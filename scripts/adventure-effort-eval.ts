#!/usr/bin/env bun
/** Live, repeatable Adventure Mode reasoning-effort comparison. */

import { parseArgs } from "node:util";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  AdventureJsonV1Schema,
  authorisedPackageRevelationScope,
  applyCompletedTurn,
  adventureJsonGmOnlyText,
  adventureJsonHiddenRecordIds,
  adventureJsonRecordIds,
  applyRollRequest,
  buildAdventureRecap,
  createPlayerTranscript,
  evaluateAdventureRun,
  packageProgressIndex,
  parseAdventureSession,
  recordPendingRollOutcome,
  retrieveAdventureJsonContext,
  resolveRecordedRoll,
  type AdventureJsonV1,
  type AdventureSession,
  type AdventureTurnProposal,
  type CommitMetadata,
  type EvaluationTurn,
  type SuppliedRollOutcome,
} from "@codex/adventure-engine";
import { AdventureTurnGenerationService as GenerationService } from "@codex/ai-engine";
import { initialSession } from "../apps/web/src/lib/stores/oracle/adventure-session";
import { ProxyInteractions } from "../packages/ai-engine/src/proxy-interactions";

type Effort = "low" | "medium" | "high" | "xhigh";
type Fixture = {
  id: string;
  title: string;
  playerCharacter: { name: string; description: string };
  rollOutcome: SuppliedRollOutcome;
  secretLeakPhrases?: Record<string, string[]>;
  runs: Array<{
    id: string;
    playerAction?: string;
    sourceRefs: string[];
    expectedBeats: string[];
    forbiddenFacts?: string[];
    revealOnSuccess?: string[];
    endingIfResolved?: string;
  }>;
  scoringGuidance: { hardFailures: string[] };
};

type CallRecord = {
  requestedEffort: Effort;
  actualModelKey?: string;
  elapsedMs: number;
  inputTokens?: number;
  outputTokens?: number;
  reasoningTokens?: number;
};

type TurnRecord = {
  id: string;
  playerAction: string;
  narration: string;
  proposal: AdventureTurnProposal;
  expectedBeats: Array<{ text: string; review: "pending" }>;
  forbiddenFactLeaks: string[];
  unexpectedRevealIds: string[];
  committed: boolean;
  endingReached?: boolean;
  repairCount: number;
  error?: string;
  rollSetup?: {
    narration: string;
    uncertainty: string;
    stakes: string;
    outcome: SuppliedRollOutcome;
  };
  calls: CallRecord[];
};

const ROOT = process.cwd();
const FIXTURE_DIR = resolve(ROOT, "fixtures/adventures/reference-one-shot");
const DEFAULT_OUTPUT = resolve(
  ROOT,
  "docs/experiments/adventure-luna-effort-results",
);
const DEFAULT_PROXY = "http://127.0.0.1:8787";

function parseCli() {
  const { values } = parseArgs({
    options: {
      proxy: {
        type: "string",
        default: process.env.ORACLE_PROXY_URL ?? DEFAULT_PROXY,
      },
      origin: {
        type: "string",
        default: process.env.ORACLE_PROXY_ORIGIN ?? "http://localhost:5173",
      },
      model: { type: "string", default: "luna-fast" },
      efforts: { type: "string", default: "low,medium,high,xhigh" },
      repeats: { type: "string", default: "1" },
      output: { type: "string", default: DEFAULT_OUTPUT },
      "dry-run": { type: "boolean", default: false },
      "report-only": { type: "boolean", default: false },
    },
    strict: true,
  });
  const efforts = values.efforts!.split(",").map((value) => value.trim());
  if (
    efforts.some((value) => !["low", "medium", "high", "xhigh"].includes(value))
  ) {
    throw new Error("Efforts must be selected from low,medium,high,xhigh.");
  }
  const repeats = Number(values.repeats);
  if (!Number.isInteger(repeats) || repeats < 1 || repeats > 10) {
    throw new Error("Repeats must be an integer from 1 to 10.");
  }
  return {
    proxy: values.proxy!,
    origin: values.origin!,
    model: values.model!,
    efforts: [...new Set(efforts)] as Effort[],
    repeats,
    output: resolve(values.output!),
    dryRun: values["dry-run"]!,
    reportOnly: values["report-only"]!,
  };
}

