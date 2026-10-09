import type { Point } from "schema";
import { drawFogStroke } from "./fog-stroke";
import {
  punchHexFogCell,
  punchHexFogRadius,
  getActiveHexConfig,
} from "./hex-fog-stroke";
import { hexToPoint, pointToHex, type HexCoord } from "map-engine";
import type { GridType } from "$lib/stores/map.svelte";
import { MaskUndoRecorder } from "./mask-undo-recorder";

export interface MapFogPainterDeps {
  mapStore: {
    activeMapId: string | null;
    brushRadius: number;
    showGrid?: boolean;
    gridType?: GridType;
    gridSize?: number;
    gridOffsetX?: number;
    gridOffsetY?: number;
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

export class MapFogPainter {
  private maskSnapshot: HTMLCanvasElement | null = null;
  private lastPaintImgCoords: Point | null = null;
  private activeMapId: string | null = null;
  private painting = false;
  private undoRecorder: MaskUndoRecorder;

  constructor(private deps: MapFogPainterDeps) {
    this.undoRecorder = new MaskUndoRecorder(deps);
  }

  get isPainting() {
    return this.painting;
  }

  begin(point: Point, isHiding: boolean): boolean {
    const maskCanvas = this.deps.getMaskCanvas();
    const activeMapId = this.deps.mapStore.activeMapId;

    if (!maskCanvas || !activeMapId) {
      return false;
    }

    this.painting = true;
    this.activeMapId = activeMapId;
    this.maskSnapshot = this.undoRecorder.snapshot();
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
    const currentMapId = this.deps.mapStore.activeMapId;

    if (!maskCanvas || !currentMapId || currentMapId !== this.activeMapId) {
      this.reset();
      return false;
    }

    this.undoRecorder.commit("Map Drawing", this.maskSnapshot);

    await this.deps.mapStore.saveMask(maskCanvas);
    this.reset();
    return true;
  }

  private lastPaintedHexKey: string | null = null;

  cancel() {
    this.reset();
  }

  // fallow-ignore-next-line complexity
  private paintAt(point: Point, isHiding: boolean) {
    const maskCanvas = this.deps.getMaskCanvas();
    if (!maskCanvas || !this.painting) return;

    const currentCoords = this.deps.mapStore.unproject(point);
    const previousCoords = this.lastPaintImgCoords || currentCoords;
    const ctx = maskCanvas.getContext("2d");
    if (!ctx) return;

    const hexConfig = getActiveHexConfig(this.deps.mapStore);
    if (hexConfig) {
      const hex = pointToHex(currentCoords, hexConfig);
      const hexKey = `${hex.q},${hex.r}`;

      if (hexKey !== this.lastPaintedHexKey) {
        this.lastPaintedHexKey = hexKey;
        const hexRadius = Math.max(
          0,
          Math.floor(
            (this.deps.mapStore.brushRadius || 50) / (hexConfig.size * 1.5),
          ),
        );
        if (hexRadius > 0) {
          punchHexFogRadius(
            ctx,
            maskCanvas,
            hex,
            hexRadius,
            hexConfig,
            isHiding,
          );
        } else {
          punchHexFogCell(ctx, maskCanvas, hex, hexConfig, isHiding);
        }
      }
      this.lastPaintImgCoords = currentCoords;
      return;
    }

    drawFogStroke(
      ctx,
      maskCanvas,
      this.deps.mapStore.brushRadius,
      previousCoords,
      currentCoords,
      isHiding,
    );

    this.lastPaintImgCoords = currentCoords;
  }

  /**
   * The hex under an image-space point and whether it is currently fogged, or
   * null when there is no hex grid, no mask, or the hex lies off the mask.
   */
  hexAt(imgPoint: Point): { hex: HexCoord; fogged: boolean } | null {
    const config = getActiveHexConfig(this.deps.mapStore);
    const maskCanvas = this.deps.getMaskCanvas();
    const ctx = maskCanvas?.getContext("2d");
    if (!config || !maskCanvas || !ctx) return null;

    const hex = pointToHex(imgPoint, config);
    const center = hexToPoint(hex, config);
    const x = Math.floor(center.x + maskCanvas.width / 2);
    const y = Math.floor(center.y + maskCanvas.height / 2);
    if (x < 0 || y < 0 || x >= maskCanvas.width || y >= maskCanvas.height) {
      return null;
    }
    // Opaque mask pixels reveal the map; transparent pixels leave fog in place.
    return { hex, fogged: ctx.getImageData(x, y, 1, 1).data[3] <= 127 };
  }

  /**
   * Whether the map is revealed at an image-space point. Unknown mask state is
   * treated as fogged; a point outside the map image is not covered by fog.
   */
  isRevealedAt(imgPoint: Point): boolean {
    const maskCanvas = this.deps.getMaskCanvas();
    const ctx = maskCanvas?.getContext("2d");
    if (!maskCanvas || !ctx) return false;

    const x = Math.floor(imgPoint.x + maskCanvas.width / 2);
    const y = Math.floor(imgPoint.y + maskCanvas.height / 2);
    if (x < 0 || y < 0 || x >= maskCanvas.width || y >= maskCanvas.height) {
      return true;
    }
    try {
      return ctx.getImageData(x, y, 1, 1).data[3] > 127;
    } catch {
      return false;
    }
  }

  /** Reveal (isHiding false) or fog (true) exactly one hex, as one undo step. */
  async paintHex(hex: HexCoord, isHiding: boolean): Promise<boolean> {
    const config = getActiveHexConfig(this.deps.mapStore);
    const maskCanvas = this.deps.getMaskCanvas();
    const mapId = this.deps.mapStore.activeMapId;
    const ctx = maskCanvas?.getContext("2d");
    if (this.painting || !config || !maskCanvas || !mapId || !ctx) return false;

    const before = this.undoRecorder.snapshot();
    punchHexFogCell(ctx, maskCanvas, hex, config, isHiding);
    this.undoRecorder.commit("Map Drawing", before);
    await this.deps.mapStore.saveMask(maskCanvas);
    return true;
  }

  private reset() {
    this.painting = false;
    this.maskSnapshot = null;
    this.lastPaintImgCoords = null;
    this.lastPaintedHexKey = null;
    this.activeMapId = null;
  }
}
