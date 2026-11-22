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
type StepConfig = {
  id: string;
  playerAction?: string;
  sourceRefs: string[];
  expectedBeats: string[];
  forbiddenFacts?: string[];
  revealOnSuccess?: string[];
  endingIfResolved?: string;
};
type Fixture = {
  id: string;
  title: string;
  playerCharacter: { name: string; description: string };
  rollOutcome: SuppliedRollOutcome;
  secretLeakPhrases?: Record<string, string[]>;
  globalConstraints?: { forbiddenUntilRevealed?: string[] };
  runs: StepConfig[];
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

type RollSetupRecord = {
  narration: string;
  uncertainty: string;
  stakes: string;
  outcome: SuppliedRollOutcome;
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
  rollSetup?: RollSetupRecord;
  calls: CallRecord[];
};

const VALID_EFFORTS = new Set<string>(["low", "medium", "high", "xhigh"]);
const ROOT = process.cwd();
const FIXTURE_DIR = resolve(ROOT, "fixtures/adventures/reference-one-shot");
const DEFAULT_OUTPUT = resolve(
  ROOT,
  "docs/experiments/adventure-luna-effort-results",
);
const DEFAULT_PROXY = "http://127.0.0.1:8787";

function parseEfforts(raw: string): Effort[] {
  const efforts = raw.split(",").map((value) => value.trim());
  if (efforts.some((value) => !VALID_EFFORTS.has(value))) {
    throw new Error("Efforts must be selected from low,medium,high,xhigh.");
  }
  return [...new Set(efforts)] as Effort[];
}

function parseRepeats(raw: string): number {
  const repeats = Number(raw);
  if (!Number.isInteger(repeats) || repeats < 1 || repeats > 10) {
    throw new Error("Repeats must be an integer from 1 to 10.");
  }
  return repeats;
}

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
  return {
    proxy: values.proxy!,
    origin: values.origin!,
    model: values.model!,
    efforts: parseEfforts(values.efforts!),
    repeats: parseRepeats(values.repeats!),
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

async function makeSession(
  fixture: Fixture,
  adventure: AdventureJsonV1,
  now: string,
) {
  let id = 0;
  const idGenerator = () => `effort-${++id}`;
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(adventure)),
  );
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
  return parseAdventureSession(session);
}

