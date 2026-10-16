import { describe, expect, it } from "bun:test";
import { HexDiscoveryService } from "../src/discovery/service";
import { buildHexContext, type HexContext } from "../src/context";
import { PRESET_TERRAIN_IDS, type Terrain } from "../src/terrain";
import {
  DISCOVERY_PART_IDS,
  type HexDiscoveryDraft,
} from "../src/discovery/draft";
import type { HexCrawlState } from "../src/model";

const clock = { now: () => 1_700_000_000_000 };

/** mulberry32: a small seeded generator, so table rolls are repeatable. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const labelFor = (hex: { q: number; r: number }) => `${hex.q}.${hex.r}`;

const context = (): HexContext =>
  buildHexContext({
    hex: { q: 0, r: 0 },
    label: "0.0",
    record: undefined,
    state: { enabled: true, hexes: {} } as HexCrawlState,
    entities: [
      {
        entityId: "f",
        title: "Iron Guild",
        type: "faction",
        summary: "Wardens.",
        hex: { q: 3, r: 0 },
      },
    ],
    labelFor,
  });

const valid = {
  landmark: { title: "Old Mill", description: "A ruined mill by the ford." },
  encounter: { title: "Wolves", description: "A pack shadows the road." },
  hazard: "Loose scree on the slope.",
  secret: "The mill hides a smuggler's cache.",
  factionPresence: {
    faction: "Iron Guild",
    description: "Guild wardens patrol.",
  },
  atmosphere: "Damp air and the smell of wet pine.",
};

const service = () => new HexDiscoveryService({ rng: seeded(7), clock });

const forest: Terrain = { kind: "preset", id: "forest" };

describe("HexDiscoveryService.generate (T058)", () => {
  it("AI: valid output gives an AI draft with all six parts pending", async () => {
    const result = await service().generate({
      context: context(),
      terrain: forest,
      aiDisabled: false,
      modelRunner: async () => valid,
    });
    expect(result.failure).toBeUndefined();
    expect(result.fellBackToTables).toBe(false);
    expect(result.draft?.source).toBe("ai");
    for (const id of DISCOVERY_PART_IDS) {
      expect(result.draft?.parts[id].status).toBe("pending");
      expect(result.draft?.parts[id].source).toBe("ai");
    }
    expect(result.draft?.parts.landmark.text).toBe(
      "Old Mill\nA ruined mill by the ford.",
    );
    expect(result.draft?.parts.factionPresence.factionName).toBe("Iron Guild");
  });

  it("Failure: invalid output gives ai-failed and no silent table fallback", async () => {
    const result = await service().generate({
      context: context(),
      terrain: forest,
      aiDisabled: false,
      modelRunner: async () => ({ landmark: "not an object" }),
    });
    expect(result.failure).toBe("ai-failed");
    expect(result.draft).toBeUndefined();
    expect(result.fellBackToTables).toBe(false);
  });

  it("Failure: a runner that throws gives ai-failed", async () => {
    const result = await service().generate({
      context: context(),
      terrain: forest,
      aiDisabled: false,
      modelRunner: async () => {
        throw new Error("network down");
      },
    });
    expect(result.failure).toBe("ai-failed");
    expect(result.draft).toBeUndefined();
  });

  it("Abort: an aborted signal rejects with AbortError and never calls the runner", async () => {
    const controller = new AbortController();
    controller.abort();
    let called = false;
    await expect(
      service().generate({
        context: context(),
        terrain: forest,
        aiDisabled: false,
        modelRunner: async () => {
          called = true;
          return valid;
        },
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(called).toBe(false);
  });

  it("Abort: a runner that rejects after abort surfaces AbortError", async () => {
    const controller = new AbortController();
    const promise = service().generate({
      context: context(),
      terrain: forest,
      aiDisabled: false,
      modelRunner: () =>
        new Promise((_, reject) => {
          controller.signal.addEventListener("abort", () => {
            const e = new Error("Aborted");
            e.name = "AbortError";
            reject(e);
          });
          controller.abort();
        }),
      signal: controller.signal,
    });
    await expect(promise).rejects.toMatchObject({ name: "AbortError" });
  });

  it("AI disabled: never calls the runner and returns a tables draft", async () => {
    let called = false;
    const result = await service().generate({
      context: context(),
      terrain: forest,
      aiDisabled: true,
      modelRunner: async () => {
        called = true;
        return valid;
      },
    });
    expect(called).toBe(false);
    expect(result.draft?.source).toBe("tables");
    expect(result.fellBackToTables).toBe(true);
  });

  it("no runner: returns a tables draft", async () => {
    const result = await service().generate({
      context: context(),
      terrain: forest,
      aiDisabled: false,
    });
    expect(result.draft?.source).toBe("tables");
  });

  it("custom or no terrain: sets usedGeneralTables, a preset does not", async () => {
    const custom = await service().generate({
      context: context(),
      terrain: { kind: "custom", label: "Glass flats" },
      aiDisabled: true,
    });
    expect(custom.draft?.usedGeneralTables).toBe(true);

    const none = await service().generate({
      context: context(),
      aiDisabled: true,
    });
    expect(none.draft?.usedGeneralTables).toBe(true);

    const preset = await service().generate({
      context: context(),
      terrain: forest,
      aiDisabled: true,
    });
    expect(preset.draft?.usedGeneralTables).not.toBe(true);
  });
});

describe("HexDiscoveryService.regeneratePart (T058)", () => {
  const tablesDraft = (): HexDiscoveryDraft =>
    service().rollFromTables(forest, ["Iron Guild"]);

  it("changes only the requested part (FR-023)", async () => {
    const before = tablesDraft();
    const result = await service().regeneratePart({
      part: "hazard",
      draft: before,
      context: context(),
      terrain: forest,
      aiDisabled: true,
    });
    for (const id of DISCOVERY_PART_IDS) {
      if (id === "hazard") continue;
      expect(result.draft.parts[id]).toEqual(before.parts[id]);
    }
    expect(result.draft.parts.hazard.status).toBe("pending");
  });

  it("AI regeneration of one part replaces only that part", async () => {
    const before = tablesDraft();
    const result = await service().regeneratePart({
      part: "secret",
      draft: before,
      context: context(),
      terrain: forest,
      aiDisabled: false,
      modelRunner: async () => ({ secret: "A hidden spring under the moss." }),
    });
    expect(result.draft.parts.secret.text).toBe(
      "A hidden spring under the moss.",
    );
    expect(result.draft.parts.secret.source).toBe("ai");
    for (const id of DISCOVERY_PART_IDS) {
      if (id === "secret") continue;
      expect(result.draft.parts[id]).toEqual(before.parts[id]);
    }
  });

  it("negative: invalid AI output keeps the previous draft and reports ai-failed", async () => {
    const before = tablesDraft();
    const result = await service().regeneratePart({
      part: "landmark",
      draft: before,
      context: context(),
      terrain: forest,
      aiDisabled: false,
      modelRunner: async () => ({ landmark: { title: "" } }),
    });
    expect(result.failure).toBe("ai-failed");
    expect(result.draft).toEqual(before);
  });
});

describe("HexDiscoveryService.rollFromTables (T058)", () => {
  it("names the nearest faction for faction presence, or says none holds sway", () => {
    const withFaction = service().rollFromTables(forest, ["Iron Guild"]);
    expect(withFaction.parts.factionPresence.factionName).toBe("Iron Guild");
    const none = service().rollFromTables(forest, []);
    expect(none.parts.factionPresence.text).toBe("No faction holds sway here.");
    expect(none.parts.factionPresence.factionName).toBeUndefined();
  });

  it("is repeatable for a fixed seed", () => {
    const a = new HexDiscoveryService({
      rng: seeded(99),
      clock,
    }).rollFromTables(forest, []);
    const b = new HexDiscoveryService({
      rng: seeded(99),
      clock,
    }).rollFromTables(forest, []);
    expect(a).toEqual(b);
  });

  it("completes in under a second for every preset and for custom terrain (SC-003)", () => {
    const terrains: Terrain[] = [
      ...PRESET_TERRAIN_IDS.map((id) => ({ kind: "preset" as const, id })),
      { kind: "custom", label: "Glass flats" },
    ];
    for (const terrain of terrains) {
      const start = performance.now();
      service().rollFromTables(terrain, ["Iron Guild"]);
      expect(performance.now() - start).toBeLessThan(1000);
    }
  });
});

describe("HexDiscoveryService prompts (T058)", () => {
  it("tells the model to avoid repeating existing hex contents (FR-029)", async () => {
    let system = "";
    let user = "";
    await service().generate({
      context: context(),
      terrain: forest,
      aiDisabled: false,
      modelRunner: async (s, u) => {
        system = s;
        user = u;
        return valid;
      },
    });
    expect(system).toMatch(/avoid repeating/i);
    expect(system).toMatch(/treat .* as canon/i);
    expect(system).toMatch(/json/i);
    expect(user).toContain("0.0");
  });
});
