import { describe, expect, it } from "vitest";
import { DEFAULT_FACTION_TURN_SETTINGS, type Entity } from "schema";
import { FactionTurnEngine } from "./engine";
import { sortHistory, mostRecentActive, deriveLastTurnDate } from "./history";
import type { FactionTurnRecord, ResolveInput } from "./types";

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
    history?: FactionTurnRecord[];
    connections?: Entity["connections"];
  } = {},
): Entity {
  return entity({
    id: "faction-a",
    title: "Black Eagles",
    connections: over.connections ?? [],
    statSheet: {
      fields: [
        { id: "fld_i", label: "Political Reach", type: "number", value: 6 },
      ],
    },
    factionTurn: {
      enabled: true,
      statRoles: { influence: "fld_i" },
      history: over.history ?? [],
    },
  });
}

const target = entity({ id: "loc-mub", type: "location", title: "Mub" });

function engine() {
  let counter = 0;
  return new FactionTurnEngine({
    now: () => 1000 + counter,
    newId: () => `t${++counter}`,
  });
}

function input(over: Partial<ResolveInput> = {}): ResolveInput {
  return {
    faction: faction(),
    target,
    allFactions: [],
    settings: { ...DEFAULT_FACTION_TURN_SETTINGS, useRandomness: false },
    worldDate: { year: 640, month: 3, day: 12, calendarRevision: 1 },
    ...over,
  };
}

describe("propose (FR-022)", () => {
  it("writes nothing to the entities it is given", () => {
    const acting = faction();
    const snapshot = JSON.stringify(acting);
    engine().propose(input({ faction: acting }));
    expect(JSON.stringify(acting)).toBe(snapshot);
  });

  it("carries both a forward and an inverse patch (FR-027)", () => {
    const result = engine().propose(input());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.changes.length).toBeGreaterThan(0);
    expect(result.value.inverse.length).toBeGreaterThan(0);
  });

  it("falls back to the local template when no AI narrative arrived (FR-021d)", () => {
    const result = engine().propose(input());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.narrativeSource).toBe("template");
    expect(result.value.narrative).toContain("Black Eagles");
  });

  it("uses the AI narrative when one is supplied", () => {
    const result = engine().propose(input(), {
      aiNarrative: "The Eagles prevailed.",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.narrativeSource).toBe("ai");
    expect(result.value.narrative).toBe("The Eagles prevailed.");
  });

  it("ignores a blank AI narrative rather than storing emptiness", () => {
    const result = engine().propose(input(), { aiNarrative: "   " });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.narrativeSource).toBe("template");
  });

  it("records that the pacing rule was overridden (FR-013)", () => {
    const result = engine().propose(input(), { isOverride: true });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.isOverride).toBe(true);
  });

  it("propagates a resolve failure rather than throwing", () => {
    const unmapped = entity({
      id: "faction-a",
      factionTurn: { enabled: true, statRoles: {}, history: [] },
    });
    const result = engine().propose(input({ faction: unmapped }));
    expect(result.ok).toBe(false);
  });
});

describe("commit (FR-026, SC-007)", () => {
  it("produces a plan and a history record", () => {
    const eng = engine();
    const proposal = eng.propose(input());
    expect(proposal.ok).toBe(true);
    if (!proposal.ok) return;

    const plan = eng.commit(proposal.value, faction(), target);
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.value.record.action).toBe("influence");
    expect(plan.value.record.undone).toBe(false);
    expect(plan.value.lastTurnDate).toEqual(proposal.value.worldDate);
  });

  it("refuses when the underlying state changed since the preview (FR-026)", () => {
    const eng = engine();
    const proposal = eng.propose(input());
    expect(proposal.ok).toBe(true);
    if (!proposal.ok) return;

    // Someone edited the faction's influence stat in another tab.
    const edited = entity({
      ...faction(),
      statSheet: {
        fields: [
          { id: "fld_i", label: "Political Reach", type: "number", value: 9 },
        ],
      },
    });
    const plan = eng.commit(proposal.value, edited, target);
    expect(plan.ok).toBe(false);
    if (plan.ok) return;
    expect(plan.errors.kind).toBe("stale");
  });

  it("refuses when the target was deleted between preview and commit", () => {
    const eng = engine();
    const proposal = eng.propose(input());
    expect(proposal.ok).toBe(true);
    if (!proposal.ok) return;

    const plan = eng.commit(proposal.value, faction(), undefined);
    expect(plan.ok).toBe(false);
    if (plan.ok) return;
    expect(plan.errors.kind).toBe("target-missing");
  });

  it("collapses changes into concrete writes", () => {
    const eng = engine();
    const proposal = eng.propose(input());
    expect(proposal.ok).toBe(true);
    if (!proposal.ok) return;

    const plan = eng.commit(proposal.value, faction(), target);
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.value.connectionWrite?.targetId).toBe("loc-mub");
    expect(plan.value.connectionWrite?.create).toBe(true);
    expect(plan.value.connectionRemove).toBe(null);
  });
});

