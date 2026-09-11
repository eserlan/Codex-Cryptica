import { describe, expect, it } from "vitest";
import {
  getTokenRotationHandlePosition,
  normalizeTokenRotation,
  rotationFromPoint,
  snapTokenRotation,
} from "../src/token-geometry";

describe("token geometry", () => {
  it("places the rotation handle above the token", () => {
    expect(
      getTokenRotationHandlePosition({ x: 10, y: 20, width: 50, height: 50 }),
    ).toEqual({ x: 35, y: 2 });
  });

  it("uses north as zero degrees and clockwise rotation", () => {
    expect(rotationFromPoint({ x: 0, y: 0 }, { x: 0, y: -1 })).toBe(0);
    expect(rotationFromPoint({ x: 0, y: 0 }, { x: 1, y: 0 })).toBe(90);
    expect(rotationFromPoint({ x: 0, y: 0 }, { x: 0, y: 1 })).toBe(180);
    expect(rotationFromPoint({ x: 0, y: 0 }, { x: -1, y: 0 })).toBe(270);
  });

  it("normalizes and snaps rotations to 45-degree increments", () => {
    expect(normalizeTokenRotation(-90)).toBe(270);
    expect(normalizeTokenRotation(450)).toBe(90);
    expect(snapTokenRotation(22)).toBe(0);
    expect(snapTokenRotation(23)).toBe(45);
    expect(snapTokenRotation(359)).toBe(0);
  });
});
