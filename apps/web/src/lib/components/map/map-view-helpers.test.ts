import { describe, expect, it } from "vitest";
import type { MapPin, StatSheetField } from "schema";
import {
  findClickedPin,
  getKeyboardViewportUpdate,
  getMapDisplayDimensions,
  getZoomViewportUpdate,
  isClickGesture,
  resolveHealthBar,
  shouldIgnoreMapKeyboardEvent,
} from "./map-view-helpers";

describe("getMapDisplayDimensions", () => {
  it("doubles small maps so grid cells come out usable", () => {
    expect(getMapDisplayDimensions(300, 200)).toEqual({
      width: 600,
      height: 400,
    });
  });

  it("leaves large maps at native size", () => {
    expect(getMapDisplayDimensions(1200, 900)).toEqual({
      width: 1200,
      height: 900,
    });
  });

  it("uses the larger dimension to decide, for tall/narrow maps", () => {
    // Larger dimension (1200) is at the threshold, so no scaling — even
    // though the smaller dimension (100) is tiny.
    expect(getMapDisplayDimensions(100, 1200)).toEqual({
      width: 100,
      height: 1200,
    });
  });
});

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

  it("shouldIgnoreMapKeyboardEvent should ignore editable elements", () => {
    const input = document.createElement("input");
    const textarea = document.createElement("textarea");
    const select = document.createElement("select");
    const div = document.createElement("div");
    const editable = document.createElement("div");
    editable.setAttribute("contenteditable", "true");

    expect(shouldIgnoreMapKeyboardEvent(input)).toBe(true);
    expect(shouldIgnoreMapKeyboardEvent(textarea)).toBe(true);
    expect(shouldIgnoreMapKeyboardEvent(select)).toBe(true);
    expect(shouldIgnoreMapKeyboardEvent(editable)).toBe(true);
    expect(shouldIgnoreMapKeyboardEvent(div)).toBe(false);
    expect(shouldIgnoreMapKeyboardEvent(null)).toBe(false);
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

describe("resolveHealthBar", () => {
  function counterField(
    overrides: Partial<StatSheetField> = {},
  ): StatSheetField {
    return {
      id: "hp",
      label: "Hit Points",
      type: "counter",
      value: 8,
      max: 20,
      barField: true,
      ...overrides,
    } as StatSheetField;
  }

  it("returns null when fields is undefined", () => {
    expect(resolveHealthBar(undefined)).toBeNull();
  });

  it("returns null when no field is designated as the bar field", () => {
    const fields = [counterField({ barField: false })];
    expect(resolveHealthBar(fields)).toBeNull();
  });

  it("returns null for a non-counter field marked as the bar field", () => {
    const fields = [
      { id: "atk", label: "Attack", type: "dice", barField: true } as any,
    ];
    expect(resolveHealthBar(fields)).toBeNull();
  });

  it("returns null when the bar field's max is 0 or negative", () => {
    expect(resolveHealthBar([counterField({ max: 0 })])).toBeNull();
  });

  it("defaults max to 1 when the field has no max set", () => {
    expect(
      resolveHealthBar([counterField({ max: undefined, value: 8 })]),
    ).toEqual({ value: 8, max: 1 });
  });

  it("returns the value/max of the designated bar field", () => {
    const fields = [
      counterField({
        id: "ap",
        label: "AP",
        value: 3,
        max: 5,
        barField: false,
      }),
      counterField({
        id: "hp",
        label: "HP",
        value: 8,
        max: 20,
        barField: true,
      }),
    ];
    expect(resolveHealthBar(fields)).toEqual({ value: 8, max: 20 });
  });

  it("treats a non-numeric value as 0", () => {
    const fields = [counterField({ value: "unset" as any })];
    expect(resolveHealthBar(fields)).toEqual({ value: 0, max: 20 });
  });
});
