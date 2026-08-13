import { describe, it, expect } from "vitest";
import { computeSpotlightClipPath } from "./spotlight";

describe("computeSpotlightClipPath", () => {
  it("returns empty string when viewport dimensions are missing", () => {
    const rect = { left: 10, top: 10, right: 50, bottom: 50 };
    expect(computeSpotlightClipPath(rect, 0, 800)).toBe("");
    expect(computeSpotlightClipPath(rect, 800, 0)).toBe("");
  });

  it("produces a clip-path polygon containing the padded hole bounds", () => {
    const rect = { left: 100, top: 200, right: 140, bottom: 240 };
    const result = computeSpotlightClipPath(rect, 1000, 800, 8);
    expect(result).toContain("clip-path: polygon");
    // padded: left=92, top=192, right=148, bottom=248
    expect(result).toContain("92px");
    expect(result).toContain("192px");
    expect(result).toContain("148px");
    expect(result).toContain("248px");
  });

  it("clamps the hole to the viewport bounds", () => {
    const rect = { left: -50, top: -50, right: 20, bottom: 20 };
    const result = computeSpotlightClipPath(rect, 1000, 800, 8);
    // left/top clamp to 0
    expect(result).toContain("0px 100%");
    expect(result).toContain("0px 0px");
  });

  it("returns empty string for a target fully outside the viewport", () => {
    const rect = { left: -200, top: -200, right: -100, bottom: -100 };
    const result = computeSpotlightClipPath(rect, 1000, 800, 8);
    expect(result).toBe("");
  });

  it("defaults padding to 8 when omitted", () => {
    const rect = { left: 100, top: 100, right: 100, bottom: 100 };
    const withDefault = computeSpotlightClipPath(rect, 1000, 800);
    const withExplicit8 = computeSpotlightClipPath(rect, 1000, 800, 8);
    expect(withDefault).toBe(withExplicit8);
  });
});