async function loadFixture() {
  const [fixtureJson, packageJson] = await Promise.all([
    readFile(resolve(FIXTURE_DIR, "effort-golden-set.json"), "utf8"),
    readFile(resolve(FIXTURE_DIR, "adventure.v1.json"), "utf8"),
  ]);
  const fixture = JSON.parse(fixtureJson) as Fixture;
  const adventure = AdventureJsonV1Schema.parse(JSON.parse(packageJson));
  return { fixture, adventure };
}

function makeSession(
  fixture: Fixture,
  adventure: AdventureJsonV1,
  now: string,
) {
  let id = 0;
  const idGenerator = () => `effort-${++id}`;
  const hashPromise = crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(adventure)),
  );
  return hashPromise.then((hash) => {
    const hashHex = [...new Uint8Array(hash)]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    const session = initialSession({
      vaultId: "effort-eval-vault",
      title: fixture.title,
      premise: adventure.premise.background,
      playerCharacter: {
        kind: "provisional",
        name: fixture.playerCharacter.name,
        description: fixture.playerCharacter.description,
      },
      sourcePackage: {
        packageId: adventure.id,
        version: adventure.version,
        formatVersion: adventure.formatVersion,
        hash: hashHex,
      },
      now,
      idGenerator,
    });
    session.packageProgress = { sceneId: adventure.scenes[0]!.id };
    session.hiddenState.secrets = adventure.secrets.map((secret) => ({
      id: secret.id,
      text: secret.text,
      status: "hidden" as const,
    }));
    return parseAdventureSession(session);
  });
}

function revealErrors(
  turn: Fixture["runs"][number],
  proposal: AdventureTurnProposal,
) {
  if (proposal.kind !== "complete") return [];
  const permitted = new Set(turn.revealOnSuccess ?? []);
  return (proposal.revealSecretIds ?? []).filter((id) => !permitted.has(id));
}

function packageMetadata(
  adventure: AdventureJsonV1,
  session: AdventureSession,
): Pick<
  CommitMetadata,
  | "packageSceneIds"
  | "packageRecordIds"
  | "packageGmOnlyText"
  | "packageSecretTexts"
  | "packageRecordKinds"
  | "packageSceneBranches"
  | "packageActorIds"
> {
  const scope = authorisedPackageRevelationScope(session.packageProgress);
  return {
    ...packageProgressIndex(adventure),
    packageSceneIds: adventure.scenes.map((scene) => scene.id),
    packageRecordIds: adventureJsonHiddenRecordIds(adventure),
    packageGmOnlyText: adventureJsonGmOnlyText(adventure, scope),
    packageSecretTexts: Object.fromEntries(
      adventure.secrets.map((secret) => [secret.id, secret.text]),
    ),
  };
}

function checkEndingReached(
  adventure: AdventureJsonV1,
  proposal: AdventureTurnProposal,
  narration: string,
  endingId: string,
): boolean {
  const ending = adventure.endings.find((item) => item.id === endingId);
  const events =
    proposal.kind === "complete" ? (proposal.packageEvents ?? []) : [];
  const normalizedEndingId = endingId.toLocaleLowerCase();
  const titleWithoutPrefix = ending?.title
    .replace(/^ending:\s*/i, "")
    .trim()
    .toLocaleLowerCase();
  const anchor = ending?.sourceRef?.anchor?.toLocaleLowerCase();
  if (
    events.some((event) => {
      const recordId = event.recordId.toLocaleLowerCase();
      const note = event.note.toLocaleLowerCase();
      return (
        recordId === normalizedEndingId ||
        note.includes(normalizedEndingId) ||
        Boolean(anchor && (recordId === anchor || note.includes(anchor))) ||
        Boolean(titleWithoutPrefix && note.includes(titleWithoutPrefix))
      );
    })
  ) {
    return true;
  }
  const lower = narration.toLocaleLowerCase();
  if (lower.includes(normalizedEndingId)) return true;
  if (titleWithoutPrefix && lower.includes(titleWithoutPrefix)) return true;
  if (!ending) return false;
  const clauses = ending.description
    .toLocaleLowerCase()
    .split(/[.;,]/)
    .map((clause) => clause.trim())
    .filter((clause) => clause.length >= 12);
  if (clauses.some((clause) => lower.includes(clause))) return true;
  const descKeywords = [
    ...new Set(
      ending.description
        .toLocaleLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((word) => word.length >= 5),
    ),
  ];
  if (descKeywords.length === 0) return false;
  const hits = descKeywords.filter((word) => lower.includes(word)).length;
  return hits >= Math.max(3, Math.ceil(descKeywords.length * 0.55));
}

