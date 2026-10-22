/**
 * Zoom and pan for the mystery clue graph, kept as plain maths so it can be
 * tested without a browser. A view is the visible window into the diagram, in
 * diagram units: its top-left corner and how far it is zoomed in.
 */

export interface GraphView {
  zoom: number;
  x: number;
  y: number;
}

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;
export const ZOOM_STEP = 1.4;
export const FULL_VIEW: GraphView = { zoom: 1, x: 0, y: 0 };

interface Size {
  width: number;
  height: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

/** Keep the zoom in range and the window inside the diagram. */
export function clampView(view: GraphView, size: Size): GraphView {
  const zoom = clamp(view.zoom, MIN_ZOOM, MAX_ZOOM);
  return {
    zoom,
    x: clamp(view.x, 0, size.width - size.width / zoom),
    y: clamp(view.y, 0, size.height - size.height / zoom),
  };
}

/** The SVG viewBox for a view. */
export function viewBoxOf(view: GraphView, size: Size): string {
  return `${view.x} ${view.y} ${size.width / view.zoom} ${size.height / view.zoom}`;
}

/**
 * Zoom by `factor`, keeping the point at (`fx`, `fy`) fixed on screen. The
 * focus is a fraction of the visible window: (0.5, 0.5) is its centre.
 */
export function zoomAt(
  view: GraphView,
  factor: number,
  size: Size,
  fx = 0.5,
  fy = 0.5,
): GraphView {
  const zoom = clamp(view.zoom * factor, MIN_ZOOM, MAX_ZOOM);
  const focusX = view.x + (size.width / view.zoom) * fx;
  const focusY = view.y + (size.height / view.zoom) * fy;
  return clampView(
    {
      zoom,
      x: focusX - (size.width / zoom) * fx,
      y: focusY - (size.height / zoom) * fy,
    },
    size,
  );
}

/**
 * Move the window by a drag of (`dx`, `dy`) screen pixels on an element
 * `renderedWidth` pixels wide. Dragging right reveals what is to the left.
 */
export function panBy(
  view: GraphView,
  dx: number,
  dy: number,
  renderedWidth: number,
  size: Size,
): GraphView {
  if (renderedWidth <= 0) return view;
  const unitsPerPixel = size.width / view.zoom / renderedWidth;
  return clampView(
    { ...view, x: view.x - dx * unitsPerPixel, y: view.y - dy * unitsPerPixel },
    size,
  );
}
