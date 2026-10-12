import { imageToViewport } from "./math";
import { getCache } from "./render-cache";
import { drawPins, drawTokens } from "./render-tokens";
import { drawGrid, drawFogOfWar } from "./render-grid-fog";
import { drawMeasurement } from "./render-measurement";
import type { RenderOptions } from "./renderer-types";

export type {
  RenderToken,
  RenderMeasurement,
  RenderOptions,
  CanvasCache,
} from "./renderer-types";

// Reusable scratch points to minimize GC pressure during animation frames
const scratchCenter = { x: 0, y: 0 };
const originPt = { x: 0, y: 0 };

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
  drawPins(ctx, pins, transform, canvasSize);

  // 5. Draw tokens above the map and pins
  drawTokens(ctx, tokens, transform, canvasSize, options.accentColor, cache);

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
    drawFogOfWar(
      ctx,
      {
        maskCanvas,
        canvasSize,
        boundsSize,
        center,
        zoom: transform.zoom,
        fogColor: options.fogColor,
      },
      cache,
    );
  }

  // 7. Draw measurement overlay
  if (measurement?.active && measurement.start && measurement.end) {
    drawMeasurement(ctx, measurement, transform, canvasSize, cache);
  }
}
