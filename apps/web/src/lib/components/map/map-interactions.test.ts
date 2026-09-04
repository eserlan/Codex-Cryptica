import { describe, expect, it, vi, beforeEach } from "vitest";
import { MapInteractionManager } from "./map-interactions.svelte";

// Mocking stores
vi.mock("../../stores/map.svelte", () => ({
  mapStore: {
    viewport: { pan: { x: 0, y: 0 }, zoom: 1 },
    canvasSize: { width: 800, height: 600 },
    isGMMode: true,
    brushRadius: 10,
    updateViewport: vi.fn(),
    project: vi.fn((p) => p),
    unproject: vi.fn((p) => p),
    pins: [{ id: "pin-a", coordinates: { x: 100, y: 100 }, visuals: {} }],
    updatePinCoordinatesInMemory: vi.fn(),
    layerVisibility: { terrain: true, object: true, token: true },
  },
}));

vi.mock("../../stores/map-session.svelte", () => ({
  mapSession: {
    vttEnabled: true,
    gridFitMode: false,
    gridMoveMode: false,
    selectedTokens: new Set(),
    tokens: {},
    allTokens: [],
    myPeerId: null,
    activeLayer: "token",
    canViewToken: vi.fn(() => true),
    canMoveToken: vi.fn(() => true),
    setDraggingTokenId: vi.fn(),
    measurement: { active: false, start: null, end: null, locked: false },
    tileDeckManager: { pendingPlacement: null },
    notePlacementArmed: false,
    pendingNoteCoords: null,
    selectedToken: null,
    cancelNotePlacement: vi.fn(),
    toggleNoteCollapsed: vi.fn(),
    cancelPendingTilePlacement: vi.fn(),
    updatePendingTilePlacement: vi.fn(),
    placePendingTile: vi.fn(),
    setSelection: vi.fn(),
    clearSelection: vi.fn(),
  },
}));

vi.mock("../../stores/vault.svelte", () => ({
  vault: {
    selectedEntityId: null,
    entities: {},
  },
}));

