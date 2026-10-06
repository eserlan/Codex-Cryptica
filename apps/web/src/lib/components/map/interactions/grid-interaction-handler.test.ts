import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  GRID_FIT_SPAN_OPTIONS,
  GridInteractionHandler,
} from "./grid-interaction-handler.svelte";
import { hexToPoint, pointToHex } from "map-engine";

describe("GridInteractionHandler", () => {
  let gridMoveMode = false;
  let gridFitMode = false;
  let hostMode = true;
  let gridSize = 50;
  let gridOffset = { x: 0, y: 0 };
  let showGridSettings = false;
  let clearNotification: ReturnType<typeof vi.fn>;
  let handler: GridInteractionHandler;

  beforeEach(() => {
    gridMoveMode = false;
    gridFitMode = false;
    hostMode = true;
    gridSize = 50;
    gridOffset = { x: 0, y: 0 };
    showGridSettings = false;
    clearNotification = vi.fn();
    handler = new GridInteractionHandler({
      isGridMoveMode: () => gridMoveMode,
      setGridMoveMode: (active: boolean) => {
        gridMoveMode = active;
      },
      isGridFitMode: () => gridFitMode,
      setGridFitMode: (active: boolean) => {
        gridFitMode = active;
      },
      isHostMode: () => hostMode,
      getViewport: () => ({ pan: { x: 25, y: 75 }, zoom: 2 }),
      getCanvasSize: () => ({ width: 800, height: 600 }),
      getGridSize: () => gridSize,
      setGridSize: (next: number) => {
        gridSize = next;
      },
      setGridOffset: (offset: { x: number; y: number }) => {
        gridOffset = offset;
      },
      setShowGridSettings: (show: boolean) => {
        showGridSettings = show;
      },
      unproject: (point: { x: number; y: number }) => point,
      clearNotification,
    } as any);
  });

  it("commits grid move offset and exits move mode", () => {
    gridMoveMode = true;

    expect(handler.commitGridMove()).toBe(true);

    expect(gridOffset).toEqual({ x: -12.5, y: -37.5 });
    expect(gridMoveMode).toBe(false);
    expect(clearNotification).toHaveBeenCalled();
  });

  it("cancels grid fit and clears the fit rectangle", () => {
    gridFitMode = true;
    handler.startGridFit({ x: 10, y: 20 });

    expect(handler.cancelGridFit()).toBe(true);

    expect(gridFitMode).toBe(false);
    expect(handler.gridFitStart).toBeNull();
    expect(handler.gridFitEnd).toBeNull();
  });

  it("only starts grid fit for host mode while fit mode is active", () => {
    gridFitMode = true;
    hostMode = false;

    expect(handler.startGridFit({ x: 10, y: 20 })).toBe(false);

    hostMode = true;
    expect(handler.startGridFit({ x: 10, y: 20 })).toBe(true);
    expect(handler.gridFitStart).toEqual({ x: 10, y: 20 });
  });

  it("defaults to a 3x3 span, dividing the dragged size by 3", () => {
    gridFitMode = true;
    expect(handler.gridFitSpan).toBe(3);
    handler.startGridFit({ x: 10, y: 20 });
    handler.updateGridFit({ x: 80, y: 95 });

    expect(handler.commitGridFit()).toBe(true);

    expect(gridSize).toBe(25); // round(75 / 3)
    expect(gridOffset).toEqual({ x: -10, y: -20 });
    expect(gridFitMode).toBe(false);
    expect(showGridSettings).toBe(true);
    expect(handler.gridFitStart).toBeNull();
  });

  it("commits grid fit at a 1x1 span as the raw dragged size", () => {
    gridFitMode = true;
    handler.startGridFit({ x: 10, y: 20 });
    handler.cycleGridFitSpan(100); // scroll down: 3 -> 2 -> 1
    handler.cycleGridFitSpan(100);
    expect(handler.gridFitSpan).toBe(1);
    handler.updateGridFit({ x: 80, y: 95 });

    expect(handler.commitGridFit()).toBe(true);

    expect(gridSize).toBe(75);
  });

  it("cycles the fit span up and down through the preset options, clamped at the ends", () => {
    gridFitMode = true;
    handler.startGridFit({ x: 10, y: 20 });
    expect(handler.gridFitSpan).toBe(3);

    handler.cycleGridFitSpan(-100); // scroll up: 3 -> 5
    expect(handler.gridFitSpan).toBe(5);
    handler.cycleGridFitSpan(-100); // 5 -> 10
    expect(handler.gridFitSpan).toBe(10);
    handler.cycleGridFitSpan(-100); // already at max
    expect(handler.gridFitSpan).toBe(
      GRID_FIT_SPAN_OPTIONS[GRID_FIT_SPAN_OPTIONS.length - 1],
    );

    handler.cycleGridFitSpan(100); // 10 -> 5
    expect(handler.gridFitSpan).toBe(5);
    handler.cycleGridFitSpan(100); // 5 -> 3
    handler.cycleGridFitSpan(100); // 3 -> 2
    handler.cycleGridFitSpan(100); // 2 -> 1
    handler.cycleGridFitSpan(100); // already at min
    expect(handler.gridFitSpan).toBe(GRID_FIT_SPAN_OPTIONS[0]);
  });

  it("does not cycle the span when no fit drag is in progress", () => {
    expect(handler.cycleGridFitSpan(-100)).toBe(false);
    expect(handler.gridFitSpan).toBe(3);
  });

  it("preserves a legitimately small cell size (e.g. a tile's real ~14px grid squares)", () => {
    gridFitMode = true;
    handler.startGridFit({ x: 0, y: 0 });
    handler.cycleGridFitSpan(100); // 3 -> 2
    handler.cycleGridFitSpan(100); // 2 -> 1
    handler.updateGridFit({ x: 14, y: 14 }); // 14 / span(1) = 14px

    expect(handler.commitGridFit()).toBe(true);

    // Not floored away just because it's numerically small — at the mocked
    // zoom (2x) the floor is 8 / 2 = 4px, well under this real value.
    expect(gridSize).toBe(14);
  });

  it("floors a genuinely degenerate result, relative to the current zoom", () => {
    gridFitMode = true;
    handler.startGridFit({ x: 0, y: 0 });
    handler.updateGridFit({ x: 6, y: 6 }); // 6 / span(3) = 2px, below the zoomed floor (4px)

    expect(handler.commitGridFit()).toBe(true);

    expect(gridSize).toBe(4); // MIN_GRID_SCREEN_PX(8) / zoom(2)
  });

  it("scales the degenerate-result floor with zoom, not a fixed image-space number", () => {
    handler = new GridInteractionHandler({
      isGridMoveMode: () => gridMoveMode,
      setGridMoveMode: (active: boolean) => {
        gridMoveMode = active;
      },
      isGridFitMode: () => gridFitMode,
      setGridFitMode: (active: boolean) => {
        gridFitMode = active;
      },
      isHostMode: () => hostMode,
      getViewport: () => ({ pan: { x: 0, y: 0 }, zoom: 0.5 }),
      getCanvasSize: () => ({ width: 800, height: 600 }),
      getGridSize: () => gridSize,
      setGridSize: (next: number) => {
        gridSize = next;
      },
      setGridOffset: (offset: { x: number; y: number }) => {
        gridOffset = offset;
      },
      setShowGridSettings: (show: boolean) => {
        showGridSettings = show;
      },
      unproject: (point: { x: number; y: number }) => point,
      clearNotification,
    } as any);

    gridFitMode = true;
    handler.startGridFit({ x: 0, y: 0 });
    handler.updateGridFit({ x: 6, y: 6 }); // 6 / span(3) = 2px, below the zoomed floor (16px)

    expect(handler.commitGridFit()).toBe(true);

    expect(gridSize).toBe(16); // MIN_GRID_SCREEN_PX(8) / zoom(0.5)
  });

  it("keeps the chosen span across cancel/restart within the session", () => {
    gridFitMode = true;
    handler.startGridFit({ x: 10, y: 20 });
    handler.cycleGridFitSpan(-100); // 3 -> 5
    handler.cancelGridFit();

    gridFitMode = true;
    handler.startGridFit({ x: 0, y: 0 });
    expect(handler.gridFitSpan).toBe(5);
  });
});

