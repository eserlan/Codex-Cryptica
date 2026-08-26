import { describe, expect, it, vi } from "vitest";
import { VTTTokenManager } from "./vtt-token-manager.svelte";

function createManager(overrides: Partial<any> = {}) {
  const addTokenToInitiativeState = vi.fn();
  const manager = new VTTTokenManager({
    emit: vi.fn(),
    getMapStore: () => ({ activeMap: null, gridSize: 50 }),
    getVault: () => ({}),
    getMode: () => "combat",
    persistDraft: vi.fn(),
    getMyPeerId: () => null,
    queueSessionSnapshotBroadcast: vi.fn(),
    broadcastSessionSnapshotNow: vi.fn(),
    addTokenToInitiativeState,
    getActiveLayer: () => "token",
    isLayerLocked: () => false,
    ...overrides,
  });
  return { manager, addTokenToInitiativeState };
}

describe("VTTTokenManager.addToken", () => {
  it("registers a regular token with the initiative tracker", () => {
    const { manager, addTokenToInitiativeState } = createManager();

    const token = manager.addToken({ name: "Goblin", x: 0, y: 0 }, true);

    expect(addTokenToInitiativeState).toHaveBeenCalledWith(token.id);
  });

  it("does not register a placed tile with the initiative tracker", () => {
    const { manager, addTokenToInitiativeState } = createManager();

    manager.addToken(
      { name: "Room", x: 0, y: 0, kind: "tile", tileDeckId: "deck-1" },
      true,
    );

    expect(addTokenToInitiativeState).not.toHaveBeenCalled();
  });

  it("places a note hidden from players and out of the initiative tracker", () => {
    const { manager, addTokenToInitiativeState } = createManager();

    const note = manager.addToken(
      { name: "Guard post", x: 0, y: 0, kind: "note", noteBody: "2 goblins" },
      true,
    );

    expect(note.kind).toBe("note");
    expect(note.noteBody).toBe("2 goblins");
    expect(note.visibleTo).toBe("gm-only");
    expect(note.baseShape).toBe("square");
    expect(note.facingIndicator).toBe(false);
    expect(addTokenToInitiativeState).not.toHaveBeenCalled();
  });

  it("lets a note be placed visible to players when asked for explicitly", () => {
    const { manager } = createManager();

    const note = manager.addToken(
      { name: "Landmark", x: 0, y: 0, kind: "note", visibleTo: "all" },
      true,
    );

    expect(note.visibleTo).toBe("all");
  });

  it("gives a note an empty body rather than leaving it undefined", () => {
    const { manager } = createManager();

    const note = manager.addToken(
      { name: "Blank", x: 0, y: 0, kind: "note" },
      true,
    );

    expect(note.noteBody).toBe("");
  });

  it("leaves noteBody off tokens that are not notes", () => {
    const { manager } = createManager();

    const token = manager.addToken({ name: "Goblin", x: 0, y: 0 }, true);

    expect(token.noteBody).toBeUndefined();
  });

  it("drops a note at the middle of the current view when given no position", () => {
    const { manager } = createManager({
      getMapStore: () => ({
        activeMap: null,
        gridSize: 50,
        canvasSize: { width: 800, height: 600 },
        unproject: (point: { x: number; y: number }) => ({
          x: point.x * 2,
          y: point.y * 2,
        }),
      }),
    });

    expect(manager.viewportCenterPoint()).toEqual({ x: 800, y: 600 });
  });

  it("falls back to the map origin before the canvas has been measured", () => {
    const { manager } = createManager({
      getMapStore: () => ({
        activeMap: null,
        gridSize: 50,
        canvasSize: { width: 0, height: 0 },
        unproject: () => ({ x: 999, y: 999 }),
      }),
    });

    expect(manager.viewportCenterPoint()).toEqual({ x: 0, y: 0 });
  });

  it("carries a note's body along with the update that reveals it", () => {
    const emit = vi.fn();
    const { manager } = createManager({ emit });
    const note = manager.addToken(
      { name: "Guard post", x: 0, y: 0, kind: "note", noteBody: "2 goblins" },
      true,
    );
    emit.mockClear();

    manager.toggleTokenVisibility(note.id);

    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "TOKEN_STATE_UPDATE",
        delta: expect.objectContaining({
          visibleTo: "all",
          noteBody: "2 goblins",
        }),
      }),
    );
  });

  it("snaps a dragged tile to align with a neighboring tile's edge", () => {
    const { manager } = createManager();
    manager.addToken(
      {
        name: "Anchor",
        x: 0,
        y: 0,
        width: 150,
        height: 150,
        kind: "tile",
        tileDeckId: "deck-1",
      },
      true,
    );
    const moving = manager.addToken(
      {
        name: "Moving",
        x: 150,
        y: 0,
        width: 150,
        height: 150,
        kind: "tile",
        tileDeckId: "deck-1",
      },
      true,
    );

    // Nudged a few px off its snapped position, right next to the anchor.
    const updated = manager.updateToken(moving.id, { x: 156, y: -4 }, true);

    expect(updated).toMatchObject({ x: 150, y: 0 });
  });

  it("does not tile-snap a regular (non-tile) token", () => {
    const { manager } = createManager();
    manager.addToken(
      {
        name: "Anchor",
        x: 0,
        y: 0,
        width: 150,
        height: 150,
        kind: "tile",
        tileDeckId: "deck-1",
      },
      true,
    );
    const character = manager.addToken({ name: "Hero", x: 300, y: 300 }, true);

    const updated = manager.updateToken(character.id, { x: 156, y: -4 }, true);

    expect(updated).toMatchObject({ x: 156, y: -4 });
  });

  it("floors a new character token's default size, even on a very fine grid", () => {
    // A grid fit to a tile's native pixel grid (e.g. a geomorph pack) can
    // legitimately be much smaller than any sane token size.
    const { manager } = createManager({
      getMapStore: () => ({ activeMap: null, gridSize: 15 }),
    });

    const token = manager.addToken({ name: "Hero", x: 0, y: 0 }, true);

    expect(token).toMatchObject({ width: 30, height: 30 });
  });

  it("still uses the grid size directly once it's above the token floor", () => {
    const { manager } = createManager({
      getMapStore: () => ({ activeMap: null, gridSize: 80 }),
    });

    const token = manager.addToken({ name: "Hero", x: 0, y: 0 }, true);

    expect(token).toMatchObject({ width: 80, height: 80 });
  });

  it("does not floor an explicitly-requested token size", () => {
    const { manager } = createManager({
      getMapStore: () => ({ activeMap: null, gridSize: 15 }),
    });

    const token = manager.addToken(
      { name: "Marker", x: 0, y: 0, width: 10, height: 10 },
      true,
    );

    expect(token).toMatchObject({ width: 10, height: 10 });
  });

  it("places a new token on whichever layer is currently active", () => {
    const { manager } = createManager({ getActiveLayer: () => "object" });

    const token = manager.addToken({ name: "Chest", x: 0, y: 0 }, true);

    expect(token.layer).toBe("object");
  });

  it("respects an explicitly-requested layer over the active one", () => {
    const { manager } = createManager({ getActiveLayer: () => "object" });

    const token = manager.addToken(
      { name: "Hero", x: 0, y: 0, layer: "token" },
      true,
    );

    expect(token.layer).toBe("token");
  });

  it("scopes bring-to-front / send-to-back / clone to the token's own layer", () => {
    const { manager } = createManager({ getActiveLayer: () => "terrain" });
    const terrainTile = manager.addToken(
      { name: "Floor", x: 0, y: 0, kind: "tile", layer: "terrain" },
      true,
    );
    const otherTerrainTile = manager.addToken(
      { name: "Floor 2", x: 50, y: 0, kind: "tile", layer: "terrain" },
      true,
    );
    const highToken = manager.addToken(
      { name: "Hero", x: 0, y: 0, layer: "token", zIndex: 100 },
      true,
    );
    void highToken;

    const broughtForward = manager.bringTokenToFront(terrainTile.id);
    expect(broughtForward?.zIndex).toBe(otherTerrainTile.zIndex + 1);
    expect(broughtForward?.zIndex).toBeLessThan(100);

    const sentBack = manager.sendTokenToBack(otherTerrainTile.id);
    expect(sentBack?.zIndex).toBeLessThan(terrainTile.zIndex);

    const cloned = manager.cloneToken(terrainTile.id, true);
    expect(cloned?.layer).toBe("terrain");
    expect(cloned?.zIndex).toBeGreaterThan(otherTerrainTile.zIndex);
    expect(cloned?.zIndex).toBeLessThan(100);
  });

  it("blocks moving a token whose layer is locked, even for the host", () => {
    const { manager } = createManager({
      isLayerLocked: (layer: string) => layer === "terrain",
    });
    const tile = manager.addToken(
      { name: "Floor", x: 0, y: 0, kind: "tile", layer: "terrain" },
      true,
    );
    const token = manager.addToken(
      { name: "Hero", x: 0, y: 0, layer: "token" },
      true,
    );

    expect(manager.canMoveToken(tile.id, null, true)).toBe(false);
    expect(manager.canMoveToken(token.id, null, true)).toBe(true);
  });
});