async function executeEffort(
  fixture: Fixture,
  adventure: AdventureJsonV1,
  effort: Effort,
  repeat: number,
  proxyUrl: string,
  origin: string,
  model: string,
) {
  const sessionToken = process.env.ORACLE_SESSION_TOKEN;
  const authenticatedFetch: typeof fetch = (input, init) => {
    const headers = new Headers(init?.headers);
    headers.set("Origin", origin);
    if (sessionToken) headers.set("Authorization", `Bearer ${sessionToken}`);
    return fetch(input, { ...init, headers });
  };
  const interactions = new ProxyInteractions(proxyUrl, authenticatedFetch);
  const calls: CallRecord[] = [];
  const client = {
    async getModel() {
      throw new Error(
        "The live harness requires the Adventure Interactions path.",
      );
    },
    async sendInteraction(params: any) {
      const started = performance.now();
      const result = await interactions.send(params);
      calls.push({
        requestedEffort: effort,
        actualModelKey: result.modelKey,
        elapsedMs: Math.round(performance.now() - started),
        inputTokens: result.usage?.inputTokens,
        outputTokens: result.usage?.outputTokens,
        reasoningTokens: result.usage?.reasoningTokens,
      });
      return result;
    },
  };
  const generation = new GenerationService(client as any);
  let session = await makeSession(fixture, adventure, new Date().toISOString());
  const allPackageRecordIds = [
    ...adventureJsonRecordIds(adventure),
    ...adventure.endings.map((ending) => ending.id),
  ];
  const evaluated: EvaluationTurn[] = [];
  const turnRecords: TurnRecord[] = [];
  const hardFailures: string[] = [];
  const allSteps: Array<Fixture["runs"][number]> = [
    {
      id: "opening",
      playerAction: undefined,
      sourceRefs: [adventure.scenes[0]!.sourceRef?.anchor].filter(
        (anchor): anchor is string => Boolean(anchor),
      ),
      expectedBeats: [] as string[],
      revealOnSuccess: [],
    },
    ...fixture.runs,
  ];

  for (const [index, step] of allSteps.entries()) {
    const turnCallsStart = calls.length;
    const packageContext = retrieveAdventureJsonContext(adventure, {
      sceneId: session.packageProgress?.sceneId,
    });
    const request = {
      session,
      phase: index === 0 ? ("opening" as const) : ("action" as const),
      ...(step.playerAction ? { playerAction: step.playerAction } : {}),
      anchors: [],
      relevant: [],
      adventurePackage: {
        playerSafe: packageContext.playerSafe,
        gmOnly: packageContext.gmOnly,
      },
    };
    let rollSetup: TurnRecord["rollSetup"];
    try {
      let proposal = await generation.generate(request, {
        modelName: model,
        reasoningEffort: effort,
      });
      const initialUnexpectedRevealIds = revealErrors(step, proposal);
      let narration =
        proposal.kind === "complete"
          ? proposal.narration
          : (proposal.setupNarration ?? "");
      const before = session;
      const meta: CommitMetadata = {
        turnId: `repeat-${repeat}-effort-${effort}-turn-${index}`,
        inputId: `repeat-${repeat}-effort-${effort}-input-${index}`,
        now: new Date(Date.now() + index).toISOString(),
        ...(step.playerAction ? { playerAction: step.playerAction } : {}),
        ...packageMetadata(adventure, session),
      };
      let committed = false;
      let error: string | undefined;
      if (proposal.kind === "complete") {
        const previousSceneId = session.packageProgress?.sceneId;
        const result = applyCompletedTurn(session, proposal, meta);
        if (result.ok) {
          session = result.value;
          if (previousSceneId !== session.packageProgress?.sceneId) {
            generation.clearInteraction(session.id);
          } else {
            generation.confirmInteraction(session.id, session.revision);
          }
          committed = true;
        } else {
          error = result.errors.map((item) => item.message).join("; ");
          generation.clearInteraction(session.id);
          hardFailures.push(
            `${step.id}: Adventure reducer rejected the turn: ${error}`,
          );
        }
      } else {
        const result = applyRollRequest(session, proposal, meta);
        if (!result.ok) {
          error = result.errors.map((item) => item.message).join("; ");
          generation.clearInteraction(session.id);
          hardFailures.push(`${step.id}: roll setup rejected: ${error}`);
        } else {
          const setupProposal = proposal;
          session = result.value;
          generation.confirmInteraction(session.id, session.revision);
          const pendingRoll = session.pendingRoll!;
          rollSetup = {
            narration: setupProposal.setupNarration ?? "",
            uncertainty: setupProposal.uncertainty ?? "",
            stakes: setupProposal.stakes ?? "",
            outcome: fixture.rollOutcome,
          };
          const recorded = recordPendingRollOutcome(
            session,
            pendingRoll.inputId,
            fixture.rollOutcome,
            {
              ...meta,
              turnId: `${meta.turnId}-outcome`,
              inputId: pendingRoll.inputId,
              now: new Date(Date.now() + index + 1).toISOString(),
            },
          );
          if (!recorded.ok) {
            error = recorded.errors.map((item) => item.message).join("; ");
            hardFailures.push(`${step.id}: roll outcome rejected: ${error}`);
            generation.clearInteraction(session.id);
          } else {
            session = recorded.value;
            generation.confirmInteraction(session.id, session.revision);
            const rollContext = retrieveAdventureJsonContext(adventure, {
              sceneId: session.packageProgress?.sceneId,
            });
            const resolution = await generation.generate(
              {
                session,
                phase: "roll-resolution",
                rollResolution: fixture.rollOutcome,
                anchors: [],
                relevant: [],
                adventurePackage: {
                  playerSafe: rollContext.playerSafe,
                  gmOnly: rollContext.gmOnly,
                },
              },
              { modelName: model, reasoningEffort: effort },
            );
            proposal = resolution;
            if (resolution.kind !== "complete") {
              error = "Roll resolution requested another roll.";
              hardFailures.push(`${step.id}: ${error}`);
              generation.clearInteraction(session.id);
            } else {
              narration = resolution.narration ?? "";
              const previousSceneId = session.packageProgress?.sceneId;
              const resolved = resolveRecordedRoll(session, resolution, {
                ...meta,
                turnId: `${meta.turnId}-resolved`,
                inputId: `${meta.inputId}-resolved`,
                now: new Date(Date.now() + index + 2).toISOString(),
                playerAction: pendingRoll.playerAction,
                ...packageMetadata(adventure, session),
              });
              if (resolved.ok) {
                session = resolved.value;
                if (previousSceneId !== session.packageProgress?.sceneId) {
                  generation.clearInteraction(session.id);
                } else {
                  generation.confirmInteraction(session.id, session.revision);
                }
                committed = true;
              } else {
                error = resolved.errors.map((item) => item.message).join("; ");
                hardFailures.push(
                  `${step.id}: roll resolution rejected: ${error}`,
                );
                generation.clearInteraction(session.id);
              }
            }
          }
        }
      }
      const unexpectedRevealIds = [
        ...new Set([
          ...initialUnexpectedRevealIds,
          ...revealErrors(step, proposal),
        ]),
      ];
      if (unexpectedRevealIds.length) {
        hardFailures.push(
          `${step.id}: revealed unearned secret id(s): ${unexpectedRevealIds.join(", ")}`,
        );
      }
      const forbiddenTexts = (step.forbiddenFacts ?? [])
        .map((id) => adventure.secrets.find((secret) => secret.id === id)?.text)
        .filter((value): value is string => typeof value === "string");
      const forbiddenSurface = [rollSetup?.narration, narration]
        .filter((text): text is string => Boolean(text))
        .join("\n")
        .toLocaleLowerCase();
      const exactLeaks = forbiddenTexts.filter((text) =>
        forbiddenSurface.includes(text.toLocaleLowerCase()),
      );
      const phraseLeaks: string[] = [];
      for (const id of step.forbiddenFacts ?? []) {
        for (const phrase of fixture.secretLeakPhrases?.[id] ?? []) {
          if (forbiddenSurface.includes(phrase.toLocaleLowerCase())) {
            phraseLeaks.push(`${id}: "${phrase}"`);
          }
        }
      }
      const forbiddenFactLeaks = [...exactLeaks, ...phraseLeaks];
      if (exactLeaks.length) {
        hardFailures.push(`${step.id}: exact forbidden source text leaked`);
      }
      if (phraseLeaks.length) {
        hardFailures.push(
          `${step.id}: forbidden secret phrase leaked (${phraseLeaks.join(", ")})`,
        );
      }
      const turnCalls = calls.slice(turnCallsStart);
      const endingReached = step.endingIfResolved
        ? checkEndingReached(
            adventure,
            proposal,
            narration,
            step.endingIfResolved,
          )
        : undefined;
      const record: TurnRecord = {
        id: step.id,
        playerAction: step.playerAction ?? "[opening scene]",
        narration,
        proposal,
        expectedBeats: step.expectedBeats.map((text) => ({
          text,
          review: "pending" as const,
        })),
        forbiddenFactLeaks: forbiddenFactLeaks.map((text: string) =>
          text.slice(0, 120),
        ),
        unexpectedRevealIds,
        committed,
        ...(endingReached !== undefined ? { endingReached } : {}),
        repairCount: Math.max(0, turnCalls.length - (rollSetup ? 2 : 1)),
        ...(rollSetup ? { rollSetup } : {}),
        ...(error ? { error } : {}),
        calls: turnCalls,
      };
      turnRecords.push(record);
      const evalSession = committed ? session : before;
      evaluated.push({
        narration,
        playerCharacterName: fixture.playerCharacter.name,
        proposal,
        playerAction: step.playerAction,
        previousSession: before,
        session: evalSession,
        gmOnlyLore: forbiddenTexts,
        recap: buildAdventureRecap(evalSession),
        transcript: createPlayerTranscript(evalSession),
        packageRecordIds: allPackageRecordIds,
        commitFailed: Boolean(error),
      } as EvaluationTurn);
      if (!committed) break;
    } catch (cause) {
      const error = cause instanceof Error ? cause.message : String(cause);
      const turnCalls = calls.slice(turnCallsStart);
      hardFailures.push(`${step.id}: generation failed: ${error}`);
      turnRecords.push({
        id: step.id,
        playerAction: step.playerAction ?? "[opening scene]",
        narration: "",
        proposal: {
          kind: "complete",
          narration: "",
          visiblePatch: {
            objectives: { add: [], update: [], removeIds: [] },
            activeCharacters: { add: [], update: [], removeIds: [] },
            knownFacts: { add: [], update: [], removeIds: [] },
            relationships: { add: [], update: [], removeIds: [] },
          },
          hiddenPatch: {
            secrets: { add: [], update: [], removeIds: [] },
            gmThreads: { add: [], update: [], removeIds: [] },
          },
          revealSecretIds: [],
          provisionalFacts: [],
          sourceRecordIds: [],
        },
        expectedBeats: step.expectedBeats.map((text) => ({
          text,
          review: "pending" as const,
        })),
        forbiddenFactLeaks: [],
        unexpectedRevealIds: [],
        committed: false,
        repairCount: Math.max(0, turnCalls.length - (rollSetup ? 2 : 1)),
        ...(rollSetup ? { rollSetup } : {}),
        error,
        calls: turnCalls,
      });
      break;
    }
  }

  const rubric = evaluateAdventureRun(evaluated, []);
  return {
    effort,
    repeat,
    requestedModel: model,
    calls,
    turns: turnRecords,
    rubric,
    hardFailures,
    passed:
      rubric.passed &&
      hardFailures.length === 0 &&
      turnRecords.length === allSteps.length,
  };
}

