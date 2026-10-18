import { describe, expect, it } from "bun:test";
import {
  emptyTipsRecord,
  markOptInAsked,
  parseTipsRecord,
  serializeTipsRecord,
  setTipsEnabled,
  type TipsRecord,
} from "../src/tips";

const withState = (over: Partial<TipsRecord>): TipsRecord => ({
  ...emptyTipsRecord(),
  ...over,
});

describe("tips record", () => {
  it("starts with tips off and nothing asked", () => {
    expect(emptyTipsRecord()).toEqual({
      schema: 1,
      enabled: false,
      optInAsked: false,
      dismissed: [],
      acted: [],
      dismissCounts: {},
      silencedAreas: [],
    });
  });

  it("round-trips through serialise and parse", () => {
    const r = withState({
      enabled: true,
      optInAsked: true,
      dismissed: ["world-pin-map"],
      dismissCounts: { map: 1 },
    });
    expect(parseTipsRecord(serializeTipsRecord(r))).toEqual(r);
  });

  it("falls back to defaults for missing, malformed or wrong-shaped data", () => {
    expect(parseTipsRecord(null)).toEqual(emptyTipsRecord());
    expect(parseTipsRecord("{not json")).toEqual(emptyTipsRecord());
    expect(parseTipsRecord('{"schema":1,"enabled":"yes"}')).toEqual(
      emptyTipsRecord(),
    );
  });

  it("discards an unknown record version", () => {
    const future = { ...emptyTipsRecord(), schema: 2, enabled: true };
    expect(parseTipsRecord(JSON.stringify(future))).toEqual(emptyTipsRecord());
  });

  it("drops unknown tip ids and unknown areas instead of failing", () => {
    const raw = JSON.stringify({
      ...emptyTipsRecord(),
      dismissed: ["world-pin-map", "removed-tip"],
      acted: ["gone"],
      dismissCounts: { map: 1, nowhere: 5 },
      silencedAreas: ["map", "nowhere"],
    });
    const r = parseTipsRecord(raw);
    expect(r.dismissed).toEqual(["world-pin-map"]);
    expect(r.acted).toEqual([]);
    expect(r.dismissCounts).toEqual({ map: 1 });
    expect(r.silencedAreas).toEqual(["map"]);
  });

  it("turning tips on again clears silence and counts but keeps dismissals", () => {
    const silenced = withState({
      enabled: true,
      dismissed: ["world-pin-map"],
      acted: ["story-roll-table"],
      dismissCounts: { map: 2 },
      silencedAreas: ["map"],
    });
    const off = setTipsEnabled(silenced, false);
    const on = setTipsEnabled(off, true);
    expect(on.enabled).toBe(true);
    expect(on.dismissCounts).toEqual({});
    expect(on.silencedAreas).toEqual([]);
    expect(on.dismissed).toEqual(["world-pin-map"]);
    expect(on.acted).toEqual(["story-roll-table"]);
  });

  it("marking the opt-in asked is idempotent", () => {
    const once = markOptInAsked(emptyTipsRecord());
    expect(once.optInAsked).toBe(true);
    expect(markOptInAsked(once)).toBe(once);
  });
});
