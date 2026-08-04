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

describe("StarterTileDeckService", () => {
  it("prefetches R2 tiles into the vault before creating a local deck", async () => {
    const importFile = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, file: { path: "files/room.png" } })
      .mockResolvedValueOnce({
        ok: true,
        file: { path: "files/corridor.png" },
      });
    const createDeck = vi.fn().mockReturnValue({
      id: "deck-1",
      name: manifest.name,
      starterDeckId: manifest.id,
      tiles: [],
      hardEdges: false,
    });
    const fetch = vi.fn(async (url: string) => {
      if (url.endsWith("kenney-scribble-dungeons")) {
        return new Response(JSON.stringify(manifest));
      }
      return new Response(new Blob(["png"], { type: "image/png" }));
    });
    const service = new StarterTileDeckService({
      fetch: fetch as typeof globalThis.fetch,
      baseUrl: "https://assets.example",
      importFile,
      getDecks: () => [],
      createDeck,
    });

    await expect(service.install(manifest.id)).resolves.toMatchObject({
      starterDeckId: manifest.id,
    });
    expect(importFile).toHaveBeenCalledTimes(2);
    expect(createDeck).toHaveBeenCalledWith(
      manifest.name,
      [
        {
          name: "Room",
          imagePath: "files/room.png",
          category: "Rooms & walls",
        },
        {
          name: "Corridor",
          imagePath: "files/corridor.png",
          category: "Corridors",
        },
      ],
      manifest.id,
    );
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
      createDeck: vi.fn(),
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
      createDeck: vi.fn(),
    });

    await expect(service.install(manifest.id)).rejects.toThrow(
      "catalog is invalid",
    );
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
