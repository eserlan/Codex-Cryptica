import { describe, expect, it } from "vitest";
import {
  FULL_VIEW,
  MAX_ZOOM,
  clampView,
  panBy,
  viewBoxOf,
  zoomAt,
} from "./mystery-graph-view";

const size = { width: 800, height: 400 };

describe("mystery graph view", () => {
  it("shows the whole diagram at zoom 1", () => {
    expect(viewBoxOf(FULL_VIEW, size)).toBe("0 0 800 400");
  });

  it("zooms around the centre by default", () => {
    const view = zoomAt(FULL_VIEW, 2, size);
    expect(view).toEqual({ zoom: 2, x: 200, y: 100 });
    expect(viewBoxOf(view, size)).toBe("200 100 400 200");
  });

  it("keeps the point under the cursor fixed when zooming", () => {
    const view = zoomAt(FULL_VIEW, 2, size, 0, 0);
    expect(view).toEqual({ zoom: 2, x: 0, y: 0 });
  });

  it("never zooms out past the whole diagram or in past the limit", () => {
    expect(zoomAt(FULL_VIEW, 0.5, size)).toEqual(FULL_VIEW);
    expect(zoomAt({ zoom: 3, x: 0, y: 0 }, 10, size).zoom).toBe(MAX_ZOOM);
  });

  it("pans in diagram units scaled to the rendered width", () => {
    // 400 units visible across 800 px: one pixel is half a unit.
    const view = panBy({ zoom: 2, x: 200, y: 100 }, -100, -40, 800, size);
    expect(view).toEqual({ zoom: 2, x: 250, y: 120 });
  });

  it("stops panning at the diagram's edges", () => {
    expect(panBy({ zoom: 2, x: 200, y: 100 }, 5000, 5000, 800, size)).toEqual({
      zoom: 2,
      x: 0,
      y: 0,
    });
    expect(clampView({ zoom: 2, x: 9999, y: 9999 }, size)).toEqual({
      zoom: 2,
      x: 400,
      y: 200,
    });
  });

  it("does not pan at zoom 1 or with no rendered width", () => {
    expect(panBy(FULL_VIEW, -50, -50, 800, size)).toEqual(FULL_VIEW);
    expect(panBy({ zoom: 2, x: 10, y: 10 }, 5, 5, 0, size)).toEqual({
      zoom: 2,
      x: 10,
      y: 10,
    });
  });
});