function reportMarkdown(
  fixture: Fixture,
  results: any[],
  proxy: string,
  origin: string,
  runConfig?: { rollOutcome?: SuppliedRollOutcome },
  generatedAt = new Date().toISOString(),
) {
  const lines = [
    `# ${fixture.title.replace(/: Luna effort comparison$/, "")} — live effort comparison`,
    "",
    `Generated: ${generatedAt}  `,
    `Proxy: \`${proxy}\`  `,
    `Origin: \`${origin}\`  `,
    `Adventure: \`${fixture.id}\` · fixed player actions · fresh interaction per run`,
    "",
    "> This report contains model output. Expected-beat reviews remain pending for human assessment; automated rubric scores are safety and state checks, not a prose-quality judge.",
    ...(runConfig?.rollOutcome
      ? [
          `> Scripted roll outcome: \`${runConfig.rollOutcome.kind} ${runConfig.rollOutcome.value}\` at every effort level.`,
        ]
      : [
          "> Baseline caveat: this capture predates scripted roll replay. A turn that requested a roll left the path pending, so later scripted actions are not a continuous playthrough.",
        ]),
    "",
    "## Summary",
    "",
    "| Effort | Repeat | Actual model(s) | Turns committed | Rolls | Repairs | Calls | Median latency | Tokens in/out (reason) | Run | Rubric | Hard failures |",
    "|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
  ];
  for (const result of results) {
    const latencies = result.calls
      .map((call: CallRecord) => call.elapsedMs)
      .sort((a: number, b: number) => a - b);
    const median = latencies.length
      ? latencies[Math.floor(latencies.length / 2)]
      : 0;
    const models =
      [
        ...new Set(
          result.calls.map(
            (call: CallRecord) => call.actualModelKey ?? "unknown",
          ),
        ),
      ].join(", ") || "none";
    const input = result.calls.reduce(
      (sum: number, call: CallRecord) => sum + (call.inputTokens ?? 0),
      0,
    );
    const output = result.calls.reduce(
      (sum: number, call: CallRecord) => sum + (call.outputTokens ?? 0),
      0,
    );
    const reasoning = result.calls.reduce(
      (sum: number, call: CallRecord) => sum + (call.reasoningTokens ?? 0),
      0,
    );
    const committedTurns = result.turns.filter(
      (turn: TurnRecord) => turn.committed,
    ).length;
    const rollCount = result.turns.filter(
      (turn: TurnRecord) =>
        Boolean(turn.rollSetup) || turn.proposal.kind === "roll-required",
    ).length;
    const repairCount = result.turns.reduce(
      (sum: number, turn: TurnRecord) =>
        sum +
        (turn.repairCount ??
          Math.max(0, turn.calls.length - (turn.rollSetup ? 2 : 1))),
      0,
    );
    lines.push(
      `| ${result.effort} | ${result.repeat} | ${models} | ${committedTurns}/${result.turns.length} | ${rollCount} | ${repairCount} | ${result.calls.length} | ${median} ms | ${input} / ${output} (${reasoning}) | ${result.passed ? "PASS" : "FAIL"} | ${result.rubric.passed ? "PASS" : "FAIL"} | ${result.hardFailures.length} |`,
    );
  }
  for (const result of results) {
    lines.push(
      "",
      `## ${result.effort} effort · repeat ${result.repeat}`,
      "",
      `Run: **${result.passed ? "PASS" : "FAIL"}** · Rubric: **${result.rubric.passed ? "PASS" : "FAIL"}** · Calls: ${result.calls.length} · Hard failures: ${result.hardFailures.length}`,
      "",
    );
    if (result.hardFailures.length)
      lines.push(
        "### Hard failures",
        "",
        ...result.hardFailures.map((failure: string) => `- ${failure}`),
        "",
      );
    for (const turn of result.turns) {
      lines.push(
        `### ${turn.id}`,
        "",
        `**Player:** ${turn.playerAction}`,
        "",
        `**GM:** ${turn.narration || "_(no narration)_"}`,
        "",
      );
      if (turn.error) lines.push(`> Run note: ${turn.error}`, "");
      if (turn.rollSetup) {
        lines.push(
          `**Roll:** ${turn.rollSetup.uncertainty}`,
          `**Stakes:** ${turn.rollSetup.stakes}`,
          `**Recorded outcome:** ${turn.rollSetup.outcome.label ?? turn.rollSetup.outcome.value}`,
          "",
        );
      }
      if (turn.calls.length) {
        lines.push(
          `_Model: ${turn.calls.map((call: CallRecord) => call.actualModelKey ?? "unknown").join(", ")} · Latency: ${turn.calls.reduce((sum: number, call: CallRecord) => sum + call.elapsedMs, 0)} ms_`,
          "",
        );
      }
      if (turn.expectedBeats.length)
        lines.push(
          "Expected beats (human review):",
          ...turn.expectedBeats.map(
            (beat: { text: string }) => `- [ ] ${beat.text}`,
          ),
          "",
        );
    }
  }
  lines.push(
    "## Review guide",
    "",
    ...fixture.scoringGuidance.hardFailures.map((failure) => `- ${failure}`),
    "",
    "Mark expected beats in each transcript as present, partial, or absent. Compare quality within each effort level before choosing a default.",
    "",
  );
  return lines.join("\n");
}

