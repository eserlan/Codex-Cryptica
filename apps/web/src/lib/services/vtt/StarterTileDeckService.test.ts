import { describe, expect, it, vi } from "vitest";
import {
  getTileCategory,
  getTileCategoryFromName,
  StarterTileDeckService,
} from "./StarterTileDeckService";

const manifest = {
  id: "kenney-scribble-dungeons",
  name: "Scribble Dungeons",
  sourceUrl: "https://kenney.nl/assets/scribble-dungeons",
  license: "CC0-1.0",
  tiles: [
    { id: "room", name: "Room", assetPath: "rooms/room.png" },
    { id: "corridor", name: "Corridor", assetPath: "corridors/corridor.png" },
  ],
};

/** Simulates VTTTileDeckManager's beginDeck/addTile/persist against an in-memory list. */
function createFakeDeckStore() {
  const decks: Array<{
    id: string;
    name: string;
    starterDeckId?: string;
    license?: string;
    sourceUrl?: string;
    tiles: Array<{
      id: string;
      name: string;
      imagePath: string;
      category?: string;
    }>;
    hardEdges: boolean;
  }> = [];
  let nextDeckId = 0;
  let nextTileId = 0;

  return {
    decks,
    getDecks: () => decks,
    beginDeck: vi.fn(
      (
        name: string,
        starterDeckId?: string,
        license?: string,
        sourceUrl?: string,
      ) => {
        const deck = {
          id: `deck-${nextDeckId++}`,
          name,
          starterDeckId,
          license,
          sourceUrl,
          tiles: [],
          hardEdges: false,
        };
        decks.push(deck);
        return deck;
      },
    ),
    addTile: vi.fn(
      (
        deckId: string,
        tile: { name: string; imagePath: string; category?: string },
      ) => {
        const deck = decks.find((d) => d.id === deckId);
        deck?.tiles.push({ ...tile, id: `tile-${nextTileId++}` });
      },
    ),
    persist: vi.fn(),
  };
}

describe("StarterTileDeckService", () => {
  it("streams R2 tiles into a deck created up front, reporting progress", async () => {
    const importFile = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, file: { path: "files/room.png" } })
      .mockResolvedValueOnce({
        ok: true,
        file: { path: "files/corridor.png" },
      });
    const store = createFakeDeckStore();
    const fetch = vi.fn(async (url: string) => {
      if (url.endsWith("kenney-scribble-dungeons")) {
        return new Response(JSON.stringify(manifest));
      }
      return new Response(new Blob(["png"], { type: "image/png" }));
    });
    const service = new StarterTileDeckService({
      fetch: fetch as typeof globalThis.fetch,
      baseUrl: "https://assets.example",
      concurrency: 1,
      importFile,
      ...store,
    });

    const onProgress = vi.fn();
    const deck = await service.install(manifest.id, onProgress);

    expect(deck.starterDeckId).toBe(manifest.id);
    expect(store.beginDeck).toHaveBeenCalledWith(
      manifest.name,
      manifest.id,
      manifest.license,
      manifest.sourceUrl,
    );
    expect(importFile).toHaveBeenCalledTimes(2);
    expect(store.decks[0].tiles).toEqual([
      expect.objectContaining({
        name: "Room",
        imagePath: "files/room.png",
        category: "Rooms & walls",
      }),
      expect.objectContaining({
        name: "Corridor",
        imagePath: "files/corridor.png",
        category: "Corridors",
      }),
    ]);
    expect(onProgress).toHaveBeenCalledWith(0, 2);
    expect(onProgress).toHaveBeenCalledWith(1, 2);
    expect(onProgress).toHaveBeenCalledWith(2, 2);
    expect(store.persist).toHaveBeenCalled();
  });

  it("prefers a manifest-provided tile category over the derived one", async () => {
    const withCategory = {
      ...manifest,
      tiles: [
        {
          id: "square",
          name: "5x5 square",
          assetPath: "square.png",
          category: "5x5",
        },
      ],
    };
    const importFile = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, file: { path: "files/square.png" } });
    const store = createFakeDeckStore();
    const fetch = vi.fn(async () => new Response(JSON.stringify(withCategory)));
    const service = new StarterTileDeckService({
      fetch: fetch as typeof globalThis.fetch,
      baseUrl: "https://assets.example",
      importFile,
      ...store,
    });

    await service.install(withCategory.id);

    expect(store.decks[0].tiles).toEqual([
      expect.objectContaining({
        name: "5x5 square",
        imagePath: "files/square.png",
        category: "5x5",
      }),
    ]);
  });

  it("does not fetch or duplicate an installed starter deck", async () => {
    const fetch = vi.fn();
    const deck = {
      id: "deck-1",
      name: manifest.name,
      starterDeckId: manifest.id,
      tiles: [],
      hardEdges: false,
    };
    const service = new StarterTileDeckService({
      fetch,
      importFile: vi.fn(),
      getDecks: () => [deck],
      beginDeck: vi.fn(),
      addTile: vi.fn(),
      persist: vi.fn(),
    });

    await expect(service.install(manifest.id)).resolves.toBe(deck);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects unsafe catalog asset paths", async () => {
    const service = new StarterTileDeckService({
      fetch: vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ...manifest,
            tiles: [{ ...manifest.tiles[0], assetPath: "../room.png" }],
          }),
        ),
      ),
      importFile: vi.fn(),
      getDecks: () => [],
      beginDeck: vi.fn(),
      addTile: vi.fn(),
      persist: vi.fn(),
    });

    await expect(service.install(manifest.id)).rejects.toThrow(
      "catalog is invalid",
    );
  });

  it("keeps already-downloaded tiles and persists when a later tile fails", async () => {
    const importFile = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, file: { path: "files/room.png" } });
    const store = createFakeDeckStore();
    const fetch = vi.fn(async (url: string) => {
      if (url.endsWith("kenney-scribble-dungeons")) {
        return new Response(JSON.stringify(manifest));
      }
      if (url.includes("corridor")) {
        return new Response("nope", { status: 500 });
      }
      return new Response(new Blob(["png"], { type: "image/png" }));
    });
    const service = new StarterTileDeckService({
      fetch: fetch as typeof globalThis.fetch,
      baseUrl: "https://assets.example",
      concurrency: 1,
      importFile,
      ...store,
    });

    await expect(service.install(manifest.id)).rejects.toThrow(
      "Could not prefetch Corridor.",
    );
    expect(store.decks[0].tiles).toHaveLength(1);
    expect(store.decks[0].tiles[0]).toMatchObject({ name: "Room" });
    expect(store.persist).toHaveBeenCalled();
  });

  it("derives the starter deck category from the source path", () => {
    expect(getTileCategory("Characters/green_character.png")).toBe(
      "Characters",
    );
    expect(getTileCategory("Items/weapon_sword.png")).toBe("Items");
    expect(getTileCategory("floor_path_curve.png")).toBe("Corridors");
    expect(getTileCategory("floor_wall_corner.png")).toBe("Rooms & walls");
    expect(getTileCategory("floor_chest.png")).toBe("Props & overlays");
    expect(getTileCategoryFromName("floor wall corner")).toBe("Rooms & walls");
  });
});
