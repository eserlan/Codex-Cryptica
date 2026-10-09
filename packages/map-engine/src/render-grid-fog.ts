import type { ViewportTransform } from "schema";
import { drawHexGrid, type HexGridRenderOptions } from "./hex-renderer";
import type { CanvasCache, RenderOptions } from "./renderer-types";

export function getFogCanvas(
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

export interface FogOfWarOptions {
  maskCanvas: HTMLCanvasElement | null;
  canvasSize: { width: number; height: number };
  boundsSize: { width: number; height: number } | HTMLCanvasElement | null;
  center: { x: number; y: number };
  zoom: number;
  fogColor?: string;
}

export function drawFogOfWar(
  ctx: CanvasRenderingContext2D,
  options: FogOfWarOptions,
  cache: CanvasCache,
) {
  const { maskCanvas, canvasSize, boundsSize, center, zoom, fogColor } =
    options;
  if (!boundsSize || !maskCanvas) return;

  const fog = getFogCanvas(canvasSize.width, canvasSize.height, cache);
  const fogCtx = fog.getContext("2d");

  if (fogCtx && fog.width > 0 && fog.height > 0) {
    // 1. Clear the entire offscreen buffer so there's no stale fog outside the map
    fogCtx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    // 2. Fill the fog color ONLY over the exact dimensions of the scaled/translated map image
    fogCtx.fillStyle = fogColor || "rgba(0, 0, 0, 0.8)";
    fogCtx.save();
    fogCtx.translate(center.x, center.y);
    fogCtx.scale(zoom, zoom);
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

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  transform: ViewportTransform,
  canvasSize: { width: number; height: number },
  grid: NonNullable<RenderOptions["grid"]>,
  cache: CanvasCache,
) {
  if (
    grid.type === "hex" ||
    grid.type === "hex-pointy" ||
    grid.type === "hex-flat"
  ) {
    drawHexGrid(ctx, transform, canvasSize, grid as HexGridRenderOptions);
    return;
  }

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
