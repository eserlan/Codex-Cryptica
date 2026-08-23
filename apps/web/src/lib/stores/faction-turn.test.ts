import { vi } from "vitest";

// Must precede any import that triggers SvelteKit or vault side effects.
vi.mock("$app/paths", () => ({ base: "" }));
vi.mock("./vault.svelte", () => ({ vault: { activeVaultId: "test-vault" } }));
vi.mock("./calendar.svelte", () => ({
  calendarStore: {
    config: { revision: 1, months: [] },
    calendarCurrentDate: null,
  },
}));
vi.mock("../utils/idb", () => {
  const store = new Map<string, unknown>();
  return {
    getDB: vi.fn().mockResolvedValue({
      get: vi.fn(async (t: string, k: string) => store.get(`${t}_${k}`)),
      put: vi.fn(async (t: string, v: unknown, k: string) => {
        store.set(`${t}_${k}`, v);
        return k;
      }),
    }),
  };
});

import { describe, it, expect, beforeEach } from "vitest";
import { DEFAULT_FACTION_TURN_SETTINGS, type Entity } from "schema";
import { FactionTurnStore } from "./faction-turn.svelte";

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

function factionEntity(): Entity {
  return entity({
    id: "faction-a",
    title: "Black Eagles",
    statSheet: {
      fields: [
        { id: "fld_i", label: "Political Reach", type: "number", value: 6 },
      ],
    },
    factionTurn: {
      enabled: true,
      statRoles: { influence: "fld_i" },
      history: [],
    },
  });
}

const targetEntity = entity({
  id: "loc-mub",
  type: "location",
  title: "Mub",
});

/** A vault double recording every write, so rollback can be asserted. */
function fakeVault(failOn?: "connection" | "history") {
  const entities: Record<string, Entity> = {
    "faction-a": factionEntity(),
    "loc-mub": targetEntity,
  };
  const calls: string[] = [];

  return {
    calls,
    entities,
    activeVaultId: "test-vault",
    get allEntities() {
      return Object.values(entities);
    },
    async updateEntity(id: string, updates: Partial<Entity>) {
      if (failOn === "history" && updates.factionTurn) {
        calls.push("history:FAIL");
        throw new Error("disk full");
      }
      const isRollback = updates.connections !== undefined;
      calls.push(
        isRollback ? "rollback" : updates.factionTurn ? "history" : "stat",
      );
      entities[id] = { ...entities[id], ...updates } as Entity;
      return true;
    },
    async addConnection(
      sId: string,
      tId: string,
      type: string,
      _label?: string,
      strength?: number,
    ) {
      if (failOn === "connection") {
        calls.push("connection:FAIL");
        throw new Error("connection write failed");
      }
      calls.push("connection");
      entities[sId] = {
        ...entities[sId],
        connections: [
          ...(entities[sId].connections ?? []),
          { target: tId, type, strength: strength ?? 1 },
        ],
      } as Entity;
      return true;
    },
    async removeConnection(sId: string, tId: string) {
      calls.push("connection-remove");
      entities[sId] = {
        ...entities[sId],
        connections: (entities[sId].connections ?? []).filter(
          (c) => c.target !== tId,
        ),
      } as Entity;
      return true;
    },
    async createEntity() {
      calls.push("create");
      return "event-1";
    },
  };
}

function fakeCalendar(source: "entity" | "vaultSetting" | "realWorld" | null) {
  return {
    config: { revision: 1, months: [] },
    calendarCurrentDate: source
      ? { source, date: { year: 640, month: 3, day: 12 }, entityId: null }
      : null,
  };
}

/** AI is off by default in these tests, so nothing hits the network. */
const noAi = {
  generate: async () => ({
    band: null,
    reason: null,
    narrative: null,
    aiUsed: false,
  }),
};

function makeStore(
  vault: ReturnType<typeof fakeVault>,
  calendar = fakeCalendar("entity"),
  aiService: typeof noAi = noAi,
) {
  const store = new FactionTurnStore({
    vault: vault as never,
    calendarStore: calendar as never,
    aiService: aiService as never,
  });
  store.settings = {
    ...DEFAULT_FACTION_TURN_SETTINGS,
    useRandomness: false,
    aiBandSelection: false,
    aiNarration: false,
  };
  return store;
}

describe("AI participant lore", () => {
  it("adds rich participant context only after the GM opts in", async () => {
    const vault = fakeVault();
    vault.entities["faction-a"] = entity({
      ...factionEntity(),
      aliases: ["The Eagles"],
      lore: "Former rulers of the northern lakes.",
      connections: [{ target: "loc-mub", type: "rival", strength: 7 }],
    });
    vault.entities["loc-mub"] = entity({
      ...targetEntity,
      lore: "A contested march.",
    });
    const generate = vi.fn(async () => ({
      band: null,
      reason: null,
      narrative: null,
      aiUsed: false,
    }));
    const store = makeStore(vault, fakeCalendar("entity"), { generate });
    store.settings = {
      ...store.settings,
      aiNarration: true,
      includeParticipantLore: true,
    };

    await store.propose(
      vault.entities["faction-a"]!,
      vault.entities["loc-mub"]!,
    );

    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({
        participantLore: expect.objectContaining({
          faction: expect.objectContaining({
            aliases: ["The Eagles"],
            lore: "Former rulers of the northern lakes.",
            connections: [{ entityTitle: "Mub", type: "rival", strength: 7 }],
          }),
        }),
      }),
    );
  });
});