describe("reverse (FR-028, FR-029)", () => {
  function committed(): { eng: FactionTurnEngine; record: FactionTurnRecord } {
    const eng = engine();
    const proposal = eng.propose(input());
    if (!proposal.ok) throw new Error("unreachable");
    const plan = eng.commit(proposal.value, faction(), target);
    if (!plan.ok) throw new Error("unreachable");
    return { eng, record: plan.value.record };
  }

  it("marks the record undone rather than deleting it (FR-029)", () => {
    const { eng, record } = committed();
    const acting = faction({ history: [record] });
    const plan = eng.reverse(record, acting);
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.value.record.undone).toBe(true);
    expect(plan.value.record.id).toBe(record.id);
  });

  it("clears lastTurnDate when the reversed turn was the only one (FR-010)", () => {
    const { eng, record } = committed();
    const acting = faction({ history: [record] });
    const plan = eng.reverse(record, acting);
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.value.lastTurnDate).toBeUndefined();
  });

  it("refuses to reverse anything but the most recent turn (FR-028)", () => {
    const { eng, record } = committed();
    const newer: FactionTurnRecord = {
      ...record,
      id: "t99",
      committedAt: 9999,
    };
    const acting = faction({ history: [record, newer] });
    const plan = eng.reverse(record, acting);
    expect(plan.ok).toBe(false);
    if (plan.ok) return;
    expect(plan.errors.kind).toBe("not-most-recent");
  });

  it("refuses when the record is not in the faction's history at all", () => {
    const { eng, record } = committed();
    const plan = eng.reverse(record, faction({ history: [] }));
    expect(plan.ok).toBe(false);
  });

  it("plans a connection removal when the turn created the edge", () => {
    const { eng, record } = committed();
    const acting = faction({ history: [record] });
    const plan = eng.reverse(record, acting);
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.value.connectionRemove?.targetId).toBe("loc-mub");
    expect(plan.value.connectionWrite).toBe(null);
  });
});

describe("history ordering (FR-036)", () => {
  function record(over: Partial<FactionTurnRecord>): FactionTurnRecord {
    return {
      id: "r",
      worldDate: { year: 640, month: 1, calendarRevision: 1 },
      committedAt: 1,
      action: "influence",
      targetId: "t",
      targetTitle: "T",
      resolution: {} as never,
      changes: [],
      inverse: [],
      narrative: "",
      narrativeSource: "template",
      isOverride: false,
      undone: false,
      ...over,
    };
  }

  it("sorts chronologically by world date", () => {
    const sorted = sortHistory(
      [
        record({
          id: "b",
          worldDate: { year: 642, month: 1, calendarRevision: 1 },
        }),
        record({
          id: "a",
          worldDate: { year: 640, month: 1, calendarRevision: 1 },
        }),
      ],
      1,
    );
    expect(sorted.map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("breaks ties by commit time", () => {
    const sorted = sortHistory(
      [
        record({ id: "b", committedAt: 20 }),
        record({ id: "a", committedAt: 10 }),
      ],
      1,
    );
    expect(sorted.map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("sorts entries with an unresolvable date last", () => {
    // The calendar was reconfigured; these have no placeable position, and
    // interleaving them by a stale date would misrepresent the history.
    const sorted = sortHistory(
      [
        record({
          id: "stale",
          worldDate: { year: 640, month: 1, calendarRevision: 0 },
        }),
        record({
          id: "ok",
          worldDate: { year: 999, month: 1, calendarRevision: 1 },
        }),
      ],
      1,
    );
    expect(sorted.map((r) => r.id)).toEqual(["ok", "stale"]);
  });

  it("does not mutate the array it is given", () => {
    const history = [
      record({ id: "b", committedAt: 20 }),
      record({ id: "a", committedAt: 10 }),
    ];
    sortHistory(history, 1);
    expect(history.map((r) => r.id)).toEqual(["b", "a"]);
  });

  it("ignores undone turns when finding the most recent (FR-010)", () => {
    const history = [
      record({ id: "a", committedAt: 10 }),
      record({ id: "b", committedAt: 20, undone: true }),
    ];
    expect(mostRecentActive(history)?.id).toBe("a");
  });

  it("derives no last-turn date when every turn was undone", () => {
    const history = [record({ id: "a", committedAt: 10, undone: true })];
    expect(deriveLastTurnDate(history)).toBeUndefined();
  });

  it("keeps every record, never pruning (FR-041)", () => {
    const many = Array.from({ length: 600 }, (_, i) =>
      record({ id: `r${i}`, committedAt: i }),
    );
    const sorted = sortHistory(many, 1);
    expect(sorted).toHaveLength(600);
    expect(sorted[0].resolution).toBeDefined();
  });
});
