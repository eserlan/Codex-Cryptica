import { describe, expect, it } from "bun:test";
import {
  countHexRecords,
  getHexRecord,
  normalizeHexCrawlState,
  parseHexKey,
  pruneHexRecord,
  toHexKey,
  upsertHexRecord,
  type HexCrawlState,
  type HexRecord,
} from "../src/model";

const NOW = 1_700_000_000_000;
const empty: HexCrawlState = { enabled: false, hexes: {} };

describe("hex keys (T005)", () => {
  it("round-trips a coordinate through its key", () => {
    expect(toHexKey({ q: 4, r: -2 })).toBe("4,-2");
    expect(parseHexKey("4,-2")).toEqual({ q: 4, r: -2 });
  });

  it("returns null for malformed keys", () => {
    for (const key of ["1", "a,b", "1.5,2", "", "1,2,3", "NaN,1"]) {
      expect(parseHexKey(key), key).toBeNull();
    }
  });
});

describe("normalizeHexCrawlState (T005)", () => {
  it("never throws on junk input and returns a disabled empty state", () => {
    for (const raw of [null, undefined, [], "x", 42, { hexes: "no" }]) {
      expect(normalizeHexCrawlState(raw)).toEqual(empty);
    }
  });

  it("drops invalid keys and invalid records, keeps valid ones", () => {
    const state = normalizeHexCrawlState({
      enabled: true,
      hexes: {
        "1,2": { terrain: { kind: "preset", id: "forest" }, explored: true },
        bogus: { explored: true },
        "3,4": "not a record",
        "5,6": { notes: 123 },
      },
    });
    expect(state.enabled).toBe(true);
    expect(Object.keys(state.hexes)).toEqual(["1,2"]);
    expect(state.hexes["1,2"].explored).toBe(true);
  });

  it("clamps notes and aiNotes to 20,000 characters", () => {
    const long = "x".repeat(25_000);
    const state = normalizeHexCrawlState({
      enabled: false,
      hexes: { "1,1": { notes: long, aiNotes: long } },
    });
    expect(state.hexes["1,1"].notes).toHaveLength(20_000);
    expect(state.hexes["1,1"].aiNotes).toHaveLength(20_000);
  });
});

describe("upsertHexRecord (T005)", () => {
  it("is immutable: the input state is not changed", () => {
    const before = JSON.stringify(empty);
    upsertHexRecord(empty, { q: 1, r: 1 }, { notes: "hi" }, NOW);
    expect(JSON.stringify(empty)).toBe(before);
  });

  it("sets updatedAt on every change", () => {
    const state = upsertHexRecord(empty, { q: 1, r: 1 }, { notes: "hi" }, NOW);
    expect(getHexRecord(state, { q: 1, r: 1 })?.updatedAt).toBe(NOW);
  });

  it("sets exploredAt only when a hex first becomes explored", () => {
    const first = upsertHexRecord(
      empty,
      { q: 0, r: 0 },
      { explored: true },
      NOW,
    );
    expect(getHexRecord(first, { q: 0, r: 0 })?.exploredAt).toBe(NOW);
    const again = upsertHexRecord(
      first,
      { q: 0, r: 0 },
      { explored: true },
      NOW + 5000,
    );
    expect(getHexRecord(again, { q: 0, r: 0 })?.exploredAt).toBe(NOW);
  });

  it("clears exploredAt when a hex is marked unexplored", () => {
    const explored = upsertHexRecord(
      empty,
      { q: 0, r: 0 },
      { explored: true },
      NOW,
    );
    const cleared = upsertHexRecord(
      explored,
      { q: 0, r: 0 },
      { explored: false },
      NOW + 1,
    );
    expect(getHexRecord(cleared, { q: 0, r: 0 })?.exploredAt).toBeUndefined();
  });

  it("removes the key when the record no longer meets the existence rule", () => {
    const withNote = upsertHexRecord(
      empty,
      { q: 2, r: 2 },
      { notes: "a" },
      NOW,
    );
    const cleared = upsertHexRecord(
      withNote,
      { q: 2, r: 2 },
      { notes: "" },
      NOW + 1,
    );
    expect(cleared.hexes["2,2"]).toBeUndefined();
  });
});

describe("pruneHexRecord (T005)", () => {
  it("keeps a record that has terrain, notes, aiNotes, explored or a draft", () => {
    const base: HexRecord = { updatedAt: NOW };
    expect(
      pruneHexRecord({ ...base, terrain: { kind: "custom", label: "Ash" } }),
    ).not.toBeNull();
    expect(pruneHexRecord({ ...base, notes: "x" })).not.toBeNull();
    expect(pruneHexRecord({ ...base, aiNotes: "x" })).not.toBeNull();
    expect(pruneHexRecord({ ...base, explored: true })).not.toBeNull();
  });

  it("returns null for a record with nothing left", () => {
    expect(pruneHexRecord({ updatedAt: NOW, notes: "" })).toBeNull();
  });
});

describe("countHexRecords (T005)", () => {
  it("counts records and returns 0 for undefined", () => {
    expect(countHexRecords(undefined)).toBe(0);
    const state = upsertHexRecord(empty, { q: 1, r: 0 }, { notes: "a" }, NOW);
    expect(countHexRecords(state)).toBe(1);
  });
});
