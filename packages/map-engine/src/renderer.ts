import type { MapPin, ViewportTransform } from "schema";
import { imageToViewport } from "./math";
import {
  TOKEN_ROTATION_HANDLE_DISTANCE,
  TOKEN_ROTATION_HANDLE_RADIUS,
} from "./token-geometry";
import {
  layoutNoteMarkdown,
  parseNoteMarkdown,
  type NoteLayoutWord,
} from "./note-markdown";

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = hex.replace("#", "").match(/.{2}/g);
  if (!m || m.length < 3) return null;
  return {
    r: parseInt(m[0], 16),
    g: parseInt(m[1], 16),
    b: parseInt(m[2], 16),
  };
}

function _lightenColor(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const r = Math.min(255, Math.round(rgb.r + (255 - rgb.r) * amount));
  const g = Math.min(255, Math.round(rgb.g + (255 - rgb.g) * amount));
  const b = Math.min(255, Math.round(rgb.b + (255 - rgb.b) * amount));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function _darkenColor(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const r = Math.max(0, Math.round(rgb.r * (1 - amount)));
  const g = Math.max(0, Math.round(rgb.g * (1 - amount)));
  const b = Math.max(0, Math.round(rgb.b * (1 - amount)));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

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
    type: "none" | "square" | "hex";
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
  };
}

interface CanvasCache {
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

const canvasCaches = new WeakMap<HTMLCanvasElement, CanvasCache>();

const TAU = Math.PI * 2;

// Reusable scratch points to minimize GC pressure during animation frames
const scratchCenter = { x: 0, y: 0 };
const scratchPinPos = { x: 0, y: 0 };
const scratchTokenPt = { x: 0, y: 0 };
const scratchTokenTopLeft = { x: 0, y: 0 };
const scratchTokenBottomRight = { x: 0, y: 0 };
const scratchTokenCenter = { x: 0, y: 0 };
const scratchStart = { x: 0, y: 0 };
const scratchEnd = { x: 0, y: 0 };
const originPt = { x: 0, y: 0 };

/**
 * Token labels are a small, stable set, but a note's body is measured a line
 * fragment at a time and changes on every keystroke — without a ceiling the
 * cache would grow for as long as the canvas lives.
 */
const TEXT_MEASUREMENT_CACHE_LIMIT = 500;

function measureTextCached(
  ctx: CanvasRenderingContext2D,
  text: string,
  font: string,
  cache: CanvasCache,
): { width: number } {
  if (!cache.textMeasurementCache) {
    cache.textMeasurementCache = new Map();
  }
  const key = `${font}:${text}`;
  let result = cache.textMeasurementCache.get(key);
  if (!result) {
    const metrics = ctx.measureText(text);
    result = { width: metrics.width };
    if (cache.textMeasurementCache.size >= TEXT_MEASUREMENT_CACHE_LIMIT) {
      cache.textMeasurementCache.clear();
    }
    cache.textMeasurementCache.set(key, result);
  }
  return result;
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, width, height, radius);
    return;
  }

  ctx.rect(x, y, width, height);
}

/**
 * Draws a collapsed note as a marker rather than a shrunken page. It borrows
 * the map pin's shape deliberately — a folded-away note is doing a pin's job,
 * so it should read like one — but keeps the note's own colour so the two
 * stay tellable apart.
 */
function drawCollapsedNote(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  color: string,
) {
  const radius = Math.max(1, Math.min(width, height) / 2);

  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, TAU);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
  ctx.lineWidth = Math.max(1, radius * 0.18);
  ctx.stroke();

  // A turned-down corner inside the dot, so a collapsed note is not mistaken
  // for an ordinary pin at a glance.
  const fold = radius * 0.55;
  ctx.beginPath();
  ctx.moveTo(-fold, fold);
  ctx.lineTo(fold, fold);
  ctx.lineTo(fold, -fold);
  ctx.closePath();
  ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
  ctx.fill();
}

/** How much of the note's corner is turned down, as a share of its short side. */
const NOTE_FOLD_RATIO = 0.22;
const NOTE_TEXT_COLOR = "rgba(28, 25, 23, 0.85)";
/** Below this on-screen size the body text is illegible, so only the paper is drawn. */
const NOTE_MIN_TEXT_SIZE = 44;
/** How much larger a `#` heading line is drawn than the note's body text. */
const HEADING_SCALE = 1.15;

