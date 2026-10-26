import {
  clampBounds,
  getCenteredBounds,
  getViewportSize,
  loadSavedBounds as loadSavedBoundsGeneric,
  resizePointerDelta,
  saveBounds as saveBoundsGeneric,
  DEFAULT_WINDOW_WIDTH,
  DEFAULT_WINDOW_HEIGHT,
  MIN_WINDOW_WIDTH,
  MIN_WINDOW_HEIGHT,
  WINDOW_MARGIN,
  type ViewportSize,
  type WindowBounds,
} from "$lib/utils/window-bounds";

/**
 * Play Tools' own window: a caller-facing wrapper over the shared, generic
 * bounds math in `$lib/utils/window-bounds.ts` (pulled out from here once
 * the Quicknote/Journal scratchpad needed the same math, #3490), keeping
 * this module's original storage key and argument order so `DiceModal`
 * doesn't have to change.
 */
export type { ViewportSize, WindowBounds };
export {
  clampBounds,
  getCenteredBounds,
  getViewportSize,
  resizePointerDelta,
  DEFAULT_WINDOW_WIDTH,
  DEFAULT_WINDOW_HEIGHT,
  MIN_WINDOW_WIDTH,
  MIN_WINDOW_HEIGHT,
  WINDOW_MARGIN,
};

export const PLAY_TOOLS_WINDOW_STORAGE_KEY = "codex_play_tools_window_bounds";

export function loadSavedBounds(
  storage: Storage | null = typeof window !== "undefined"
    ? window.localStorage
    : null,
  viewport: ViewportSize = getViewportSize(),
  key = PLAY_TOOLS_WINDOW_STORAGE_KEY,
): WindowBounds {
  return loadSavedBoundsGeneric(key, storage, viewport);
}

export function saveBounds(
  bounds: WindowBounds,
  storage: Storage | null = typeof window !== "undefined"
    ? window.localStorage
    : null,
  key = PLAY_TOOLS_WINDOW_STORAGE_KEY,
): void {
  saveBoundsGeneric(key, bounds, storage);
}
