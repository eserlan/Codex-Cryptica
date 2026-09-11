import { describe, expect, it } from "vitest";
import {
  migrateAdventureSession,
  parseAdventureSession,
  parseTurnProposal,
} from "../src";

describe("adventure schemas", () => {
  it("requires exactly one discriminated player character", () => {
    expect(() => parseAdventureSession({})).toThrow();
  });

  it("allows a roll setup narration longer than an ordinary state field", () => {
    expect(() =>
      parseTurnProposal({
        kind: "roll-required",
        setupNarration: "x".repeat(1_000),
        uncertainty: "Can the crossing hold?",
        stakes: "The flooded road may collapse.",
        sourceRecordIds: [],
      }),
    ).not.toThrow();
  });

  it("accepts new state without model-created IDs and rejects IDs on additions", () => {
    const proposal = {
      kind: "complete",
      narration: "A lantern burns on the ridge.",
      visiblePatch: {
        objectives: { add: [], update: [], removeIds: [] },
        activeCharacters: { add: [], update: [], removeIds: [] },
        knownFacts: {
          add: [
            { text: "A lantern burns on the ridge.", source: "provisional" },
          ],
          update: [],
          removeIds: [],
        },
        relationships: { add: [], update: [], removeIds: [] },
      },
      hiddenPatch: {
        secrets: { add: [], update: [], removeIds: [] },
        gmThreads: { add: [], update: [], removeIds: [] },
      },
      revealSecretIds: [],
      provisionalFacts: [],
      sourceRecordIds: [],
    };
    expect(() => parseTurnProposal(proposal)).not.toThrow();
    expect(() =>
      parseTurnProposal({
        ...proposal,
        visiblePatch: {
          ...proposal.visiblePatch,
          knownFacts: {
            ...proposal.visiblePatch.knownFacts,
            add: [
              {
                id: "model-invented-id",
                text: "A lantern burns on the ridge.",
                source: "provisional",
              },
            ],
          },
        },
      }),
    ).toThrow();
  });

  it("allows an opening roll with no player action", () => {
    const session = parseAdventureSession({
      schemaVersion: 1,
      id: "session-1",
      vaultId: "vault-1",
      title: "Road",
      status: "active",
      createdAt: "2026-08-16T12:00:00.000Z",
      updatedAt: "2026-08-16T12:00:00.000Z",
      lastPlayedAt: "2026-08-16T12:00:00.000Z",
      revision: 1,
      playerCharacter: {
        kind: "provisional",
        name: "Mara",
        description: "Guide",
      },
      premise: "Find the road",
      sourceRecords: [],
      visibleState: {
        objectives: [],
        activeCharacters: [],
        knownFacts: [],
        relationships: [],
      },
      hiddenState: { secrets: [], gmThreads: [] },
      provisionalFacts: [],
      turns: [],
      pendingRoll: {
        id: "roll-1",
        inputId: "input-1",
        playerAction: "",
        uncertainty: "Can Mara cross?",
        stakes: "The road may collapse.",
        resolutionStatus: "awaiting-outcome",
        createdAt: "2026-08-16T12:00:00.000Z",
      },
    });
    expect(session.schemaVersion).toBe(2);
    expect(session.dicePresets).toEqual([]);
    expect(session.resourceCounters).toEqual([]);
  });

  it("rejects unknown future versions without mutating the stored document", () => {
    const future = { schemaVersion: 3, title: "Future adventure" };
    expect(() => migrateAdventureSession(future)).toThrow(
      "incompatible-version",
    );
    expect(future).toEqual({ schemaVersion: 3, title: "Future adventure" });
  });

  it("allows an opening completed turn with no player action", () => {
    const base = {
      schemaVersion: 1,
      id: "session-2",
      vaultId: "vault-1",
      title: "Road",
      status: "active",
      createdAt: "2026-08-16T12:00:00.000Z",
      updatedAt: "2026-08-16T12:00:00.000Z",
      lastPlayedAt: "2026-08-16T12:00:00.000Z",
      revision: 1,
      playerCharacter: {
        kind: "provisional",
        name: "Mara",
        description: "Guide",
      },
      premise: "Find the road",
      sourceRecords: [],
      visibleState: {
        objectives: [],
        activeCharacters: [],
        knownFacts: [],
        relationships: [],
      },
      hiddenState: { secrets: [], gmThreads: [] },
      provisionalFacts: [],
      pendingRoll: null,
    };
    expect(() =>
      parseAdventureSession({
        ...base,
        turns: [
          {
            id: "turn-1",
            sequence: 0,
            inputId: "input-1",
            playerAction: "",
            narration: "The road opens. ".repeat(100),
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
            revealedSecretIds: [],
            sourceRecordIds: [],
            provisionalFactIds: [],
            committedAt: "2026-08-16T12:00:00.000Z",
          },
        ],
      }),
    ).not.toThrow();
  });

  it("keeps previously committed, ID-bearing turn patches readable", () => {
    const session = parseAdventureSession({
      schemaVersion: 1,
      id: "session-3",
      vaultId: "vault-1",
      title: "Road",
      status: "active",
      createdAt: "2026-08-16T12:00:00.000Z",
      updatedAt: "2026-08-16T12:00:00.000Z",
      lastPlayedAt: "2026-08-16T12:00:00.000Z",
      revision: 1,
      playerCharacter: {
        kind: "provisional",
        name: "Mara",
        description: "Guide",
      },
      premise: "Find the road",
      sourceRecords: [],
      visibleState: {
        objectives: [],
        activeCharacters: [],
        knownFacts: [],
        relationships: [],
      },
      hiddenState: { secrets: [], gmThreads: [] },
      provisionalFacts: [],
      pendingRoll: null,
      turns: [
        {
          id: "turn-1",
          sequence: 0,
          inputId: "input-1",
          playerAction: "",
          narration: "A lantern burns on the ridge.",
          visiblePatch: {
            knownFacts: {
              add: [
                {
                  id: "fact-committed",
                  text: "A lantern burns on the ridge.",
                  source: "provisional",
                },
              ],
              update: [],
              removeIds: [],
            },
            objectives: { add: [], update: [], removeIds: [] },
            activeCharacters: { add: [], update: [], removeIds: [] },
            relationships: { add: [], update: [], removeIds: [] },
          },
          hiddenPatch: {
            secrets: { add: [], update: [], removeIds: [] },
            gmThreads: { add: [], update: [], removeIds: [] },
          },
          revealedSecretIds: [],
          sourceRecordIds: [],
          provisionalFactIds: [],
          committedAt: "2026-08-16T12:00:00.000Z",
        },
      ],
    });
    expect(session.turns[0]?.visiblePatch.knownFacts.add[0]?.id).toBe(
      "fact-committed",
    );
  });
});
