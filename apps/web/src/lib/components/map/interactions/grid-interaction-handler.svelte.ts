import type { Point, ViewportTransform } from "schema";

export interface GridInteractionDependencies {
  isGridMoveMode: () => boolean;
  setGridMoveMode: (active: boolean) => void;
  isGridFitMode: () => boolean;
  setGridFitMode: (active: boolean) => void;
  isHostMode: () => boolean;
  getViewport: () => ViewportTransform;
  getCanvasSize: () => { width: number; height: number };
  getGridSize: () => number;
  setGridSize: (gridSize: number) => void;
  setGridOffset: (offset: Point) => void;
  setShowGridSettings: (show: boolean) => void;
  unproject: (point: Point) => Point;
  clearNotification: () => void;
}

export class GridInteractionHandler {
  gridFitStart = $state<Point | null>(null);
  gridFitEnd = $state<Point | null>(null);

  constructor(private deps: GridInteractionDependencies) {}

  commitGridMove() {
    if (!this.deps.isGridMoveMode()) return false;

    const viewport = this.deps.getViewport();
    const canvasSize = this.deps.getCanvasSize();
    const gridSize = this.deps.getGridSize();
    this.deps.setGridOffset({
      x: -((viewport.pan.x + canvasSize.width / 2) / viewport.zoom) % gridSize,
      y: -((viewport.pan.y + canvasSize.height / 2) / viewport.zoom) % gridSize,
    });
    this.deps.setGridMoveMode(false);
    this.deps.clearNotification();
    return true;
  }

  cancelGridMove() {
    if (!this.deps.isGridMoveMode()) return false;
    this.deps.setGridMoveMode(false);
    this.deps.clearNotification();
    return true;
  }

  cancelGridFit() {
    if (!this.deps.isGridFitMode() && !this.gridFitStart) return false;
    this.deps.setGridFitMode(false);
    this.gridFitStart = null;
    this.gridFitEnd = null;
    return true;
  }

  shouldStartGridMove() {
    return this.deps.isGridMoveMode() && this.deps.isHostMode();
  }

  startGridFit(point: Point) {
    if (!this.deps.isGridFitMode() || !this.deps.isHostMode()) return false;
    this.gridFitStart = point;
    this.gridFitEnd = point;
    return true;
  }

  updateGridFit(point: Point) {
    if (!this.gridFitStart) return false;
    this.gridFitEnd = point;
    return true;
  }

  commitGridFit() {
    if (!this.gridFitStart || !this.gridFitEnd) return false;

    const startImg = this.deps.unproject(this.gridFitStart);
    const endImg = this.deps.unproject(this.gridFitEnd);
    const imgWidth = Math.abs(endImg.x - startImg.x);
    const imgHeight = Math.abs(endImg.y - startImg.y);

    if (imgWidth >= 5 || imgHeight >= 5) {
      const cellSize = Math.round(Math.max(imgWidth, imgHeight));
      this.deps.setGridSize(cellSize);
      this.deps.setGridOffset({
        x: -(Math.min(startImg.x, endImg.x) % cellSize),
        y: -(Math.min(startImg.y, endImg.y) % cellSize),
      });
    }

    this.gridFitStart = null;
    this.gridFitEnd = null;
    this.deps.setGridFitMode(false);
    this.deps.setShowGridSettings(true);
    return true;
  }
}
