import { describe, expect, it, vi } from "vitest";
import { VTTTileDeckManager } from "./vtt-tile-deck-manager.svelte";

function createManager(options?: {
  normalizePlacement?: (point: { x: number; y: number }) => {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  getActiveLayer?: () => string;
  tokens?: Record<string, any>;
}) {
  const tokens: Record<string, any> = options?.tokens ?? {};
  const addToken = vi.fn((input) => {
    const token = { id: `tile-${Object.keys(tokens).length}`, ...input };
    tokens[token.id] = token;
    return token;
  });
  const persistDraft = vi.fn();
  let nextId = 0;
  let activeLayer = "terrain";
  const getActiveLayer = options?.getActiveLayer
    ? (options.getActiveLayer as any)
    : () => activeLayer;
  const setActiveLayer = vi.fn((layer: any) => {
    activeLayer = layer;
  });
  const manager = new VTTTileDeckManager(
    {
      getTokens: () => tokens,
      addToken,
      persistDraft,
      normalizePlacement: options?.normalizePlacement
        ? (point) => options.normalizePlacement!(point)
        : undefined,
      getActiveLayer,
      setActiveLayer,
    },
    { uuid: () => `id-${nextId++}` },
  );
  return { manager, tokens, addToken, persistDraft, setActiveLayer };
}

describe("VTTTileDeckManager", () => {
  it("creates a persisted deck and draws a square image tile", () => {
    const { manager, addToken, persistDraft } = createManager();
    const deck = manager.createDeck("Rooms", [
      { name: "Crypt", imagePath: "files/crypt.png" },
    ]);

    expect(deck?.tiles[0].id).toBe("id-1");
    expect(persistDraft).toHaveBeenCalledOnce();

    const tile = manager.draw(deck!.id, 200);
    expect(tile).toMatchObject({ name: "Crypt", imagePath: "files/crypt.png" });
    manager.updatePendingPlacement(25, 50);
    const placed = manager.placePending();
    expect(placed).toMatchObject({ kind: "tile", tileDeckId: deck!.id });
    expect(persistDraft).toHaveBeenCalledTimes(2);
    expect(addToken).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Crypt",
        imageUrl: "files/crypt.png",
        baseShape: "square",
        width: 200,
        height: 200,
      }),
      false,
    );
  });

  it("streams tiles into a deck started empty, persisting only on explicit calls", () => {
    const { manager, persistDraft } = createManager();
    const deck = manager.beginDeck(
      "Geomorphs",
      "majcher-geomorphs-2013",
      "CC BY 4.0",
      "https://majcher.itch.io/geomorphs-2013",
    );

    expect(deck).toMatchObject({
      name: "Geomorphs",
      starterDeckId: "majcher-geomorphs-2013",
      license: "CC BY 4.0",
      sourceUrl: "https://majcher.itch.io/geomorphs-2013",
      tiles: [],
    });
    expect(persistDraft).not.toHaveBeenCalled();

    manager.addTile(deck!.id, {
      name: "Geomorph 1",
      imagePath: "full_0001.png",
    });
    manager.addTile(deck!.id, {
      name: "Geomorph 2",
      imagePath: "full_0002.png",
    });

    expect(manager.decks[0].tiles).toHaveLength(2);
    expect(persistDraft).not.toHaveBeenCalled();

    manager.persist();
    expect(persistDraft).toHaveBeenCalledOnce();
  });

  it("draws from any deck, weighting every tile equally", () => {
    const { manager } = createManager();
    manager.createDeck("Small", [{ name: "Only tile", imagePath: "only.png" }]);
    manager.createDeck("Big", [
      { name: "A", imagePath: "a.png" },
      { name: "B", imagePath: "b.png" },
      { name: "C", imagePath: "c.png" },
    ])!;

    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const tile = manager.drawAny();
      manager.cancelPendingPlacement();
      seen.add(tile!.name);
    }

    // With 200 draws across 4 equally-weighted tiles, every tile should
    // have come up at least once — flags a bug where drawAny always picks
    // the same deck (which would starve the single-tile "Small" deck).
    expect(seen).toEqual(new Set(["Only tile", "A", "B", "C"]));
  });

  it("returns null from drawAny when no deck has tiles", () => {
    const { manager } = createManager();
    manager.beginDeck("Empty");
    expect(manager.drawAny()).toBeNull();
  });

  it("removes a deck and cancels any pending placement from it", () => {
    const { manager, persistDraft } = createManager();
    const deck = manager.createDeck("Rooms", [
      { name: "Crypt", imagePath: "files/crypt.png" },
    ]);
    manager.draw(deck!.id);
    expect(manager.pendingPlacement).not.toBeNull();
    persistDraft.mockClear();

    expect(manager.removeDeck(deck!.id)).toBe(true);
    expect(manager.decks).toHaveLength(0);
    expect(manager.pendingPlacement).toBeNull();
    expect(persistDraft).toHaveBeenCalledOnce();

    expect(manager.removeDeck(deck!.id)).toBe(false);
  });

  it("refuses empty decks and hard-edge placements that overlap an existing tile", () => {
    const { manager, tokens, addToken } = createManager();
    expect(
      manager.createDeck("", [{ name: "Room", imagePath: "room.png" }]),
    ).toBeNull();
    expect(manager.createDeck("Empty", [])).toBeNull();

    const deck = manager.createDeck("Rooms", [
      { name: "Room", imagePath: "room.png" },
    ])!;
    manager.setHardEdges(deck.id, true);
    tokens.existing = {
      id: "existing",
      kind: "tile",
      x: 0,
      y: 0,
      width: 150,
      height: 150,
    };

    expect(manager.draw(deck.id, 150)).not.toBeNull();
    manager.updatePendingPlacement(100, 100);
    expect(manager.placePending()).toBeNull();
    expect(addToken).not.toHaveBeenCalled();
  });

  it("starts placement for a selected tile and rejects a missing tile", () => {
    const { manager } = createManager();
    const deck = manager.createDeck("Rooms", [
      {
        name: "Round room",
        imagePath: "round-room.png",
        category: "Rooms & walls",
      },
    ]);
    expect(deck).not.toBeNull();

    expect(manager.select(deck!.id, deck!.tiles[0].id)).toEqual(deck!.tiles[0]);
    expect(manager.pendingPlacement?.tile.category).toBe("Rooms & walls");
    expect(manager.select(deck!.id, "missing")).toBeNull();
  });

  it("snaps a new tile's edge to a nearby placed tile", () => {
    const { manager, tokens } = createManager();
    const deck = manager.createDeck("Rooms", [
      { name: "Room", imagePath: "room.png" },
    ])!;
    tokens.existing = {
      id: "existing",
      kind: "tile",
      x: 0,
      y: 0,
      width: 150,
      height: 150,
    };

    manager.draw(deck.id, 150);
    // Dropped a few pixels right of and level with the existing tile.
    manager.updatePendingPlacement(158, 4);

    expect(manager.pendingPlacement).toMatchObject({ x: 150, y: 0 });
  });

  it("checks hard edges at the final snapped placement", () => {
    const { manager, tokens } = createManager({
      normalizePlacement: () => ({ x: 150, y: 0, width: 150, height: 150 }),
    });
    const deck = manager.createDeck("Rooms", [
      { name: "Room", imagePath: "room.png" },
    ])!;
    manager.setHardEdges(deck.id, true);
    tokens.existing = {
      id: "existing",
      kind: "tile",
      x: 150,
      y: 0,
      width: 150,
      height: 150,
    };
    manager.draw(deck.id);
    manager.updatePendingPlacement(149, 0);
    expect(manager.pendingPlacement?.valid).toBe(false);
  });

  it("scopes a newly placed tile's zIndex to the active layer, ignoring other layers", () => {
    const { manager, addToken } = createManager({
      getActiveLayer: () => "terrain",
      tokens: {
        "high-token": { id: "high-token", layer: "token", zIndex: 100 },
        "terrain-tile": { id: "terrain-tile", layer: "terrain", zIndex: 2 },
      },
    });
    const deck = manager.createDeck("Rooms", [
      { name: "Crypt", imagePath: "files/crypt.png" },
    ])!;

    manager.draw(deck.id, 150);
    manager.updatePendingPlacement(0, 0);
    manager.placePending();

    expect(addToken).toHaveBeenCalledWith(
      expect.objectContaining({ zIndex: 3 }),
      false,
    );
  });

  it("places a geomorph tile on the terrain layer regardless of the active layer", () => {
    const { manager, addToken, setActiveLayer } = createManager({
      getActiveLayer: () => "token",
    });
    const deck = manager.createDeck("Geomorphs 2013", [
      { name: "Geomorph 1", imagePath: "full_0001.png", category: "Geomorphs" },
    ])!;

    manager.draw(deck.id, 150);
    manager.updatePendingPlacement(0, 0);
    manager.placePending();

    expect(addToken).toHaveBeenCalledWith(
      expect.objectContaining({ layer: "terrain" }),
      false,
    );
    expect(setActiveLayer).toHaveBeenCalledWith("terrain");
  });

  it("leaves non-terrain tiles on the active layer", () => {
    const { manager, addToken, setActiveLayer } = createManager({
      getActiveLayer: () => "object",
    });
    const deck = manager.createDeck("Scribble Dungeons", [
      { name: "Chest", imagePath: "chest.png", category: "Props & overlays" },
    ])!;

    manager.draw(deck.id, 150);
    manager.updatePendingPlacement(0, 0);
    manager.placePending();

    expect(addToken).toHaveBeenCalledWith(
      expect.objectContaining({ layer: "object" }),
      false,
    );
    expect(setActiveLayer).not.toHaveBeenCalled();
  });
});
