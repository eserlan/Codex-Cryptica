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
    measurement: { active: false, start: null, end: null, locked: false },
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
      clientX: 100,
      clientY: 100,
      button: 0,
    });
    manager.onMouseDown(event);
    expect(manager.isPanning).toBe(true);
    expect(manager.lastMousePos).toEqual({ x: 100, y: 100 });
  });

  it("should handle mouse move and update viewport when panning", async () => {
    const { mapStore } = await import("../../stores/map.svelte");

    manager.onMouseDown(
      new MouseEvent("mousedown", { clientX: 100, clientY: 100, button: 0 }),
    );
    manager.onMouseMove(
      new MouseEvent("mousemove", { clientX: 110, clientY: 120 }),
    );

    expect(mapStore.updateViewport).toHaveBeenCalledWith({ x: 10, y: 20 }, 1);
  });

  it("should start box selection when Ctrl is pressed on GM mode", () => {
    const event = new MouseEvent("mousedown", {
      clientX: 100,
      clientY: 100,
      ctrlKey: true,
      button: 0,
    });
    manager.onMouseDown(event);
    expect(manager.boxSelectStart).toEqual({ x: 100, y: 100 });
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

  it("should clear selection on Escape", async () => {
    const { mapSession } = await import("../../stores/map-session.svelte");
    mapSession.selectedTokens.add("token-1");
    mapSession.selectedTokens.add("token-2");

    const event = new KeyboardEvent("keydown", { key: "Escape" });
    manager.onGlobalKeyDown(event);

    expect(mapSession.clearSelection).toHaveBeenCalled();
  });
});