describe("opted-out factions are indistinguishable (FR-002, SC-008)", () => {
  it("reports the layer as off for an entity with no factionTurn block", () => {
    const store = makeStore(fakeVault());
    expect(store.isEnabled(entity())).toBe(false);
  });

  it("exposes no history for an entity that never opted in", () => {
    const store = makeStore(fakeVault());
    expect(store.history(entity())).toEqual([]);
  });

  it("maps the built-in Faction Turns stats automatically when enabling a faction", async () => {
    const vault = fakeVault();
    const faction = entity({
      ...factionEntity(),
      statSheet: {
        templateId: "builtin-faction-turn",
        fields: [
          { id: "power", label: "Power", type: "number", value: 3 },
          { id: "influence", label: "Influence", type: "number", value: 6 },
          { id: "resources", label: "Resources", type: "number", value: 4 },
          { id: "stability", label: "Stability", type: "number", value: 5 },
        ],
      },
      factionTurn: undefined,
    });
    vault.entities[faction.id] = faction;
    const store = makeStore(vault);

    await store.setEnabled(faction, true);

    expect(vault.entities[faction.id]?.factionTurn?.statRoles).toEqual({
      power: "power",
      influence: "influence",
      resources: "resources",
      stability: "stability",
    });
  });
});

describe("world clock (FR-006, FR-008a, SC-003)", () => {
  it("refuses to propose when the only date is the real-world clock", async () => {
    const store = makeStore(fakeVault(), fakeCalendar("realWorld"));
    const result = await store.propose(factionEntity(), targetEntity);
    expect(result).toBe(null);
    expect(store.lastError).toContain("current date");
  });

  it("refuses to propose when no date is resolved at all", async () => {
    const store = makeStore(fakeVault(), fakeCalendar(null));
    expect(await store.propose(factionEntity(), targetEntity)).toBe(null);
  });

  it("never writes to the calendar config across a full turn (SC-003)", async () => {
    const calendar = fakeCalendar("entity");
    const before = JSON.stringify(calendar.config);
    const vault = fakeVault();
    const store = makeStore(vault, calendar);

    const proposal = await store.propose(factionEntity(), targetEntity);
    expect(proposal).not.toBe(null);
    await store.commit(proposal!);
    expect(JSON.stringify(calendar.config)).toBe(before);
  });
});

describe("propose writes nothing (FR-022)", () => {
  it("makes no vault writes at all", async () => {
    const vault = fakeVault();
    const store = makeStore(vault);
    await store.propose(factionEntity(), targetEntity);
    expect(vault.calls).toEqual([]);
  });

  it("discarding leaves no trace (FR-024)", async () => {
    const vault = fakeVault();
    const store = makeStore(vault);
    await store.propose(factionEntity(), targetEntity);
    store.discard();
    expect(store.proposal).toBe(null);
    expect(vault.calls).toEqual([]);
  });
});

describe("atomic commit (FR-025, FR-025a)", () => {
  it("writes history last, so a failure never leaves an untrue record", async () => {
    const vault = fakeVault();
    const store = makeStore(vault);
    const proposal = await store.propose(factionEntity(), targetEntity);
    await store.commit(proposal!);
    expect(vault.calls[vault.calls.length - 1]).toBe("history");
  });

  it("rolls back and reports failure when the connection write fails", async () => {
    const vault = fakeVault("connection");
    const store = makeStore(vault);
    const proposal = await store.propose(factionEntity(), targetEntity);
    const result = await store.commit(proposal!);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("not applied");
    // Assert the observable end state rather than the call sequence: the
    // rollback is deliberately minimal, touching only the steps that landed.
    const field = vault.entities["faction-a"].statSheet?.fields.find(
      (f) => f.id === "fld_i",
    );
    expect(field?.value).toBe(6);
    // And no history entry may exist for a turn that did not land.
    expect(vault.entities["faction-a"].factionTurn?.history).toEqual([]);
  });

  it("rolls back when the history write fails", async () => {
    // The unrecoverable case if left unhandled: stats changed, no record to
    // undo them with, and the inverse patch dying with the proposal.
    const vault = fakeVault("history");
    const store = makeStore(vault);
    const proposal = await store.propose(factionEntity(), targetEntity);
    const result = await store.commit(proposal!);

    expect(result.ok).toBe(false);
    expect(vault.entities["faction-a"].factionTurn?.history).toEqual([]);
  });

  it("restores the stat value after a failed commit", async () => {
    const vault = fakeVault("history");
    const store = makeStore(vault);
    const proposal = await store.propose(factionEntity(), targetEntity);
    await store.commit(proposal!);
    const field = vault.entities["faction-a"].statSheet?.fields.find(
      (f) => f.id === "fld_i",
    );
    expect(field?.value).toBe(6);
  });

  it("refuses a second concurrent commit", async () => {
    const vault = fakeVault();
    const store = makeStore(vault);
    const proposal = await store.propose(factionEntity(), targetEntity);
    store.isCommitting = true;
    const result = await store.commit(proposal!);
    expect(result.ok).toBe(false);
  });
});

