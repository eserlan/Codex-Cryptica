import type { MapPin, ViewportTransform } from "schema";

export interface RenderToken {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  baseShape?: "circle" | "square";
  facingIndicator?: boolean;
  color: string;
  label: string;
  /** "note" renders as a dog-eared sticky instead of a portrait/art token. */
  kind?: "token" | "tile" | "note";
  /** Body text previewed on the face of a `kind: "note"` element. */
  noteBody?: string;
  /** A note folded down to a marker, showing no body. */
  noteCollapsed?: boolean;
  image?: HTMLImageElement | null;
  /** Which part of the image to keep in view when cropped to fit the token's shape. Defaults to centered. */
  imageFocus?: "center" | "top" | "bottom" | "left" | "right";
  selected?: boolean;
  primarySelected?: boolean;
  active?: boolean;
  visible?: boolean;
  visionActive?: boolean;
  statusEffects?: string[];
  healthBar?: { value: number; max: number } | null;
}

export interface RenderMeasurement {
  active: boolean;
  start: { x: number; y: number } | null;
  end: { x: number; y: number } | null;
  color?: string;
  label?: string;
}

export interface RenderOptions {
  canvas: HTMLCanvasElement;
  image: HTMLImageElement | null;
  /** Size (in image-space px) to draw `image` at, when it differs from the
   * image's own native pixel size — e.g. a small pre-drawn tile that's
   * displayed at 2x so its grid squares are usable. Falls back to the
   * image's native size when omitted. Nearest-neighbor scaling is used so
   * pre-drawn grid/hex lines stay crisp instead of blurring. */
  imageDisplaySize?: { width: number; height: number } | null;
  transform: ViewportTransform;
  canvasSize: { width: number; height: number };
  pins: MapPin[];
  maskCanvas: HTMLCanvasElement | null;
  showFog: boolean;
  fogColor?: string;
  tokens?: RenderToken[];
  measurement?: RenderMeasurement | null;
  accentColor?: string;
  grid?: {
    type: "none" | "square" | "hex" | "hex-pointy" | "hex-flat";
    size: number;
    color: string;
    opacity: number;
    offsetX?: number;
    offsetY?: number;
    fixed?: boolean;
    /** Pan value the fixed grid should render at (its "screen position");
     * ignored unless `fixed` is set. Should be a snapshot of the viewport's
     * pan taken when fixed mode began, so the grid renders exactly where it
     * already was instead of jumping to `pan: {0,0}` — while still staying
     * static (not tracking live pan) as the map is dragged underneath it. */
    fixedPan?: { x: number; y: number };
    lineWidth?: number;
    showCoordinates?: boolean;
  };
}

export interface CanvasCache {
  fogCanvas?: HTMLCanvasElement;
  fogCanvasW?: number;
  fogCanvasH?: number;
  cachedPattern?: {
    pattern: CanvasPattern;
    size: number;
    color: string;
    opacity: number;
  };
  textMeasurementCache?: Map<string, { width: number }>;
}
