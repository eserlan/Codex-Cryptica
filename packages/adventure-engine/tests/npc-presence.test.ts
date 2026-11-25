import { describe, expect, it } from "vitest";
import {
  applyCompletedTurn,
  projectVisibleState,
  reconcileDuplicateActiveCharacters,
  type AdventureSession,
  type CompletedTurnProposal,
} from "../src";
import { meta, proposal, session } from "./reducer-fixtures";

let counter = 0;
const nextId = () => `id-${++counter}`;

function baseTurn(overrides: Partial<CompletedTurnProposal> = {}) {
  return { ...proposal(), ...overrides };
}

function commit(
  s: AdventureSession,
  turnOverrides: Partial<CompletedTurnProposal>,
  step: number,
): AdventureSession {
  const turnMeta = {
    ...meta,
    turnId: `turn-${step}`,
    inputId: `input-${step}`,
  };
  const res = applyCompletedTurn(
    s,
    baseTurn(turnOverrides),
    turnMeta,
    turnMeta.now,
    nextId,
  );
  if (!res.ok) throw new Error(res.errors.map((e) => e.message).join("; "));
  return res.value;
}

describe("NPC presence deduplication (#5176)", () => {
  it("1. keeps one live presence for companion Mara across market -> office -> alley -> revisit -> leave", () => {
    let s = session();
    s.places = [{ id: "p-market", name: "Market Square" }];
    s.currentPlaceId = "p-market";

    // Turn 1: Mara joins at Market Square
    s = commit(
      s,
      {
        playerAction: "Ask Mara the porter to guide me.",
        narration:
          "Mara, the porter, shoulders her satchel and agrees to guide you.",
        visiblePatch: {
          ...baseTurn().visiblePatch,
          activeCharacters: {
            add: [
              {
                text: "Mara, the porter",
                source: "provisional",
                cues: ["human", "porter"],
              },
            ],
            update: [],
            removeIds: [],
          },
        },
      },
      1,
    );
    expect(s.visibleState.activeCharacters).toHaveLength(1);
    const maraId = s.visibleState.activeCharacters[0]!.id;
    expect(s.visibleState.activeCharacters[0]!.placeId).toBe("p-market");

    // Turn 2: Walk to Office; model re-emits Mara in `add` instead of `update`
    s = commit(
      s,
      {
        playerAction: "Walk to the harbour office with Mara.",
        narration: "Mara walks beside you into the harbour office.",
        moveTo: { name: "Harbour Office" },
        visiblePatch: {
          ...baseTurn().visiblePatch,
          activeCharacters: {
            add: [{ text: "Mara", source: "provisional" }],
            update: [],
            removeIds: [],
          },
        },
      },
      2,
    );
    expect(s.visibleState.activeCharacters).toHaveLength(1);
    expect(s.visibleState.activeCharacters[0]!.id).toBe(maraId);
    expect(s.visibleState.activeCharacters[0]!.placeId).toBe(s.currentPlaceId);
    expect(s.visibleState.activeCharacters[0]!.text).toBe("Mara, the porter");

    // Turn 3: Walk down an alley; model omits Mara from activeCharacters but narration says she accompanies
    s = commit(
      s,
      {
        playerAction: "Head down Tannery Alley.",
        narration:
          "Mara follows you down Tannery Alley, watching the rooftops.",
        moveTo: { name: "Tannery Alley" },
      },
      3,
    );
    expect(s.visibleState.activeCharacters).toHaveLength(1);
    expect(s.visibleState.activeCharacters[0]!.id).toBe(maraId);
    expect(s.visibleState.activeCharacters[0]!.placeId).toBe(s.currentPlaceId);

    // Turn 4: Revisit Market Square with Mara
    s = commit(
      s,
      {
        playerAction: "Return to Market Square with Mara.",
        narration: "You and Mara step back into Market Square.",
        moveTo: { placeId: "p-market" },
        visiblePatch: {
          ...baseTurn().visiblePatch,
          activeCharacters: {
            add: [{ text: "Mara, the porter", source: "provisional" }],
            update: [],
            removeIds: [],
          },
        },
      },
      4,
    );
    expect(s.visibleState.activeCharacters).toHaveLength(1);
    expect(s.visibleState.activeCharacters[0]!.placeId).toBe("p-market");

    // Turn 5: Mara leaves
    s = commit(
      s,
      {
        playerAction: "Thank Mara and part ways.",
        narration: "Mara nods and heads off into the crowd.",
        visiblePatch: {
          ...baseTurn().visiblePatch,
          activeCharacters: {
            add: [],
            update: [],
            removeIds: [maraId],
          },
        },
      },
      5,
    );
    expect(s.visibleState.activeCharacters).toHaveLength(0);
  });

  it("2. reuses existing person identity and presence when re-encountering Mara after a gap", () => {
    let s = session();
    s.places = [
      { id: "p-market", name: "Market" },
      { id: "p-inn", name: "Inn" },
    ];
    s.currentPlaceId = "p-inn";
    s.people = [
      {
        id: "person-mara",
        name: "Mara Vance",
        aliases: ["Mara"],
        linkedFactIds: ["fact-mara-1"],
      },
    ];
    s.visibleState.activeCharacters = [
      {
        id: "char-mara-1",
        text: "Mara Vance",
        source: "provisional",
        placeId: "p-market",
        personId: "person-mara",
      },
    ];

    // Re-encounter Mara at the Inn using only her alias "Mara"
    s = commit(
      s,
      {
        playerAction: "Look around the inn.",
        narration: "Mara Vance waves from a corner table.",
        visiblePatch: {
          ...baseTurn().visiblePatch,
          activeCharacters: {
            add: [{ text: "Mara", source: "provisional" }],
            update: [],
            removeIds: [],
          },
        },
      },
      1,
    );
    expect(s.visibleState.activeCharacters).toHaveLength(1);
    expect(s.visibleState.activeCharacters[0]!.id).toBe("char-mara-1");
    expect(s.visibleState.activeCharacters[0]!.placeId).toBe("p-inn");
    expect(s.visibleState.activeCharacters[0]!.personId).toBe("person-mara");
  });

  it("3. never coalesces two genuinely distinct NPCs who share a first name", () => {
    let s = session();
    s.places = [
      { id: "p-market", name: "Market" },
      { id: "p-gate", name: "North Gate" },
    ];
    s.currentPlaceId = "p-gate";
    s.people = [
      {
        id: "person-mara-1",
        name: "Mara Vance",
        aliases: ["Mara"],
        linkedFactIds: [],
      },
      {
        id: "person-mara-2",
        name: "Mara Thorne",
        aliases: ["Mara"],
        linkedFactIds: [],
      },
    ];
    s.visibleState.activeCharacters = [
      {
        id: "char-mara-1",
        text: "Mara Vance",
        source: "provisional",
        placeId: "p-market",
      },
    ];

    s = commit(
      s,
      {
        playerAction: "Talk to the guard at the gate.",
        narration: "A second woman named Mara stands watch.",
        visiblePatch: {
          ...baseTurn().visiblePatch,
          activeCharacters: {
            add: [{ text: "Mara", source: "provisional" }],
            update: [],
            removeIds: [],
          },
        },
      },
      1,
    );
    expect(s.visibleState.activeCharacters).toHaveLength(2);
  });

  it("4. keeps companion at previous place when she refuses to follow", () => {
    let s = session();
    s.places = [{ id: "p-market", name: "Market" }];
    s.currentPlaceId = "p-market";
    s.visibleState.activeCharacters = [
      {
        id: "char-mara",
        text: "Mara, the porter",
        source: "provisional",
        placeId: "p-market",
      },
    ];

    s = commit(
      s,
      {
        playerAction: "Ask Mara to follow me into the cellar.",
        narration:
          "Mara refuses to follow you down the steps and stays behind in the market.",
        moveTo: { name: "Damp Cellar" },
      },
      1,
    );
    expect(s.currentPlaceId).not.toBe("p-market");
    expect(s.visibleState.activeCharacters).toHaveLength(1);
    expect(s.visibleState.activeCharacters[0]!.placeId).toBe("p-market");
  });

  it("5 & 6. safely reconciles legacy duplicate activeCharacters without deleting history and projects no simultaneous clones", () => {
    const legacy = session();
    legacy.places = [
      { id: "p-market", name: "Market" },
      { id: "p-office", name: "Office" },
    ];
    legacy.currentPlaceId = "p-office";
    legacy.people = [
      {
        id: "person-mara",
        name: "Mara, the porter",
        aliases: ["Mara"],
        linkedFactIds: ["pf-1"],
      },
    ];
    legacy.provisionalFacts = [
      {
        id: "pf-1",
        kind: "person",
        name: "Mara, the porter",
        summary: "Hired at the market.",
        provenance: "play",
        visibility: "player-visible",
      },
    ];
    legacy.visibleState.activeCharacters = [
      {
        id: "old-mara-id",
        text: "Mara, the porter",
        source: "provisional",
        placeId: "p-market",
        cues: ["human", "porter"],
      },
      {
        id: "new-mara-id",
        text: "Mara",
        source: "provisional",
        placeId: "p-office",
      },
    ];

    const reconciledOnce = reconcileDuplicateActiveCharacters(
      legacy.visibleState.activeCharacters,
      legacy.people,
    );
    const reconciledTwice = reconcileDuplicateActiveCharacters(
      reconciledOnce,
      legacy.people,
    );
    expect(reconciledOnce).toEqual(reconciledTwice);
    expect(reconciledOnce).toHaveLength(1);
    expect(reconciledOnce[0]).toMatchObject({
      id: "new-mara-id",
      text: "Mara, the porter",
      placeId: "p-office",
      personId: "person-mara",
      cues: ["human", "porter"],
    });
    expect(legacy.provisionalFacts).toHaveLength(1);

    const projected = projectVisibleState(legacy) as {
      activeCharacters: Array<{ text: string }>;
      elsewhere?: Array<{ id: string; people: string[] }>;
    };
    expect(projected.activeCharacters).toHaveLength(1);
    expect(projected.activeCharacters[0]!.text).toBe("Mara, the porter");
    expect(projected.elsewhere ?? []).toEqual([]);
  });
});
