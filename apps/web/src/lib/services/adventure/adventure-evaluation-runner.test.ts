import { describe, expect, it, vi } from "vitest";
import {
  createScenarioState,
  parseAdventureSession,
  type AdventureSession,
  type AdventureTurnProposal,
} from "@codex/adventure-engine";
import {
  AdventureEvaluationRunner,
  adventureEvaluationRunner,
} from "./adventure-evaluation-runner";

const now = "2026-11-10T10:00:00.000Z";

const emptyVisible = {
  objectives: { add: [], update: [], removeIds: [] },
  activeCharacters: { add: [], update: [], removeIds: [] },
  knownFacts: { add: [], update: [], removeIds: [] },
  relationships: { add: [], update: [], removeIds: [] },
};

const emptyHidden = {
  secrets: { add: [], update: [], removeIds: [] },
  gmThreads: { add: [], update: [], removeIds: [] },
};

function completeProposal(
  overrides: Partial<Extract<AdventureTurnProposal, { kind: "complete" }>> = {},
): Extract<AdventureTurnProposal, { kind: "complete" }> {
  return {
    kind: "complete",
    narration: "A quiet breeze moves across the market square.",
    visiblePatch: emptyVisible,
    hiddenPatch: emptyHidden,
    revealSecretIds: [],
    provisionalFacts: [],
    sourceRecordIds: [],
    ...overrides,
  };
}

function makeSession(): AdventureSession {
  return parseAdventureSession({
    schemaVersion: 3,
    id: "eval-session-1",
    vaultId: "vault-1",
    title: "Market Square",
    status: "active",
    createdAt: now,
    updatedAt: now,
    lastPlayedAt: now,
    revision: 0,
    playerCharacter: { kind: "canonical", recordId: "pc-1", name: "Kestrel" },
    premise: "Evening in Oakhaven.",
    sourceRecords: [
      {
        recordId: "pc-1",
        recordType: "character",
        displayName: "Kestrel",
        role: "player-character",
        availability: "available",
      },
      {
        recordId: "loc-1",
        recordType: "location",
        displayName: "Oakhaven Market",
        role: "anchor",
        availability: "available",
      },
    ],
    places: [
      { id: "place-1", name: "Oakhaven Market", sourceRecordId: "loc-1" },
    ],
    currentPlaceId: "place-1",
    scenarioCollection: {
      version: 1,
      focusedScenarioId: null,
      items: [
        {
          ...createScenarioState({
            id: "scen-1",
            origin: { kind: "manual", manualId: "m-1" },
            playerVisible: {
              rumour: "The baker's cart arrived late.",
              lead: "South Gate",
            },
            gmOnly: { truth: "Bandits demanded a toll at the ford." },
          }),
          knowledge: "heard",
          anchorRefs: ["loc-1"],
          revealedSecretIds: [],
          secretBindings: { truth: "truth-1", eventIds: {} },
        },
      ],
    },
    worldTime: { version: 1, elapsedMinutes: 0, events: [] },
    visibleState: {
      objectives: [],
      activeCharacters: [],
      knownFacts: [],
      relationships: [],
    },
    hiddenState: {
      secrets: [{ id: "sec-1", text: "CANARY-TOLL-COIN", status: "hidden" }],
      gmThreads: [
        { id: "thread-1", text: "South Gate watch", status: "hidden" },
      ],
    },
    provisionalFacts: [],
    turns: [],
    pendingRoll: null,
    dicePresets: [],
    resourceCounters: [],
  });
}

