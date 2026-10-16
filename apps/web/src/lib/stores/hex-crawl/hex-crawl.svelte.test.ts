import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Map as MapRecord } from "schema";
import { HexCrawlStore, type HexCrawlStoreDeps } from "./hex-crawl.svelte";

const MAP_ID = "11111111-1111-4111-8111-111111111111";
const NOW = 1_700_000_000_000;

function makeMap(hexCrawl?: MapRecord["hexCrawl"]): MapRecord {
  return {
    id: MAP_ID,
    name: "Overland",
    assetPath: "maps/overland.webp",
    dimensions: { width: 800, height: 600 },
    pins: [],
    hexCrawl,
  } as MapRecord;
}

function setup(overrides: Partial<HexCrawlStoreDeps> = {}) {
  const maps: Record<string, MapRecord> = { [MAP_ID]: makeMap() };
  const deps: HexCrawlStoreDeps = {
    getMap: (id) => maps[id],
    saveMaps: vi.fn(async () => true),
    clock: { now: () => NOW },
    publishCapture: vi.fn(),
    isGM: () => true,
    isGuest: () => false,
    ...overrides,
  };
  return { store: new HexCrawlStore(deps), maps, deps };
}

describe("HexCrawlStore (T010)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("turns the mode on and off, and turning it off keeps the hex data (FR-001/002)", async () => {
    const { store, maps, deps } = setup();
    await store.setTerrain(
      MAP_ID,
      { q: 1, r: 1 },
      { kind: "preset", id: "forest" },
    );

    await store.setEnabled(MAP_ID, true);
    expect(store.isEnabled(MAP_ID)).toBe(true);
    expect(maps[MAP_ID].hexCrawl?.enabled).toBe(true);

    await store.setEnabled(MAP_ID, false);
    expect(store.isEnabled(MAP_ID)).toBe(false);
    expect(store.recordFor(MAP_ID, { q: 1, r: 1 })?.terrain).toEqual({
      kind: "preset",
      id: "forest",
    });
    expect(deps.saveMaps).toHaveBeenCalled();
  });

  it("persists terrain and notes, and prunes a record once it is empty again (FR-011)", async () => {
    const { store, maps } = setup();
    const hex = { q: 2, r: -1 };

    await store.setTerrain(MAP_ID, hex, {
      kind: "custom",
      label: "Glass dunes",
    });
    await store.setNotes(MAP_ID, hex, "The ruin hides a cult.");
    expect(store.recordFor(MAP_ID, hex)?.notes).toBe("The ruin hides a cult.");

    await store.setNotes(MAP_ID, hex, "");
    await store.setTerrain(MAP_ID, hex, null);
    expect(store.recordFor(MAP_ID, hex)).toBeUndefined();
    expect(maps[MAP_ID].hexCrawl?.hexes["2,-1"]).toBeUndefined();
  });

  it("keeps AI notes separate from GM notes (FR-027)", async () => {
    const { store } = setup();
    const hex = { q: 0, r: 0 };
    await store.setNotes(MAP_ID, hex, "GM text");
    await store.setAiNotes(MAP_ID, hex, "Hazard: sinkholes");

    const record = store.recordFor(MAP_ID, hex);
    expect(record?.notes).toBe("GM text");
    expect(record?.aiNotes).toBe("Hazard: sinkholes");
  });

  it("sets and removes a discovery draft, pruning the record when nothing else is left (FR-033a)", async () => {
    const { store } = setup();
    const hex = { q: 3, r: 3 };
    const draft = {
      source: "tables" as const,
      createdAt: NOW,
      parts: Object.fromEntries(
        [
          "landmark",
          "encounter",
          "hazard",
          "secret",
          "factionPresence",
          "atmosphere",
        ].map((id) => [
          id,
          { text: "A thing", source: "tables", status: "pending" },
        ]),
      ) as any,
    };

    await store.setDraft(MAP_ID, hex, draft);
    expect(store.recordFor(MAP_ID, hex)?.draft?.source).toBe("tables");

    await store.setDraft(MAP_ID, hex, null);
    expect(store.recordFor(MAP_ID, hex)).toBeUndefined();
  });

  it("is a no-op for guests and non-GM clients (negative cases)", async () => {
    for (const deps of [{ isGuest: () => true }, { isGM: () => false }]) {
      const { store, maps, deps: d } = setup(deps);
      expect(await store.setEnabled(MAP_ID, true)).toBe(false);
      expect(await store.setNotes(MAP_ID, { q: 0, r: 0 }, "x")).toBe(false);
      expect(maps[MAP_ID].hexCrawl).toBeUndefined();
      expect(d.saveMaps).not.toHaveBeenCalled();
    }
  });

  it("is a no-op for an unknown map", async () => {
    const { store, deps } = setup();
    expect(await store.setEnabled("missing", true)).toBe(false);
    expect(deps.saveMaps).not.toHaveBeenCalled();
  });

  it("tracks the selected hex and remembers the opener for focus return", () => {
    const { store } = setup();
    const opener = { focus: vi.fn() } as unknown as HTMLElement;

    store.openHex(MAP_ID, { q: 4, r: 5 }, opener);
    expect(store.selectedHex).toEqual({ mapId: MAP_ID, hex: { q: 4, r: 5 } });

    store.closeHex();
    expect(store.selectedHex).toBeNull();
    expect(opener.focus).toHaveBeenCalledTimes(1);
  });
});

