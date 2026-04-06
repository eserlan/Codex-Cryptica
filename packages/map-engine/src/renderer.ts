import type { MapPin, ViewportTransform } from "schema";
import { imageToViewport } from "./math";

export interface RenderToken {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
  label: string;
  image?: HTMLImageElement | null;
  selected?: boolean;
  active?: boolean;
  visible?: boolean;
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
  transform: ViewportTransform;
  canvasSize: { width: number; height: number };
  pins: MapPin[];
  maskCanvas: HTMLCanvasElement | null;
  showFog: boolean;
  fogColor?: string;
  tokens?: RenderToken[];
  measurement?: RenderMeasurement | null;
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

  // 3. Draw Grid
  if (grid && grid.type !== "none") {
    drawGrid(ctx, transform, canvasSize, grid, cache);
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
    ctx.fillStyle = pin.visuals.color || "#4ade80"; // Fallback to theme-primary
    ctx.fill();
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // 5. Draw tokens above the map and pins
  for (const token of tokens) {
    if (token.visible === false) continue;

    const topLeft = imageToViewport(
      { x: token.x, y: token.y },
      transform,
      canvasSize,
    );
    const bottomRight = imageToViewport(
      { x: token.x + token.width, y: token.y + token.height },
      transform,
      canvasSize,
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

    const center = {
      x: minX + width / 2,
      y: minY + height / 2,
    };
    const diameter = Math.max(1, Math.min(width, height));
    const radius = diameter / 2;

    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.rotate((token.rotation * Math.PI) / 180);

    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    if (token.image && token.image.width > 0 && token.image.height > 0) {
      const imageAspect = token.image.width / token.image.height;
      const drawWidth = imageAspect > 1 ? diameter * imageAspect : diameter;
      const drawHeight = imageAspect > 1 ? diameter : diameter / imageAspect;

      ctx.drawImage(
        token.image,
        -drawWidth / 2,
        -drawHeight / 2,
        drawWidth,
        drawHeight,
      );
    } else if (token.image) {
      ctx.fillStyle = token.color || "#f59e0b";
      ctx.fill();
    } else {
      ctx.fillStyle = token.color || "#f59e0b";
      ctx.fill();
    }

    if (token.selected || token.active) {
      ctx.lineWidth = token.active ? 4 : 3;
      ctx.strokeStyle = token.active ? "#f59e0b" : "#ffffff";
      ctx.shadowColor = token.active
        ? "rgba(245, 158, 11, 0.8)"
        : "rgba(255, 255, 255, 0.5)";
      ctx.shadowBlur = token.active ? 14 : 8;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.restore();

    if (token.label) {
      ctx.save();
      ctx.font = "12px ui-sans-serif, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const labelX = center.x;
      const labelY = center.y + height / 2 + 6;
      const metrics = ctx.measureText(token.label);
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

  // 6. Draw Fog of War above pins and tokens so the reveal state masks them.
  // Applying destination-out directly on the main canvas would erase the map
  // image itself, not just the fog layer on top of it.
  if (showFog && maskCanvas) {
    const fog = getFogCanvas(canvasSize.width, canvasSize.height, cache);
    const fogCtx = fog.getContext("2d");

    if (fogCtx) {
      // 1. Clear the entire offscreen buffer so there's no stale fog outside the map
      fogCtx.clearRect(0, 0, canvasSize.width, canvasSize.height);

      // 2. Fill the fog color ONLY over the exact dimensions of the scaled/translated map image
      fogCtx.fillStyle = options.fogColor || "rgba(0, 0, 0, 0.8)";
      fogCtx.save();
      fogCtx.translate(center.x, center.y);
      fogCtx.scale(transform.zoom, transform.zoom);
      fogCtx.fillRect(
        -image.width / 2,
        -image.height / 2,
        image.width,
        image.height,
      );
      fogCtx.restore();

      // 3. Punch holes where map is revealed (white = revealed in mask)
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

      // 4. Overlay the perfectly constrained fog (with holes) on the main canvas
      // The `fog` canvas is already sized to `canvasSize`, so it maps 1:1 with `ctx` without transforms.
      ctx.drawImage(fog, 0, 0);
    }
  }

  // 7. Draw measurement overlay
  if (measurement?.active && measurement.start && measurement.end) {
    const start = imageToViewport(measurement.start, transform, canvasSize);
    const end = imageToViewport(measurement.end, transform, canvasSize);
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
    ctx.arc(start.x, start.y, 4, 0, Math.PI * 2);
    ctx.fill();

    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    const label = measurement.label || "";
    if (label) {
      ctx.font = "bold 12px ui-sans-serif, system-ui, sans-serif";
      const metrics = ctx.measureText(label);
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
