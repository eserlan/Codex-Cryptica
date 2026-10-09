import type { CanvasCache } from "./renderer-types";

export const TAU = Math.PI * 2;

const canvasCaches = new WeakMap<HTMLCanvasElement, CanvasCache>();

/**
 * Token labels are a small, stable set, but a note's body is measured a line
 * fragment at a time and changes on every keystroke — without a ceiling the
 * cache would grow for as long as the canvas lives.
 */
const TEXT_MEASUREMENT_CACHE_LIMIT = 500;

export function getCache(canvas: HTMLCanvasElement): CanvasCache {
  let cache = canvasCaches.get(canvas);
  if (!cache) {
    cache = {};
    canvasCaches.set(canvas, cache);
  }
  return cache;
}

export function measureTextCached(
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
