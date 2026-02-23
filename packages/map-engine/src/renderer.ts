import type { MapPin, ViewportTransform } from "schema";
import { imageToViewport } from "./math";

export interface RenderOptions {
  canvas: HTMLCanvasElement;
  image: HTMLImageElement | null;
  transform: ViewportTransform;
  canvasSize: { width: number; height: number };
  pins: MapPin[];
  maskCanvas: HTMLCanvasElement | null;
  showFog: boolean;
  grid?: {
    type: "none" | "square" | "hex";
    size: number;
    color: string;
    opacity: number;
  };
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
    grid,
  } = options;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Clear canvas
  ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

  if (!image) return;

  const center = imageToViewport({ x: 0, y: 0 }, transform, canvasSize);

  // 1. Draw background image
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.scale(transform.zoom, transform.zoom);
  ctx.drawImage(
    image,
    -image.width / 2,
    -image.height / 2,
    image.width,
    image.height,
  );
  ctx.restore();

  // 2. Draw Grid
  if (grid && grid.type !== "none") {
    drawGrid(ctx, transform, canvasSize, grid);
  }

  // 3. Draw Fog of War
  if (showFog && maskCanvas) {
    ctx.save();
    // Fill with black fog first
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    // Cut out revealed areas
    ctx.globalCompositeOperation = "destination-out";
    ctx.translate(center.x, center.y);
    ctx.scale(transform.zoom, transform.zoom);
    ctx.drawImage(
      maskCanvas,
      -image.width / 2,
      -image.height / 2,
      image.width,
      image.height,
    );
    ctx.restore();
  }

  // 4. Draw pins
  for (const pin of pins) {
    const pos = imageToViewport(pin.coordinates, transform, canvasSize);

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
    ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = pin.visuals.color || "#3b82f6"; // Fallback to blue-500
    ctx.fill();
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

let cachedPattern: {
  pattern: CanvasPattern;
  size: number;
  color: string;
  opacity: number;
} | null = null;

function drawGrid(
  ctx: CanvasRenderingContext2D,
  transform: ViewportTransform,
  canvasSize: { width: number; height: number },
  grid: NonNullable<RenderOptions["grid"]>,
) {
  if (grid.type === "square") {
    const size = grid.size * transform.zoom;
    if (size < 2) return; // Prevent infinite loops or invisible patterns

    if (
      !cachedPattern ||
      cachedPattern.size !== size ||
      cachedPattern.color !== grid.color ||
      cachedPattern.opacity !== grid.opacity
    ) {
      const patternCanvas = document.createElement("canvas");
      const pCtx = patternCanvas.getContext("2d")!;
      patternCanvas.width = size;
      patternCanvas.height = size;
      pCtx.strokeStyle = grid.color;
      pCtx.globalAlpha = grid.opacity;
      pCtx.strokeRect(0, 0, size, size);

      cachedPattern = {
        pattern: ctx.createPattern(patternCanvas, "repeat")!,
        size,
        color: grid.color,
        opacity: grid.opacity,
      };
    }

    ctx.save();
    ctx.fillStyle = cachedPattern.pattern;

    const offsetX = (transform.pan.x + canvasSize.width / 2) % size;
    const offsetY = (transform.pan.y + canvasSize.height / 2) % size;

    ctx.translate(offsetX, offsetY);
    // Draw slightly larger to cover edges during pan
    ctx.fillRect(
      -size,
      -size,
      canvasSize.width + size * 2,
      canvasSize.height + size * 2,
    );
    ctx.restore();
  }
}
