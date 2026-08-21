import { describe, expect, it } from "vitest";
import { EntitySchema } from "./entity";
import {
  FactionTurnStateSchema,
  FactionTurnRecordSchema,
  FactionTurnSettingsSchema,
  DEFAULT_FACTION_TURN_SETTINGS,
  OUTCOME_BANDS,
} from "./faction-turn";

/**
 * The load-bearing guarantee of this feature's storage design: adding
 * `factionTurn` must be invisible to every vault that predates it (FR-002,
 * SC-008). If these fail, the "no migration, no DB version bump" claim in
 * plan.md is wrong.
 */
describe("entity back-compat", () => {
  const legacyEntity = {
    id: "faction-black-eagles",
    type: "faction",
    title: "Black Eagles",
    connections: [{ target: "loc-mub", type: "neutral", strength: 0.4 }],
    content: "A mercenary company of the northern lakes.",
  };

  it("parses an entity written before this feature existed", () => {
    const parsed = EntitySchema.parse(legacyEntity);
    expect(parsed.title).toBe("Black Eagles");
  });

  it("leaves factionTurn absent rather than defaulting it", () => {
    const parsed = EntitySchema.parse(legacyEntity);
    // Not `toBeUndefined()` alone — the key must not be introduced at all, or
    // every legacy entity would be rewritten on next save and sync would churn.
    expect("factionTurn" in parsed).toBe(false);
  });

  it("round-trips a legacy entity without gaining keys", () => {
    const parsed = EntitySchema.parse(legacyEntity);
    const reparsed = EntitySchema.parse(parsed);
    expect(Object.keys(reparsed).sort()).toEqual(Object.keys(parsed).sort());
  });

  it("accepts an entity that has opted in", () => {
    const parsed = EntitySchema.parse({
      ...legacyEntity,
      factionTurn: { enabled: true, statRoles: { influence: "fld_sway" } },
    });
    expect(parsed.factionTurn?.enabled).toBe(true);
    expect(parsed.factionTurn?.statRoles.influence).toBe("fld_sway");
    expect(parsed.factionTurn?.history).toEqual([]);
  });
});

describe("FactionTurnStateSchema", () => {
  it("defaults to disabled with no roles and no history", () => {
    const state = FactionTurnStateSchema.parse({});
    expect(state.enabled).toBe(false);
    expect(state.statRoles).toEqual({});
    expect(state.history).toEqual([]);
    expect(state.lastTurnDate).toBeUndefined();
  });

  it("treats every role as individually optional (FR-004a)", () => {
    // Influence needs only `influence`; requiring all four would block a GM who
    // has not modelled military power at all.
    const state = FactionTurnStateSchema.parse({
      enabled: true,
      statRoles: { influence: "fld_a" },
    });
    expect(state.statRoles.influence).toBe("fld_a");
    expect(state.statRoles.power).toBeUndefined();
  });
});

describe("FactionTurnRecordSchema", () => {
  const record = {
    id: "turn-1",
    worldDate: { year: 640, month: 3, day: 12, calendarRevision: 1 },
    committedAt: 1_700_000_000_000,
    action: "influence",
    targetId: "loc-mub",
    targetTitle: "Mub Territory",
    resolution: {
      actingRole: "influence",
      actingFieldId: "fld_sway",
      actingLabel: "Political Reach",
      actingValue: 6,
      opposingValue: 5,
      oppositionSource: "baseline",
      oppositionDetail: "Held by no faction; vault baseline.",
      roll: { formula: "1d10", total: 7, dice: [7] },
      total: 13,
      mechanicalBand: "success",
      permittedBands: ["decisive-success", "success", "mixed"],
      finalBand: "success",
    },
  };

  it("parses a minimal committed record", () => {
    const parsed = FactionTurnRecordSchema.parse(record);
    expect(parsed.undone).toBe(false);
    expect(parsed.isOverride).toBe(false);
    expect(parsed.narrativeSource).toBe("template");
    expect(parsed.promotedEventId).toBeUndefined();
  });

  it("keeps the target title so history survives target deletion (FR-040)", () => {
    const parsed = FactionTurnRecordSchema.parse(record);
    expect(parsed.targetTitle).toBe("Mub Territory");
  });

  it("rejects a band outside the five", () => {
    const bad = {
      ...record,
      resolution: { ...record.resolution, finalBand: "catastrophe" },
    };
    expect(() => FactionTurnRecordSchema.parse(bad)).toThrow();
  });

  it("allows a no-randomness resolution with a null roll (FR-019)", () => {
    const deterministic = {
      ...record,
      resolution: { ...record.resolution, roll: null, total: 6 },
    };
    expect(FactionTurnRecordSchema.parse(deterministic).resolution.roll).toBe(
      null,
    );
  });
});

describe("outcome bands", () => {
  it("has exactly five, in order (FR-017)", () => {
    expect(OUTCOME_BANDS).toEqual([
      "decisive-success",
      "success",
      "mixed",
      "failure",
      "backfire",
    ]);
  });
});

describe("FactionTurnSettingsSchema", () => {
  it("defaults both AI switches on and randomness on", () => {
    expect(DEFAULT_FACTION_TURN_SETTINGS.useRandomness).toBe(true);
    expect(DEFAULT_FACTION_TURN_SETTINGS.aiBandSelection).toBe(true);
    expect(DEFAULT_FACTION_TURN_SETTINGS.aiNarration).toBe(true);
  });

  it("rejects a turn interval below one unit", () => {
    expect(() =>
      FactionTurnSettingsSchema.parse({ turnIntervalAmount: 0 }),
    ).toThrow();
  });
});
