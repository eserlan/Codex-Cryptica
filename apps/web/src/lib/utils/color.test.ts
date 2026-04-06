import { describe, it, expect } from "vitest";
import { isTransparent } from "./color";

describe("isTransparent", () => {
  it("should return true for empty or null-ish values", () => {
    expect(isTransparent("")).toBe(true);
    expect(isTransparent(null as any)).toBe(true);
    expect(isTransparent(undefined as any)).toBe(true);
  });

  it("should return true for 'transparent' keyword", () => {
    expect(isTransparent("transparent")).toBe(true);
    expect(isTransparent("TRANSPARENT")).toBe(true);
  });

  it("should return true for rgba with zero alpha", () => {
    expect(isTransparent("rgba(0, 0, 0, 0)")).toBe(true);
    expect(isTransparent("rgba(255, 255, 255, 0)")).toBe(true);
    expect(isTransparent("rgba(0,0,0,0)")).toBe(true);
    expect(isTransparent("RGBA(0,0,0,0)")).toBe(true);
  });

  it("should return true for any color with 0 alpha in rgba", () => {
    expect(isTransparent("rgba(10, 20, 30, 0)")).toBe(true);
    expect(isTransparent("rgba(10,20,30,0)")).toBe(true);
  });

  it("should return false for opaque colors", () => {
    expect(isTransparent("#ff0000")).toBe(false);
    expect(isTransparent("rgb(255, 0, 0)")).toBe(false);
    expect(isTransparent("rgba(0, 0, 0, 1)")).toBe(false);
    expect(isTransparent("rgba(0, 0, 0, 0.5)")).toBe(false);
    expect(isTransparent("green")).toBe(false);
  });
});
