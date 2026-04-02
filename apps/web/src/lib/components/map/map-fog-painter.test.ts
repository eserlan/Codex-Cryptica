import { describe, expect, it, vi, beforeEach } from "vitest";
import { MapFogPainter, type MapFogPainterDeps } from "./map-fog-painter";

function createCanvasMock() {
  const ctx = {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    arc: vi.fn(),
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    lineCap: "",
    lineJoin: "",
    lineWidth: 0,
    globalCompositeOperation: "",
    fillStyle: "",
    strokeStyle: "",
  } as any;

  const canvas = {
    width: 100,
    height: 80,
    getContext: vi.fn(() => ctx),
  } as unknown as HTMLCanvasElement;

  return { canvas, ctx };
}

describe("MapFogPainter", () => {
  let mask: ReturnType<typeof createCanvasMock>;
  let currentMask: ReturnType<typeof createCanvasMock>;
  let saveMask: MapFogPainterDeps["mapStore"]["saveMask"];
  let pushUndoAction: MapFogPainterDeps["oracle"]["pushUndoAction"];
  let painter: MapFogPainter;
  let mapImage: HTMLImageElement;
  let undoAction: (() => Promise<void>) | undefined;
  let redoAction: (() => Promise<void>) | undefined;

  beforeEach(() => {
    mask = createCanvasMock();
    currentMask = mask;
    saveMask = vi
      .fn()
      .mockResolvedValue(
        undefined,
      ) as unknown as MapFogPainterDeps["mapStore"]["saveMask"];
    undoAction = undefined;
    redoAction = undefined;
    pushUndoAction = vi.fn((_, undo, __, redo) => {
      undoAction = undo;
      redoAction = redo;
    }) as unknown as MapFogPainterDeps["oracle"]["pushUndoAction"];
    mapImage = { width: 200, height: 100 } as HTMLImageElement;
    const createdCanvases: ReturnType<typeof createCanvasMock>[] = [];

    painter = new MapFogPainter({
      mapStore: {
        activeMapId: "map-1",
        brushRadius: 12,
        unproject: vi.fn((point) => ({ x: point.x / 2, y: point.y / 2 })),
        saveMask,
      },
      oracle: { pushUndoAction },
      getMaskCanvas: () => currentMask.canvas,
      getMapImage: () => mapImage,
      createCanvas: () => {
        const canvas = createCanvasMock();
        createdCanvases.push(canvas);
        return canvas.canvas;
      },
    });
  });

  it("begins painting and draws a stroke", () => {
    const started = painter.begin({ x: 20, y: 30 }, false);
    expect(started).toBe(true);
    expect(mask.ctx.save).toHaveBeenCalled();
    expect(mask.ctx.stroke).toHaveBeenCalled();
    expect(mask.ctx.fill).toHaveBeenCalled();
  });

  it("finishes painting and registers undo/redo", async () => {
    painter.begin({ x: 20, y: 30 }, false);
    painter.move({ x: 30, y: 40 }, false);

    const finished = await painter.finish();

    expect(finished).toBe(true);
    expect(saveMask).toHaveBeenCalledWith(mask.canvas);
    expect(pushUndoAction).toHaveBeenCalledWith(
      "Map Drawing",
      expect.any(Function),
      undefined,
      expect.any(Function),
    );
  });

  it("keeps undo/redo tied to the live mask canvas", async () => {
    painter.begin({ x: 20, y: 30 }, false);
    painter.move({ x: 30, y: 40 }, false);

    const finished = await painter.finish();

    expect(finished).toBe(true);
    expect(undoAction).toEqual(expect.any(Function));
    expect(redoAction).toEqual(expect.any(Function));

    const reloadedMask = createCanvasMock();
    currentMask = reloadedMask;

    await undoAction?.();
    expect(reloadedMask.ctx.clearRect).toHaveBeenCalledWith(
      0,
      0,
      reloadedMask.canvas.width,
      reloadedMask.canvas.height,
    );
    expect(reloadedMask.ctx.drawImage).toHaveBeenCalled();
    expect(saveMask).toHaveBeenCalledWith(reloadedMask.canvas);

    await redoAction?.();
    expect(reloadedMask.ctx.clearRect).toHaveBeenCalledTimes(2);
    expect(reloadedMask.ctx.drawImage).toHaveBeenCalledTimes(2);
  });

  it("ignores finish when not painting", async () => {
    await expect(painter.finish()).resolves.toBe(false);
    expect(pushUndoAction).not.toHaveBeenCalled();
  });
});
