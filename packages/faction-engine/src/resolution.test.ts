import { describe, expect, it } from "vitest";
import { DiceEngine } from "dice-engine";
import { DEFAULT_FACTION_TURN_SETTINGS, type Entity } from "schema";
import { applyAiBand, resolveInfluence } from "./resolution";
import { computeOpposition } from "./opposition";
import { BAND_ORDER } from "./bands";
import type { FactionResolution, ResolveInput } from "./types";

/** A crypto stub so dice results are fixed without mocking globals. */
function fixedDice(value: number): DiceEngine {
  return new DiceEngine({
    getRandomValues(arr: Uint32Array) {
      arr.fill(value);
      return arr;
    },
  });
}

function entity(over: Partial<Entity> = {}): Entity {
  return {
    id: "e",
    type: "faction",
    title: "Entity",
    labels: [],
    aliases: [],
    connections: [],
    content: "",
    status: "active",
    ...over,
  } as Entity;
}

function actingFaction(influence = 6): Entity {
  return entity({
    id: "faction-a",
    title: "Black Eagles",
    statSheet: {
      fields: [
        {
          id: "fld_i",
          label: "Political Reach",
          type: "number",
          value: influence,
        },
      ],
    },
    factionTurn: {
      enabled: true,
      statRoles: { influence: "fld_i" },
      history: [],
    },
  });
}

function input(over: Partial<ResolveInput> = {}): ResolveInput {
  return {
    faction: actingFaction(),
    target: entity({ id: "loc-mub", type: "location", title: "Mub" }),
    allFactions: [],
    settings: { ...DEFAULT_FACTION_TURN_SETTINGS, useRandomness: false },
    worldDate: { year: 640, month: 1, calendarRevision: 1 },
    ...over,
  };
}

describe("resolveInfluence failures (FR-005)", () => {
  it("refuses a self-target", () => {
    const faction = actingFaction();
    const result = resolveInfluence(input({ faction, target: faction }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.kind).toBe("self-target");
  });

  it("names the missing role rather than throwing", () => {
    const unmapped = entity({
      id: "faction-a",
      factionTurn: { enabled: true, statRoles: {}, history: [] },
    });
    const result = resolveInfluence(input({ faction: unmapped }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.kind).toBe("role-unmapped");
    expect(result.errors.role).toBe("influence");
  });

  it("does not require roles the action never uses (FR-005)", () => {
    // Only `influence` is mapped; power/resources/stability are absent.
    expect(resolveInfluence(input()).ok).toBe(true);
  });
});

describe("determinism (FR-019, SC-006)", () => {
  it("produces an identical resolution for identical inputs", () => {
    const a = resolveInfluence(input());
    const b = resolveInfluence(input());
    expect(a).toEqual(b);
  });

  it("does not roll at all when randomness is off", () => {
    const result = resolveInfluence(input());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.roll).toBe(null);
    expect(result.value.total).toBe(result.value.actingValue);
  });

  it("records the individual dice when randomness is on (FR-018)", () => {
    const result = resolveInfluence(
      input({
        settings: { ...DEFAULT_FACTION_TURN_SETTINGS, useRandomness: true },
      }),
      { dice: fixedDice(7) },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.roll).not.toBe(null);
    expect(result.value.roll?.dice.length).toBeGreaterThan(0);
    expect(result.value.total).toBeGreaterThan(result.value.actingValue);
  });
});

describe("permitted range (FR-021a)", () => {
  it("always includes the mechanical band and never exceeds three", () => {
    const result = resolveInfluence(input());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.permittedBands).toContain(result.value.mechanicalBand);
    expect(result.value.permittedBands.length).toBeLessThanOrEqual(3);
  });

  it("never extends more than one band either side", () => {
    const result = resolveInfluence(input());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const mechanicalIndex = BAND_ORDER.indexOf(result.value.mechanicalBand);
    for (const band of result.value.permittedBands) {
      expect(
        Math.abs(BAND_ORDER.indexOf(band) - mechanicalIndex),
      ).toBeLessThanOrEqual(1);
    }
  });

  it("starts with finalBand equal to mechanicalBand and aiUsed false", () => {
    const result = resolveInfluence(input());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.finalBand).toBe(result.value.mechanicalBand);
    expect(result.value.aiUsed).toBe(false);
  });
});

