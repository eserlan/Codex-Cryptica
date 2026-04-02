import type { Point } from "schema";

export interface MapFogPainterDeps {
  mapStore: {
    activeMapId: string | null;
    brushRadius: number;
    unproject(point: Point): Point;
    saveMask(canvas: HTMLCanvasElement): Promise<void>;
  };
  oracle: {
    pushUndoAction(
      name: string,
      undo: () => Promise<void>,
      messageId: string | undefined,
      redo: () => Promise<void>,
    ): void;
  };
  getMaskCanvas: () => HTMLCanvasElement | null;
  getMapImage: () => HTMLImageElement | null;
  createCanvas: () => HTMLCanvasElement;
}

function copyCanvas(
  source: HTMLCanvasElement,
  createCanvas: () => HTMLCanvasElement,
) {
  const canvas = createCanvas();
  canvas.width = source.width;
  canvas.height = source.height;
  canvas.getContext("2d")?.drawImage(source, 0, 0);
  return canvas;
}

function drawFogStroke(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  radius: number,
  from: Point,
  to: Point,
  isHiding: boolean,
) {
  ctx.save();

  if (isHiding) {
    ctx.globalCompositeOperation = "destination-out";
  } else {
    ctx.fillStyle = "white";
    ctx.strokeStyle = "white";
    ctx.globalCompositeOperation = "source-over";
  }

  const centerX = to.x + image.width / 2;
  const centerY = to.y + image.height / 2;
  const prevX = from.x + image.width / 2;
  const prevY = from.y + image.height / 2;

  ctx.beginPath();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = radius * 2;
  ctx.moveTo(prevX, prevY);
  ctx.lineTo(centerX, centerY);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export class MapFogPainter {
  private maskSnapshot: HTMLCanvasElement | null = null;
  private lastPaintImgCoords: Point | null = null;
  private activeMapId: string | null = null;
  private painting = false;

  constructor(private deps: MapFogPainterDeps) {}

  get isPainting() {
    return this.painting;
  }

  begin(point: Point, isHiding: boolean): boolean {
    const maskCanvas = this.deps.getMaskCanvas();
    const image = this.deps.getMapImage();
    const activeMapId = this.deps.mapStore.activeMapId;

    if (!maskCanvas || !image || !activeMapId) {
      return false;
    }

    this.painting = true;
    this.activeMapId = activeMapId;
    this.maskSnapshot = copyCanvas(maskCanvas, this.deps.createCanvas);
    this.lastPaintImgCoords = this.deps.mapStore.unproject(point);

    this.paintAt(point, isHiding);
    return true;
  }

  move(point: Point, isHiding: boolean): boolean {
    if (!this.painting) return false;
    this.paintAt(point, isHiding);
    return true;
  }

  async finish(): Promise<boolean> {
    if (!this.painting) {
      this.reset();
      return false;
    }

    const maskCanvas = this.deps.getMaskCanvas();
    const image = this.deps.getMapImage();
    const currentMapId = this.deps.mapStore.activeMapId;

    if (
      !maskCanvas ||
      !image ||
      !currentMapId ||
      currentMapId !== this.activeMapId
    ) {
      this.reset();
      return false;
    }

    const snapshotBefore = this.maskSnapshot;
    const snapshotAfter = copyCanvas(maskCanvas, this.deps.createCanvas);
    const applySnapshot = async (snapshot: HTMLCanvasElement | null) => {
      const liveMaskCanvas = this.deps.getMaskCanvas();

      if (
        snapshot &&
        liveMaskCanvas &&
        this.deps.mapStore.activeMapId === currentMapId
      ) {
        const ctx = liveMaskCanvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, liveMaskCanvas.width, liveMaskCanvas.height);
          ctx.drawImage(snapshot, 0, 0);
          await this.deps.mapStore.saveMask(liveMaskCanvas);
        }
      }
    };

    this.deps.oracle.pushUndoAction(
      "Map Drawing",
      async () => {
        await applySnapshot(snapshotBefore);
      },
      undefined,
      async () => {
        await applySnapshot(snapshotAfter);
      },
    );

    await this.deps.mapStore.saveMask(maskCanvas);
    this.reset();
    return true;
  }

  cancel() {
    this.reset();
  }

  private paintAt(point: Point, isHiding: boolean) {
    const maskCanvas = this.deps.getMaskCanvas();
    const image = this.deps.getMapImage();
    if (!maskCanvas || !image || !this.painting) return;

    const currentCoords = this.deps.mapStore.unproject(point);
    const previousCoords = this.lastPaintImgCoords || currentCoords;
    const ctx = maskCanvas.getContext("2d");
    if (!ctx) return;

    drawFogStroke(
      ctx,
      image,
      this.deps.mapStore.brushRadius,
      previousCoords,
      currentCoords,
      isHiding,
    );

    this.lastPaintImgCoords = currentCoords;
  }

  private reset() {
    this.painting = false;
    this.maskSnapshot = null;
    this.lastPaintImgCoords = null;
    this.activeMapId = null;
  }
}