async function main() {
  const cli = parseCli();
  const { fixture, adventure } = await loadFixture();
  if (cli.reportOnly) {
    const existing = JSON.parse(
      await readFile(resolve(cli.output, "results.json"), "utf8"),
    );
    if (existing.fixtureId !== fixture.id)
      throw new Error("Existing results belong to a different fixture.");
    await writeFile(
      resolve(cli.output, "results.md"),
      reportMarkdown(
        fixture,
        existing.results,
        existing.proxy,
        existing.origin,
        existing.runConfig,
        existing.generatedAt,
      ),
    );
    console.log(`Wrote ${resolve(cli.output, "results.md")}`);
    return;
  }
  if (cli.dryRun) {
    console.log(
      JSON.stringify(
        {
          adventure: adventure.id,
          steps: fixture.runs.length + 1,
          model: cli.model,
          efforts: cli.efforts,
          repeats: cli.repeats,
          baseModelRequests:
            (fixture.runs.length + 1) * cli.efforts.length * cli.repeats,
          rollOutcome: fixture.rollOutcome,
          proxy: cli.proxy,
          origin: cli.origin,
        },
        null,
        2,
      ),
    );
    return;
  }
  const results = [];
  for (let repeat = 1; repeat <= cli.repeats; repeat++) {
    for (const effort of cli.efforts) {
      console.log(`Running ${effort}, repeat ${repeat}…`);
      results.push(
        await executeEffort(
          fixture,
          adventure,
          effort,
          repeat,
          cli.proxy,
          cli.origin,
          cli.model,
        ),
      );
    }
  }
  const report = {
    schemaVersion: 1,
    fixtureId: fixture.id,
    adventureId: adventure.id,
    generatedAt: new Date().toISOString(),
    proxy: cli.proxy,
    origin: cli.origin,
    runConfig: {
      model: cli.model,
      efforts: cli.efforts,
      repeats: cli.repeats,
      scriptedStepsPerEffort: fixture.runs.length + 1,
      rollOutcome: fixture.rollOutcome,
    },
    results,
  };
  await mkdir(cli.output, { recursive: true });
  await Promise.all([
    writeFile(
      resolve(cli.output, "results.json"),
      JSON.stringify(report, null, 2) + "\n",
    ),
    writeFile(
      resolve(cli.output, "results.md"),
      reportMarkdown(
        fixture,
        results,
        cli.proxy,
        cli.origin,
        report.runConfig,
        report.generatedAt,
      ),
    ),
  ]);
  console.log(`Wrote ${resolve(cli.output, "results.md")}`);
  console.log(`Wrote ${resolve(cli.output, "results.json")}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