describe("HexCrawlStore.setExplored (T046, FR-019)", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(["party", "gm"] as const)(
    "marks a hex explored via %s and publishes exactly one capture",
    async (via) => {
      const { store, deps } = setup({
        formatHex: (_mapId, hex) => `Hex ${hex.q}.${hex.r}`,
      });
      const hex = { q: 2, r: 3 };
      await store.setTerrain(MAP_ID, hex, { kind: "preset", id: "forest" });

      const result = await store.setExplored(MAP_ID, hex, true, via);

      expect(result).toEqual({ newlyExplored: true });
      expect(store.recordFor(MAP_ID, hex)?.explored).toBe(true);
      expect(deps.publishCapture).toHaveBeenCalledTimes(1);
      expect(deps.publishCapture).toHaveBeenCalledWith(
        expect.objectContaining({
          entryType: "hex-explored",
          content: "Explored hex Hex 2.3 (Forest)",
        }),
      );
    },
  );

  it("sets exploredAt from the injected clock", async () => {
    const { store } = setup();
    await store.setExplored(MAP_ID, { q: 0, r: 0 }, true, "party");
    expect(store.recordFor(MAP_ID, { q: 0, r: 0 })?.exploredAt).toBe(NOW);
  });

  it("returns newlyExplored false and publishes nothing for an already explored hex", async () => {
    const { store, deps } = setup();
    const hex = { q: 1, r: 0 };
    await store.setExplored(MAP_ID, hex, true, "party");
    vi.mocked(deps.publishCapture).mockClear();

    const again = await store.setExplored(MAP_ID, hex, true, "gm");

    expect(again).toEqual({ newlyExplored: false });
    expect(deps.publishCapture).not.toHaveBeenCalled();
  });

  it("clears exploredAt and publishes nothing when a hex is marked unexplored", async () => {
    const { store, deps } = setup();
    const hex = { q: 4, r: 4 };
    await store.setExplored(MAP_ID, hex, true, "party");
    vi.mocked(deps.publishCapture).mockClear();

    const result = await store.setExplored(MAP_ID, hex, false, "gm");

    expect(result).toEqual({ newlyExplored: false });
    expect(store.recordFor(MAP_ID, hex)?.explored).toBeUndefined();
    expect(store.recordFor(MAP_ID, hex)?.exploredAt).toBeUndefined();
    expect(deps.publishCapture).not.toHaveBeenCalled();
  });

  it("does nothing for guests and non-GM clients (negative cases)", async () => {
    for (const overrides of [{ isGuest: () => true }, { isGM: () => false }]) {
      const { store, deps } = setup(overrides);
      const result = await store.setExplored(
        MAP_ID,
        { q: 0, r: 0 },
        true,
        "party",
      );
      expect(result).toEqual({ newlyExplored: false });
      expect(store.recordFor(MAP_ID, { q: 0, r: 0 })).toBeUndefined();
      expect(deps.publishCapture).not.toHaveBeenCalled();
    }
  });
});

describe("HexCrawlStore.updateHex (atomic multi-field write)", () => {
  it("applies several fields in one save and prunes the record when they clear it", async () => {
    const { store, deps } = setup();
    const hex = { q: 7, r: 7 };
    await store.setTerrain(MAP_ID, hex, { kind: "preset", id: "hills" });
    vi.mocked(deps.saveMaps).mockClear();

    const written = await store.updateHex(MAP_ID, hex, {
      aiNotes: "Hazard: sinkholes",
      draft: undefined,
    });

    expect(written).toBe(true);
    expect(deps.saveMaps).toHaveBeenCalledTimes(1);
    expect(store.recordFor(MAP_ID, hex)?.aiNotes).toBe("Hazard: sinkholes");
    expect(store.recordFor(MAP_ID, hex)?.notes).toBeUndefined();
  });

  it("writes nothing for a guest (negative case)", async () => {
    const { store, deps } = setup({ isGuest: () => true });
    expect(await store.updateHex(MAP_ID, { q: 0, r: 0 }, { notes: "x" })).toBe(
      false,
    );
    expect(deps.saveMaps).not.toHaveBeenCalled();
  });
});