function revealErrors(turn: StepConfig, proposal: AdventureTurnProposal) {
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

function matchesFieldNeedle(haystack: string, needle?: string): boolean {
  if (!needle) return false;
  return haystack.includes(needle);
}

function eventMatchesEnding(
  event: { recordId: string; note: string },
  normalizedEndingId: string,
  anchor?: string,
  titleWithoutPrefix?: string,
): boolean {
  const recordId = event.recordId.toLocaleLowerCase();
  const note = event.note.toLocaleLowerCase();
  return [
    recordId === normalizedEndingId,
    note.includes(normalizedEndingId),
    recordId === anchor,
    matchesFieldNeedle(note, anchor),
    matchesFieldNeedle(note, titleWithoutPrefix),
  ].some(Boolean);
}

function matchesEndingEvent(
  proposal: AdventureTurnProposal,
  normalizedEndingId: string,
  anchor?: string,
  titleWithoutPrefix?: string,
): boolean {
  if (proposal.kind !== "complete") return false;
  return (proposal.packageEvents ?? []).some((event) =>
    eventMatchesEnding(event, normalizedEndingId, anchor, titleWithoutPrefix),
  );
}

function matchesEndingDescription(lower: string, description: string): boolean {
  const clauses = description
    .toLocaleLowerCase()
    .split(/[.;,]/)
    .map((clause) => clause.trim())
    .filter((clause) => clause.length >= 12);
  if (clauses.some((clause) => lower.includes(clause))) return true;
  const descKeywords = [
    ...new Set(
      description
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

function extractEndingTitle(
  ending?: AdventureJsonV1["endings"][number],
): string | undefined {
  if (!ending) return undefined;
  return ending.title
    .replace(/^ending:\s*/i, "")
    .trim()
    .toLocaleLowerCase();
}

function extractEndingAnchor(
  ending?: AdventureJsonV1["endings"][number],
): string | undefined {
  return ending?.sourceRef?.anchor?.toLocaleLowerCase();
}

function checkEndingMatchedByText(
  lower: string,
  normalizedEndingId: string,
  titleWithoutPrefix?: string,
  description?: string,
): boolean {
  if (lower.includes(normalizedEndingId)) return true;
  if (matchesFieldNeedle(lower, titleWithoutPrefix)) return true;
  return description ? matchesEndingDescription(lower, description) : false;
}

function checkEndingReached(
  adventure: AdventureJsonV1,
  proposal: AdventureTurnProposal,
  narration: string,
  endingId: string,
): boolean {
  const ending = adventure.endings.find((item) => item.id === endingId);
  const normalizedEndingId = endingId.toLocaleLowerCase();
  const titleWithoutPrefix = extractEndingTitle(ending);
  const anchor = extractEndingAnchor(ending);
  if (
    matchesEndingEvent(proposal, normalizedEndingId, anchor, titleWithoutPrefix)
  ) {
    return true;
  }
  return checkEndingMatchedByText(
    narration.toLocaleLowerCase(),
    normalizedEndingId,
    titleWithoutPrefix,
    ending?.description,
  );
}

function createGenerationHarness(
  proxyUrl: string,
  origin: string,
  effort: Effort,
  calls: CallRecord[],
) {
  const sessionToken = process.env.ORACLE_SESSION_TOKEN;
  const authenticatedFetch: typeof fetch = (input, init) => {
    const headers = new Headers(init?.headers);
    headers.set("Origin", origin);
    if (sessionToken) headers.set("Authorization", `Bearer ${sessionToken}`);
    return fetch(input, { ...init, headers });
  };
  const interactions = new ProxyInteractions(proxyUrl, authenticatedFetch);
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
  return new GenerationService(client as any);
}

function buildFallbackProposal(): AdventureTurnProposal {
  const emptyCollection = () => ({ add: [], update: [], removeIds: [] });
  return {
    kind: "complete",
    narration: "",
    visiblePatch: {
      objectives: emptyCollection(),
      activeCharacters: emptyCollection(),
      knownFacts: emptyCollection(),
      relationships: emptyCollection(),
    },
    hiddenPatch: {
      secrets: emptyCollection(),
      gmThreads: emptyCollection(),
    },
    revealSecretIds: [],
    provisionalFacts: [],
    sourceRecordIds: [],
  };
}

function applySceneOutcome(
  result:
    | { ok: true; value: AdventureSession }
    | { ok: false; errors: Array<{ message: string }> },
  previousSceneId: string | undefined,
  sessionId: string,
  generation: GenerationService,
  failurePrefix: string,
  hardFailures: string[],
): { session?: AdventureSession; error?: string } {
  if (!result.ok) {
    const error = result.errors.map((item) => item.message).join("; ");
    generation.clearInteraction(sessionId);
    hardFailures.push(`${failurePrefix}: ${error}`);
    return { error };
  }
  if (previousSceneId !== result.value.packageProgress?.sceneId) {
    generation.clearInteraction(sessionId);
  } else {
    generation.confirmInteraction(sessionId, result.value.revision);
  }
  return { session: result.value };
}

type StepOutcome = {
  session: AdventureSession;
  proposal: AdventureTurnProposal;
  narration: string;
  rollSetup?: RollSetupRecord;
  committed: boolean;
  error?: string;
};

function recordRollSetupState(
  session: AdventureSession,
  proposal: AdventureTurnProposal & { kind: "roll-required" },
  meta: CommitMetadata,
  generation: GenerationService,
  stepId: string,
  hardFailures: string[],
): { session?: AdventureSession; error?: string } {
  const setupResult = applyRollRequest(session, proposal, meta);
  if (!setupResult.ok) {
    const error = setupResult.errors.map((item) => item.message).join("; ");
    generation.clearInteraction(session.id);
    hardFailures.push(`${stepId}: roll setup rejected: ${error}`);
    return { error };
  }
  generation.confirmInteraction(
    setupResult.value.id,
    setupResult.value.revision,
  );
  return { session: setupResult.value };
}

function recordRollOutcomeState(
  session: AdventureSession,
  outcomeValue: SuppliedRollOutcome,
  meta: CommitMetadata,
  index: number,
  generation: GenerationService,
  stepId: string,
  hardFailures: string[],
): { session?: AdventureSession; error?: string } {
  const pendingRoll = session.pendingRoll!;
  const recorded = recordPendingRollOutcome(
    session,
    pendingRoll.inputId,
    outcomeValue,
    {
      ...meta,
      turnId: `${meta.turnId}-outcome`,
      inputId: pendingRoll.inputId,
      now: new Date(Date.now() + index + 1).toISOString(),
    },
  );
  if (!recorded.ok) {
    const error = recorded.errors.map((item) => item.message).join("; ");
    hardFailures.push(`${stepId}: roll outcome rejected: ${error}`);
    generation.clearInteraction(session.id);
    return { error };
  }
  generation.confirmInteraction(recorded.value.id, recorded.value.revision);
  return { session: recorded.value };
}

function commitRollResolution(params: {
  adventure: AdventureJsonV1;
  generation: GenerationService;
  session: AdventureSession;
  resolution: AdventureTurnProposal & { kind: "complete" };
  rollSetup: RollSetupRecord;
  meta: CommitMetadata;
  stepId: string;
  index: number;
  hardFailures: string[];
}): StepOutcome {
  const { session, resolution, rollSetup } = params;
  const previousSceneId = session.packageProgress?.sceneId;
  const resolved = resolveRecordedRoll(session, resolution, {
    ...params.meta,
    turnId: `${params.meta.turnId}-resolved`,
    inputId: `${params.meta.inputId}-resolved`,
    now: new Date(Date.now() + params.index + 2).toISOString(),
    playerAction: session.pendingRoll!.playerAction,
    ...packageMetadata(params.adventure, session),
  });
  const outcome = applySceneOutcome(
    resolved,
    previousSceneId,
    session.id,
    params.generation,
    `${params.stepId}: roll resolution rejected`,
    params.hardFailures,
  );
  return {
    session: outcome.session ?? session,
    proposal: resolution,
    narration: resolution.narration,
    rollSetup,
    committed: Boolean(outcome.session),
    error: outcome.error,
  };
}

async function requestAndCommitRollResolution(params: {
  adventure: AdventureJsonV1;
  fixture: Fixture;
  generation: GenerationService;
  session: AdventureSession;
  rollSetup: RollSetupRecord;
  meta: CommitMetadata;
  stepId: string;
  index: number;
  model: string;
  effort: Effort;
  hardFailures: string[];
}): Promise<StepOutcome> {
  const { session, rollSetup } = params;
  const rollContext = retrieveAdventureJsonContext(params.adventure, {
    sceneId: session.packageProgress?.sceneId,
  });
  const resolution = await params.generation.generate(
    {
      session,
      phase: "roll-resolution",
      rollResolution: params.fixture.rollOutcome,
      anchors: [],
      relevant: [],
      adventurePackage: {
        playerSafe: rollContext.playerSafe,
        gmOnly: rollContext.gmOnly,
      },
    },
    { modelName: params.model, reasoningEffort: params.effort },
  );
  if (resolution.kind !== "complete") {
    const error = "Roll resolution requested another roll.";
    params.hardFailures.push(`${params.stepId}: ${error}`);
    params.generation.clearInteraction(session.id);
    return {
      session,
      proposal: resolution,
      narration: rollSetup.narration,
      rollSetup,
      committed: false,
      error,
    };
  }
  return commitRollResolution({ ...params, resolution });
}

function buildRollSetupRecord(
  proposal: AdventureTurnProposal & { kind: "roll-required" },
  outcome: SuppliedRollOutcome,
): RollSetupRecord {
  return {
    narration: proposal.setupNarration ?? "",
    uncertainty: proposal.uncertainty ?? "",
    stakes: proposal.stakes ?? "",
    outcome,
  };
}

async function resolveRollStep(params: {
  adventure: AdventureJsonV1;
  fixture: Fixture;
  generation: GenerationService;
  session: AdventureSession;
  proposal: AdventureTurnProposal & { kind: "roll-required" };
  meta: CommitMetadata;
  stepId: string;
  index: number;
  model: string;
  effort: Effort;
  hardFailures: string[];
}): Promise<StepOutcome> {
  const setup = recordRollSetupState(
    params.session,
    params.proposal,
    params.meta,
    params.generation,
    params.stepId,
    params.hardFailures,
  );
  if (!setup.session) {
    return {
      session: params.session,
      proposal: params.proposal,
      narration: params.proposal.setupNarration ?? "",
      committed: false,
      error: setup.error,
    };
  }
  const rollSetup = buildRollSetupRecord(
    params.proposal,
    params.fixture.rollOutcome,
  );
  const outcomeState = recordRollOutcomeState(
    setup.session,
    params.fixture.rollOutcome,
    params.meta,
    params.index,
    params.generation,
    params.stepId,
    params.hardFailures,
  );
  if (!outcomeState.session) {
    return {
      session: setup.session,
      proposal: params.proposal,
      narration: rollSetup.narration,
      rollSetup,
      committed: false,
      error: outcomeState.error,
    };
  }
  return requestAndCommitRollResolution({
    ...params,
    session: outcomeState.session,
    rollSetup,
  });
}

function collectPhraseLeaks(
  forbiddenIds: readonly string[],
  fixture: Fixture,
  forbiddenSurface: string,
): string[] {
  return forbiddenIds.flatMap((id) =>
    (fixture.secretLeakPhrases?.[id] ?? [])
      .filter((phrase) => forbiddenSurface.includes(phrase.toLocaleLowerCase()))
      .map((phrase) => `${id}: "${phrase}"`),
  );
}

function unrevealedGlobalSecretIds(
  step: StepConfig,
  fixture: Fixture,
  previouslyRevealedIds: readonly string[],
): string[] {
  const exempt = new Set([
    ...previouslyRevealedIds,
    ...(step.revealOnSuccess ?? []),
  ]);
  return (fixture.globalConstraints?.forbiddenUntilRevealed ?? []).filter(
    (id) => !exempt.has(id),
  );
}

/** Add global unrevealed secrets to the explicit per-step prohibitions. */
function forbiddenSecretIds(
  step: StepConfig,
  fixture: Fixture,
  previouslyRevealedIds: readonly string[],
): string[] {
  return [
    ...new Set([
      ...(step.forbiddenFacts ?? []),
      ...unrevealedGlobalSecretIds(step, fixture, previouslyRevealedIds),
    ]),
  ];
}

function collectForbiddenLeaks(
  step: StepConfig,
  fixture: Fixture,
  adventure: AdventureJsonV1,
  surfaceParts: Array<string | undefined>,
  hardFailures: string[],
  previouslyRevealedIds: readonly string[],
): { forbiddenTexts: string[]; forbiddenFactLeaks: string[] } {
  const forbiddenIds = forbiddenSecretIds(
    step,
    fixture,
    previouslyRevealedIds,
  );
  const forbiddenTexts = forbiddenIds
    .map((id) => adventure.secrets.find((secret) => secret.id === id)?.text)
    .filter((value): value is string => typeof value === "string");
  const forbiddenSurface = surfaceParts
    .filter((text): text is string => Boolean(text))
    .join("\n")
    .toLocaleLowerCase();
  const exactLeaks = forbiddenTexts.filter((text) =>
    forbiddenSurface.includes(text.toLocaleLowerCase()),
  );
  const phraseLeaks = collectPhraseLeaks(forbiddenIds, fixture, forbiddenSurface);
  if (exactLeaks.length) {
    hardFailures.push(`${step.id}: exact forbidden source text leaked`);
  }
  if (phraseLeaks.length) {
    hardFailures.push(
      `${step.id}: forbidden secret phrase leaked (${phraseLeaks.join(", ")})`,
    );
  }
  return {
    forbiddenTexts,
    forbiddenFactLeaks: [...exactLeaks, ...phraseLeaks],
  };
}

function buildStepRequest(
  step: StepConfig,
  index: number,
  before: AdventureSession,
  adventure: AdventureJsonV1,
) {
  const packageContext = retrieveAdventureJsonContext(adventure, {
    sceneId: before.packageProgress?.sceneId,
  });
  return {
    session: before,
    phase: (index === 0 ? "opening" : "action") as "opening" | "action",
    ...(step.playerAction ? { playerAction: step.playerAction } : {}),
    anchors: [],
    relevant: [],
    adventurePackage: {
      playerSafe: packageContext.playerSafe,
      gmOnly: packageContext.gmOnly,
    },
  };
}

function buildStepMeta(
  step: StepConfig,
  index: number,
  before: AdventureSession,
  adventure: AdventureJsonV1,
  repeat: number,
  effort: Effort,
): CommitMetadata {
  const meta: CommitMetadata = {
    turnId: `repeat-${repeat}-effort-${effort}-turn-${index}`,
    inputId: `repeat-${repeat}-effort-${effort}-input-${index}`,
    now: new Date(Date.now() + index).toISOString(),
    ...packageMetadata(adventure, before),
  };
  if (step.playerAction) meta.playerAction = step.playerAction;
  return meta;
}

function executeCompleteProposal(
  before: AdventureSession,
  proposal: AdventureTurnProposal & { kind: "complete" },
  meta: CommitMetadata,
  generation: GenerationService,
  stepId: string,
  hardFailures: string[],
): StepOutcome {
  const applied = applySceneOutcome(
    applyCompletedTurn(before, proposal, meta),
    before.packageProgress?.sceneId,
    before.id,
    generation,
    `${stepId}: Adventure reducer rejected the turn`,
    hardFailures,
  );
  return {
    session: applied.session ?? before,
    proposal,
    narration: proposal.narration,
    committed: Boolean(applied.session),
    error: applied.error,
  };
}

async function executeProposedStep(params: {
  step: StepConfig;
  index: number;
  fixture: Fixture;
  adventure: AdventureJsonV1;
  before: AdventureSession;
  generation: GenerationService;
  repeat: number;
  effort: Effort;
  model: string;
  hardFailures: string[];
}): Promise<{ outcome: StepOutcome; initialUnexpectedRevealIds: string[] }> {
  const proposal = await params.generation.generate(
    buildStepRequest(
      params.step,
      params.index,
      params.before,
      params.adventure,
    ),
    { modelName: params.model, reasoningEffort: params.effort },
  );
  const initialUnexpectedRevealIds = revealErrors(params.step, proposal);
  const meta = buildStepMeta(
    params.step,
    params.index,
    params.before,
    params.adventure,
    params.repeat,
    params.effort,
  );

  if (proposal.kind === "complete") {
    return {
      initialUnexpectedRevealIds,
      outcome: executeCompleteProposal(
        params.before,
        proposal,
        meta,
        params.generation,
        params.step.id,
        params.hardFailures,
      ),
    };
  }

  const outcome = await resolveRollStep({
    adventure: params.adventure,
    fixture: params.fixture,
    generation: params.generation,
    session: params.before,
    proposal,
    meta,
    stepId: params.step.id,
    index: params.index,
    model: params.model,
    effort: params.effort,
    hardFailures: params.hardFailures,
  });
  return { initialUnexpectedRevealIds, outcome };
}

function collectUnexpectedReveals(
  step: StepConfig,
  initialUnexpectedRevealIds: string[],
  proposal: AdventureTurnProposal,
  hardFailures: string[],
): string[] {
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
  return unexpectedRevealIds;
}

function attachOptionalTurnFields(
  record: TurnRecord,
  step: StepConfig,
  adventure: AdventureJsonV1,
  outcome: StepOutcome,
): TurnRecord {
  if (step.endingIfResolved) {
    record.endingReached = checkEndingReached(
      adventure,
      outcome.proposal,
      outcome.narration,
      step.endingIfResolved,
    );
  }
  if (outcome.rollSetup) record.rollSetup = outcome.rollSetup;
  if (outcome.error) record.error = outcome.error;
  return record;
}

function buildSuccessTurnRecord(params: {
  step: StepConfig;
  adventure: AdventureJsonV1;
  outcome: StepOutcome;
  forbiddenFactLeaks: string[];
  unexpectedRevealIds: string[];
  turnCalls: CallRecord[];
}): TurnRecord {
  const { step, outcome } = params;
  const baseCalls = outcome.rollSetup ? 2 : 1;
  return attachOptionalTurnFields(
    {
      id: step.id,
      playerAction: step.playerAction ?? "[opening scene]",
      narration: outcome.narration,
      proposal: outcome.proposal,
      expectedBeats: step.expectedBeats.map((text) => ({
        text,
        review: "pending" as const,
      })),
      forbiddenFactLeaks: params.forbiddenFactLeaks.map((text) =>
        text.slice(0, 120),
      ),
      unexpectedRevealIds: params.unexpectedRevealIds,
      committed: outcome.committed,
      repairCount: Math.max(0, params.turnCalls.length - baseCalls),
      calls: params.turnCalls,
    },
    step,
    params.adventure,
    outcome,
  );
}

function buildSuccessEvaluationTurn(params: {
  step: StepConfig;
  fixture: Fixture;
  before: AdventureSession;
  outcome: StepOutcome;
  forbiddenTexts: string[];
  allPackageRecordIds: string[];
}): EvaluationTurn {
  const { step, fixture, before, outcome, forbiddenTexts } = params;
  const evalSession = outcome.committed ? outcome.session : before;
  return {
    narration: outcome.narration,
    playerCharacterName: fixture.playerCharacter.name,
    proposal: outcome.proposal,
    playerAction: step.playerAction,
    previousSession: before,
    session: evalSession,
    gmOnlyLore: forbiddenTexts,
    recap: buildAdventureRecap(evalSession),
    transcript: createPlayerTranscript(evalSession),
    packageRecordIds: params.allPackageRecordIds,
    commitFailed: Boolean(outcome.error),
  } as EvaluationTurn;
}

function buildSuccessStepResult(params: {
  step: StepConfig;
  fixture: Fixture;
  adventure: AdventureJsonV1;
  before: AdventureSession;
  outcome: StepOutcome;
  initialUnexpectedRevealIds: string[];
  turnCalls: CallRecord[];
  allPackageRecordIds: string[];
  hardFailures: string[];
}): {
  nextSession: AdventureSession;
  record: TurnRecord;
  evalTurn: EvaluationTurn;
} {
  const { outcome, step } = params;
  const unexpectedRevealIds = collectUnexpectedReveals(
    step,
    params.initialUnexpectedRevealIds,
    outcome.proposal,
    params.hardFailures,
  );
  const { forbiddenTexts, forbiddenFactLeaks } = collectForbiddenLeaks(
    step,
    params.fixture,
    params.adventure,
    [outcome.rollSetup?.narration, outcome.narration],
    params.hardFailures,
    params.before.packageProgress?.revealedSecretIds ?? [],
  );
  const record = buildSuccessTurnRecord({
    step,
    adventure: params.adventure,
    outcome,
    forbiddenFactLeaks,
    unexpectedRevealIds,
    turnCalls: params.turnCalls,
  });
  return {
    nextSession: outcome.session,
    record,
    evalTurn: buildSuccessEvaluationTurn({
      step,
      fixture: params.fixture,
      before: params.before,
      outcome,
      forbiddenTexts,
      allPackageRecordIds: params.allPackageRecordIds,
    }),
  };
}

function buildFailedStepResult(params: {
  step: StepConfig;
  fixture: Fixture;
  before: AdventureSession;
  turnCalls: CallRecord[];
  allPackageRecordIds: string[];
  cause: unknown;
  hardFailures: string[];
}): {
  nextSession: AdventureSession;
  record: TurnRecord;
  evalTurn: EvaluationTurn;
} {
  const errMsg =
    params.cause instanceof Error ? params.cause.message : String(params.cause);
  const proposal = buildFallbackProposal();
  params.hardFailures.push(`${params.step.id}: generation failed: ${errMsg}`);
  return {
    nextSession: params.before,
    record: {
      id: params.step.id,
      playerAction: params.step.playerAction ?? "[opening scene]",
      narration: "",
      proposal,
      expectedBeats: params.step.expectedBeats.map((text) => ({
        text,
        review: "pending" as const,
      })),
      forbiddenFactLeaks: [],
      unexpectedRevealIds: [],
      committed: false,
      repairCount: Math.max(0, params.turnCalls.length - 1),
      error: errMsg,
      calls: params.turnCalls,
    },
    evalTurn: {
      narration: "",
      playerCharacterName: params.fixture.playerCharacter.name,
      proposal,
      playerAction: params.step.playerAction,
      previousSession: params.before,
      session: params.before,
      gmOnlyLore: [],
      recap: buildAdventureRecap(params.before),
      transcript: createPlayerTranscript(params.before),
      packageRecordIds: params.allPackageRecordIds,
      commitFailed: true,
    } as EvaluationTurn,
  };
}

async function runSingleStep(params: {
  step: StepConfig;
  index: number;
  fixture: Fixture;
  adventure: AdventureJsonV1;
  session: AdventureSession;
  generation: GenerationService;
  calls: CallRecord[];
  repeat: number;
  effort: Effort;
  model: string;
  allPackageRecordIds: string[];
  hardFailures: string[];
}) {
  const turnCallsStart = params.calls.length;
  try {
    const { outcome, initialUnexpectedRevealIds } = await executeProposedStep({
      step: params.step,
      index: params.index,
      fixture: params.fixture,
      adventure: params.adventure,
      before: params.session,
      generation: params.generation,
      repeat: params.repeat,
      effort: params.effort,
      model: params.model,
      hardFailures: params.hardFailures,
    });
    return buildSuccessStepResult({
      step: params.step,
      fixture: params.fixture,
      adventure: params.adventure,
      before: params.session,
      outcome,
      initialUnexpectedRevealIds,
      turnCalls: params.calls.slice(turnCallsStart),
      allPackageRecordIds: params.allPackageRecordIds,
      hardFailures: params.hardFailures,
    });
  } catch (cause) {
    return buildFailedStepResult({
      step: params.step,
      fixture: params.fixture,
      before: params.session,
      turnCalls: params.calls.slice(turnCallsStart),
      allPackageRecordIds: params.allPackageRecordIds,
      cause,
      hardFailures: params.hardFailures,
    });
  }
}

function buildAllSteps(
  adventure: AdventureJsonV1,
  fixture: Fixture,
): StepConfig[] {
  const anchor = adventure.scenes[0]!.sourceRef?.anchor;
  return [
    {
      id: "opening",
      playerAction: undefined,
      sourceRefs: anchor ? [anchor] : [],
      expectedBeats: [],
      revealOnSuccess: [],
    },
    ...fixture.runs,
  ];
}

function isRunPassed(
  rubricPassed: boolean,
  hardFailures: string[],
  turnCount: number,
  expectedCount: number,
): boolean {
  if (!rubricPassed) return false;
  if (hardFailures.length > 0) return false;
  return turnCount === expectedCount;
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
  const calls: CallRecord[] = [];
  const generation = createGenerationHarness(proxyUrl, origin, effort, calls);
  let session = await makeSession(fixture, adventure, new Date().toISOString());
  const allPackageRecordIds = [
    ...adventureJsonRecordIds(adventure),
    ...adventure.endings.map((ending) => ending.id),
  ];
  const evaluated: EvaluationTurn[] = [];
  const turnRecords: TurnRecord[] = [];
  const hardFailures: string[] = [];
  const allSteps = buildAllSteps(adventure, fixture);

  for (const [index, step] of allSteps.entries()) {
    const outcome = await runSingleStep({
      step,
      index,
      fixture,
      adventure,
      session,
      generation,
      calls,
      repeat,
      effort,
      model,
      allPackageRecordIds,
      hardFailures,
    });
    session = outcome.nextSession;
    turnRecords.push(outcome.record);
    evaluated.push(outcome.evalTurn);
    if (!outcome.record.committed) break;
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
    passed: isRunPassed(
      rubric.passed,
      hardFailures,
      turnRecords.length,
      allSteps.length,
    ),
  };
}

function computeMedianLatency(calls: CallRecord[]): number {
  if (calls.length === 0) return 0;
  const latencies = calls.map((call) => call.elapsedMs).sort((a, b) => a - b);
  const mid = Math.floor(latencies.length / 2);
  if (latencies.length % 2 === 1) return latencies[mid]!;
  return Math.round((latencies[mid - 1]! + latencies[mid]!) / 2);
}

function sumCallField(
  calls: CallRecord[],
  pick: (call: CallRecord) => number | undefined,
): number {
  return calls.reduce((sum, call) => sum + (pick(call) ?? 0), 0);
}

function summarizeModels(calls: CallRecord[]): string {
  const models = [
    ...new Set(
      calls.map((call) =>
        escapeMarkdownOutput(call.actualModelKey ?? "unknown"),
      ),
    ),
  ];
  return models.join(", ") || "none";
}

function countTurnRepairs(turn: TurnRecord): number {
  const baseCalls = turn.rollSetup ? 2 : 1;
  return turn.repairCount ?? Math.max(0, turn.calls.length - baseCalls);
}

function summarizeRunRow(result: any): string {
  const median = computeMedianLatency(result.calls);
  const models = summarizeModels(result.calls);
  const committedTurns = result.turns.filter(
    (turn: TurnRecord) => turn.committed,
  ).length;
  const rollCount = result.turns.filter(
    (turn: TurnRecord) =>
      Boolean(turn.rollSetup) || turn.proposal.kind === "roll-required",
  ).length;
  const repairCount = result.turns.reduce(
    (sum: number, turn: TurnRecord) => sum + countTurnRepairs(turn),
    0,
  );
  const tokens = `${sumCallField(result.calls, (c) => c.inputTokens)} / ${sumCallField(result.calls, (c) => c.outputTokens)} (${sumCallField(result.calls, (c) => c.reasoningTokens)})`;
  return `| ${result.effort} | ${result.repeat} | ${models} | ${committedTurns}/${result.turns.length} | ${rollCount} | ${repairCount} | ${result.calls.length} | ${median} ms | ${tokens} | ${result.passed ? "PASS" : "FAIL"} | ${result.rubric.passed ? "PASS" : "FAIL"} | ${result.hardFailures.length} |`;
}

function formatTurnRollLines(rollSetup?: RollSetupRecord): string[] {
  if (!rollSetup) return [];
  return [
    `**Roll:** ${escapeMarkdownOutput(rollSetup.uncertainty)}`,
    `**Stakes:** ${escapeMarkdownOutput(rollSetup.stakes)}`,
    `**Recorded outcome:** ${escapeMarkdownOutput(String(rollSetup.outcome.label ?? rollSetup.outcome.value))}`,
    "",
  ];
}

function formatTurnCallLines(calls: CallRecord[]): string[] {
  if (calls.length === 0) return [];
  const models = calls
    .map((call) => escapeMarkdownOutput(call.actualModelKey ?? "unknown"))
    .join(", ");
  const latency = calls.reduce((sum, call) => sum + call.elapsedMs, 0);
  return [`_Model: ${models} · Latency: ${latency} ms_`, ""];
}

function formatTurnBeatLines(
  expectedBeats: TurnRecord["expectedBeats"],
): string[] {
  if (expectedBeats.length === 0) return [];
  return [
    "Expected beats (human review):",
    ...expectedBeats.map((beat) => `- [ ] ${beat.text}`),
    "",
  ];
}

export function escapeMarkdownOutput(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/!\[/g, "\\![");
}

function formatTurnMarkdown(turn: TurnRecord): string[] {
  const narration = turn.narration
    ? escapeMarkdownOutput(turn.narration)
    : "_(no narration)_";
  const lines = [
    `### ${turn.id}`,
    "",
    `**Player:** ${escapeMarkdownOutput(turn.playerAction)}`,
    "",
    `**GM:** ${narration}`,
    "",
  ];
  if (turn.error) {
    lines.push(`> Run note: ${escapeMarkdownOutput(turn.error)}`, "");
  }
  return [
    ...lines,
    ...formatTurnRollLines(turn.rollSetup),
    ...formatTurnCallLines(turn.calls),
    ...formatTurnBeatLines(turn.expectedBeats),
  ];
}

export function formatHardFailuresBlock(hardFailures: string[]): string[] {
  if (hardFailures.length === 0) return [];
  return [
    "### Hard failures",
    "",
    ...hardFailures.map(
      (failure) => `- ${escapeMarkdownOutput(failure.replace(/\r?\n/g, " "))}`,
    ),
    "",
  ];
}

function formatResultSection(result: any): string[] {
  return [
    "",
    `## ${result.effort} effort · repeat ${result.repeat}`,
    "",
    `Run: **${result.passed ? "PASS" : "FAIL"}** · Rubric: **${result.rubric.passed ? "PASS" : "FAIL"}** · Calls: ${result.calls.length} · Hard failures: ${result.hardFailures.length}`,
    "",
    ...formatHardFailuresBlock(result.hardFailures),
    ...result.turns.flatMap(formatTurnMarkdown),
  ];
}

function reportMarkdown(
  fixture: Fixture,
  results: any[],
  proxy: string,
  origin: string,
  runConfig?: { rollOutcome?: SuppliedRollOutcome },
  generatedAt = new Date().toISOString(),
) {
  const caveat = runConfig?.rollOutcome
    ? `> Scripted roll outcome: \`${runConfig.rollOutcome.kind} ${runConfig.rollOutcome.value}\` at every effort level.`
    : "> Baseline caveat: this capture predates scripted roll replay. A turn that requested a roll left the path pending, so later scripted actions are not a continuous playthrough.";

  return [
    `# ${fixture.title.replace(/: Luna effort comparison$/, "")} — live effort comparison`,
    "",
    `Generated: ${generatedAt}  `,
    `Proxy: \`${proxy}\`  `,
    `Origin: \`${origin}\`  `,
    `Adventure: \`${fixture.id}\` · fixed player actions · fresh interaction per run`,
    "",
    "> This report contains model output. Expected-beat reviews remain pending for human assessment; automated rubric scores are safety and state checks, not a prose-quality judge.",
    caveat,
    "",
    "## Summary",
    "",
    "| Effort | Repeat | Actual model(s) | Turns committed | Rolls | Repairs | Calls | Median latency | Tokens in/out (reason) | Run | Rubric | Hard failures |",
    "|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
    ...results.map(summarizeRunRow),
    ...results.flatMap(formatResultSection),
    "## Review guide",
    "",
    ...fixture.scoringGuidance.hardFailures.map((failure) => `- ${failure}`),
    "",
    "Mark expected beats in each transcript as present, partial, or absent. Compare quality within each effort level before choosing a default.",
    "",
  ].join("\n");
}

async function writeReportOnly(
  outputDir: string,
  fixture: Fixture,
): Promise<void> {
  const existing = JSON.parse(
    await readFile(resolve(outputDir, "results.json"), "utf8"),
  );
  if (existing.fixtureId !== fixture.id) {
    throw new Error("Existing results belong to a different fixture.");
  }
  await writeFile(
    resolve(outputDir, "results.md"),
    reportMarkdown(
      fixture,
      existing.results,
      existing.proxy,
      existing.origin,
      existing.runConfig,
      existing.generatedAt,
    ),
  );
  console.log(`Wrote ${resolve(outputDir, "results.md")}`);
}

function logDryRun(
  cli: ReturnType<typeof parseCli>,
  fixture: Fixture,
  adventure: AdventureJsonV1,
): void {
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
}

async function runLiveComparison(
  cli: ReturnType<typeof parseCli>,
  fixture: Fixture,
  adventure: AdventureJsonV1,
): Promise<void> {
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

async function main() {
  const cli = parseCli();
  const { fixture, adventure } = await loadFixture();
  if (cli.reportOnly) {
    await writeReportOnly(cli.output, fixture);
    return;
  }
  if (cli.dryRun) {
    logDryRun(cli, fixture, adventure);
    return;
  }
  await runLiveComparison(cli, fixture, adventure);
}

export { collectForbiddenLeaks, collectUnexpectedReveals, reportMarkdown };

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
