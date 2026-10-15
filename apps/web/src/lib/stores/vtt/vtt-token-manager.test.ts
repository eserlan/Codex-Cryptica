import { describe, expect, it, vi } from "vitest";
import { hexToPoint, isNoteCollapsed, pointToHex } from "map-engine";
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

function hexManager(
  gridType: "hex-pointy" | "hex-flat",
  extra: Record<string, unknown> = {},
) {
  return createManager({
    getMapStore: () => ({
      activeMap: { dimensions: { width: 4000, height: 4000 } },
      showGrid: true,
      gridType,
      gridSize: 100,
      gridOffsetX: 0,
      gridOffsetY: 0,
      ...extra,
    }),
  }).manager;
}

describe("VTTTokenManager hex grid snapping", () => {
  const cell = Math.sqrt(3) * 100;

  it.each(["hex-pointy", "hex-flat"] as const)(
    "centres a creature token on a hex centre on a %s grid",
    (gridType) => {
      const manager = hexManager(gridType);
      const orientation = gridType === "hex-flat" ? "flat" : "pointy";
      const config = {
        orientation,
        size: 100,
        offsetX: 0,
        offsetY: 0,
      } as const;
      const token = manager.addToken(
        { name: "Mara Vell", x: 237, y: 411, width: 100, height: 100 },
        true,
      );
      const centre = {
        x: token.x + token.width / 2,
        y: token.y + token.height / 2,
      };
      const hexCentre = hexToPoint(pointToHex(centre, config), config);
      expect(centre.x).toBeCloseTo(hexCentre.x, 1);
      expect(centre.y).toBeCloseTo(hexCentre.y, 1);
    },
  );

  it("makes the smallest token fill a hex rather than a fraction of one", () => {
    const manager = hexManager("hex-pointy");
    const token = manager.addToken(
      { name: "Tiny", x: 0, y: 0, width: 10, height: 10 },
      true,
    );
    expect(token.width).toBeCloseTo(cell, 1);
    expect(token.height).toBeCloseTo(cell, 1);
  });

  it("keeps a snapped token centred on the nearest fitting hex at the map edge", () => {
    const manager = hexManager("hex-pointy");
    const position = manager.clampAndSnapPosition(
      { x: -cell / 2, y: 1900 - cell / 2 },
      { width: cell, height: cell },
    );
    const centre = {
      x: position.x + position.width / 2,
      y: position.y + position.height / 2,
    };
    const config = {
      orientation: "pointy" as const,
      size: 100,
      offsetX: 0,
      offsetY: 0,
    };
    const hexCentre = hexToPoint(pointToHex(centre, config), config);

    expect(centre.x).toBeCloseTo(hexCentre.x, 1);
    expect(centre.y).toBeCloseTo(hexCentre.y, 1);
    expect(centre.y).toBe(1800);
    expect(position.y).toBeGreaterThanOrEqual(-2000);
    expect(position.y + position.height).toBeLessThanOrEqual(2000);
  });

  it("rounds larger tokens to whole hexes and keeps them square", () => {
    const manager = hexManager("hex-flat");
    const token = manager.addToken(
      { name: "Ogre", x: 0, y: 0, width: 2.2 * cell, height: 1.8 * cell },
      true,
    );
    expect(token.width).toBeCloseTo(2 * cell, 1);
    expect(token.height).toBeCloseTo(2 * cell, 1);
  });

  it.each([0.25, 0.5])(
    "keeps a %s-hex token at that size, centred on its hex",
    (fraction) => {
      const manager = hexManager("hex-pointy");
      const token = manager.addToken(
        {
          name: "Pip",
          x: 237,
          y: 411,
          width: fraction * cell,
          height: fraction * cell,
        },
        true,
      );
      expect(token.width).toBeCloseTo(fraction * cell, 1);
      expect(token.height).toBeCloseTo(fraction * cell, 1);
      const config = {
        orientation: "pointy",
        size: 100,
        offsetX: 0,
        offsetY: 0,
      } as const;
      const centre = {
        x: token.x + token.width / 2,
        y: token.y + token.height / 2,
      };
      const hexCentre = hexToPoint(pointToHex(centre, config), config);
      expect(centre.x).toBeCloseTo(hexCentre.x, 1);
      expect(centre.y).toBeCloseTo(hexCentre.y, 1);
    },
  );

  it("still turns a size between a half and a whole hex into a whole hex", () => {
    const manager = hexManager("hex-flat");
    for (const fraction of [0.3, 0.6, 0.75]) {
      const token = manager.addToken(
        {
          name: "Between",
          x: 0,
          y: 0,
          width: fraction * cell,
          height: fraction * cell,
        },
        true,
      );
      expect(token.width).toBeCloseTo(cell, 1);
    }
  });

  it("keeps a half-hex token its size when it is moved", () => {
    const manager = hexManager("hex-pointy");
    const token = manager.addToken(
      { name: "Pip", x: 0, y: 0, width: cell / 2, height: cell / 2 },
      true,
    );
    manager.updateToken(token.id, { x: 640, y: 320 });
    const moved = manager.tokens[token.id];
    expect(moved.width).toBeCloseTo(cell / 2, 1);
    expect(moved.height).toBeCloseTo(cell / 2, 1);
  });

  it("keeps a hex-shaped token's own bounding box", () => {
    const manager = hexManager("hex-pointy");
    const token = manager.addToken(
      {
        name: "Hex marker",
        x: 0,
        y: 0,
        width: cell,
        height: 200,
        baseShape: "hex-pointy",
      },
      true,
    );
    expect(token.width).toBeCloseTo(cell, 1);
    expect(token.height).toBeCloseTo(200, 1);
  });

  it("keeps a token on its hex when it is moved or resized", () => {
    const manager = hexManager("hex-pointy");
    const token = manager.addToken(
      { name: "Scout", x: 300, y: 300, width: 100, height: 100 },
      true,
    );
    const config = {
      orientation: "pointy" as const,
      size: 100,
      offsetX: 0,
      offsetY: 0,
    };
    const hexBefore = pointToHex(
      { x: token.x + token.width / 2, y: token.y + token.height / 2 },
      config,
    );
    // Resize around the centre, as the context-menu resize does.
    const size = 2 * cell;
    const resized = manager.updateToken(
      token.id,
      {
        x: token.x + token.width / 2 - size / 2,
        y: token.y + token.height / 2 - size / 2,
        width: size,
        height: size,
      },
      true,
    )!;
    const centre = {
      x: resized.x + resized.width / 2,
      y: resized.y + resized.height / 2,
    };
    expect(pointToHex(centre, config)).toEqual(hexBefore);
    const hexCentre = hexToPoint(hexBefore, config);
    expect(centre.x).toBeCloseTo(hexCentre.x, 1);
  });

  it("leaves notes and a hidden grid alone", () => {
    const note = hexManager("hex-pointy").addToken(
      { name: "Note", x: 37, y: 41, kind: "note", width: 20, height: 20 },
      true,
    );
    expect(note.width).toBe(20);
    const hidden = hexManager("hex-pointy", { showGrid: false }).addToken(
      { name: "Free", x: 37, y: 41, width: 20, height: 20 },
      true,
    );
    expect(hidden).toMatchObject({ x: 37, y: 41, width: 20 });
  });

  it("still snaps to the square grid on square maps", () => {
    const manager = hexManager("hex-pointy", { gridType: "square" });
    const token = manager.addToken(
      { name: "Square", x: 130, y: 20, width: 90, height: 90 },
      true,
    );
    expect(token).toMatchObject({ x: 100, y: 0, width: 100, height: 100 });
  });

  it.each([0.25, 0.5])(
    "resizes a square-grid token to %s of a cell",
    (fraction) => {
      const manager = hexManager("hex-pointy", { gridType: "square" });
      const token = manager.addToken(
        { name: "Square", x: 100, y: 100, width: 100, height: 100 },
        true,
      );

      const resized = manager.updateToken(token.id, {
        width: fraction * 100,
        height: fraction * 100,
      });

      expect(resized).toMatchObject({
        width: fraction * 100,
        height: fraction * 100,
      });
    },
  );
});

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

  it("keeps a hex tile inside the map when snapping it near an edge", () => {
    const { manager } = createManager({
      getMapStore: () => ({
        activeMap: { dimensions: { width: 1000, height: 1000 } },
        showGrid: true,
        gridType: "hex-flat",
        gridSize: 50,
        gridOffsetX: 0,
        gridOffsetY: 0,
      }),
    });

    const tile = manager.addToken(
      {
        name: "Edge room",
        x: 490,
        y: 490,
        width: 100,
        height: Math.sqrt(3) * 50,
        kind: "tile",
      },
      true,
    );

    const centre = { x: tile.x + tile.width / 2, y: tile.y + tile.height / 2 };
    const config = {
      orientation: "flat" as const,
      size: 50,
      offsetX: 0,
      offsetY: 0,
    };
    const hex = pointToHex(centre, config);
    const snappedCentre = hexToPoint(hex, config);
    expect(centre.x).toBeCloseTo(snappedCentre.x, 2);
    expect(centre.y).toBeCloseTo(snappedCentre.y, 2);
    expect(tile.x).toBeGreaterThanOrEqual(-500);
    expect(tile.x + tile.width).toBeLessThanOrEqual(500);
    expect(tile.y).toBeGreaterThanOrEqual(-500);
    expect(tile.y + tile.height).toBeLessThanOrEqual(500);
  });

  it("keeps an off-map hex tile aligned when the pointer is far beyond the edge", () => {
    const { manager } = createManager({
      getMapStore: () => ({
        activeMap: { dimensions: { width: 1000, height: 1000 } },
        showGrid: true,
        gridType: "hex-flat",
        gridSize: 50,
        gridOffsetX: 0,
        gridOffsetY: 0,
      }),
    });

    const tile = manager.addToken(
      {
        name: "Off-map room",
        x: 10_000,
        y: 10_000,
        width: 100,
        height: Math.sqrt(3) * 50,
        kind: "tile",
      },
      true,
    );

    const centre = { x: tile.x + tile.width / 2, y: tile.y + tile.height / 2 };
    const config = {
      orientation: "flat" as const,
      size: 50,
      offsetX: 0,
      offsetY: 0,
    };
    const snappedCentre = hexToPoint(pointToHex(centre, config), config);
    expect(centre.x).toBeCloseTo(snappedCentre.x, 2);
    expect(centre.y).toBeCloseTo(snappedCentre.y, 2);
    expect(tile.x + tile.width).toBeLessThanOrEqual(500);
    expect(tile.y + tile.height).toBeLessThanOrEqual(500);
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

  it("defaults tile baseShape to hex-flat on a hex-flat grid and hex-pointy on a hex-pointy grid", () => {
    const { manager: flatManager } = createManager({
      getMapStore: () => ({
        activeMap: null,
        gridType: "hex-flat",
        gridSize: 50,
      }),
    });
    const flatTile = flatManager.addToken(
      { name: "Hex flat tile", x: 0, y: 0, kind: "tile" },
      true,
    );
    expect(flatTile.baseShape).toBe("hex-flat");

    const { manager: pointyManager } = createManager({
      getMapStore: () => ({
        activeMap: null,
        gridType: "hex-pointy",
        gridSize: 50,
      }),
    });
    const pointyTile = pointyManager.addToken(
      { name: "Hex pointy tile", x: 0, y: 0, kind: "tile" },
      true,
    );
    expect(pointyTile.baseShape).toBe("hex-pointy");

    const { manager: squareManager } = createManager({
      getMapStore: () => ({
        activeMap: null,
        gridType: "square",
        gridSize: 50,
      }),
    });
    const squareTile = squareManager.addToken(
      { name: "Square tile", x: 0, y: 0, kind: "tile" },
      true,
    );
    expect(squareTile.baseShape).toBe("square");
  });

  it("keeps a hidden token visible to the GM while guest visibility stays restricted", () => {
    const { manager } = createManager();
    const note = manager.addToken(
      { name: "Hidden cache", x: 0, y: 0, kind: "note", visibleTo: "gm-only" },
      true,
    );

    expect(manager.canViewToken(note.id, null, true)).toBe(true);
    expect(manager.canViewToken(note.id, "guest-1", false)).toBe(false);
  });

  it("lands a note folded down to a marker, springing back to a full page", () => {
    const { manager } = createManager();

    const note = manager.addToken(
      { name: "Guard post", x: 0, y: 0, kind: "note", noteBody: "2 goblins" },
      true,
    );

    // Half a 50px grid, so it reads at the same weight as a lore pin.
    expect(note.width).toBe(25);
    expect(note.height).toBe(25);
    expect(isNoteCollapsed(note)).toBe(true);

    const expanded = manager.toggleNoteCollapsed(note.id)!;
    expect(expanded.width).toBe(75);
    expect(expanded.noteCollapsedFrom).toBeUndefined();
  });

  it("lands a note open when the caller asks for a size of its own", () => {
    const { manager } = createManager();

    const note = manager.addToken(
      { name: "Guard post", x: 0, y: 0, width: 90, height: 90, kind: "note" },
      true,
    );

    expect(note.width).toBe(90);
    expect(isNoteCollapsed(note)).toBe(false);
  });

  it("leaves noteCollapsedFrom off tokens that are not notes", () => {
    const { manager } = createManager();

    const token = manager.addToken({ name: "Goblin", x: 0, y: 0 }, true);

    expect(token.noteCollapsedFrom).toBeUndefined();
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

  it("folds a note down to a marker and springs it back to the size it had", () => {
    const { manager } = createManager();
    const note = manager.addToken(
      { name: "Guard post", x: 0, y: 0, width: 90, height: 90, kind: "note" },
      true,
    );

    const collapsed = manager.toggleNoteCollapsed(note.id)!;
    expect(collapsed.width).toBe(25);
    expect(collapsed.noteCollapsedFrom).toEqual({ width: 90, height: 90 });
    // The body survives folding: it is only taking up less of the map.
    expect(collapsed.noteBody).toBe("");

    const expanded = manager.toggleNoteCollapsed(note.id)!;
    expect(expanded.width).toBe(90);
    expect(expanded.height).toBe(90);
    expect(expanded.noteCollapsedFrom).toBeUndefined();
  });

  it("refuses to collapse anything that is not a note", () => {
    const { manager } = createManager();
    const token = manager.addToken({ name: "Goblin", x: 0, y: 0 }, true);

    expect(manager.toggleNoteCollapsed(token.id)).toBeNull();
    expect(manager.toggleNoteCollapsed("missing")).toBeNull();
  });

  it("keeps a note off the grid so it can be smaller than one cell", () => {
    const { manager } = createManager({
      getMapStore: () => ({
        activeMap: { dimensions: { width: 1000, height: 1000 } },
        gridSize: 50,
        showGrid: true,
        gridOffsetX: 0,
        gridOffsetY: 0,
      }),
    });
    const note = manager.addToken(
      { name: "Note", x: 37, y: 61, width: 75, height: 75, kind: "note" },
      true,
    );

    // A token here would have been snapped to a whole cell in both size and
    // position; the note keeps exactly what it was given.
    expect(note.width).toBe(75);
    expect(note.x).toBe(37);
    expect(note.y).toBe(61);

    const collapsed = manager.toggleNoteCollapsed(note.id)!;
    expect(collapsed.width).toBe(25);
  });

  it("still snaps a regular token to the grid", () => {
    const { manager } = createManager({
      getMapStore: () => ({
        activeMap: { dimensions: { width: 1000, height: 1000 } },
        gridSize: 50,
        showGrid: true,
        gridOffsetX: 0,
        gridOffsetY: 0,
      }),
    });

    const token = manager.addToken(
      { name: "Goblin", x: 37, y: 61, width: 75, height: 75 },
      true,
    );

    expect(token.width).toBe(100);
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