/**
 * Draws a sticky note centred on the current origin. Expects the caller to
 * have already translated, rotated and clipped to the token's shape — the
 * dog-eared corner is deliberately left unfilled so the map shows through it.
 */
function drawNoteFace(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  color: string,
  body: string,
  cache: CanvasCache,
) {
  const left = -width / 2;
  const top = -height / 2;
  const fold = Math.min(width, height) * NOTE_FOLD_RATIO;

  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left + width - fold, top);
  ctx.lineTo(left + width, top + fold);
  ctx.lineTo(left + width, top + height);
  ctx.lineTo(left, top + height);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();

  // The turned-down corner, shaded so the fold reads as a fold.
  ctx.beginPath();
  ctx.moveTo(left + width - fold, top);
  ctx.lineTo(left + width, top + fold);
  ctx.lineTo(left + width - fold, top + fold);
  ctx.closePath();
  ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
  ctx.fill();

  const text = body.trim();
  if (!text || Math.min(width, height) < NOTE_MIN_TEXT_SIZE) return;

  const fontSize = Math.max(8, Math.min(15, height * 0.13));
  const lineHeight = fontSize * 1.3;
  const padding = Math.max(4, width * 0.08);
  const maxWidth = width - padding * 2;
  const maxLines = Math.max(1, Math.floor((height - padding * 2) / lineHeight));
  const bulletIndent = fontSize;

  const fontFor = (word: NoteLayoutWord) => {
    const size = Math.round(word.heading ? fontSize * HEADING_SCALE : fontSize);
    const weight = word.bold || word.heading ? "700" : "400";
    const slant = word.italic ? "italic " : "";
    return `${slant}${weight} ${size}px ui-sans-serif, system-ui, sans-serif`;
  };
  const widthOf = (value: string, word: NoteLayoutWord) =>
    measureTextCached(ctx, value, fontFor(word), cache).width;

  const { lines, truncated } = layoutNoteMarkdown(parseNoteMarkdown(body), {
    maxWidth,
    maxLines,
    bulletIndent,
    measure: widthOf,
  });
  if (lines.length === 0) return;

  // Anything that did not fit is signalled rather than silently dropped, so
  // the GM knows to open the note for the rest.
  if (truncated) {
    const lastLine = lines[lines.length - 1];
    const lastWord = lastLine.words[lastLine.words.length - 1];
    if (lastWord) lastWord.text = `${lastWord.text}…`;
  }

  ctx.fillStyle = NOTE_TEXT_COLOR;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const y = top + padding + i * lineHeight;
    let x = left + padding + (line.bullet || line.indented ? bulletIndent : 0);

    if (line.bullet) {
      ctx.beginPath();
      ctx.arc(
        left + padding + bulletIndent * 0.4,
        y + fontSize * 0.6,
        Math.max(1, fontSize * 0.13),
        0,
        TAU,
      );
      ctx.fill();
    }

    for (let w = 0; w < line.words.length; w++) {
      const word = line.words[w];
      ctx.font = fontFor(word);
      if (w > 0) x += widthOf(" ", word);
      ctx.fillText(word.text, x, y);
      x += widthOf(word.text, word);
    }
  }
}

function traceTokenShape(
  ctx: CanvasRenderingContext2D,
  shape: "circle" | "square",
  width: number,
  height: number,
) {
  ctx.beginPath();
  if (shape === "square") {
    ctx.rect(-width / 2, -height / 2, width, height);
  } else {
    ctx.arc(0, 0, Math.min(width, height) / 2, 0, TAU);
  }
  ctx.closePath();
}

