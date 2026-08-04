import { describe, expect, it, vi } from "vitest";
import { VTTTileDeckManager } from "./vtt-tile-deck-manager.svelte";

function createManager(options?: {
  normalizePlacement?: (point: { x: number; y: number }) => {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}) {
  const tokens: Record<string, any> = {};
  const addToken = vi.fn((input) => {
    const token = { id: `tile-${Object.keys(tokens).length}`, ...input };
    tokens[token.id] = token;
    return token;
  });
  const persistDraft = vi.fn();
  let nextId = 0;
  const manager = new VTTTileDeckManager(
    {
      getTokens: () => tokens,
      addToken,
      persistDraft,
      normalizePlacement: options?.normalizePlacement
        ? (point) => options.normalizePlacement!(point)
        : undefined,
    },
    { uuid: () => `id-${nextId++}` },
  );
  return { manager, tokens, addToken, persistDraft };
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
});
