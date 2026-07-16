import { describe, it, expect } from "vitest";
import { PanZoomState } from "./pan-zoom.svelte";

function pointerEvent(
  pointerId: number,
  clientX: number,
  clientY: number,
): PointerEvent {
  return { pointerId, clientX, clientY } as unknown as PointerEvent;
}

function wheelEvent(
  clientX: number,
  clientY: number,
  deltaY: number,
): WheelEvent {
  return {
    clientX,
    clientY,
    deltaY,
    altKey: false,
    preventDefault: () => {},
  } as unknown as WheelEvent;
}

function keyEvent(key: string): KeyboardEvent {
  return {
    key,
    target: document.body,
    preventDefault: () => {},
  } as unknown as KeyboardEvent;
}

const container = {
  getBoundingClientRect: () => ({ left: 0, top: 0 }),
} as unknown as HTMLElement;

describe("PanZoomState (T014)", () => {
  it("pans on a single-pointer drag", () => {
    const state = new PanZoomState(() => ({ width: 800, height: 600 }));
    state.onPointerDown(pointerEvent(1, 100, 100));
    state.onPointerMove(pointerEvent(1, 130, 120));
    expect(state.viewport.pan).toEqual({ x: 30, y: 20 });
  });

  it("zooms on wheel, anchored on the cursor", () => {
    const state = new PanZoomState(() => ({ width: 800, height: 600 }));
    const before = state.viewport.zoom;
    state.onWheel(wheelEvent(400, 300, -200), container);
    expect(state.viewport.zoom).toBeGreaterThan(before);
  });

  it("clamps zoom to the configured min/max", () => {
    const state = new PanZoomState(() => ({ width: 800, height: 600 }));
    for (let i = 0; i < 100; i++)
      state.onWheel(wheelEvent(0, 0, -1000), container);
    expect(state.viewport.zoom).toBeLessThanOrEqual(4);
    for (let i = 0; i < 100; i++)
      state.onWheel(wheelEvent(0, 0, 1000), container);
    expect(state.viewport.zoom).toBeGreaterThanOrEqual(0.2);
  });

  it("scales about the midpoint on a two-pointer pinch", () => {
    const state = new PanZoomState(() => ({ width: 800, height: 600 }));
    state.onPointerDown(pointerEvent(1, 100, 100));
    state.onPointerDown(pointerEvent(2, 200, 100));
    const before = state.viewport.zoom;
    state.onPointerMove(pointerEvent(1, 50, 100));
    state.onPointerMove(pointerEvent(2, 250, 100));
    expect(state.viewport.zoom).toBeGreaterThan(before);
    // The content point beneath the pinch midpoint remains fixed as it zooms.
    expect(state.viewport.pan).toEqual({ x: -150, y: -100 });
  });

  it("pans with arrow keys and zooms with +/-", () => {
    const state = new PanZoomState(() => ({ width: 800, height: 600 }));
    const beforeZoom = state.viewport.zoom;
    state.onKeyDown(keyEvent("ArrowRight"));
    expect(state.viewport.pan.x).not.toBe(0);
    state.onKeyDown(keyEvent("+"));
    expect(state.viewport.zoom).toBeGreaterThan(beforeZoom);
  });

  it("fitTo centres and scales the viewport to contain the given bounds", () => {
    const state = new PanZoomState(() => ({ width: 800, height: 600 }));
    state.fitTo({ width: 1600, height: 300 });
    expect(state.viewport.zoom).toBeCloseTo(0.5, 5);
    expect(state.viewport.pan).toEqual({ x: 0, y: 0 });
  });
});

describe("PanZoomState — touch interactions (T021)", () => {
  it("pans with a single-pointer touch drag", () => {
    const state = new PanZoomState(() => ({ width: 400, height: 800 }));
    state.onPointerDown(pointerEvent(1, 50, 50));
    state.onPointerMove(pointerEvent(1, 20, 90));
    expect(state.viewport.pan).toEqual({ x: -30, y: 40 });
  });

  it("zooms about the pinch midpoint (touch pinch)", () => {
    const state = new PanZoomState(() => ({ width: 400, height: 800 }));
    state.onPointerDown(pointerEvent(10, 100, 200));
    state.onPointerDown(pointerEvent(11, 120, 200));
    state.onPointerMove(pointerEvent(10, 80, 200));
    state.onPointerMove(pointerEvent(11, 140, 200));
    expect(state.viewport.zoom).toBeGreaterThan(1);
  });

  it("ends the gesture cleanly on pointerup/pointercancel, leaving no stuck pan state", () => {
    const state = new PanZoomState(() => ({ width: 400, height: 800 }));
    state.onPointerDown(pointerEvent(1, 0, 0));
    state.onPointerUp(pointerEvent(1, 0, 0));
    const panBefore = { ...state.viewport.pan };
    state.onPointerMove(pointerEvent(1, 500, 500));
    expect(state.viewport.pan).toEqual(panBefore);
  });

  it("drops a pointer from an active pinch on pointercancel without leaving a stuck zoom drag", () => {
    const state = new PanZoomState(() => ({ width: 400, height: 800 }));
    state.onPointerDown(pointerEvent(1, 100, 100));
    state.onPointerDown(pointerEvent(2, 200, 100));
    state.onPointerUp(pointerEvent(2, 200, 100)); // pointercancel routes here too
    const zoomBefore = state.viewport.zoom;
    // Only one pointer remains; further single-pointer move should pan, not zoom.
    state.onPointerMove(pointerEvent(1, 130, 100));
    expect(state.viewport.zoom).toBe(zoomBefore);
  });
});
