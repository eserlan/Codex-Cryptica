import type { Point, ViewportTransform } from "schema";
import {
  fitHexGrid,
  normalizeHexOffset,
  type HexOrientation,
} from "map-engine";

/**
 * How many grid squares the fit-drag rectangle is assumed to span. A tile
 * with a small repeating grid pattern (e.g. a geomorph module) is far easier
 * to fit accurately by dragging across several squares and dividing than by
 * trying to land on exactly one square's edges.
 */
export const GRID_FIT_SPAN_OPTIONS = [1, 2, 3, 5, 10] as const;
const DEFAULT_GRID_FIT_SPAN = 3;
// A cell should stay large enough to be usable on screen, but "usable" is a
// screen-space notion — a tile's real grid squares (e.g. ~14 image-px on a
// geomorph pack) are legitimately small in image-space and must not be
// floored away. So the floor is defined in screen pixels and converted to
// image-space via the current zoom, rather than a fixed image-space number.
const MIN_GRID_SCREEN_PX = 8;

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
  /** Absent means a square grid, which is how the handler began. */
  getGridType?: () => "square" | "hex-pointy" | "hex-flat";
  getGridOffset?: () => Point;
  /** Where the map was panned to when grid-move mode began. */
  getGridFixedPan?: () => Point | null;
}

const hexOrientation = (
  type: "square" | "hex-pointy" | "hex-flat" | undefined,
): HexOrientation | null =>
  type === "hex-pointy" ? "pointy" : type === "hex-flat" ? "flat" : null;

const hasGridFitDrag = (
  start: Point,
  end: Point,
  orientation: HexOrientation | null,
): boolean => {
  if (orientation === "pointy") return Math.abs(end.x - start.x) >= 5;
  if (orientation === "flat") return Math.abs(end.y - start.y) >= 5;
  return Math.abs(end.x - start.x) >= 5 || Math.abs(end.y - start.y) >= 5;
};

/** Hex sizes keep two decimals: whole pixels drift visibly over a dozen hexes. */
const roundHexSize = (size: number) => Math.round(size * 100) / 100;

export class GridInteractionHandler {
  gridFitStart = $state<Point | null>(null);
  gridFitEnd = $state<Point | null>(null);
  /** Persists across drags in a session so a chosen span doesn't need reselecting each time. */
  gridFitSpan = $state<number>(DEFAULT_GRID_FIT_SPAN);

  constructor(private deps: GridInteractionDependencies) {}

  commitGridMove() {
    if (!this.deps.isGridMoveMode()) return false;

    const viewport = this.deps.getViewport();
    if (this.commitHexGridMove(viewport)) return true;
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

  /**
   * A hex grid repeats under whole-hex shifts, not whole-size ones, so the
   * square arithmetic would nudge it out of line. Keep the grid exactly where
   * it was held on screen and move it by how far the map was dragged.
   */
  private commitHexGridMove(viewport: ViewportTransform): boolean {
    const orientation = hexOrientation(this.deps.getGridType?.());
    const fixedPan = this.deps.getGridFixedPan?.();
    const offset = this.deps.getGridOffset?.();
    if (!orientation || !fixedPan || !offset) return false;

    const zoom = viewport.zoom || 1;
    this.deps.setGridOffset(
      normalizeHexOffset(
        {
          x: offset.x + (fixedPan.x - viewport.pan.x) / zoom,
          y: offset.y + (fixedPan.y - viewport.pan.y) / zoom,
        },
        this.deps.getGridSize(),
        orientation,
      ),
    );
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

  /** Shift+scroll while dragging a fit rectangle cycles how many grid squares it's assumed to span. */
  cycleGridFitSpan(deltaY: number) {
    if (!this.gridFitStart) return false;
    const options = GRID_FIT_SPAN_OPTIONS;
    const currentIndex = options.indexOf(
      this.gridFitSpan as (typeof options)[number],
    );
    const index =
      currentIndex === -1
        ? options.indexOf(DEFAULT_GRID_FIT_SPAN)
        : currentIndex;
    const nextIndex =
      deltaY < 0
        ? Math.min(options.length - 1, index + 1)
        : Math.max(0, index - 1);
    this.gridFitSpan = options[nextIndex];
    return true;
  }

  /**
   * Fits a hex grid to hexes already on the map: the drag spans `gridFitSpan`
   * hexes along a row (pointy) or column (flat).
   */
  private fitHexGrid(
    orientation: HexOrientation,
    startImg: Point,
    endImg: Point,
  ) {
    const zoom = this.deps.getViewport().zoom || 1;
    const fit = fitHexGrid({
      start: startImg,
      end: endImg,
      span: this.gridFitSpan,
      orientation,
    });
    if (fit.size <= 0) return;

    this.deps.setGridSize(
      roundHexSize(Math.max(MIN_GRID_SCREEN_PX / zoom, fit.size)),
    );
    this.deps.setGridOffset({ x: fit.offsetX, y: fit.offsetY });
  }

  /** Fits a square grid: the drag spans `gridFitSpan` squares. */
  private fitSquareGrid(startImg: Point, endImg: Point) {
    const zoom = this.deps.getViewport().zoom || 1;
    const minCellSize = MIN_GRID_SCREEN_PX / zoom;
    const dragged = Math.max(
      Math.abs(endImg.x - startImg.x),
      Math.abs(endImg.y - startImg.y),
    );
    const cellSize = Math.round(
      Math.max(minCellSize, dragged / this.gridFitSpan),
    );
    this.deps.setGridSize(cellSize);
    this.deps.setGridOffset({
      x: -(Math.min(startImg.x, endImg.x) % cellSize),
      y: -(Math.min(startImg.y, endImg.y) % cellSize),
    });
  }

  commitGridFit() {
    if (!this.gridFitStart || !this.gridFitEnd) return false;

    const startImg = this.deps.unproject(this.gridFitStart);
    const endImg = this.deps.unproject(this.gridFitEnd);
    const orientation = hexOrientation(this.deps.getGridType?.());
    const dragged = hasGridFitDrag(startImg, endImg, orientation);

    if (dragged && orientation) this.fitHexGrid(orientation, startImg, endImg);
    else if (dragged) this.fitSquareGrid(startImg, endImg);

    this.gridFitStart = null;
    this.gridFitEnd = null;
    this.deps.setGridFitMode(false);
    this.deps.setShowGridSettings(true);
    return true;
  }
}
