import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  GRID_FIT_SPAN_OPTIONS,
  GridInteractionHandler,
} from "./grid-interaction-handler.svelte";

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