describe("AdventureEvaluationRunner", () => {
  it("rejects when using the unconfigured default singleton", async () => {
    await expect(
      adventureEvaluationRunner.run([
        {
          id: "unconfigured",
          session: makeSession(),
          playerAction: "Look around.",
          playerCharacterName: "Kestrel",
          canaries: [],
        },
      ]),
    ).rejects.toThrow("Configure an AdventureTurnGenerationService");
  });

  it("passes grounded context, scores all 6 rubric dimensions, and records deterministic telemetry", async () => {
    let clock = 1_000;
    let hydrations = 0;
    const generate = vi.fn(async (request) => {
      clock += 25;
      if (request.playerAction === "Walk to the South Gate.") {
        return completeProposal({
          narration: "You walk past the stalls toward the South Gate.",
          moveTo: { name: "South Gate" },
          timeAdvance: {
            minutes: 15,
            cause: "Walked to the gate",
            developments: [
              { threadId: "thread-1", text: "Guards close the side wicket." },
            ],
          },
        });
      }
      return completeProposal({
        narration: "Lantern light glints on the timber gatehouse.",
      });
    });

    const grounding = {
      prepare: vi.fn(async ({ session }: { session: AdventureSession }) => {
        hydrations += 2;
        return {
          vaultId: session.vaultId,
          sessionId: session.id,
          revision: session.revision,
          purpose: "action" as const,
          anchors: [
            {
              recordId: "loc-1",
              displayName: "Oakhaven Market",
              content: "A cobbled market square.",
              lore: "GM-ONLY-TUNNEL-BELOW",
              role: "anchor" as const,
            },
          ],
          relevant: [
            {
              recordId: "npc-1",
              displayName: "Warden Hale",
              content: "Keeps the gate ledger.",
              role: "turn-source" as const,
            },
          ],
          sessionKnowledge: {} as any,
        };
      }),
    };

    const runner = new AdventureEvaluationRunner(
      { generate },
      ["stub-provider"],
      {
        grounding,
        now: () => clock,
        getRetrievalHydrations: () => hydrations,
        commitNow: () => "2026-11-10T10:05:00.000Z",
      },
    );

    const results = await runner.run([
      {
        id: "multi-turn-case",
        session: makeSession(),
        playerAction: "Walk to the South Gate.",
        playerCharacterName: "Kestrel",
        canaries: ["CANARY-TOLL-COIN"],
        turns: [
          { playerAction: "Walk to the South Gate." },
          { playerAction: "Inspect the gatehouse." },
        ],
      },
    ]);

    expect(results).toHaveLength(1);
    const [res] = results;
    expect(res!.provider).toBe("stub-provider");
    expect(res!.passed).toBe(true);
    expect(res!.agency).toBe(1);
    expect(res!.secrecy).toBe(1);
    expect(res!.continuity).toBe(1);
    expect(res!.canonSafety).toBe(1);
    expect(res!.consequenceCredibility).toBe(1);
    expect(res!.unnecessaryEscalation).toBe(1);
    expect(res!.telemetry.modelCalls).toBe(2);
    expect(res!.telemetry.retrievalHydrations).toBe(4);
    expect(res!.telemetry.serializedStateChars).toBeGreaterThan(0);
    expect(res!.telemetry.generationInputChars).toBeGreaterThan(
      res!.telemetry.serializedStateChars,
    );
    expect(res!.telemetry.durationMs).toBe(50);
    expect(res!.telemetry.expansionCount).toBe(2); // 1 new place + 1 worldTime event
    expect(generate.mock.calls[0]![0].anchors).toHaveLength(1);
    expect(generate.mock.calls[0]![0].relevant).toHaveLength(1);
  });

  it("commits the supplied outcome once during roll resolution", async () => {
    const suppliedOutcome = {
      kind: "numeric" as const,
      value: 17,
      label: "success",
    };
    const session = parseAdventureSession({
      ...makeSession(),
      pendingRoll: {
        id: "roll-1",
        inputId: "roll-input-1",
        playerAction: "Leap across the gap.",
        uncertainty: "Whether Kestrel can reach the ledge.",
        stakes: "A fall would cause injury.",
        resolutionStatus: "ready-to-resolve",
        suppliedOutcome,
        createdAt: now,
        outcomeRecordedAt: now,
      },
    });
    const runner = new AdventureEvaluationRunner(
      { generate: vi.fn(async () => completeProposal()) },
      ["stub-provider"],
      { commitNow: () => now },
    );

    const [result] = await runner.run([
      {
        id: "roll-resolution-case",
        session,
        playerAction: "The result is 17.",
        playerCharacterName: "Kestrel",
        canaries: [],
        phase: "roll-resolution",
      },
    ]);

    expect(result?.continuity).toBe(1);
    expect(result?.passed).toBe(true);
  });

  it("fails continuity when a roll-resolution proposal cannot be committed", async () => {
    const session = parseAdventureSession({
      ...makeSession(),
      pendingRoll: {
        id: "roll-1",
        inputId: "roll-input-1",
        playerAction: "Leap across the gap.",
        uncertainty: "Whether Kestrel can reach the ledge.",
        stakes: "A fall would cause injury.",
        resolutionStatus: "ready-to-resolve",
        suppliedOutcome: { kind: "numeric", value: 17 },
        createdAt: now,
        outcomeRecordedAt: now,
      },
    });
    const runner = new AdventureEvaluationRunner(
      {
        generate: vi.fn(async () =>
          completeProposal({ narration: "CANARY-TOLL-COIN" }),
        ),
      },
      ["stub-provider"],
      { commitNow: () => now },
    );

    const [result] = await runner.run([
      {
        id: "rejected-roll-resolution-case",
        session,
        playerAction: "The result is 17.",
        playerCharacterName: "Kestrel",
        canaries: ["CANARY-TOLL-COIN"],
        phase: "roll-resolution",
      },
    ]);

    expect(result?.continuity).toBe(0);
    expect(result?.passed).toBe(false);
  });

  it("flags failures for canary/GM-lore leakage, agency override, canon duplication, and unnecessary escalation", async () => {
    const generate = vi.fn(async () =>
      completeProposal({
        narration:
          "Kestrel decides to charge! Suddenly an ambush erupts! CANARY-TOLL-COIN",
        visiblePatch: {
          ...emptyVisible,
          objectives: {
            add: [{ text: "Defeat the bandits", source: "provisional" }],
            update: [],
            removeIds: [],
          },
        },
        provisionalFacts: [
          {
            kind: "place",
            name: "Oakhaven Market",
            summary: "Duplicate canonical location",
            visibility: "player-visible",
          },
        ],
      }),
    );

    const runner = new AdventureEvaluationRunner({ generate }, ["bad-model"]);
    const [res] = await runner.run([
      {
        id: "failing-case",
        session: makeSession(),
        playerAction: "I decline the rumour and rest at the inn.",
        playerCharacterName: "Kestrel",
        canaries: ["CANARY-TOLL-COIN"],
      },
    ]);

    expect(res!.passed).toBe(false);
    expect(res!.agency).toBe(0);
    expect(res!.secrecy).toBe(0);
    expect(res!.canonSafety).toBe(0);
    expect(res!.unnecessaryEscalation).toBe(0);
  });
});
