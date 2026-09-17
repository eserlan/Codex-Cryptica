import { describe, expect, it } from "vitest";
import type { Entity } from "schema";
import { BAND_ORDER } from "./bands";
import { factionStateHash } from "./hash";
import { buildChanges, computeStateHash, findHold } from "./patches";
import type {
  FactionResolution,
  FactionTurnChange,
  OutcomeBandId,
} from "./types";

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

function faction(
  over: {
    influence?: number;
    min?: number;
    max?: number;
    connections?: Entity["connections"];
  } = {},
): Entity {
  return entity({
    id: "faction-a",
    title: "Black Eagles",
    connections: over.connections ?? [],
    statSheet: {
      fields: [
        {
          id: "fld_i",
          label: "Political Reach",
          type: "number",
          value: over.influence ?? 6,
          min: over.min,
          max: over.max,
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

const target = entity({ id: "loc-mub", type: "location", title: "Mub" });

function resolution(band: OutcomeBandId): FactionResolution {
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
    mechanicalBand: band,
    permittedBands: [band],
    finalBand: band,
    aiUsed: false,
  };
}

/**
 * Simulate applying a change list to a mutable world, so forward-then-inverse
 * can be asserted to restore the exact starting state (SC-005). This mirrors
 * what the store does through EntityMutationService.
 */
interface World {
  stat: number;
  strength: number | null;
  type: string | null;
}

function apply(world: World, changes: FactionTurnChange[]): World {
  const next = { ...world };
  for (const change of changes) {
    switch (change.kind) {
      case "stat-value":
        next.stat = change.to;
        break;
      case "connection-strength":
        next.strength = change.to;
        break;
      case "connection-created":
        next.type = change.type;
        break;
      case "connection-removed":
        next.strength = null;
        next.type = null;
        break;
      case "connection-type":
        next.type = change.to;
        break;
    }
  }
  return next;
}

describe("reversibility across all five bands (SC-005)", () => {
  it.each(BAND_ORDER)("restores exact prior state after %s", (band) => {
    const acting = faction({
      influence: 6,
      connections: [{ target: target.id, type: "neutral", strength: 0.5 }],
    });
    const before: World = { stat: 6, strength: 0.5, type: "neutral" };

    const { changes, inverse } = buildChanges(
      acting,
      target,
      resolution(band),
      false,
    );
    const after = apply(before, changes);
    const restored = apply(after, inverse);

    expect(restored).toEqual(before);
  });

  it.each(BAND_ORDER)(
    "restores exactly when the edge did not exist (%s)",
    (band) => {
      const acting = faction({ influence: 6, connections: [] });
      const before: World = { stat: 6, strength: null, type: null };

      const { changes, inverse } = buildChanges(
        acting,
        target,
        resolution(band),
        false,
      );
      const restored = apply(apply(before, changes), inverse);

      expect(restored).toEqual(before);
    },
  );
});

describe("clamping (FR-034, FR-034a)", () => {
  it("records that a stat change was capped at its maximum", () => {
    const acting = faction({ influence: 10, max: 10 });
    const { changes } = buildChanges(
      acting,
      target,
      resolution("decisive-success"),
      false,
    );
    const stat = changes.find((c) => c.kind === "stat-value");
    // At the ceiling already, so no change is emitted at all.
    expect(stat).toBeUndefined();
  });

  it("caps a partial overshoot and marks it clamped", () => {
    const acting = faction({ influence: 9, max: 10 });
    const { changes } = buildChanges(
      acting,
      target,
      resolution("decisive-success"),
      false,
    );
    const stat = changes.find((c) => c.kind === "stat-value");
    expect(stat).toMatchObject({ to: 10, clamped: true });
  });

  it("reverses a clamped change to the true prior value, not the cap (FR-034a)", () => {
    // The bug this guards against: reversing to the clamped ceiling would
    // ratchet the stat upward a little on every commit/undo cycle.
    const acting = faction({ influence: 9, max: 10 });
    const before: World = { stat: 9, strength: null, type: null };
    const { changes, inverse } = buildChanges(
      acting,
      target,
      resolution("decisive-success"),
      false,
    );
    const restored = apply(apply(before, changes), inverse);
    expect(restored.stat).toBe(9);
  });

  it("clamps relationship strength at 1 and still reverses exactly", () => {
    const acting = faction({
      influence: 6,
      connections: [{ target: target.id, type: "neutral", strength: 0.95 }],
    });
    const before: World = { stat: 6, strength: 0.95, type: "neutral" };
    const { changes, inverse } = buildChanges(
      acting,
      target,
      resolution("decisive-success"),
      false,
    );
    const after = apply(before, changes);
    expect(after.strength).toBe(1);
    expect(apply(after, inverse)).toEqual(before);
  });

  it("clamps relationship strength at 0 on a backfire", () => {
    const acting = faction({
      influence: 6,
      connections: [{ target: target.id, type: "neutral", strength: 0.05 }],
    });
    const { changes } = buildChanges(
      acting,
      target,
      resolution("backfire"),
      false,
    );
    const strength = changes.find((c) => c.kind === "connection-strength");
    expect(strength).toMatchObject({ to: 0, clamped: true });
  });
});

describe("directionality (FR-032c, FR-033)", () => {
  it("never produces a change for an edge from the target back to the faction", () => {
    const targetPointsBack = entity({
      id: "loc-mub",
      connections: [{ target: "faction-a", type: "friendly", strength: 1 }],
    });
    const { changes } = buildChanges(
      faction(),
      targetPointsBack,
      resolution("success"),
      false,
    );
    // Every change addresses the target, never the faction.
    for (const change of changes) {
      if ("targetId" in change) expect(change.targetId).toBe("loc-mub");
    }
  });

  it("creates a neutral edge when none exists (FR-033)", () => {
    const { changes } = buildChanges(
      faction(),
      target,
      resolution("success"),
      false,
    );
    expect(changes).toContainEqual({
      kind: "connection-created",
      targetId: "loc-mub",
      type: "neutral",
    });
  });

  it("modifies in place rather than duplicating when one exists (FR-033)", () => {
    const acting = faction({
      connections: [{ target: target.id, type: "enemy", strength: 0.3 }],
    });
    const { changes } = buildChanges(
      acting,
      target,
      resolution("success"),
      false,
    );
    expect(changes.some((c) => c.kind === "connection-created")).toBe(false);
  });
});

describe("relationship type is never changed automatically (FR-032b)", () => {
  it("leaves the type alone when the GM does not opt in", () => {
    const acting = faction({
      connections: [{ target: target.id, type: "neutral", strength: 0.5 }],
    });
    const { changes } = buildChanges(
      acting,
      target,
      resolution("decisive-success"),
      false,
    );
    expect(changes.some((c) => c.kind === "connection-type")).toBe(false);
  });

  it("still surfaces the suggestion for the GM to consider", () => {
    const acting = faction({
      connections: [{ target: target.id, type: "neutral", strength: 0.5 }],
    });
    const { suggestedTypeChange } = buildChanges(
      acting,
      target,
      resolution("decisive-success"),
      false,
    );
    expect(suggestedTypeChange).toBe("friendly");
  });

  it("applies the type change only when opted in, and reverses it", () => {
    const acting = faction({
      connections: [{ target: target.id, type: "neutral", strength: 0.5 }],
    });
    const before: World = { stat: 6, strength: 0.5, type: "neutral" };
    const { changes, inverse } = buildChanges(
      acting,
      target,
      resolution("decisive-success"),
      true,
    );
    const after = apply(before, changes);
    expect(after.type).toBe("friendly");
    expect(apply(after, inverse)).toEqual(before);
  });

  it("suggests enemy on a backfire against a neutral relationship", () => {
    const acting = faction({
      connections: [{ target: target.id, type: "neutral", strength: 0.5 }],
    });
    const { suggestedTypeChange } = buildChanges(
      acting,
      target,
      resolution("backfire"),
      false,
    );
    expect(suggestedTypeChange).toBe("enemy");
  });

  it("suggests nothing for a relationship the GM already characterised", () => {
    const acting = faction({
      connections: [{ target: target.id, type: "enemy", strength: 0.5 }],
    });
    const { suggestedTypeChange } = buildChanges(
      acting,
      target,
      resolution("decisive-success"),
      false,
    );
    expect(suggestedTypeChange).toBeUndefined();
  });
});

describe("buildChanges purity (FR-022)", () => {
  it("does not mutate the entities it is given", () => {
    const acting = faction({
      connections: [{ target: target.id, type: "neutral", strength: 0.5 }],
    });
    const snapshot = JSON.stringify(acting);
    buildChanges(acting, target, resolution("decisive-success"), true);
    expect(JSON.stringify(acting)).toBe(snapshot);
  });
});

describe("computeStateHash (FR-026, SC-007)", () => {
  it("uses the same deterministic cyrb53 hash as the former shared helper", () => {
    expect(factionStateHash("Black Eagles|Mub Territory")).toBe("4fsyec9e8f");
  });

  it("is stable for identical inputs", () => {
    expect(computeStateHash(faction(), target)).toBe(
      computeStateHash(faction(), target),
    );
  });

  it("changes when the acting stat value changes", () => {
    expect(computeStateHash(faction({ influence: 6 }), target)).not.toBe(
      computeStateHash(faction({ influence: 7 }), target),
    );
  });

  it("changes when the hold's strength changes", () => {
    const a = faction({
      connections: [{ target: target.id, type: "neutral", strength: 0.4 }],
    });
    const b = faction({
      connections: [{ target: target.id, type: "neutral", strength: 0.6 }],
    });
    expect(computeStateHash(a, target)).not.toBe(computeStateHash(b, target));
  });

  it("changes when the hold's type changes", () => {
    const a = faction({
      connections: [{ target: target.id, type: "neutral", strength: 0.4 }],
    });
    const b = faction({
      connections: [{ target: target.id, type: "enemy", strength: 0.4 }],
    });
    expect(computeStateHash(a, target)).not.toBe(computeStateHash(b, target));
  });

  it("ignores edits that cannot affect the turn", () => {
    // A preview the GM is still reading must not be invalidated because they
    // renamed the faction or added lore in another tab.
    const renamed = {
      ...faction(),
      title: "The Swift Wing Eagles",
      content: "New lore.",
    };
    expect(computeStateHash(renamed as Entity, target)).toBe(
      computeStateHash(faction(), target),
    );
  });
});

describe("findHold", () => {
  it("finds the faction's outgoing edge to the target", () => {
    const acting = faction({
      connections: [{ target: target.id, type: "neutral", strength: 0.5 }],
    });
    expect(findHold(acting, target.id)?.strength).toBe(0.5);
  });

  it("returns undefined when there is none", () => {
    expect(findHold(faction(), target.id)).toBeUndefined();
  });
});
