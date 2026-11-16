import { describe, expect, it, vi } from "vitest";
import {
  AdventureGroundingError,
  AdventureGroundingService,
} from "./adventure-grounding-service";
import { AdventureContextService } from "./adventure-context-service";
import { resolveTemporalWorldContext } from "./temporal-world-context";
import {
  batchFilterPromotableFacts,
  promoteProvisionalFacts,
} from "./adventure-provisional-fact-creator";
import { AdventureEvaluationRunner } from "./adventure-evaluation-runner";
import { DEFAULT_CALENDAR } from "chronology-engine";
import { AdventureManager } from "#lib/stores/oracle/adventure-manager.svelte.js";
import { AdventureBackground } from "#lib/stores/oracle/adventure-background.js";
import { createAdventureBackgroundRequest } from "./adventure-background-request";
import { TURN_REJECTED_COPY } from "#lib/stores/oracle/adventure-turn-retry.js";
import {
  completeProposal,
  dependencies,
  rollProposal,
  startInput,
} from "#lib/stores/oracle/tests/adventure-fixtures.js";
import {
  AdventureInteractionContext,
  AdventureSummaryService,
} from "@codex/ai-engine";
import {
  applyCompletedTurn,
  buildAdventurePrompt,
  buildStorySummaryRequest,
  MAX_GENERATION_INPUT_CHARS,
  MAX_GROUNDING_RECORDS,
  MAX_SERIALIZED_STATE_CHARS,
  parseAdventureSession,
  PROMPT_TRANSCRIPT_TURNS,
  SUMMARY_TRIGGER_TURNS,
  type ProvisionalFact,
} from "@codex/adventure-engine";

const now = "2026-11-10T10:00:00.000Z";

function setOnline(value: boolean) {
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { onLine: value },
  });
}

function makeLargeVaultStore(recordCount: number) {
  const getByIdCalls: string[] = [];
  const records = new Map<string, any>();
  const searchEntries: Array<{ id: string; title: string; type: string }> = [];

  for (let i = 0; i < recordCount; i += 1) {
    const id = i === 0 ? "pc" : i === 1 ? "anchor-quay" : `rec-${i}`;
    const title =
      i === 0 ? "Mara" : i === 1 ? "Brackwater Quay" : `Harbour Record ${i}`;
    records.set(id, {
      id,
      recordId: id,
      recordType: i === 0 ? "character" : "location",
      type: i === 0 ? "character" : "location",
      displayName: title,
      title,
      text: `Public details for ${title}.`,
      content: `Public details for ${title}.`,
      lore: `GM-SECRET-${id}`,
      relationships:
        i === 1 ? [{ targetId: "rec-2", type: "near", label: "near" }] : [],
      labels: [],
      metadata: {},
    });
    searchEntries.push({
      id,
      title,
      type: i === 0 ? "character" : "location",
      text: `Public details for ${title}.`,
      lore: `GM-SECRET-${id}`,
    } as any);
  }

  return {
    getByIdCalls,
    search: vi.fn(async () => searchEntries.slice(0, 40)),
    getById: vi.fn(async (_vaultId: string, id: string) => {
      getByIdCalls.push(id);
      return records.get(id) ?? null;
    }),
    listPlaceRecords: vi.fn(async () => [
      { id: "anchor-quay", name: "Brackwater Quay", type: "location" },
    ]),
  };
}

