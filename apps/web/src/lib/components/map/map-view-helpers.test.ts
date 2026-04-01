import { describe, expect, it } from "vitest";
import type { MapPin } from "schema";
import {
  findClickedPin,
  getKeyboardViewportUpdate,
  getZoomViewportUpdate,
  isClickGesture,
} from "./map-view-helpers";

describe("map-view helpers", () => {
  it("findClickedPin should return a pin within range", () => {
    const pins = [
      { id: "1", coordinates: { x: 10, y: 10 } },
      { id: "2", coordinates: { x: 100, y: 100 } },
    ] as MapPin[];
    const pin = findClickedPin(
      pins,
      (point) => ({ x: point.x, y: point.y }),
      12,
      13,
    );
    expect(pin?.id).toBe("1");
  });

  it("findClickedPin should return null when nothing is close enough", () => {
    const pins = [{ id: "1", coordinates: { x: 10, y: 10 } }] as MapPin[];
    const pin = findClickedPin(
      pins,
      (point) => ({ x: point.x, y: point.y }),
      100,
      100,
    );
    expect(pin).toBeNull();
  });

  it("findClickedPin should work with a projector that depends on this when wrapped", () => {
    const pins = [{ id: "1", coordinates: { x: 10, y: 10 } }] as MapPin[];
    const projector = {
      scale: 2,
      project(point: { x: number; y: number }) {
        return { x: point.x * this.scale, y: point.y * this.scale };
      },
    };

    const pin = findClickedPin(
      pins,
      (point) => projector.project(point),
      20,
      20,
    );

    expect(pin?.id).toBe("1");
  });

  it("isClickGesture should accept small movements and reject large ones", () => {
    expect(isClickGesture({ x: 0, y: 0 }, { x: 2, y: 3 })).toBe(true);
    expect(isClickGesture({ x: 0, y: 0 }, { x: 10, y: 0 })).toBe(false);
  });

  it("getKeyboardViewportUpdate should pan and zoom predictably", () => {
    const pan = getKeyboardViewportUpdate("ArrowLeft", {
      pan: { x: 10, y: 20 },
      zoom: 1,
    });
    expect(pan).toMatchObject({
      pan: { x: 60, y: 20 },
      zoom: 1,
      announcement: "Map panned left",
    });

    const zoom = getKeyboardViewportUpdate("+", {
      pan: { x: 10, y: 20 },
      zoom: 1,
    });
    expect(zoom?.zoom).toBe(1.1);
  });

  it("getZoomViewportUpdate should keep the mouse focus unless alt is held", () => {
    const next = getZoomViewportUpdate({
      mouse: { x: 250, y: 150 },
      canvasSize: { width: 400, height: 200 },
      viewport: { pan: { x: 0, y: 0 }, zoom: 1 },
      deltaY: -100,
      altHeld: false,
    });

    expect(next.zoom).toBeGreaterThan(1);
    expect(next.pan).not.toEqual({ x: 0, y: 0 });

    const locked = getZoomViewportUpdate({
      mouse: { x: 200, y: 100 },
      canvasSize: { width: 400, height: 200 },
      viewport: { pan: { x: 12, y: 34 }, zoom: 1 },
      deltaY: -100,
      altHeld: true,
    });

    expect(locked.pan).toEqual({ x: 12, y: 34 });
  });
});
