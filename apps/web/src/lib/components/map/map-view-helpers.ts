import type { MapPin, Point, ViewportTransform } from "schema";

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
  const delta = -deltaY * zoomSpeed;
  const oldZoom = viewport.zoom;
  const nextZoom = Math.max(minZoom, Math.min(maxZoom, oldZoom + delta));

  const panX = mouse.x - canvasSize.width / 2;
  const panY = mouse.y - canvasSize.height / 2;

  const relX = (panX - viewport.pan.x) / oldZoom;
  const relY = (panY - viewport.pan.y) / oldZoom;

  const nextPan = altHeld
    ? viewport.pan
    : {
        x: panX - relX * nextZoom,
        y: panY - relY * nextZoom,
      };

  return {
    pan: nextPan,
    zoom: nextZoom,
    announcement: `Zoom level ${nextZoom.toFixed(2)}`,
  };
}