function drawFacingIndicator(
  ctx: CanvasRenderingContext2D,
  radius: number,
  rotation: number,
) {
  const front = "#22c55e";
  const side = "#f59e0b";
  const rear = "#ef4444";
  const ringRadius = radius + 2;
  const ringWidth = Math.max(3, radius * 0.1);
  const north = -Math.PI / 2;

  ctx.save();
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.lineWidth = ringWidth;
  ctx.lineCap = "butt";
  for (const [color, start, end] of [
    [front, north - Math.PI / 4, north + Math.PI / 4],
    [side, north + Math.PI / 4, north + (3 * Math.PI) / 4],
    [rear, north + (3 * Math.PI) / 4, north + (5 * Math.PI) / 4],
    [side, north + (5 * Math.PI) / 4, north + (7 * Math.PI) / 4],
  ] as const) {
    ctx.beginPath();
    ctx.arc(0, 0, ringRadius, start, end);
    ctx.strokeStyle = color;
    ctx.stroke();
  }

  ctx.fillStyle = front;
  ctx.beginPath();
  ctx.moveTo(0, -radius * 0.92);
  ctx.lineTo(-radius * 0.13, -radius * 0.62);
  ctx.lineTo(radius * 0.13, -radius * 0.62);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Returns the bar's height in image-space so callers can push other overlays
// (e.g. the name label) below it and avoid overlapping.
function drawHealthBar(
  ctx: CanvasRenderingContext2D,
  center: { x: number; y: number },
  tokenWidth: number,
  radius: number,
  bar: { value: number; max: number },
): number {
  const ratio = Math.max(0, Math.min(1, bar.value / bar.max));
  const fillColor =
    ratio >= 0.5 ? "#22c55e" : ratio >= 0.25 ? "#facc15" : "#ef4444";
  const barWidth = tokenWidth;
  const barHeight = Math.max(4, Math.min(7, radius * 0.18));
  const barX = center.x - barWidth / 2;
  const barY = center.y + radius + 4;

  ctx.save();
  drawRoundedRectPath(ctx, barX, barY, barWidth, barHeight, barHeight / 2);
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fill();
  if (ratio > 0) {
    drawRoundedRectPath(
      ctx,
      barX,
      barY,
      barWidth * ratio,
      barHeight,
      barHeight / 2,
    );
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
  ctx.lineWidth = 1;
  drawRoundedRectPath(ctx, barX, barY, barWidth, barHeight, barHeight / 2);
  ctx.stroke();
  ctx.restore();

  return barHeight;
}

function drawRotationHandle(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  rotation: number,
  accentColor: string,
  handleDistance: number,
) {
  const handleX = centerX;
  const handleY = centerY - Math.max(width, height) / 2 - handleDistance;

  ctx.save();
  ctx.strokeStyle = accentColor;
  ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - Math.max(width, height) / 2);
  ctx.lineTo(handleX, handleY);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(handleX, handleY, TOKEN_ROTATION_HANDLE_RADIUS, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.save();
  ctx.translate(handleX, handleY);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.beginPath();
  ctx.arc(0, 0, 6, -Math.PI / 2, Math.PI);
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}

function getCache(canvas: HTMLCanvasElement): CanvasCache {
  let cache = canvasCaches.get(canvas);
  if (!cache) {
    cache = {};
    canvasCaches.set(canvas, cache);
  }
  return cache;
}

export function renderMap(options: RenderOptions) {
  const {
    canvas,
    image,
    transform,
    canvasSize,
    pins,
    maskCanvas,
    showFog,
    tokens = [],
    measurement = null,
    grid,
  } = options;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const cache = getCache(canvas);

  // Clear canvas
  ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

  const hasImage = Boolean(image && image.width > 0 && image.height > 0);
  const displayWidth =
    hasImage && image ? (options.imageDisplaySize?.width ?? image.width) : 0;
  const displayHeight =
    hasImage && image ? (options.imageDisplaySize?.height ?? image.height) : 0;
  // The image's on-canvas bounds, also used to size the fog overlay (step 6)
  // even when there's no image — the mask canvas is always sized to the
  // map's intended dimensions (see MapView.svelte's mask-loading effect).
  const boundsSize =
    hasImage && image
      ? { width: displayWidth, height: displayHeight }
      : maskCanvas;

  const center = imageToViewport(
    originPt,
    transform,
    canvasSize,
    scratchCenter,
  );

  // 1. Draw background image
  if (hasImage && image) {
    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.scale(transform.zoom, transform.zoom);
    // Nearest-neighbor when displaying larger than native so pre-drawn
    // grid/hex lines on small tile art stay crisp instead of blurring.
    ctx.imageSmoothingEnabled =
      displayWidth === image.width && displayHeight === image.height;
    ctx.drawImage(
      image,
      -displayWidth / 2,
      -displayHeight / 2,
      displayWidth,
      displayHeight,
    );
    ctx.restore();
  }

  // 4. Draw pins
  for (const pin of pins) {
    const pos = imageToViewport(
      pin.coordinates,
      transform,
      canvasSize,
      scratchPinPos,
    );

    // Frustum culling: skip pins outside the viewport (with padding)
    if (
      pos.x < -20 ||
      pos.x > canvasSize.width + 20 ||
      pos.y < -20 ||
      pos.y > canvasSize.height + 20
    ) {
      continue;
    }

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 8, 0, TAU);
    ctx.fillStyle = pin.visuals.color || "#4ade80"; // Fallback to theme-primary
    ctx.fill();
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // 5. Draw tokens above the map and pins
  for (const token of tokens) {
    if (token.visible === false) continue;

    scratchTokenPt.x = token.x;
    scratchTokenPt.y = token.y;
    const topLeft = imageToViewport(
      scratchTokenPt,
      transform,
      canvasSize,
      scratchTokenTopLeft,
    );
    scratchTokenPt.x = token.x + token.width;
    scratchTokenPt.y = token.y + token.height;
    const bottomRight = imageToViewport(
      scratchTokenPt,
      transform,
      canvasSize,
      scratchTokenBottomRight,
    );

    const minX = Math.min(topLeft.x, bottomRight.x);
    const minY = Math.min(topLeft.y, bottomRight.y);
    const width = Math.abs(bottomRight.x - topLeft.x);
    const height = Math.abs(bottomRight.y - topLeft.y);

    if (
      minX > canvasSize.width + 40 ||
      minY > canvasSize.height + 40 ||
      minX + width < -40 ||
      minY + height < -40
    ) {
      continue;
    }

    const center = scratchTokenCenter;
    center.x = minX + width / 2;
    center.y = minY + height / 2;
    const diameter = Math.max(1, Math.min(width, height));
    const radius = diameter / 2;
    const shape = token.baseShape ?? "circle";

    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.rotate((token.rotation * Math.PI) / 180);

    traceTokenShape(ctx, shape, width, height);
    ctx.clip();

    if (token.kind === "note") {
      if (token.noteCollapsed) {
        drawCollapsedNote(ctx, width, height, token.color || "#f5b942");
      } else {
        drawNoteFace(
          ctx,
          width,
          height,
          token.color || "#f5b942",
          token.noteBody ?? "",
          cache,
        );
      }
    } else if (token.image && token.image.width > 0 && token.image.height > 0) {
      const imageAspect = token.image.width / token.image.height;
      const drawWidth = imageAspect > 1 ? diameter * imageAspect : diameter;
      const drawHeight = imageAspect > 1 ? diameter : diameter / imageAspect;

      // Cover-fit crops whichever axis overflows the token's diameter. By
      // default that crop is centered (equal amounts trimmed off both
      // sides) — imageFocus instead pins one edge of the image to the
      // token's edge, so e.g. a portrait whose subject sits near the top
      // doesn't get its head cropped off by a symmetric center-crop.
      let offsetX = -drawWidth / 2;
      let offsetY = -drawHeight / 2;
      switch (token.imageFocus) {
        case "left":
          offsetX = -diameter / 2;
          break;
        case "right":
          offsetX = diameter / 2 - drawWidth;
          break;
        case "top":
          offsetY = -diameter / 2;
          break;
        case "bottom":
          offsetY = diameter / 2 - drawHeight;
          break;
      }

      ctx.drawImage(token.image, offsetX, offsetY, drawWidth, drawHeight);
    } else if (token.image) {
      ctx.fillStyle = token.color || "#f59e0b";
      ctx.fill();
    } else {
      ctx.fillStyle = token.color || "#f59e0b";
      ctx.fill();
    }

    ctx.restore();

    // Border and shadow OUTSIDE the token (grouped to minimise save/restore thrash)
    if (token.active || token.selected) {
      const accent = token.active
        ? options.accentColor || "#d97706"
        : "#3b82f6";
      // Scale the selection ring relative to the token's own size instead of
      // a fixed pixel width — a border sized for a typical ~100px token
      // would visually swallow a much smaller one (e.g. a token sized to a
      // grid fit to a tile's fine native pixel grid), making an otherwise
      // correctly-sized token look like it oversteps its cell.
      const baseBorderWidth = token.active ? 8 : 5;
      const borderWidth = Math.min(baseBorderWidth, Math.max(2, radius * 0.25));
      const highlightWidth = Math.min(2, Math.max(1, radius * 0.08));
      const blurScale = Math.min(1, radius / 25);

      ctx.save();
      ctx.translate(center.x, center.y);
      ctx.rotate((token.rotation * Math.PI) / 180);

      // Outer drop shadow (outside only)
      traceTokenShape(ctx, shape, width + borderWidth, height + borderWidth);
      ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
      ctx.lineWidth = borderWidth + 4;
      ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
      ctx.shadowBlur = (token.active ? 20 : 12) * blurScale;
      ctx.stroke();

      // Main thick border
      traceTokenShape(ctx, shape, width, height);
      ctx.strokeStyle = accent;
      ctx.lineWidth = borderWidth;
      ctx.shadowColor = accent;
      ctx.shadowBlur = (token.active ? 16 : 10) * blurScale;
      ctx.stroke();

      // Thin bright highlight on top
      traceTokenShape(ctx, shape, width, height);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
      ctx.lineWidth = highlightWidth;
      ctx.shadowColor = "rgba(255, 255, 255, 0.3)";
      ctx.shadowBlur = 4 * blurScale;
      ctx.stroke();

      ctx.restore();
    }

    if (token.visionActive) {
      ctx.save();
      ctx.translate(center.x, center.y);
      ctx.rotate((token.rotation * Math.PI) / 180);
      traceTokenShape(ctx, shape, width + 10, height + 10);
      ctx.strokeStyle = "#22d3ee";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#22d3ee";
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.restore();
    }

    if (token.facingIndicator) {
      ctx.save();
      ctx.translate(center.x, center.y);
      drawFacingIndicator(ctx, radius, token.rotation);
      ctx.restore();
    }

    if (token.primarySelected ?? token.selected) {
      drawRotationHandle(
        ctx,
        center.x,
        center.y,
        width,
        height,
        token.rotation,
        options.accentColor || "#3b82f6",
        TOKEN_ROTATION_HANDLE_DISTANCE * transform.zoom,
      );
    }

    // Draw dead status: red X ON the token + dark overlay
    if (token.statusEffects && token.statusEffects.includes("dead")) {
      ctx.save();
      // Dark overlay on token
      ctx.translate(center.x, center.y);
      ctx.rotate((token.rotation * Math.PI) / 180);
      traceTokenShape(ctx, shape, width, height);
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fill();
      // Red X
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = Math.max(3, radius * 0.15);
      ctx.lineCap = "round";
      ctx.shadowColor = "rgba(239, 68, 68, 0.8)";
      ctx.shadowBlur = 8;
      const xHalf = radius * 0.5;
      ctx.beginPath();
      ctx.moveTo(-xHalf, -xHalf);
      ctx.lineTo(xHalf, xHalf);
      ctx.moveTo(xHalf, -xHalf);
      ctx.lineTo(-xHalf, xHalf);
      ctx.stroke();
      ctx.restore();
    }

    // Draw other status icons above the token
    if (token.statusEffects) {
      const otherStatuses = token.statusEffects.filter((s) => s !== "dead");
      if (otherStatuses.length > 0) {
        const iconSize = Math.max(14, Math.min(20, radius * 0.5));
        const gap = 4;
        const padding = 9;
        const totalWidth = otherStatuses.length * (iconSize + gap) - gap;
        const barWidth = totalWidth + padding * 2;
        const barHeight = iconSize + padding * 2;
        const startX = center.x - totalWidth / 2;
        const iconY = center.y - radius - iconSize - 8;
        const barX = center.x - barWidth / 2;
        const barY = iconY - padding;
        const barRadius = barHeight / 2;

        // Shared pill background & status icons (grouped to minimise save/restore thrash)
        ctx.save();
        drawRoundedRectPath(ctx, barX, barY, barWidth, barHeight, barRadius);
        ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        for (let i = 0; i < otherStatuses.length; i++) {
          const statusId = otherStatuses[i];
          const cx = startX + i * (iconSize + gap) + iconSize / 2;
          const cy = iconY + iconSize / 2;
          const s = iconSize / 2;

          // Reset shadows from previous iteration
          ctx.shadowColor = "transparent";
          ctx.shadowBlur = 0;

          switch (statusId) {
            case "stunned": {
              // Zap / lightning bolt
              ctx.fillStyle = "#facc15";
              ctx.shadowColor = "rgba(250, 204, 21, 0.6)";
              ctx.shadowBlur = 4;
              ctx.beginPath();
              ctx.moveTo(cx + s * 0.1, -s + cy);
              ctx.lineTo(cx - s * 0.5, cy);
              ctx.lineTo(cx - s * 0.05, cy);
              ctx.lineTo(cx - s * 0.2, s + cy);
              ctx.lineTo(cx + s * 0.5, cy);
              ctx.lineTo(cx + s * 0.05, cy);
              ctx.closePath();
              ctx.fill();
              break;
            }
            case "prone": {
              // Arrow-down
              ctx.strokeStyle = "#a855f7";
              ctx.lineWidth = 2;
              ctx.shadowColor = "rgba(168, 85, 247, 0.5)";
              ctx.shadowBlur = 3;
              ctx.beginPath();
              ctx.moveTo(cx, -s * 0.6 + cy);
              ctx.lineTo(cx, s * 0.7 + cy);
              ctx.moveTo(cx - s * 0.4, s * 0.2 + cy);
              ctx.lineTo(cx, s * 0.7 + cy);
              ctx.lineTo(cx + s * 0.4, s * 0.2 + cy);
              ctx.stroke();
              break;
            }
            case "poisoned": {
              // Skull / flask-conical
              ctx.strokeStyle = "#22c55e";
              ctx.lineWidth = 1.5;
              ctx.shadowColor = "rgba(34, 197, 94, 0.5)";
              ctx.shadowBlur = 3;
              ctx.beginPath();
              ctx.arc(cx, cy - s * 0.2, s * 0.35, Math.PI, 0, false);
              ctx.lineTo(cx + s * 0.35, cy + s * 0.2);
              ctx.lineTo(cx + s * 0.5, cy + s * 0.9);
              ctx.lineTo(cx - s * 0.5, cy + s * 0.9);
              ctx.lineTo(cx - s * 0.35, cy + s * 0.2);
              ctx.closePath();
              ctx.stroke();
              // Eyes
              ctx.fillStyle = "#22c55e";
              ctx.beginPath();
              ctx.arc(cx - s * 0.12, cy - s * 0.2, 1.2, 0, TAU);
              ctx.fill();
              ctx.beginPath();
              ctx.arc(cx + s * 0.12, cy - s * 0.2, 1.2, 0, TAU);
              ctx.fill();
              break;
            }
            case "invisible": {
              // Eye with slash (eye-off)
              ctx.strokeStyle = "#94a3b8";
              ctx.lineWidth = 1.5;
              ctx.shadowColor = "rgba(148, 163, 184, 0.5)";
              ctx.shadowBlur = 3;
              // Eye shape
              ctx.beginPath();
              ctx.moveTo(cx - s * 0.7, cy);
              ctx.quadraticCurveTo(cx, cy - s * 0.7, cx + s * 0.7, cy);
              ctx.quadraticCurveTo(cx, cy + s * 0.7, cx - s * 0.7, cy);
              ctx.stroke();
              // Iris
              ctx.beginPath();
              ctx.arc(cx, cy, s * 0.25, 0, TAU);
              ctx.stroke();
              // Slash
              ctx.beginPath();
              ctx.moveTo(cx - s * 0.6, cy - s * 0.7);
              ctx.lineTo(cx + s * 0.6, cy + s * 0.7);
              ctx.stroke();
              break;
            }
          }
        }
        ctx.restore();
      }
    }

    let healthBarHeight = 0;
    if (token.healthBar && token.healthBar.max > 0) {
      healthBarHeight = drawHealthBar(
        ctx,
        center,
        width,
        radius,
        token.healthBar,
      );
    }

    if (token.label) {
      ctx.save();
      const font = "12px ui-sans-serif, system-ui, sans-serif";
      ctx.font = font;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const labelX = center.x;
      const labelY =
        center.y +
        height / 2 +
        6 +
        (healthBarHeight > 0 ? healthBarHeight + 4 : 0);
      const metrics = measureTextCached(ctx, token.label, font, cache);
      const paddingX = 8;
      const boxWidth = metrics.width + paddingX * 2;
      const boxHeight = 18;
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.strokeStyle = token.active ? "#f59e0b" : "rgba(255, 255, 255, 0.2)";
      ctx.lineWidth = 1;
      drawRoundedRectPath(
        ctx,
        labelX - boxWidth / 2,
        labelY,
        boxWidth,
        boxHeight,
        8,
      );
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.fillText(token.label, labelX, labelY + 2);
      ctx.restore();
    }
  }

  // 5b. Draw Grid above tiles/tokens (translucent) so it stays visible over
  // large tile art (e.g. geomorph packs) instead of being hidden beneath it —
  // also makes grid-fit-by-drag usable when dragging over a placed tile.
  if (grid && grid.type !== "none") {
    drawGrid(ctx, transform, canvasSize, grid, cache);
  }

  // 6. Draw Fog of War above pins and tokens so the reveal state masks them.
  // Applying destination-out directly on the main canvas would erase the map
  // image itself, not just the fog layer on top of it.
  if (
    showFog &&
    boundsSize &&
    maskCanvas &&
    maskCanvas.width > 0 &&
    maskCanvas.height > 0 &&
    canvasSize.width > 0 &&
    canvasSize.height > 0
  ) {
    const fog = getFogCanvas(canvasSize.width, canvasSize.height, cache);
    const fogCtx = fog.getContext("2d");

    if (fogCtx && fog.width > 0 && fog.height > 0) {
      // 1. Clear the entire offscreen buffer so there's no stale fog outside the map
      fogCtx.clearRect(0, 0, canvasSize.width, canvasSize.height);

      // 2. Fill the fog color ONLY over the exact dimensions of the scaled/translated map image
      fogCtx.fillStyle = options.fogColor || "rgba(0, 0, 0, 0.8)";
      fogCtx.save();
      fogCtx.translate(center.x, center.y);
      fogCtx.scale(transform.zoom, transform.zoom);
      fogCtx.fillRect(
        -boundsSize.width / 2,
        -boundsSize.height / 2,
        boundsSize.width,
        boundsSize.height,
      );

      // 3. Punch holes where map is revealed (white = revealed in mask)
      fogCtx.globalCompositeOperation = "destination-out";
      fogCtx.drawImage(
        maskCanvas,
        -boundsSize.width / 2,
        -boundsSize.height / 2,
        boundsSize.width,
        boundsSize.height,
      );
      fogCtx.restore();
      fogCtx.globalCompositeOperation = "source-over";

      // 4. Overlay the perfectly constrained fog (with holes) on the main canvas
      // The `fog` canvas is already sized to `canvasSize`, so it maps 1:1 with `ctx` without transforms.
      ctx.drawImage(fog, 0, 0);
    }
  }

  // 7. Draw measurement overlay
  if (measurement?.active && measurement.start && measurement.end) {
    const start = imageToViewport(
      measurement.start,
      transform,
      canvasSize,
      scratchStart,
    );
    const end = imageToViewport(
      measurement.end,
      transform,
      canvasSize,
      scratchEnd,
    );
    const color = measurement.color || "#22c55e";

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 6]);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw arrowhead at end
    const headLength = 12;
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    ctx.beginPath();
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(
      end.x - headLength * Math.cos(angle - Math.PI / 6),
      end.y - headLength * Math.sin(angle - Math.PI / 6),
    );
    ctx.lineTo(
      end.x - headLength * Math.cos(angle + Math.PI / 6),
      end.y - headLength * Math.sin(angle + Math.PI / 6),
    );
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.arc(start.x, start.y, 4, 0, TAU);
    ctx.fill();

    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    const label = measurement.label || "";
    if (label) {
      const font = "bold 12px ui-sans-serif, system-ui, sans-serif";
      ctx.font = font;
      const metrics = measureTextCached(ctx, label, font, cache);
      const paddingX = 12;
      const paddingY = 6;
      const boxWidth = metrics.width + paddingX * 2;
      const boxHeight = 14 + paddingY * 2;

      ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;

      const boxX = midX - boxWidth / 2;
      const boxY = midY - boxHeight - 15; // Shift up from the line

      drawRoundedRectPath(ctx, boxX, boxY, boxWidth, boxHeight, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, midX, boxY + boxHeight / 2 + 1);
    }
    ctx.restore();
  }
}

