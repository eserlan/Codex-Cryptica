import { beforeEach, describe, expect, it, vi } from "vitest";
import { GridInteractionHandler } from "./grid-interaction-handler.svelte";

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

  it("commits grid fit size and opens grid settings", () => {
    gridFitMode = true;
    handler.startGridFit({ x: 10, y: 20 });
    handler.updateGridFit({ x: 80, y: 95 });

    expect(handler.commitGridFit()).toBe(true);

    expect(gridSize).toBe(75);
    expect(gridOffset).toEqual({ x: -10, y: -20 });
    expect(gridFitMode).toBe(false);
    expect(showGridSettings).toBe(true);
    expect(handler.gridFitStart).toBeNull();
  });
});
