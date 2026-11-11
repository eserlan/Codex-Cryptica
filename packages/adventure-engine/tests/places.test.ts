import { describe, expect, it } from "vitest";
import {
  applyCompletedTurn,
  buildAdventurePrompt,
  buildAdventureRecap,
  isHere,
  MAX_PLACES,
  parseAdventureSession,
  parseTurnProposal,
  projectVisibleState,
  type AdventureSession,
  type CompletedTurnProposal,
} from "../src";
import { meta, proposal, session } from "./reducer-fixtures";

let counter = 0;
const nextId = () => `gen-${++counter}`;

const fact = (id: string, text: string, placeId?: string) => ({
  id,
  text,
  source: "provisional" as const,
  ...(placeId ? { placeId } : {}),
});

/** A session standing in the lower village with people and facts in two places. */
function placedSession(): AdventureSession {
  const s = session();
  s.places = [
    { id: "p-high", name: "Tiny village" },
    { id: "p-low", name: "Lower village", relation: "below Tiny village" },
  ];
  s.currentPlaceId = "p-low";
  s.visibleState.activeCharacters = [
    fact("c-orra", "Orra the keeper", "p-low"),
    fact("c-pell", "Pell the drinker", "p-low"),
    fact("c-mara", "Mara the traveller", "p-high"),
  ];
  s.visibleState.knownFacts = [
    fact("f-ale", "The alehouse is warm", "p-low"),
    fact("f-bake", "Sela bakes", "p-high"),
    fact("f-free", "It is autumn"),
  ];
  return s;
}

function turn(overrides: Partial<CompletedTurnProposal> = {}) {
  return { ...proposal(), ...overrides };
}

