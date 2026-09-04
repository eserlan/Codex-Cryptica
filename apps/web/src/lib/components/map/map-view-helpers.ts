import type { MapPin, Point, StatSheetField, ViewportTransform } from "schema";

export interface PanZoomUpdate {
  pan: Point;
  zoom: number;
  announcement: string;
}

export interface ZoomViewportInput {
  mouse: Point;
  canvasSize: { width: number; height: number };
  viewport: ViewportTransform;
  deltaY: number;
  altHeld: boolean;
  zoomSpeed?: number;
  minZoom?: number;
  maxZoom?: number;
}

// Small pre-drawn map tiles (e.g. geomorph line-art) are often authored at a
// native resolution that makes each grid square only a handful of pixels
// once "fit grid to map" divides it up. Below this size (larger dimension,
// in px) the map is displayed at 2x — the source file is untouched, only
// its on-canvas draw/grid/pin coordinate space is scaled up.
export const SMALL_MAP_DISPLAY_SCALE_THRESHOLD = 1000;
export const SMALL_MAP_DISPLAY_SCALE_FACTOR = 2;

// Computes the image-space size a map should be displayed/interacted with
// at, given its background image's native pixel size. Called once, when a
// map's dimensions are first recorded (see MapView.svelte), so the result
// becomes the single source of truth for grid size, pin coordinates, fog
// mask sizing, and drag bounds clamping from then on.
export function getMapDisplayDimensions(
  nativeWidth: number,
  nativeHeight: number,
): { width: number; height: number } {
  const scale =
    Math.max(nativeWidth, nativeHeight) < SMALL_MAP_DISPLAY_SCALE_THRESHOLD
      ? SMALL_MAP_DISPLAY_SCALE_FACTOR
      : 1;
  return { width: nativeWidth * scale, height: nativeHeight * scale };
}

// Explains why a token under the cursor refused to be dragged, so pressing
// a locked piece says so instead of silently doing nothing (or, worse,
// panning the map out from under the press).
export function describeMoveBlocked(
  token: { name?: string; locked?: boolean; layer?: string | null },
  isLayerLocked: boolean,
  isHost: boolean,
): string {
  const name = token.name?.trim() || "That piece";

  if (token.locked) {
    return `${name} is locked — unlock it to move it`;
  }
  if (isLayerLocked) {
    return `The ${token.layer ?? "token"} layer is locked — unlock the layer to move ${name}`;
  }
  if (!isHost) {
    return `${name} belongs to someone else — only its owner or the GM can move it`;
  }
  return `${name} can't be moved`;
}

export function findClickedPin(
  pins: MapPin[],
  project: (point: Point) => Point,
  x: number,
  y: number,
  radius = 15,
): MapPin | null {
  for (const pin of pins) {
    const pinPos = project(pin.coordinates);
    const dist = Math.sqrt(
      Math.pow(x - pinPos.x, 2) + Math.pow(y - pinPos.y, 2),
    );
    if (dist < radius) return pin;
  }

  return null;
}

export function isClickGesture(
  start: Point,
  end: Point,
  threshold = 5,
): boolean {
  const dist = Math.sqrt(
    Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2),
  );
  return dist < threshold;
}

