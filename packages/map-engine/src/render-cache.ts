import type { CanvasCache } from "./renderer-types";

export const TAU = Math.PI * 2;

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = hex.replace("#", "").match(/.{2}/g);
  if (!m || m.length < 3) return null;
  return {
    r: parseInt(m[0], 16),
    g: parseInt(m[1], 16),
    b: parseInt(m[2], 16),
  };
}

export function _lightenColor(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const r = Math.min(255, Math.round(rgb.r + (255 - rgb.r) * amount));
  const g = Math.min(255, Math.round(rgb.g + (255 - rgb.g) * amount));
  const b = Math.min(255, Math.round(rgb.b + (255 - rgb.b) * amount));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export function _darkenColor(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const r = Math.max(0, Math.round(rgb.r * (1 - amount)));
  const g = Math.max(0, Math.round(rgb.g * (1 - amount)));
  const b = Math.max(0, Math.round(rgb.b * (1 - amount)));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

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