function commit(s: AdventureSession, p: CompletedTurnProposal) {
  const result = applyCompletedTurn(s, p, meta, meta.now, nextId);
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

describe("moving between places", () => {
  it("records a new place, makes it current and tags facts added in the move turn", () => {
    const next = turn({
      moveTo: { name: "Tiny village", relation: "up the track" },
    });
    next.visiblePatch.knownFacts.add = [
      {
        text: "A child carries kindling",
        source: "provisional",
        placeId: "p-high",
      },
    ];
    const after = commit(session(), next);
    const place = after.places?.at(-1);
    expect(place).toMatchObject({
      name: "Tiny village",
      relation: "up the track",
    });
    expect(after.currentPlaceId).toBe(place?.id);
    expect(after.visibleState.knownFacts[0]?.placeId).toBe(place?.id);
  });

  it("reuses a known place by id and by name regardless of case and spacing", () => {
    const byId = commit(
      placedSession(),
      turn({ moveTo: { placeId: "p-high" } }),
    );
    expect(byId.currentPlaceId).toBe("p-high");
    expect(byId.places).toHaveLength(2);
    const byName = commit(
      placedSession(),
      turn({ moveTo: { name: "  tiny   VILLAGE " } }),
    );
    expect(byName.currentPlaceId).toBe("p-high");
    expect(byName.places).toHaveLength(2);
  });

  it("rejects a move to an unknown place id and leaves the session unchanged", () => {
    const before = placedSession();
    const snapshot = structuredClone(before);
    const result = applyCompletedTurn(
      before,
      turn({ moveTo: { placeId: "nowhere" } }),
      meta,
      meta.now,
      nextId,
    );
    expect(result).toMatchObject({
      ok: false,
      errors: [{ code: "conflicting-patch" }],
    });
    expect(before).toEqual(snapshot);
  });

  it("leaves people not mentioned in the move turn at the place left behind", () => {
    const next = turn({ moveTo: { placeId: "p-high" } });
    next.visiblePatch.activeCharacters.update = [
      fact("c-pell", "Pell the drinker, now walking with you", "p-low"),
    ];
    const after = commit(placedSession(), next);
    const byId = Object.fromEntries(
      after.visibleState.activeCharacters.map((c) => [c.id, c.placeId]),
    );
    expect(byId).toEqual({
      "c-orra": "p-low",
      "c-pell": "p-high",
      "c-mara": "p-high",
    });
  });

  it("parks unplaced people at the place left behind", () => {
    const s = placedSession();
    s.visibleState.activeCharacters.push(fact("c-old", "Old hand"));
    const after = commit(s, turn({ moveTo: { placeId: "p-high" } }));
    expect(
      after.visibleState.activeCharacters.find((c) => c.id === "c-old")
        ?.placeId,
    ).toBe("p-low");
  });

  it("keeps an updated fact's place when the player has not moved", () => {
    const next = turn();
    next.visiblePatch.knownFacts.update = [
      fact("f-bake", "Sela bakes rye", "p-low"),
    ];
    const after = commit(placedSession(), next);
    expect(
      after.visibleState.knownFacts.find((f) => f.id === "f-bake")?.placeId,
    ).toBe("p-high");
  });

  it("tags new facts with the current place when no move happens", () => {
    const next = turn();
    next.visiblePatch.activeCharacters.add = [
      { text: "A stranger", source: "provisional" },
    ];
    const after = commit(placedSession(), next);
    expect(after.visibleState.activeCharacters.at(-1)?.placeId).toBe("p-low");
  });

  it("does not fail the turn when the place registry is full", () => {
    const s = placedSession();
    s.places = Array.from({ length: MAX_PLACES }, (_, i) => ({
      id: `p-${i}`,
      name: `Place ${i}`,
    }));
    s.currentPlaceId = "p-0";
    const next = turn({ moveTo: { name: "One place too many" } });
    next.visiblePatch.knownFacts.add = [
      { text: "A fact", source: "provisional" },
    ];
    const after = commit(s, next);
    expect(after.places).toHaveLength(MAX_PLACES);
    expect(after.currentPlaceId).toBeUndefined();
    expect(after.visibleState.knownFacts.at(-1)?.placeId).toBeUndefined();
  });

  it("keeps place-tagged state scoped when the player is unplaced at capacity", () => {
    const s = placedSession();
    s.places = Array.from({ length: MAX_PLACES }, (_, i) => ({
      id: `p-${i}`,
      name: `Place ${i}`,
    }));
    delete s.currentPlaceId;
    s.visibleState.activeCharacters = [
      fact("c-away", "A person elsewhere", "p-0"),
      fact("c-global", "A person everywhere"),
    ];
    s.visibleState.knownFacts = [
      fact("f-away", "A fact elsewhere", "p-1"),
      fact("f-global", "A fact everywhere"),
    ];

    const promptState = projectVisibleState(s) as Record<string, any>;
    expect(
      promptState.activeCharacters.map((person: any) => person.id),
    ).toEqual(["c-global"]);
    expect(promptState.knownFacts.map((item: any) => item.id)).toEqual([
      "f-global",
    ]);
    expect(promptState).not.toHaveProperty("currentPlace");
    expect(promptState.elsewhere).toEqual([
      {
        id: "p-0",
        name: "Place 0",
        people: ["A person elsewhere"],
        facts: [],
      },
      {
        id: "p-1",
        name: "Place 1",
        people: [],
        facts: ["A fact elsewhere"],
      },
    ]);

    const recap = buildAdventureRecap(s);
    expect(recap.activeCharacters.map((person) => person.id)).toEqual([
      "c-global",
    ]);
    expect(recap.knownFacts.map((item) => item.id)).toEqual(["f-global"]);
  });

  it("never reuses an existing place id for a new place", () => {
    const ids = ["p-high", "p-fresh"];
    const result = applyCompletedTurn(
      placedSession(),
      turn({ moveTo: { name: "The mill" } }),
      meta,
      meta.now,
      () => ids.shift() ?? "late",
    );
    if (!result.ok) throw new Error("Expected turn");
    expect(result.value.places?.map((place) => place.id)).toEqual([
      "p-high",
      "p-low",
      "p-fresh",
    ]);
    expect(result.value.currentPlaceId).toBe("p-fresh");
  });
});

describe("sessions from before places existed", () => {
  it("parses and commits with no places, and no place data is invented", () => {
    const legacy = session();
    expect(legacy.places).toBeUndefined();
    const after = commit(legacy, turn());
    expect(after.places).toBeUndefined();
    expect(after.currentPlaceId).toBeUndefined();
    expect(after.schemaVersion).toBe(3);
  });

  it("seeds the first place from the world entry when the first move happens", () => {
    const s = session();
    s.worldEntry = {
      version: 1,
      location: { kind: "canonical", recordId: "rec-1", name: "Nombe" },
      intent: "explore",
    };
    const after = commit(s, turn({ moveTo: { name: "Tiny village" } }));
    expect(after.places?.[0]).toMatchObject({
      name: "Nombe",
      sourceRecordId: "rec-1",
    });
    expect(after.places).toHaveLength(2);
  });

  it("seeds from the current location text when there is no world entry", () => {
    const s = session();
    s.visibleState.location = fact("loc", "A crossroads inn");
    s.visibleState.activeCharacters = [fact("c-host", "The host")];
    const after = commit(s, turn({ moveTo: { name: "The market" } }));
    expect(after.places?.[0]?.name).toBe("A crossroads inn");
    expect(
      after.visibleState.activeCharacters.find((c) => c.id === "c-host")
        ?.placeId,
    ).toBe(after.places?.[0]?.id);
  });

  it("round-trips places through a saved session", () => {
    const saved = JSON.parse(JSON.stringify(placedSession()));
    expect(parseAdventureSession(saved).places).toHaveLength(2);
  });
});

describe("move proposal validation", () => {
  const base = () => JSON.parse(JSON.stringify(proposal()));

  it.each([
    ["no placeId or name", {}],
    ["an empty name", { name: "   " }],
    ["an over-long name", { name: "x".repeat(121) }],
    ["an unknown field", { name: "A", extra: true }],
  ])("rejects a move with %s", (_label, moveTo) => {
    expect(() => parseTurnProposal({ ...base(), moveTo })).toThrow();
  });

  it("accepts a move by id or by name", () => {
    expect(() =>
      parseTurnProposal({ ...base(), moveTo: { placeId: "p-1" } }),
    ).not.toThrow();
    expect(() =>
      parseTurnProposal({ ...base(), moveTo: { name: "The mill" } }),
    ).not.toThrow();
  });
});

describe("what the model and the player see", () => {
  it("sends here-and-unplaced items in full and the rest as short notes by place", () => {
    const view = projectVisibleState(placedSession()) as Record<string, any>;
    expect(view.activeCharacters.map((c: any) => c.id)).toEqual([
      "c-orra",
      "c-pell",
    ]);
    expect(view.knownFacts.map((f: any) => f.id)).toEqual(["f-ale", "f-free"]);
    expect(view.activeCharacters[0]).not.toHaveProperty("placeId");
    expect(view.currentPlace).toEqual({
      id: "p-low",
      name: "Lower village",
      relation: "below Tiny village",
    });
    expect(view.knownPlaces).toHaveLength(2);
    expect(view.elsewhere).toEqual([
      {
        id: "p-high",
        name: "Tiny village",
        people: ["Mara the traveller"],
        facts: ["Sela bakes"],
      },
    ]);
  });

  it("limits other places to 5 short notes of 120 characters each", () => {
    const s = placedSession();
    s.visibleState.knownFacts = Array.from({ length: 9 }, (_, i) =>
      fact(`f-${i}`, `${"x".repeat(200)}${i}`, "p-high"),
    );
    const view = projectVisibleState(s) as Record<string, any>;
    const notes = view.elsewhere[0].facts as string[];
    expect(notes).toHaveLength(5);
    expect(notes.every((n) => n.length <= 120)).toBe(true);
  });

  it("sends a legacy session with no place registry unchanged", () => {
    const legacy = session();
    expect(projectVisibleState(legacy)).toBe(legacy.visibleState);
  });

  it("puts the projection and the move rule in the prompt", () => {
    const prompt = buildAdventurePrompt({
      session: placedSession(),
      phase: "action",
      playerAction: "Look around",
      anchors: [],
      relevant: [],
    });
    expect(prompt.state).toContain('"currentPlace"');
    expect(prompt.state).not.toContain('Mara the traveller","source');
    expect(prompt.behavior).toContain("set moveTo");
  });

  it("limits the player's who-is-here list to the current place", () => {
    const recap = buildAdventureRecap(placedSession());
    expect(recap.activeCharacters.map((c) => c.id)).toEqual([
      "c-orra",
      "c-pell",
    ]);
    expect(recap.knownFacts.map((f) => f.id)).toEqual(["f-ale", "f-free"]);
  });

  it("treats unplaced and legacy facts as present everywhere", () => {
    expect(isHere({}, placedSession())).toBe(true);
    expect(isHere({ placeId: "p-high" }, session())).toBe(true);
    expect(isHere({ placeId: "p-high" }, placedSession())).toBe(false);
    const unplaced = placedSession();
    delete unplaced.currentPlaceId;
    expect(isHere({ placeId: "p-high" }, unplaced)).toBe(false);
  });
});