export function getKeyboardViewportUpdate(
  key: string,
  viewport: ViewportTransform,
  options: {
    panStep?: number;
    zoomStep?: number;
    minZoom?: number;
    maxZoom?: number;
  } = {},
): PanZoomUpdate | null {
  const panStep = options.panStep ?? 50;
  const zoomStep = options.zoomStep ?? 0.1;
  const minZoom = options.minZoom ?? 0.1;
  const maxZoom = options.maxZoom ?? 10;

  const { pan, zoom } = viewport;

  switch (key) {
    case "ArrowUp":
      return {
        pan: { x: pan.x, y: pan.y + panStep },
        zoom,
        announcement: "Map panned up",
      };
    case "ArrowDown":
      return {
        pan: { x: pan.x, y: pan.y - panStep },
        zoom,
        announcement: "Map panned down",
      };
    case "ArrowLeft":
      return {
        pan: { x: pan.x + panStep, y: pan.y },
        zoom,
        announcement: "Map panned left",
      };
    case "ArrowRight":
      return {
        pan: { x: pan.x - panStep, y: pan.y },
        zoom,
        announcement: "Map panned right",
      };
    case "+":
    case "=": {
      const nextZoom = Math.max(minZoom, Math.min(maxZoom, zoom + zoomStep));
      return {
        pan,
        zoom: nextZoom,
        announcement: `Zoom level ${nextZoom.toFixed(2)}`,
      };
    }
    case "-": {
      const nextZoom = Math.max(minZoom, Math.min(maxZoom, zoom - zoomStep));
      return {
        pan,
        zoom: nextZoom,
        announcement: `Zoom level ${nextZoom.toFixed(2)}`,
      };
    }
    default:
      return null;
  }
}

export function shouldIgnoreMapKeyboardEvent(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  if (
    target.isContentEditable ||
    target.getAttribute("contenteditable") === "" ||
    target.getAttribute("contenteditable") === "true"
  ) {
    return true;
  }

  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select";
}

// A token shows at most one health bar, driven by whichever counter field
// on its linked entity has been designated via the stat sheet's bar toggle.
export function resolveHealthBar(
  fields: StatSheetField[] | undefined,
): { value: number; max: number } | null {
  const barField = fields?.find((f) => f.type === "counter" && f.barField);
  if (!barField) return null;
  const max = barField.max ?? 1;
  if (max <= 0) return null;
  return {
    value: typeof barField.value === "number" ? barField.value : 0,
    max,
  };
}

export interface ZoomAtPointInput {
  point: Point;
  canvasSize: { width: number; height: number };
  viewport: ViewportTransform;
  nextZoom: number;
  minZoom?: number;
  maxZoom?: number;
}

// Zooms the viewport to `nextZoom` while keeping the image-space location
// under `point` fixed on screen. Shared by wheel zoom and pinch-to-zoom so
// both anchor the same way.
export function getZoomAtPointUpdate({
  point,
  canvasSize,
  viewport,
  nextZoom,
  minZoom = 0.1,
  maxZoom = 10,
}: ZoomAtPointInput): PanZoomUpdate {
  const clampedZoom = Math.max(minZoom, Math.min(maxZoom, nextZoom));
  const oldZoom = viewport.zoom;

  const panX = point.x - canvasSize.width / 2;
  const panY = point.y - canvasSize.height / 2;

  const relX = (panX - viewport.pan.x) / oldZoom;
  const relY = (panY - viewport.pan.y) / oldZoom;

  return {
    pan: {
      x: panX - relX * clampedZoom,
      y: panY - relY * clampedZoom,
    },
    zoom: clampedZoom,
    announcement: `Zoom level ${clampedZoom.toFixed(2)}`,
  };
}

export function getZoomViewportUpdate({
  mouse,
  canvasSize,
  viewport,
  deltaY,
  altHeld,
  zoomSpeed = 0.001,
  minZoom = 0.1,
  maxZoom = 10,
}: ZoomViewportInput): PanZoomUpdate {
  const nextZoom = viewport.zoom - deltaY * zoomSpeed;

  if (altHeld) {
    const clampedZoom = Math.max(minZoom, Math.min(maxZoom, nextZoom));
    return {
      pan: viewport.pan,
      zoom: clampedZoom,
      announcement: `Zoom level ${clampedZoom.toFixed(2)}`,
    };
  }

  return getZoomAtPointUpdate({
    point: mouse,
    canvasSize,
    viewport,
    nextZoom,
    minZoom,
    maxZoom,
  });
}

export function getPinchDistance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function getPinchMidpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}