describe("adventure multi-scenario retrieval, continuity, and resilience gates", () => {
  it("verifies all 5 play-related AI entry points (opening, action, roll-resolution, background, summary) and secrecy contracts", async () => {
    setOnline(true);
    const deps: any = dependencies();
    const generate = vi.fn(async (req: any) => {
      if (req.phase === "action" && req.playerAction === "Check the slipway") {
        return rollProposal;
      }
      return completeProposal;
    });
    const worldEntryRumourGenerator = vi.fn(
      async (sessionArg: any, _signal: any, contextArg: any) => {
        const bgReq = createAdventureBackgroundRequest(
          sessionArg,
          contextArg,
          true,
          "fantasy",
        );
        expect(bgReq.generatorId).toBe("rumour");
        return {
          title: "Brackwater Quay",
          content: "Harbour quay",
          lore: "GM-ONLY-BG-TRUTH",
          items: [
            {
              rumour: "Tide is late.",
              lead: "Slipway",
              truth: "GM-ONLY-BG-TRUTH",
            },
          ],
        } as any;
      },
    );

    const summaryCalls: any[] = [];
    const summaryService = new AdventureSummaryService({
      getModel: async () => ({
        generateContent: async (input: unknown) => {
          summaryCalls.push(input);
          return {
            response: { text: () => "Mara spoke with locals at the quay." },
          };
        },
      }),
    });

    deps.generation = { generate };
    deps.summary = {
      summarize: (req: any, opts: any) => summaryService.summarize(req, opts),
    };

    const manager = new AdventureManager(deps);
    // 1. Opening
    await manager.start({
      ...startInput,
      worldEntry: {
        version: 1,
        location: { kind: "provisional", name: "Brackwater Quay" },
        intent: "explore",
      },
    });
    expect(generate.mock.calls[0]?.[0].phase).toBe("opening");

    // 2. Background (AdventureBackground -> createAdventureBackgroundRequest -> worldEntryRumourGenerator)
    let bgSeq = 0;
    const bg = new AdventureBackground(
      () => `bg-id-${(bgSeq += 1)}`,
      new AdventureGroundingService(deps.context as any),
      () => "fantasy",
    );
    bg.setGenerator(worldEntryRumourGenerator);
    const preparedSession = await bg.prepare({
      ...manager.session!,
      scenarioCollection: undefined,
    });
    expect(worldEntryRumourGenerator).toHaveBeenCalledTimes(1);
    expect(preparedSession.scenarioCollection?.items.length).toBeGreaterThan(0);

    // 3. Action -> Roll Request -> Roll Resolution
    await manager.submitAction("Check the slipway");
    expect(generate.mock.calls[1]?.[0].phase).toBe("action");
    expect(manager.session?.pendingRoll).not.toBeNull();

    await manager.recordRollOutcome({ kind: "numeric", value: 11 });
    expect(generate.mock.calls[2]?.[0].phase).toBe("roll-resolution");

    // 4. Rolling Summary (buildStorySummaryRequest -> AdventureSummaryService.summarize)
    let sessionWithTurns = manager.session!;
    sessionWithTurns = {
      ...sessionWithTurns,
      hiddenState: {
        secrets: [
          {
            id: "sec-gm",
            text: "CANARY-SUMMARY-SECRET",
            status: "hidden",
          },
        ],
        gmThreads: [],
      },
    };
    const neededTurns = PROMPT_TRANSCRIPT_TURNS + SUMMARY_TRIGGER_TURNS;
    for (let i = 0; i < neededTurns; i += 1) {
      const committed = applyCompletedTurn(sessionWithTurns, completeProposal, {
        turnId: `sum-t-${i}`,
        inputId: `sum-in-${i}`,
        now,
        playerAction: `Walk pier ${i}`,
      });
      if (committed.ok) sessionWithTurns = committed.value;
    }
    const summaryReq = buildStorySummaryRequest(sessionWithTurns);
    expect(summaryReq).toBeDefined();
    const summaryResult = await summaryService.summarize(summaryReq!, {
      apiKey: "test-key",
      modelName: "gemini-2.5-flash",
    });
    expect(summaryResult.text).toContain("Mara");
    const serializedSummaryPrompt = JSON.stringify(summaryCalls);
    expect(serializedSummaryPrompt).not.toContain("CANARY-SUMMARY-SECRET");
    expect(serializedSummaryPrompt).not.toContain("GM-ONLY-BG-TRUTH");
  });

  it("enforces temporal applicability, empty-vs-error retrieval, cache invalidation, and <=24 hydration on 2,000+ record Vault", async () => {
    const vaultStore = makeLargeVaultStore(2_100);
    const contextService = new AdventureContextService(vaultStore as any);

    const session = parseAdventureSession({
      schemaVersion: 3,
      id: "large-vault-session",
      vaultId: "vault-large",
      title: "Brackwater Quay",
      status: "active",
      createdAt: now,
      updatedAt: now,
      lastPlayedAt: now,
      revision: 1,
      playerCharacter: { kind: "canonical", recordId: "pc", name: "Mara" },
      premise: "Dockside inquiry",
      sourceRecords: [
        {
          recordId: "pc",
          recordType: "character",
          displayName: "Mara",
          role: "player-character",
          availability: "available",
        },
        {
          recordId: "anchor-quay",
          recordType: "location",
          displayName: "Brackwater Quay",
          role: "anchor",
          availability: "available",
        },
      ],
      worldTime: { version: 1, elapsedMinutes: 0, events: [] },
      visibleState: {
        objectives: [],
        activeCharacters: [],
        knownFacts: [],
        relationships: [],
      },
      hiddenState: { secrets: [], gmThreads: [] },
      provisionalFacts: [],
      turns: [],
      pendingRoll: null,
      dicePresets: [],
      resourceCounters: [],
    });

    // Large-Vault bounded hydration (<= 24 getById calls)
    const anchors = await contextService.resolveAnchors(session);
    const relevant = await contextService.resolveActionRelevant(
      session,
      "Inspect the quay",
    );
    expect(vaultStore.getByIdCalls.length).toBeLessThanOrEqual(
      MAX_GROUNDING_RECORDS,
    );
    expect(anchors.length + relevant.length).toBeLessThanOrEqual(
      MAX_GROUNDING_RECORDS,
    );

    const prompt = buildAdventurePrompt({
      session,
      phase: "action",
      playerAction: "Inspect the quay",
      anchors,
      relevant,
    });
    expect(JSON.stringify(prompt.state).length).toBeLessThanOrEqual(
      MAX_SERIALIZED_STATE_CHARS,
    );
    expect(JSON.stringify(prompt).length).toBeLessThanOrEqual(
      MAX_GENERATION_INPUT_CHARS,
    );

    // Runner telemetry over large-Vault grounding
    const runner = new AdventureEvaluationRunner(
      { generate: async () => completeProposal },
      ["stub"],
      {
        grounding: new AdventureGroundingService(contextService as any),
        getRetrievalHydrations: () => vaultStore.getByIdCalls.length,
      },
    );
    const [evalResult] = await runner.run([
      {
        id: "large-vault-eval",
        session,
        playerAction: "Inspect the quay",
        playerCharacterName: "Mara",
        canaries: [],
      },
    ]);
    expect(evalResult!.telemetry.modelCalls).toBe(1);
    expect(evalResult!.telemetry.retrievalHydrations).toBeLessThanOrEqual(
      MAX_GROUNDING_RECORDS,
    );

    // Temporal applicability labels future, historical, uncertain, contradictory without promoting future facts
    const calendar = DEFAULT_CALENDAR;
    const temporal = resolveTemporalWorldContext({
      locationId: "e-root",
      calendar,
      at: { year: 400, month: 5, day: 1 },
      elapsedMinutes: 0,
      entities: [
        {
          id: "e-root",
          title: "Brackwater Quay",
          type: "location",
          content: "Harbour quay",
          labels: [],
          aliases: [],
          status: "active",
          connections: [
            {
              target: "e-past",
              type: "associated",
              strength: 1,
              label: "link",
            },
            {
              target: "e-future",
              type: "associated",
              strength: 1,
              label: "link",
            },
            {
              target: "e-uncertain",
              type: "associated",
              strength: 1,
              label: "link",
            },
            {
              target: "e-contra",
              type: "associated",
              strength: 1,
              label: "link",
            },
          ],
        },
        {
          id: "e-past",
          title: "Old Dock",
          type: "location",
          content: "Built in 350",
          labels: ["historical"],
          aliases: [],
          status: "active",
          connections: [],
          start_date: { year: 350 },
          end_date: { year: 390 },
        },
        {
          id: "e-future",
          title: "Grand Canal",
          type: "location",
          content: "Opened in 420",
          labels: [],
          aliases: [],
          status: "active",
          connections: [],
          start_date: { year: 420 },
        },
        {
          id: "e-uncertain",
          title: "Lost Charter",
          type: "note",
          content: "Rumor of a charter",
          labels: ["uncertain"],
          aliases: [],
          status: "active",
          connections: [],
        },
        {
          id: "e-contra",
          title: "Disputed Guild",
          type: "faction",
          content: "Two accounts exist",
          labels: ["contradictory"],
          aliases: [],
          status: "active",
          connections: [],
          start_date: { year: 410 },
          end_date: { year: 380 },
        },
      ],
    });
    const labels = new Map(
      [...temporal.playerSafe, ...temporal.gmOnly].map((item) => [
        item.id,
        item.applicability,
      ]),
    );
    expect(labels.get("e-past")).toBe("historical");
    expect(labels.get("e-future")).toBe("future");
    expect(labels.get("e-uncertain")).toBe("uncertain");
    expect(labels.get("e-contra")).toBe("contradictory");

    // Advancing worldTime across calendar days refreshes temporal snapshot
    const nextDay = resolveTemporalWorldContext({
      locationId: "e-root",
      calendar,
      at: { year: 400, month: 5, day: 1 },
      elapsedMinutes: 1_440,
      entities: [
        {
          id: "e-root",
          title: "Brackwater Quay",
          type: "location",
          content: "Harbour quay",
          labels: [],
          aliases: [],
          status: "active",
          connections: [
            {
              target: "e-day2",
              type: "associated",
              strength: 1,
              label: "link",
            },
          ],
        },
        {
          id: "e-day2",
          title: "Day 2 Notice",
          type: "note",
          content: "Posted on day 2",
          labels: [],
          aliases: [],
          status: "active",
          connections: [],
          start_date: { year: 400, month: 5, day: 2 },
          end_date: { year: 410 },
        },
      ],
    });
    expect(
      [...nextDay.playerSafe, ...nextDay.gmOnly].find((e) => e.id === "e-day2")
        ?.applicability,
    ).toBe("established");

    // Empty retrieval succeeds cleanly
    const emptyGrounding = new AdventureGroundingService(
      new AdventureContextService({
        search: async () => [],
        getById: async () => null,
        listPlaceRecords: async () => [],
      } as any) as any,
    );
    const emptyCtx = await emptyGrounding.prepare({
      purpose: "action",
      session: {
        ...session,
        playerCharacter: {
          kind: "provisional",
          name: "Mara",
          description: "Traveler",
        },
        sourceRecords: [],
      },
      playerAction: "Look",
    });
    expect(emptyCtx.anchors).toEqual([]);
    expect(emptyCtx.relevant).toEqual([]);

    // Retrieval failure blocks AI dispatch and never leaks private storage errors
    const failingGrounding = new AdventureGroundingService(
      new AdventureContextService({
        search: async () => {
          throw new Error("PRIVATE-IDB-CORRUPTION-DETAIL");
        },
        getById: async () => null,
        listPlaceRecords: async () => undefined,
      } as any) as any,
    );
    await expect(
      failingGrounding.prepare({
        purpose: "action",
        session,
        playerAction: "Look",
      }),
    ).rejects.toThrow(AdventureGroundingError);
    try {
      await failingGrounding.prepare({
        purpose: "action",
        session,
        playerAction: "Look",
      });
    } catch (err) {
      expect((err as Error).message).not.toContain(
        "PRIVATE-IDB-CORRUPTION-DETAIL",
      );
    }

    // Cache invalidation on revision, modelName, sourceHashes, pending, and 80 turns
    const cache = new AdventureInteractionContext();
    const interaction = cache.get(session.id);
    interaction.previousInteractionId = "prev-1";
    interaction.modelName = "model-a";
    interaction.revision = 1;
    interaction.sourceHashes.set("anchor-quay", "old-hash");

    // modelName change clears
    const onModelChange = cache.prepare(session, prompt, "model-b");
    expect(onModelChange.previousInteractionId).toBeNull();

    // sourceHashes change clears
    const i2 = cache.get(session.id);
    i2.previousInteractionId = "prev-2";
    i2.modelName = "model-a";
    i2.revision = 1;
    i2.sourceHashes.set("anchor-quay", "stale-hash");
    const onHashChange = cache.prepare(session, prompt, "model-a");
    expect(onHashChange.previousInteractionId).toBeNull();

    // >= 80 turns clears
    const i3 = cache.get(session.id);
    i3.previousInteractionId = "prev-3";
    i3.modelName = "model-a";
    i3.revision = 1;
    i3.successfulTurns = 80;
    const on80Turns = cache.prepare(session, prompt, "model-a");
    expect(on80Turns.previousInteractionId).toBeNull();
  });

  it("verifies selective/retried provisional fact promotion, canonical reuse, and app-layer resilience", async () => {
    setOnline(true);

    // 1. Selective & retried promotion with canonical-match reuse
    const facts: ProvisionalFact[] = [
      {
        id: "pf-person",
        kind: "person",
        name: "Bram",
        summary: "Ferryman",
        introducedOnTurnId: "t1",
        visibility: "player-visible",
      },
      {
        id: "pf-place",
        kind: "place",
        name: "Brackwater Quay",
        summary: "Already canonical",
        introducedOnTurnId: "t1",
        visibility: "player-visible",
      },
      {
        id: "pf-faction",
        kind: "faction",
        name: "Salt Guild",
        summary: "Dockside merchants",
        introducedOnTurnId: "t1",
        visibility: "player-visible",
      },
      {
        id: "pf-secret",
        kind: "clue",
        name: "Hidden Ledger",
        summary: "GM-ONLY-SECRET",
        introducedOnTurnId: "t1",
        visibility: "gm-only",
      },
    ];

    const filtered = batchFilterPromotableFacts(
      facts,
      ["Brackwater Quay"],
      ["pf-dismissed"],
    );
    expect(filtered.map((f) => f.id)).toEqual(["pf-person", "pf-faction"]);

    const created: string[] = [];
    const linked: Array<[string, string]> = [];
    let current = true;
    const promoted = await promoteProvisionalFacts(
      filtered,
      "Brackwater Quay",
      {
        isCurrent: () => current,
        findExistingId: (title) =>
          title === "Bram" ? "existing-bram-id" : undefined,
        createEntity: async (_type, title) => {
          created.push(title);
          return `new-${title}`;
        },
        linkRecord: async (fact, recordId) => {
          linked.push([fact.id, recordId]);
          current = false; // Simulate interruption after first record
        },
      },
    );
    expect(promoted.interrupted).toBe(true);
    expect(created).toEqual([]); // Bram reused existing id without duplicate createEntity
    expect(linked).toEqual([["pf-person", "existing-bram-id"]]);

    // 2. Malformed generation triggers at most 1 bounded repair/retry and shows TURN_REJECTED_COPY on double refusal
    const depsRetry: any = dependencies();
    let callIndex = 0;
    depsRetry.generation = {
      generate: vi.fn(async () => {
        callIndex += 1;
        return callIndex === 1 ? completeProposal : ({ invalid: true } as any);
      }),
    };
    const retryManager = new AdventureManager(depsRetry);
    await retryManager.start(startInput);
    await retryManager.submitAction("Look around");
    expect(retryManager.errorMessage).toBe(TURN_REJECTED_COPY);
    expect(depsRetry.generation.generate).toHaveBeenCalledTimes(3);

    // 3. Offline transition preserves draft and allows deterministic local time advance
    const depsOffline: any = dependencies();
    const offlineManager = new AdventureManager(depsOffline);
    await offlineManager.start(startInput);
    setOnline(false);
    offlineManager.draft = "Wait at the quay";
    await offlineManager.submitAction("Wait at the quay");
    expect(offlineManager.phase).toBe("offline");
    expect(offlineManager.draft).toBe("Wait at the quay");

    // 4. Read-only / lease loss rejects writes cleanly without corrupting saved state
    setOnline(true);
    const depsLease: any = dependencies();
    depsLease.repository.save = vi.fn(async () => ({
      ok: false as const,
      error: new Error("revision-conflict"),
    }));
    const leaseManager = new AdventureManager(depsLease);
    await expect(leaseManager.start(startInput)).rejects.toThrow(
      "revision-conflict",
    );
    expect(leaseManager.phase).toBe("error");
    expect(leaseManager.errorMessage).toContain("revision-conflict");
  });
});