describe("GridInteractionHandler on a hex grid", () => {
  const SQRT_3 = Math.sqrt(3);
  let gridSize = 50;
  let gridOffset = { x: 0, y: 0 };
  let gridType: "square" | "hex-pointy" | "hex-flat" = "hex-pointy";
  let moveMode = false;
  let fitMode = false;
  let fixedPan: { x: number; y: number } | null = null;
  let pan = { x: 0, y: 0 };
  let zoom = 1;
  let handler: GridInteractionHandler;

  beforeEach(() => {
    gridSize = 50;
    gridOffset = { x: 0, y: 0 };
    gridType = "hex-pointy";
    moveMode = false;
    fitMode = true;
    fixedPan = null;
    pan = { x: 0, y: 0 };
    zoom = 1;
    handler = new GridInteractionHandler({
      isGridMoveMode: () => moveMode,
      setGridMoveMode: (active: boolean) => {
        moveMode = active;
      },
      isGridFitMode: () => fitMode,
      setGridFitMode: (active: boolean) => {
        fitMode = active;
      },
      isHostMode: () => true,
      getViewport: () => ({ pan, zoom }),
      getCanvasSize: () => ({ width: 800, height: 600 }),
      getGridSize: () => gridSize,
      setGridSize: (next: number) => {
        gridSize = next;
      },
      setGridOffset: (offset: { x: number; y: number }) => {
        gridOffset = offset;
      },
      setShowGridSettings: () => {},
      unproject: (point: { x: number; y: number }) => point,
      clearNotification: vi.fn(),
      getGridType: () => gridType,
      getGridOffset: () => gridOffset,
      getGridFixedPan: () => fixedPan,
    });
  });

  it("fits a pointy-top grid from a drag along a row of hexes", () => {
    // Three hexes of radius 30 side by side: 3 * sqrt(3) * 30 wide.
    const width = 3 * SQRT_3 * 30;
    handler.startGridFit({ x: 100, y: 200 });
    handler.updateGridFit({ x: 100 + width, y: 220 });

    expect(handler.commitGridFit()).toBe(true);

    expect(gridSize).toBeCloseTo(30, 2);
    // A hex centre of the fitted grid sits half a hex in from the drag's left
    // edge, on the middle of the drag.
    const fitted = hexToPoint(
      pointToHex(
        { x: 100 + (SQRT_3 / 2) * 30, y: 210 },
        {
          orientation: "pointy",
          size: gridSize,
          offsetX: gridOffset.x,
          offsetY: gridOffset.y,
        },
      ),
      {
        orientation: "pointy",
        size: gridSize,
        offsetX: gridOffset.x,
        offsetY: gridOffset.y,
      },
    );
    expect(fitted.x).toBeCloseTo(100 + (SQRT_3 / 2) * 30, 4);
    expect(fitted.y).toBeCloseTo(210, 4);
    expect(Math.abs(gridOffset.x)).toBeLessThanOrEqual(SQRT_3 * 30);
    expect(Math.abs(gridOffset.y)).toBeLessThanOrEqual(1.5 * 30);
    expect(fitMode).toBe(false);
  });

  it("measures flat-top hexes down a column instead", () => {
    gridType = "hex-flat";
    const height = 3 * SQRT_3 * 30;
    handler.startGridFit({ x: 100, y: 200 });
    handler.updateGridFit({ x: 110, y: 200 + height });

    handler.commitGridFit();

    expect(gridSize).toBeCloseTo(30, 2);
  });

  it("keeps fractional hex sizes instead of rounding to whole pixels", () => {
    handler.startGridFit({ x: 0, y: 0 });
    handler.updateGridFit({ x: 3 * SQRT_3 * 33.37, y: 10 });

    handler.commitGridFit();

    expect(gridSize).toBe(33.37);
  });

  it("uses the chosen span, like the square fitter", () => {
    handler.startGridFit({ x: 0, y: 0 });
    handler.cycleGridFitSpan(100); // 3 -> 2
    handler.updateGridFit({ x: 2 * SQRT_3 * 40, y: 10 });

    handler.commitGridFit();

    expect(gridSize).toBeCloseTo(40, 2);
  });

  it("floors a degenerate hex result relative to zoom, and ignores a drag with no length", () => {
    zoom = 2;
    handler.startGridFit({ x: 0, y: 0 });
    handler.updateGridFit({ x: 6, y: 80 });
    handler.commitGridFit();
    expect(gridSize).toBe(4); // MIN_GRID_SCREEN_PX(8) / zoom(2)

    gridSize = 50;
    fitMode = true;
    handler.startGridFit({ x: 10, y: 10 });
    handler.updateGridFit({ x: 10, y: 90 }); // nothing along the row
    handler.commitGridFit();
    expect(gridSize).toBe(50);
  });

  it("leaves a tiny stray click alone", () => {
    handler.startGridFit({ x: 10, y: 10 });
    handler.updateGridFit({ x: 12, y: 12 });

    handler.commitGridFit();

    expect(gridSize).toBe(50);
    expect(gridOffset).toEqual({ x: 0, y: 0 });
  });

  it("ignores a drag perpendicular to the hex grid's measurement axis", () => {
    gridOffset = { x: 8, y: -6 };
    handler.startGridFit({ x: 100, y: 100 });
    handler.updateGridFit({ x: 100, y: 180 });

    handler.commitGridFit();

    expect(gridSize).toBe(50);
    expect(gridOffset).toEqual({ x: 8, y: -6 });
  });

  it("ignores a horizontal drag when fitting a flat-top hex column", () => {
    gridType = "hex-flat";
    gridOffset = { x: 8, y: -6 };
    handler.startGridFit({ x: 100, y: 100 });
    handler.updateGridFit({ x: 180, y: 100 });

    handler.commitGridFit();

    expect(gridSize).toBe(50);
    expect(gridOffset).toEqual({ x: 8, y: -6 });
  });

  it("moves a hex grid by how far the map was dragged, whole hexes aside", () => {
    moveMode = true;
    fixedPan = { x: 0, y: 0 };
    pan = { x: -20, y: 10 }; // map dragged 20px left, 10px down... grid held still
    gridOffset = { x: 5, y: 5 };

    expect(handler.commitGridMove()).toBe(true);

    // Same grid on screen: image shift is (fixed - pan) / zoom = (20, -10).
    expect(gridOffset.x).toBeCloseTo(25, 6);
    expect(gridOffset.y).toBeCloseTo(-5, 6);
    expect(moveMode).toBe(false);
  });

  it("keeps a large hex move equivalent by reducing it to the nearest hex", () => {
    moveMode = true;
    fixedPan = { x: 0, y: 0 };
    pan = { x: -1000, y: -777 };

    handler.commitGridMove();

    expect(Math.abs(gridOffset.x)).toBeLessThanOrEqual(SQRT_3 * 50);
    expect(Math.abs(gridOffset.y)).toBeLessThanOrEqual(1.5 * 50);
  });

  it("leaves square fitting exactly as it was when the grid is square", () => {
    gridType = "square";
    handler.startGridFit({ x: 10, y: 20 });
    handler.updateGridFit({ x: 80, y: 95 });

    handler.commitGridFit();

    expect(gridSize).toBe(25); // round(75 / 3)
    expect(gridOffset).toEqual({ x: -10, y: -20 });
  });

  it("falls back to the square move when the grid pan was never recorded", () => {
    moveMode = true;
    fixedPan = null;
    pan = { x: 25, y: 75 };
    zoom = 2;

    handler.commitGridMove();

    expect(gridOffset).toEqual({ x: -12.5, y: -37.5 });
  });
});
