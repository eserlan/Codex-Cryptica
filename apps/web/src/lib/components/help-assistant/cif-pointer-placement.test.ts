import { describe, expect, it } from "vitest";
import { CIF_POINTER_SIZE, placeCifPointer } from "./cif-pointer-placement";

const viewport = { width: 1000, height: 700 };
const rect = (left: number, top: number, width = 80, height = 30) => ({
  left,
  top,
  width,
  height,
});

describe("placeCifPointer", () => {
  it("perches to the right of the control when there is room", () => {
    const p = placeCifPointer(rect(200, 300), viewport);
    expect(p.side).toBe("right");
    expect(p.left).toBeGreaterThan(280);
    expect(p.flip).toBe(false);
  });

  it("moves to the left, mirrored, near the right edge", () => {
    const p = placeCifPointer(rect(900, 300, 80), viewport);
    expect(p.side).toBe("left");
    expect(p.left + CIF_POINTER_SIZE.width).toBeLessThan(900);
    expect(p.flip).toBe(true);
  });

  it("goes below a control that spans the viewport width", () => {
    const p = placeCifPointer(rect(0, 100, 1000), viewport);
    expect(p.side).toBe("below");
    expect(p.top).toBeGreaterThan(130);
  });

  it("goes above a full-width control at the bottom, clear of the label", () => {
    const p = placeCifPointer(rect(0, 650, 1000, 40), viewport);
    expect(p.side).toBe("above");
    expect(p.top + CIF_POINTER_SIZE.height).toBeLessThan(650 - 28);
  });

  it("always stays inside the viewport, even when nothing fits", () => {
    const p = placeCifPointer(rect(0, 0, 1000, 700), viewport);
    expect(p.left).toBeGreaterThanOrEqual(0);
    expect(p.top).toBeGreaterThanOrEqual(0);
    expect(p.left + CIF_POINTER_SIZE.width).toBeLessThanOrEqual(1000);
    expect(p.top + CIF_POINTER_SIZE.height).toBeLessThanOrEqual(700);
  });
});