function getFogCanvas(
  width: number,
  height: number,
  cache: CanvasCache,
): HTMLCanvasElement {
  if (
    !cache.fogCanvas ||
    cache.fogCanvasW !== width ||
    cache.fogCanvasH !== height
  ) {
    cache.fogCanvas = document.createElement("canvas");
    cache.fogCanvas.width = width;
    cache.fogCanvas.height = height;
    cache.fogCanvasW = width;
    cache.fogCanvasH = height;
  }
  return cache.fogCanvas;
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  transform: ViewportTransform,
  canvasSize: { width: number; height: number },
  grid: NonNullable<RenderOptions["grid"]>,
  cache: CanvasCache,
) {
  if (grid.type === "square") {
    const size = grid.size * transform.zoom;
    if (size < 2) return; // Prevent infinite loops or invisible patterns

    if (
      !cache.cachedPattern ||
      cache.cachedPattern.size !== size ||
      cache.cachedPattern.color !== grid.color ||
      cache.cachedPattern.opacity !== grid.opacity
    ) {
      const patternCanvas = document.createElement("canvas");
      const pCtx = patternCanvas.getContext("2d");
      if (!pCtx) return;

      patternCanvas.width = size;
      patternCanvas.height = size;
      pCtx.strokeStyle = grid.color;
      pCtx.globalAlpha = grid.opacity;
      pCtx.lineWidth = 1.5;
      pCtx.strokeRect(0, 0, size, size);

      const pattern = ctx.createPattern(patternCanvas, "repeat");
      if (!pattern) return;

      cache.cachedPattern = {
        pattern,
        size,
        color: grid.color,
        opacity: grid.opacity,
      };
    }

    ctx.save();
    ctx.fillStyle = cache.cachedPattern.pattern;

    if (grid.fixed) {
      // Fixed grid mode: stays at the pan position it had when fixed mode
      // began (its `fixedPan` snapshot) instead of tracking the live pan —
      // so the grid holds still on screen while the map is dragged
      // underneath it, without jumping to a different phase on entry.
      const fixedPan = grid.fixedPan ?? { x: 0, y: 0 };
      const gridOffsetX = (grid.offsetX ?? 0) * transform.zoom;
      const gridOffsetY = (grid.offsetY ?? 0) * transform.zoom;
      const offsetX = (fixedPan.x + canvasSize.width / 2 + gridOffsetX) % size;
      const offsetY = (fixedPan.y + canvasSize.height / 2 + gridOffsetY) % size;

      ctx.translate(offsetX, offsetY);
      ctx.fillRect(
        -size,
        -size,
        canvasSize.width + size * 2,
        canvasSize.height + size * 2,
      );
    } else {
      const gridOffsetX = (grid.offsetX ?? 0) * transform.zoom;
      const gridOffsetY = (grid.offsetY ?? 0) * transform.zoom;
      const offsetX =
        (transform.pan.x + canvasSize.width / 2 + gridOffsetX) % size;
      const offsetY =
        (transform.pan.y + canvasSize.height / 2 + gridOffsetY) % size;

      ctx.translate(offsetX, offsetY);
      // Draw slightly larger to cover edges during pan
      ctx.fillRect(
        -size,
        -size,
        canvasSize.width + size * 2,
        canvasSize.height + size * 2,
      );
    }
    ctx.restore();
  }
}
