import { describe, expect, it } from "vitest";
import { buildAdventurePrompt, parseAdventureSession } from "../src";

const now = "2026-11-02T10:00:00.000Z";

function rawSession() {
  return {
    schemaVersion: 2,
    id: "adventure-1",
    vaultId: "vault-1",
    title: "Lira in Northbrook",
    status: "active",
    createdAt: now,
    updatedAt: now,
    lastPlayedAt: now,
    revision: 0,
    playerCharacter: {
      kind: "canonical",
      recordId: "pc-1",
      name: "Lira",
    },
    premise: "Start in Northbrook and let the player explore freely.",
    sourceRecords: [],
    worldEntry: {
      version: 1,
      location: {
        kind: "canonical",
        recordId: "place-1",
        name: "Northbrook",
      },
      at: { year: 618, precision: "year", calendarRevision: 1 },
      intent: "explore",
    },
    visibleState: {
      location: {
        id: "location-state-1",
        text: "Northbrook",
        source: "canonical",
        sourceRecordId: "place-1",
      },
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
  };
}

describe("world entry session and GM contract", () => {
  it("parses the optional world-entry context and keeps chosen date precision", () => {
    const session = parseAdventureSession(rawSession());
    expect(session.worldEntry?.location).toEqual({
      kind: "canonical",
      recordId: "place-1",
      name: "Northbrook",
    });
    expect(session.worldEntry?.at).toEqual({
      year: 618,
      precision: "year",
      calendarRevision: 1,
    });
    expect(session.visibleState.location?.sourceRecordId).toBe("place-1");
  });

  it("leaves ordinary and older sessions compatible without a world entry", () => {
    const { worldEntry: _worldEntry, ...oldSession } = rawSession();
    expect(parseAdventureSession(oldSession).worldEntry).toBeUndefined();
  });

  it("rejects invalid or unbounded world-entry dates", () => {
    expect(() =>
      parseAdventureSession({
        ...rawSession(),
        worldEntry: {
          ...rawSession().worldEntry,
          at: { year: Number.NaN },
        },
      }),
    ).toThrow();
  });

  it("instructs Oracle to allow quiet exploration and respect chronological context", () => {
    const session = parseAdventureSession(rawSession());
    const prompt = buildAdventurePrompt({
      session,
      phase: "opening",
      anchors: [],
      relevant: [],
    });
    expect(prompt.behavior).toContain("not a pre-written quest");
    expect(prompt.behavior).toContain("undated/uncertain sources");
    expect(prompt.behavior).toContain("Begin with open exploration");
    expect(prompt.behavior).toContain(
      "The opening may weave in one small background sign",
    );
    expect(JSON.parse(prompt.state).worldEntry.at.year).toBe(618);
  });

  it("accepts custom-calendar dates beyond Gregorian month and day bounds", () => {
    const raw = rawSession();
    raw.worldEntry.at = {
      year: 618,
      // @ts-expect-error -- widening the fixture's literal date shape
      month: 13,
      day: 400,
      precision: "day",
    };
    const session = parseAdventureSession(raw);
    expect(session.worldEntry?.at).toMatchObject({ month: 13, day: 400 });
  });

  it("still rejects non-positive and fractional date parts", () => {
    for (const at of [
      { year: 618, month: 0 },
      { year: 618, day: -1 },
      { year: 618, day: 1.5 },
    ]) {
      const raw = rawSession();
      // @ts-expect-error -- deliberately malformed date
      raw.worldEntry.at = at;
      expect(() => parseAdventureSession(raw)).toThrow();
    }
  });
});