describe("successful commit", () => {
  let vault: ReturnType<typeof fakeVault>;
  let store: FactionTurnStore;

  beforeEach(async () => {
    vault = fakeVault();
    store = makeStore(vault);
  });

  it("records the turn and clears the preview", async () => {
    const proposal = await store.propose(factionEntity(), targetEntity);
    const result = await store.commit(proposal!);
    expect(result.ok).toBe(true);
    expect(store.proposal).toBe(null);
    expect(vault.entities["faction-a"].factionTurn?.history).toHaveLength(1);
  });

  it("creates the faction -> target edge", async () => {
    const proposal = await store.propose(factionEntity(), targetEntity);
    await store.commit(proposal!);
    const connections = vault.entities["faction-a"].connections ?? [];
    expect(connections.some((c) => c.target === "loc-mub")).toBe(true);
  });

  it("does not create an edge on the target back to the faction (FR-032c)", async () => {
    const proposal = await store.propose(factionEntity(), targetEntity);
    await store.commit(proposal!);
    expect(vault.entities["loc-mub"].connections ?? []).toEqual([]);
  });
});

describe("promotion (FR-037, FR-038)", () => {
  it("creates no event without an explicit promote call", async () => {
    const vault = fakeVault();
    const store = makeStore(vault);
    const proposal = await store.propose(factionEntity(), targetEntity);
    await store.commit(proposal!);
    expect(vault.calls).not.toContain("create");
  });

  it("creates an event when promoted, and refuses to promote twice", async () => {
    const vault = fakeVault();
    const store = makeStore(vault);
    const proposal = await store.propose(factionEntity(), targetEntity);
    await store.commit(proposal!);

    const faction = vault.entities["faction-a"];
    const record = faction.factionTurn!.history[0];
    const eventId = await store.promote(faction, record);
    expect(eventId).toBe("event-1");

    const promoted = vault.entities["faction-a"].factionTurn!.history[0];
    expect(promoted.promotedEventId).toBe("event-1");
    expect(await store.promote(vault.entities["faction-a"], promoted)).toBe(
      null,
    );
  });
});

describe("settings", () => {
  it("falls back to defaults when nothing is stored", async () => {
    const store = makeStore(fakeVault());
    await store.loadSettings();
    expect(store.settings.turnIntervalUnit).toBe("month");
    expect(store.settings.turnIntervalAmount).toBe(1);
  });

  it("persists and reloads the quarterly cadence", async () => {
    const store = makeStore(fakeVault());
    await store.saveSettings({
      turnIntervalUnit: "month",
      turnIntervalAmount: 3,
    });
    await store.loadSettings();
    expect(store.settings.turnIntervalUnit).toBe("month");
    expect(store.settings.turnIntervalAmount).toBe(3);
  });
});

/**
 * T080 — the feature's headline promise, asserted across every operation it
 * offers rather than just the one where it is easiest to check.
 *
 * FR-006 and SC-003 say the campaign's world clock is read and never written.
 * A regression here would be invisible until a GM noticed their campaign date
 * had drifted, by which point the wrong dates are already in their history.
 */
describe("the world clock is never written (FR-006, SC-003)", () => {
  it("survives propose, commit, undo and promote untouched", async () => {
    const calendar = fakeCalendar("entity");
    const before = JSON.stringify(calendar);
    const vault = fakeVault();
    const store = makeStore(vault, calendar);

    const proposal = await store.propose(factionEntity(), targetEntity);
    expect(proposal).not.toBe(null);
    expect(JSON.stringify(calendar)).toBe(before);

    await store.commit(proposal!);
    expect(JSON.stringify(calendar)).toBe(before);

    const faction = vault.entities["faction-a"];
    const record = faction.factionTurn!.history[0];

    await store.promote(faction, record);
    expect(JSON.stringify(calendar)).toBe(before);

    await store.undo(vault.entities["faction-a"], record);
    expect(JSON.stringify(calendar)).toBe(before);
  });

  it("survives a discarded preview untouched", async () => {
    const calendar = fakeCalendar("entity");
    const before = JSON.stringify(calendar);
    const store = makeStore(fakeVault(), calendar);

    await store.propose(factionEntity(), targetEntity);
    store.discard();
    expect(JSON.stringify(calendar)).toBe(before);
  });

  it("survives a refused turn untouched", async () => {
    const calendar = fakeCalendar("realWorld");
    const before = JSON.stringify(calendar);
    const store = makeStore(fakeVault(), calendar);

    await store.propose(factionEntity(), targetEntity);
    expect(JSON.stringify(calendar)).toBe(before);
  });
});