describe("computeOpposition (FR-020)", () => {
  const settings = { ...DEFAULT_FACTION_TURN_SETTINGS, baselineOpposition: 5 };

  it("uses a turn-enabled target's stability (FR-020a)", () => {
    const rivalFaction = entity({
      id: "faction-b",
      title: "Srath",
      statSheet: {
        fields: [{ id: "s", label: "Cohesion", type: "number", value: 9 }],
      },
      factionTurn: {
        enabled: true,
        statRoles: { stability: "s" },
        history: [],
      },
    });
    const result = computeOpposition(rivalFaction, [], "faction-a", settings);
    expect(result.source).toBe("faction-stability");
    expect(result.value).toBe(9);
  });

  it("resists at exactly the baseline when nobody holds it (FR-020c)", () => {
    const result = computeOpposition(
      entity({ id: "loc" }),
      [],
      "faction-a",
      settings,
    );
    expect(result.source).toBe("baseline");
    expect(result.value).toBe(5);
  });

  it("rises above the baseline when a rival already holds it (FR-020b)", () => {
    const rival = entity({
      id: "faction-b",
      title: "Srath",
      connections: [{ target: "loc", type: "neutral", strength: 1 }],
      factionTurn: { enabled: true, statRoles: {}, history: [] },
    });
    const result = computeOpposition(
      entity({ id: "loc" }),
      [rival],
      "faction-a",
      settings,
    );
    expect(result.source).toBe("existing-hold");
    expect(result.value).toBeGreaterThan(5);
  });

  it("scales with the strength of the hold (FR-020b)", () => {
    const weak = entity({
      id: "faction-b",
      connections: [{ target: "loc", type: "neutral", strength: 0.2 }],
      factionTurn: { enabled: true, statRoles: {}, history: [] },
    });
    const strong = entity({
      id: "faction-b",
      connections: [{ target: "loc", type: "neutral", strength: 0.9 }],
      factionTurn: { enabled: true, statRoles: {}, history: [] },
    });
    const weakResult = computeOpposition(
      entity({ id: "loc" }),
      [weak],
      "faction-a",
      settings,
    );
    const strongResult = computeOpposition(
      entity({ id: "loc" }),
      [strong],
      "faction-a",
      settings,
    );
    expect(strongResult.value).toBeGreaterThan(weakResult.value);
  });

  it("ignores the acting faction's own hold", () => {
    // Otherwise a faction would find its own province harder to influence the
    // more firmly it already held it.
    const self = entity({
      id: "faction-a",
      connections: [{ target: "loc", type: "neutral", strength: 1 }],
      factionTurn: { enabled: true, statRoles: {}, history: [] },
    });
    const result = computeOpposition(
      entity({ id: "loc" }),
      [self],
      "faction-a",
      settings,
    );
    expect(result.source).toBe("baseline");
  });

  it("ignores relationships directed from the target back at a faction (FR-020b)", () => {
    // The target pointing at a faction is something the GM authored to mean
    // something else; it is not that faction holding the target.
    const target = entity({
      id: "loc",
      connections: [{ target: "faction-b", type: "friendly", strength: 1 }],
    });
    const other = entity({
      id: "faction-b",
      connections: [],
      factionTurn: { enabled: true, statRoles: {}, history: [] },
    });
    const result = computeOpposition(target, [other], "faction-a", settings);
    expect(result.source).toBe("baseline");
  });

  it("ignores factions that have not opted in", () => {
    const plain = entity({
      id: "faction-b",
      connections: [{ target: "loc", type: "neutral", strength: 1 }],
    });
    const result = computeOpposition(
      entity({ id: "loc" }),
      [plain],
      "faction-a",
      settings,
    );
    expect(result.source).toBe("baseline");
  });
});

describe("applyAiBand (FR-021c, FR-021e, FR-021b)", () => {
  function base(): FactionResolution {
    return {
      actingRole: "influence",
      actingFieldId: "fld_i",
      actingLabel: "Political Reach",
      actingValue: 6,
      opposingValue: 5,
      oppositionSource: "baseline",
      oppositionDetail: "",
      modifiers: [],
      roll: null,
      total: 6,
      mechanicalBand: "mixed",
      permittedBands: ["success", "mixed", "failure"],
      finalBand: "mixed",
      aiUsed: false,
    };
  }

  it("accepts a band inside the permitted range with a reason", () => {
    const result = applyAiBand(base(), {
      band: "success",
      reason: "A former province.",
    });
    expect(result.finalBand).toBe("success");
    expect(result.aiUsed).toBe(true);
    expect(result.aiReason).toBe("A former province.");
  });

  it("ignores a null proposal (FR-021c)", () => {
    expect(applyAiBand(base(), null)).toEqual(base());
  });

  it("ignores a band outside the permitted range (FR-021c)", () => {
    const result = applyAiBand(base(), {
      band: "backfire",
      reason: "Because.",
    });
    expect(result.finalBand).toBe("mixed");
    expect(result.aiUsed).toBe(false);
  });

  it("ignores an unrecognised band (FR-021c)", () => {
    const result = applyAiBand(base(), {
      band: "catastrophe" as never,
      reason: "Because.",
    });
    expect(result.finalBand).toBe("mixed");
    expect(result.aiUsed).toBe(false);
  });

  it("rejects a band change with no reason (FR-021b)", () => {
    // FR-035a keeps the reason in history so the outcome stays explainable; a
    // change we cannot explain is worse than no change.
    expect(applyAiBand(base(), { band: "success", reason: "" }).aiUsed).toBe(
      false,
    );
    expect(applyAiBand(base(), { band: "success", reason: "   " }).aiUsed).toBe(
      false,
    );
  });

  it("does not mark aiUsed when the model agrees with the mechanics", () => {
    const result = applyAiBand(base(), {
      band: "mixed",
      reason: "Seems right.",
    });
    expect(result.aiUsed).toBe(false);
    expect(result.aiReason).toBeUndefined();
  });

  it("never lets AI touch anything but the band and reason (FR-021e)", () => {
    // A hostile response carrying magnitudes, stat values and eligibility hints
    // must have every one of those fields ignored.
    const hostile = {
      band: "success",
      reason: "Legitimate reason.",
      actingValue: 999,
      opposingValue: -50,
      total: 1234,
      mechanicalBand: "decisive-success",
      permittedBands: BAND_ORDER,
      strength: 5,
      stat: 5,
      canAct: true,
    } as never;
    const result = applyAiBand(base(), hostile);
    expect(result.actingValue).toBe(6);
    expect(result.opposingValue).toBe(5);
    expect(result.total).toBe(6);
    expect(result.mechanicalBand).toBe("mixed");
    expect(result.permittedBands).toEqual(["success", "mixed", "failure"]);
    expect(Object.keys(result).sort()).toEqual(
      [...Object.keys(base()), "aiReason"].sort(),
    );
  });

  it("does not mutate the resolution it is given", () => {
    const original = base();
    applyAiBand(original, { band: "success", reason: "x" });
    expect(original.finalBand).toBe("mixed");
    expect(original.aiUsed).toBe(false);
  });
});
