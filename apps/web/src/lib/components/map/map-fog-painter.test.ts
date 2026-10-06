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
    closePath: vi.fn(),
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

  it("paints on a blank map with no background image, sized off the mask canvas", async () => {
    const blankPainter = new MapFogPainter({
      mapStore: {
        activeMapId: "map-1",
        brushRadius: 12,
        unproject: vi.fn((point) => ({ x: point.x / 2, y: point.y / 2 })),
        saveMask,
      },
      oracle: { pushUndoAction },
      getMaskCanvas: () => currentMask.canvas,
      getMapImage: () => null,
      createCanvas: () => createCanvasMock().canvas,
    });

    const started = blankPainter.begin({ x: 20, y: 30 }, false);
    expect(started).toBe(true);
    expect(mask.ctx.stroke).toHaveBeenCalled();

    const finished = await blankPainter.finish();
    expect(finished).toBe(true);
    expect(saveMask).toHaveBeenCalledWith(mask.canvas);
  });

  it("stamps polygon hexes instead of circle brush when hex grid is active", async () => {
    const hexMask = createCanvasMock();
    const hexPainter = new MapFogPainter({
      mapStore: {
        activeMapId: "map-hex",
        brushRadius: 10,
        showGrid: true,
        gridType: "hex-pointy",
        gridSize: 50,
        unproject: vi.fn((p) => p),
        saveMask,
      },
      oracle: { pushUndoAction },
      getMaskCanvas: () => hexMask.canvas,
      getMapImage: () => mapImage,
      createCanvas: () => createCanvasMock().canvas,
    });

    hexPainter.begin({ x: 0, y: 0 }, false);
    // Should have filled a 6-vertex polygon path
    expect(hexMask.ctx.beginPath).toHaveBeenCalled();
    expect(hexMask.ctx.moveTo).toHaveBeenCalled();
    expect(hexMask.ctx.lineTo).toHaveBeenCalledTimes(5);
    expect(hexMask.ctx.closePath).toHaveBeenCalled();
    expect(hexMask.ctx.fill).toHaveBeenCalled();
    expect(hexMask.ctx.fillStyle).toBe("white");
  });

  describe("single hex", () => {
    function hexPainter(opts: { hex?: boolean; alpha?: number } = {}) {
      const hexMask = createCanvasMock();
      hexMask.ctx.getImageData = vi.fn(() => ({
        data: [0, 0, 0, opts.alpha ?? 255],
      }));
      const hexSave = vi.fn().mockResolvedValue(undefined);
      const hexUndo = vi.fn();
      const instance = new MapFogPainter({
        mapStore: {
          activeMapId: "map-hex",
          brushRadius: 10,
          showGrid: opts.hex !== false,
          gridType: "hex-pointy",
          gridSize: 20,
          unproject: vi.fn((p) => p),
          saveMask: hexSave,
        },
        oracle: { pushUndoAction: hexUndo },
        getMaskCanvas: () => hexMask.canvas,
        getMapImage: () => mapImage,
        createCanvas: () => createCanvasMock().canvas,
      });
      return { instance, hexMask, hexSave, hexUndo };
    }

    it("reports the hex under a point and whether it is fogged", () => {
      expect(hexPainter().instance.hexAt({ x: 0, y: 0 })).toEqual({
        hex: { q: 0, r: 0 },
        fogged: true,
      });
      expect(
        hexPainter({ alpha: 0 }).instance.hexAt({ x: 0, y: 0 })?.fogged,
      ).toBe(false);
    });

    it("has no hex target without a hex grid or off the mask", () => {
      expect(
        hexPainter({ hex: false }).instance.hexAt({ x: 0, y: 0 }),
      ).toBeNull();
      expect(hexPainter().instance.hexAt({ x: 5000, y: 0 })).toBeNull();
    });

    it("reveals one hex, saves the mask and registers undo", async () => {
      const { instance, hexMask, hexSave, hexUndo } = hexPainter();

      expect(await instance.paintHex({ q: 0, r: 0 }, false)).toBe(true);

      expect(hexMask.ctx.fill).toHaveBeenCalledTimes(1);
      expect(hexMask.ctx.lineTo).toHaveBeenCalledTimes(5);
      expect(hexSave).toHaveBeenCalledWith(hexMask.canvas);
      expect(hexUndo).toHaveBeenCalledWith(
        "Map Drawing",
        expect.any(Function),
        undefined,
        expect.any(Function),
      );
    });

    it("does nothing without a hex grid", async () => {
      const { instance, hexSave, hexUndo } = hexPainter({ hex: false });

      expect(await instance.paintHex({ q: 0, r: 0 }, false)).toBe(false);
      expect(hexSave).not.toHaveBeenCalled();
      expect(hexUndo).not.toHaveBeenCalled();
    });
  });
});