describe("MapInteractionManager", () => {
  let manager: MapInteractionManager;
  let painterMock: any;
  let containerMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    painterMock = {
      begin: vi.fn(),
      move: vi.fn(),
      finish: vi.fn(),
      isPainting: false,
    };
    containerMock = {
      getBoundingClientRect: vi.fn(() => ({
        left: 0,
        top: 0,
        width: 800,
        height: 600,
      })),
    };
    manager = new MapInteractionManager({
      painter: painterMock,
      getContainer: () => containerMock,
    });
  });

  it("should handle mouse down and start panning", () => {
    const event = new MouseEvent("mousedown", {
      clientX: 200,
      clientY: 200,
      button: 0,
    });
    manager.onMouseDown(event);
    expect(manager.isPanning).toBe(true);
    expect(manager.lastMousePos).toEqual({ x: 200, y: 200 });
  });

  it("should handle mouse move and update viewport when panning", async () => {
    const { mapStore } = await import("../../stores/map.svelte");

    manager.onMouseDown(
      new MouseEvent("mousedown", { clientX: 200, clientY: 200, button: 0 }),
    );
    manager.onMouseMove(
      new MouseEvent("mousemove", { clientX: 210, clientY: 220 }),
    );

    expect(mapStore.updateViewport).toHaveBeenCalledWith({ x: 10, y: 20 }, 1);
  });

  it("should pan with pointer events used by touch devices", async () => {
    const { mapStore } = await import("../../stores/map.svelte");
    const pointer = (type: string, clientX: number, clientY: number) =>
      Object.assign(new MouseEvent(type, { clientX, clientY, button: 0 }), {
        pointerId: 1,
      }) as unknown as PointerEvent;

    manager.onPointerDown(pointer("pointerdown", 200, 200));
    manager.onPointerMove(pointer("pointermove", 214, 225));

    expect(mapStore.updateViewport).toHaveBeenCalledWith({ x: 14, y: 25 }, 1);
  });

  it("should ignore touch jitter until the drag threshold is crossed", async () => {
    const { mapStore } = await import("../../stores/map.svelte");
    const pointer = (type: string, clientX: number, clientY: number) =>
      Object.assign(new MouseEvent(type, { clientX, clientY, button: 0 }), {
        pointerId: 1,
      }) as unknown as PointerEvent;

    manager.onPointerDown(pointer("pointerdown", 200, 200));
    manager.onPointerMove(pointer("pointermove", 202, 203));

    expect(mapStore.updateViewport).not.toHaveBeenCalled();

    manager.onPointerMove(pointer("pointermove", 210, 210));

    expect(mapStore.updateViewport).toHaveBeenCalledWith({ x: 10, y: 10 }, 1);
  });

  it("should pinch-zoom with two touch pointers", async () => {
    const { mapStore } = await import("../../stores/map.svelte");
    const touch = (
      type: string,
      pointerId: number,
      clientX: number,
      clientY: number,
    ) =>
      Object.assign(new MouseEvent(type, { clientX, clientY, button: 0 }), {
        pointerId,
        pointerType: "touch",
      }) as unknown as PointerEvent;

    manager.onPointerDown(touch("pointerdown", 1, 300, 300));
    manager.onPointerDown(touch("pointerdown", 2, 500, 300));
    expect(manager.isPanning).toBe(false);

    // Pinch distance doubles from 200 to 400 -> zoom doubles. A single move
    // keeps this independent of the mocked store re-reading its own zoom,
    // so we assert on the call args instead of mutating the store mock.
    manager.onPointerMove(touch("pointermove", 2, 700, 300));

    expect(mapStore.updateViewport).toHaveBeenCalled();
    const [, zoom] = (mapStore.updateViewport as any).mock.calls.at(-1);
    expect(zoom).toBeCloseTo(2, 5);
  });

  it("should not pan or click after lifting fingers from a pinch gesture", async () => {
    const { mapStore } = await import("../../stores/map.svelte");
    const touch = (
      type: string,
      pointerId: number,
      clientX: number,
      clientY: number,
    ) =>
      Object.assign(new MouseEvent(type, { clientX, clientY, button: 0 }), {
        pointerId,
        pointerType: "touch",
      }) as unknown as PointerEvent;

    manager.onPointerDown(touch("pointerdown", 1, 300, 300));
    manager.onPointerDown(touch("pointerdown", 2, 500, 300));
    manager.onPointerMove(touch("pointermove", 1, 250, 300));
    manager.onPointerMove(touch("pointermove", 2, 550, 300));
    (mapStore.updateViewport as any).mockClear();

    await manager.onPointerUp(touch("pointerup", 1, 250, 300));
    await manager.onPointerUp(touch("pointerup", 2, 550, 300));

    expect(manager.isPanning).toBe(false);
  });

  it("should pan again with one finger after a pinch ends", async () => {
    const { mapStore } = await import("../../stores/map.svelte");
    const touch = (
      type: string,
      pointerId: number,
      clientX: number,
      clientY: number,
    ) =>
      Object.assign(new MouseEvent(type, { clientX, clientY, button: 0 }), {
        pointerId,
        pointerType: "touch",
      }) as unknown as PointerEvent;

    manager.onPointerDown(touch("pointerdown", 1, 300, 300));
    manager.onPointerDown(touch("pointerdown", 2, 500, 300));
    await manager.onPointerUp(touch("pointerup", 1, 300, 300));
    await manager.onPointerUp(touch("pointerup", 2, 500, 300));
    (mapStore.updateViewport as any).mockClear();

    manager.onPointerDown(touch("pointerdown", 3, 200, 200));
    manager.onPointerMove(touch("pointermove", 3, 220, 225));

    expect(mapStore.updateViewport).toHaveBeenCalledWith({ x: 20, y: 25 }, 1);
  });

  it("should start box selection when Ctrl is pressed on GM mode", () => {
    const event = new MouseEvent("mousedown", {
      clientX: 200,
      clientY: 200,
      ctrlKey: true,
      button: 0,
    });
    manager.onMouseDown(event);
    expect(manager.boxSelectStart).toEqual({ x: 200, y: 200 });
    expect(manager.isPanning).toBe(false);
  });

  it("should handle wheel zoom", async () => {
    const { mapStore } = await import("../../stores/map.svelte");
    const event = new WheelEvent("wheel", {
      clientX: 400,
      clientY: 300,
      deltaY: -100,
    });
    // We need to preventDefault
    vi.spyOn(event, "preventDefault");

    manager.onWheel(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(mapStore.updateViewport).toHaveBeenCalled();
  });

  it("shift+scroll during a grid-fit drag cycles the span instead of zooming", async () => {
    const { mapStore } = await import("../../stores/map.svelte");
    const { mapSession } = await import("../../stores/map-session.svelte");
    (mapSession as any).gridFitMode = true;

    manager.onPointerDown(
      new MouseEvent("mousedown", {
        clientX: 10,
        clientY: 10,
        button: 0,
      }) as unknown as PointerEvent,
    );
    expect(manager.gridFitStart).toEqual({ x: 10, y: 10 });
    expect(manager.gridFitSpan).toBe(3);

    const event = new WheelEvent("wheel", {
      clientX: 10,
      clientY: 10,
      deltaY: -100,
      shiftKey: true,
    });
    manager.onWheel(event);

    expect(manager.gridFitSpan).toBe(5);
    expect(mapStore.updateViewport).not.toHaveBeenCalled();

    (mapSession as any).gridFitMode = false;
  });

  it("blocks plain (non-shift) scroll-zoom during a grid-fit drag, since it would corrupt the in-progress rectangle", async () => {
    const { mapStore } = await import("../../stores/map.svelte");
    const { mapSession } = await import("../../stores/map-session.svelte");
    (mapSession as any).gridFitMode = true;

    manager.onPointerDown(
      new MouseEvent("mousedown", {
        clientX: 10,
        clientY: 10,
        button: 0,
      }) as unknown as PointerEvent,
    );
    expect(manager.gridFitStart).toEqual({ x: 10, y: 10 });

    const event = new WheelEvent("wheel", {
      clientX: 10,
      clientY: 10,
      deltaY: -100,
      shiftKey: false,
    });
    vi.spyOn(event, "preventDefault");
    manager.onWheel(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(mapStore.updateViewport).not.toHaveBeenCalled();
    expect(manager.gridFitSpan).toBe(3); // unchanged — no span cycling either

    (mapSession as any).gridFitMode = false;
  });

  it("should clear selection on Escape", async () => {
    const { mapSession } = await import("../../stores/map-session.svelte");
    mapSession.selectedTokens.add("token-1");
    mapSession.selectedTokens.add("token-2");

    const event = new KeyboardEvent("keydown", { key: "Escape" });
    manager.onGlobalKeyDown(event);

    expect(mapSession.clearSelection).toHaveBeenCalled();
  });

  it("should initiate pin drag on mouse down over a pin", () => {
    // There is a mock pin at { x: 100, y: 100 }
    const event = new MouseEvent("mousedown", {
      clientX: 100,
      clientY: 100,
      button: 0,
    });
    manager.onMouseDown(event);
    expect(manager.pinDragState).not.toBeNull();
    expect(manager.pinDragState?.pinId).toBe("pin-a");
    expect(manager.isPanning).toBe(false);
  });

  it("should open the health bar popover when double-clicking a token", async () => {
    const { mapSession } = await import("../../stores/map-session.svelte");
    (mapSession as any).allTokens = [
      {
        id: "token-1",
        x: 100,
        y: 100,
        width: 50,
        height: 50,
        zIndex: 0,
      } as any,
    ];

    manager.onDoubleClick(
      new MouseEvent("dblclick", { clientX: 110, clientY: 110 }),
    );

    expect(manager.healthBarPopoverTokenId).toBe("token-1");
    (mapSession as any).allTokens = [];
  });

  it("should toggle the health bar popover closed on a second double-click of the same token", async () => {
    const { mapSession } = await import("../../stores/map-session.svelte");
    (mapSession as any).allTokens = [
      {
        id: "token-1",
        x: 100,
        y: 100,
        width: 50,
        height: 50,
        zIndex: 0,
      } as any,
    ];

    manager.onDoubleClick(
      new MouseEvent("dblclick", { clientX: 110, clientY: 110 }),
    );
    expect(manager.healthBarPopoverTokenId).toBe("token-1");

    manager.onDoubleClick(
      new MouseEvent("dblclick", { clientX: 110, clientY: 110 }),
    );
    expect(manager.healthBarPopoverTokenId).toBeNull();
    (mapSession as any).allTokens = [];
  });

  it("should fall through to token/pin creation when double-clicking empty space", async () => {
    const { mapSession } = await import("../../stores/map-session.svelte");
    (mapSession as any).allTokens = [];
    (mapSession as any).pendingTokenCoords = null;

    manager.onDoubleClick(
      new MouseEvent("dblclick", { clientX: 400, clientY: 400 }),
    );

    expect(manager.healthBarPopoverTokenId).toBeNull();
    expect((mapSession as any).pendingTokenCoords).toEqual({
      x: 400,
      y: 400,
    });
  });

  it("should update pin coordinates on mouse move when dragging a pin", async () => {
    const { mapStore } = await import("../../stores/map.svelte");
    manager.onMouseDown(
      new MouseEvent("mousedown", { clientX: 100, clientY: 100, button: 0 }),
    );
    manager.onMouseMove(
      new MouseEvent("mousemove", { clientX: 110, clientY: 115 }),
    );
    expect(mapStore.updatePinCoordinatesInMemory).toHaveBeenCalledWith(
      "pin-a",
      {
        x: 110,
        y: 115,
      },
    );
  });

  it("should save map on mouse up after pin dragging", async () => {
    const { vault } = await import("../../stores/vault.svelte");
    const saveMock = vi.fn();
    vault.saveMaps = saveMock;

    manager.onMouseDown(
      new MouseEvent("mousedown", { clientX: 100, clientY: 100, button: 0 }),
    );
    manager.onMouseMove(
      new MouseEvent("mousemove", { clientX: 150, clientY: 150 }),
    );
    await manager.onMouseUp(
      new MouseEvent("mouseup", { clientX: 150, clientY: 150 }),
    );

    expect(saveMock).toHaveBeenCalled();
    expect(manager.pinDragState).toBeNull();
  });

  it("should select pin if dragging distance is below click threshold", async () => {
    const { vault } = await import("../../stores/vault.svelte");
    const { mapStore } = await import("../../stores/map.svelte");
    const saveMock = vi.fn();
    vault.saveMaps = saveMock;

    // Add entity info to mock pin
    mapStore.pins = [
      {
        id: "pin-a",
        mapId: "",
        coordinates: { x: 100, y: 100 },
        entityId: "entity-123",
        visuals: {},
      },
    ];

    manager.onMouseDown(
      new MouseEvent("mousedown", { clientX: 100, clientY: 100, button: 0 }),
    );
    // Move slightly (within click gesture threshold of 5px)
    manager.onMouseMove(
      new MouseEvent("mousemove", { clientX: 102, clientY: 102 }),
    );
    await manager.onMouseUp(
      new MouseEvent("mouseup", { clientX: 102, clientY: 102 }),
    );

    expect(manager.selectedPinId).toBe("pin-a");
    expect(vault.selectedEntityId).toBe("entity-123");
  });

  it("ignores double-clicks originating from interactive UI buttons or sidebar elements", () => {
    const handleDoubleClickSpy = vi.spyOn(
      manager.creationInteractions,
      "handleDoubleClick",
    );

    const button = document.createElement("button");
    const event = new MouseEvent("dblclick", {
      clientX: 50,
      clientY: 50,
      bubbles: true,
    });
    Object.defineProperty(event, "target", { value: button });

    manager.onDoubleClick(event);

    expect(handleDoubleClickSpy).not.toHaveBeenCalled();
  });

  describe("note placement", () => {
    it("uses a left click to choose where an armed note goes, without panning", async () => {
      const { mapSession } = await import("../../stores/map-session.svelte");
      (mapSession as any).notePlacementArmed = true;

      manager.onMouseDown(
        new MouseEvent("mousedown", { clientX: 320, clientY: 240, button: 0 }),
      );

      expect((mapSession as any).pendingNoteCoords).toEqual({
        x: 320,
        y: 240,
      });
      expect(mapSession.cancelNotePlacement).toHaveBeenCalled();
      expect(manager.isPanning).toBe(false);

      (mapSession as any).notePlacementArmed = false;
      (mapSession as any).pendingNoteCoords = null;
    });

    it("pans as usual when note placement is not armed", async () => {
      const { mapSession } = await import("../../stores/map-session.svelte");

      manager.onMouseDown(
        new MouseEvent("mousedown", { clientX: 320, clientY: 240, button: 0 }),
      );

      expect((mapSession as any).pendingNoteCoords).toBeNull();
      expect(manager.isPanning).toBe(true);
    });

    it("backs out of armed note placement on Escape", async () => {
      const { mapSession } = await import("../../stores/map-session.svelte");
      (mapSession as any).notePlacementArmed = true;

      manager.onGlobalKeyDown(new KeyboardEvent("keydown", { key: "Escape" }));

      expect(mapSession.cancelNotePlacement).toHaveBeenCalled();
      (mapSession as any).notePlacementArmed = false;
    });

    it("backs out of armed tile placement on Escape", async () => {
      const { mapSession } = await import("../../stores/map-session.svelte");
      (mapSession as any).tileDeckManager.pendingPlacement = {
        deckId: "deck-1",
        tile: { id: "tile-1", name: "Corridor" },
      };

      manager.onGlobalKeyDown(new KeyboardEvent("keydown", { key: "Escape" }));

      expect(mapSession.cancelPendingTilePlacement).toHaveBeenCalled();
      expect(manager.mapAnnouncement).toBe("Tile placement cancelled");
      (mapSession as any).tileDeckManager.pendingPlacement = null;
    });
  });

  describe("notes with play switched off", () => {
    it("selects a note on click instead of falling through to pins", async () => {
      const { mapSession } = await import("../../stores/map-session.svelte");
      (mapSession as any).vttEnabled = false;
      (mapSession as any).allTokens = [
        {
          id: "note-a",
          kind: "note",
          x: 100,
          y: 100,
          width: 60,
          height: 60,
          rotation: 0,
          zIndex: 0,
          baseShape: "square",
          layer: "token",
          visibleTo: "all",
        },
      ];

      manager.handleMapClick(
        new MouseEvent("click", { clientX: 130, clientY: 130 }),
      );

      expect(mapSession.setSelection).toHaveBeenCalledWith("note-a");
      expect(manager.selectedPinId).toBeNull();

      (mapSession as any).vttEnabled = true;
      (mapSession as any).allTokens = [];
    });
  });

  describe("move-map-to-fine-tune mode", () => {
    // The mode exists to nudge a tile-covered map under a fixed grid, so a
    // pointer-down landing on a tile/token must still pan the map — grabbing
    // the object instead would drag it snapped to the grid while the map
    // itself never moved, which reads as "moving the map snaps".
    it("pans the map even when the drag starts on top of a token or tile", async () => {
      const { mapSession } = await import("../../stores/map-session.svelte");
      const { mapStore } = await import("../../stores/map.svelte");
      (mapSession as any).gridMoveMode = true;
      (mapSession as any).allTokens = [
        {
          id: "token-1",
          x: 100,
          y: 100,
          width: 50,
          height: 50,
          rotation: 0,
          zIndex: 0,
          baseShape: "square",
          layer: "token",
          visibleTo: "all",
        },
      ];

      manager.onMouseDown(
        new MouseEvent("mousedown", {
          clientX: 110,
          clientY: 110,
          button: 0,
        }),
      );

      expect(manager.isPanning).toBe(true);
      expect(manager.tokenDrag.dragState).toBeFalsy();

      manager.onMouseMove(
        new MouseEvent("mousemove", { clientX: 117, clientY: 123 }),
      );

      expect(mapStore.updateViewport).toHaveBeenCalledWith({ x: 7, y: 13 }, 1);

      (mapSession as any).gridMoveMode = false;
      (mapSession as any).allTokens = [];
    });

    it("leaves the mode on release, so tiles are draggable again afterwards", async () => {
      const { mapSession } = await import("../../stores/map-session.svelte");
      (mapSession as any).gridMoveMode = true;
      (mapSession as any).allTokens = [
        {
          id: "token-1",
          x: 100,
          y: 100,
          width: 50,
          height: 50,
          rotation: 0,
          zIndex: 0,
          baseShape: "square",
          layer: "token",
          visibleTo: "all",
        },
      ];

      manager.onMouseDown(
        new MouseEvent("mousedown", { clientX: 110, clientY: 110, button: 0 }),
      );
      manager.onMouseMove(
        new MouseEvent("mousemove", { clientX: 150, clientY: 160 }),
      );
      await manager.onMouseUp(
        new MouseEvent("mouseup", { clientX: 150, clientY: 160 }),
      );

      expect(mapSession.gridMoveMode).toBe(false);

      // The very next pointer-down on a tile must grab it, not pan the map.
      manager.onMouseDown(
        new MouseEvent("mousedown", { clientX: 110, clientY: 110, button: 0 }),
      );

      expect(manager.tokenDrag.dragState).toBeTruthy();
      expect(manager.isPanning).toBe(false);

      (mapSession as any).allTokens = [];
    });

    it("still grabs a token normally when not in move-map mode", async () => {
      const { mapSession } = await import("../../stores/map-session.svelte");
      (mapSession as any).gridMoveMode = false;
      (mapSession as any).allTokens = [
        {
          id: "token-1",
          x: 100,
          y: 100,
          width: 50,
          height: 50,
          rotation: 0,
          zIndex: 0,
          baseShape: "square",
          layer: "token",
          visibleTo: "all",
        },
      ];

      manager.onMouseDown(
        new MouseEvent("mousedown", {
          clientX: 110,
          clientY: 110,
          button: 0,
        }),
      );

      expect(manager.isPanning).toBe(false);
      expect(manager.tokenDrag.dragState).toBeTruthy();

      (mapSession as any).allTokens = [];
    });
  });

  it("folds a note away on double-click instead of dropping a pin under it", async () => {
    const { mapSession } = await import("../../stores/map-session.svelte");
    (mapSession as any).allTokens = [
      {
        id: "note-a",
        kind: "note",
        x: 100,
        y: 100,
        width: 60,
        height: 60,
        rotation: 0,
        zIndex: 0,
        baseShape: "square",
        layer: "token",
        visibleTo: "all",
      },
    ];

    manager.onDoubleClick(
      new MouseEvent("dblclick", { clientX: 130, clientY: 130 }),
    );

    expect(mapSession.toggleNoteCollapsed).toHaveBeenCalledWith("note-a");
    (mapSession as any).allTokens = [];
  });
});
