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
}

const canvasCaches = new WeakMap<HTMLCanvasElement, CanvasCache>();

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
    grid,
  } = options;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const cache = getCache(canvas);

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
    drawGrid(ctx, transform, canvasSize, grid, cache);
  }

  // 3. Draw Fog of War using an off-screen canvas to isolate the compositing.
  // Applying destination-out directly on the main canvas would erase the map
  // image itself, not just the fog layer on top of it.
  if (showFog && maskCanvas) {
    const fog = getFogCanvas(canvasSize.width, canvasSize.height, cache);
    const fogCtx = fog.getContext("2d");

    if (fogCtx) {
      // Fill fog layer with opaque black
      fogCtx.clearRect(0, 0, canvasSize.width, canvasSize.height);
      fogCtx.fillStyle = "rgba(0, 0, 0, 0.8)";
      fogCtx.fillRect(0, 0, canvasSize.width, canvasSize.height);

      // Punch holes where map is revealed (white = revealed in mask)
      fogCtx.globalCompositeOperation = "destination-out";
      fogCtx.save();
      fogCtx.translate(center.x, center.y);
      fogCtx.scale(transform.zoom, transform.zoom);
      fogCtx.drawImage(
        maskCanvas,
        -image.width / 2,
        -image.height / 2,
        image.width,
        image.height,
      );
      fogCtx.restore();
      fogCtx.globalCompositeOperation = "source-over";

      // Overlay fog (with holes) on the main canvas using normal compositing
      ctx.drawImage(fog, 0, 0);
    }
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
