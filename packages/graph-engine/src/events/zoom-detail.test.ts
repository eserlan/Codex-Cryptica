import { describe, expect, it, vi } from "vitest";
import {
  applyDetailLevel,
  detailLevelForZoom,
  LOW_DETAIL_ZOOM,
  MEDIUM_DETAIL_ZOOM,
} from "./zoom-detail";

describe("detailLevelForZoom", () => {
  it("picks the level from the zoom", () => {
    expect(detailLevelForZoom(1)).toBe("high");
    expect(detailLevelForZoom(MEDIUM_DETAIL_ZOOM - 0.01)).toBe("medium");
    expect(detailLevelForZoom(LOW_DETAIL_ZOOM - 0.01)).toBe("low");
  });

  it("does not flip back just past a threshold, only once clearly beyond it", () => {
    expect(detailLevelForZoom(LOW_DETAIL_ZOOM + 0.005, "low")).toBe("low");
    expect(detailLevelForZoom(LOW_DETAIL_ZOOM * 1.2, "low")).toBe("medium");
    expect(detailLevelForZoom(MEDIUM_DETAIL_ZOOM + 0.01, "medium")).toBe(
      "medium",
    );
    expect(detailLevelForZoom(MEDIUM_DETAIL_ZOOM * 1.2, "medium")).toBe("high");
  });

  it("enters a lower level at the plain threshold, not the exit margin (negative)", () => {
    expect(detailLevelForZoom(MEDIUM_DETAIL_ZOOM + 0.01, "high")).toBe("high");
    expect(detailLevelForZoom(LOW_DETAIL_ZOOM + 0.005, "medium")).toBe(
      "medium",
    );
  });
});

describe("applyDetailLevel", () => {
  const eles = () => {
    const e: any = {};
    e.addClass = vi.fn(() => e);
    e.removeClass = vi.fn(() => e);
    return e;
  };

  it("sets one level class and clears the other", () => {
    const low = eles();
    applyDetailLevel(low, "low");
    expect(low.addClass).toHaveBeenCalledWith("lod-low");
    expect(low.removeClass).toHaveBeenCalledWith("lod-medium");

    const high = eles();
    applyDetailLevel(high, "high");
    expect(high.addClass).not.toHaveBeenCalled();
    expect(high.removeClass).toHaveBeenCalledWith("lod-low lod-medium");
  });
});
