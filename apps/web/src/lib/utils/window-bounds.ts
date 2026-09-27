/**
 * Position/size math for a draggable and/or resizable floating window,
 * persisted to `localStorage` under a caller-chosen key. Framework-free and
 * DOM-free (bar reading `window.innerWidth`/`innerHeight` and `localStorage`)
 * so a component wires it to its own pointer handlers; see
 * `dice/DiceModal.svelte` (drag + resize) and
 * `quicknote/QuickNoteScratchpad.svelte` (resize only, #3490) for the two
 * ways it gets used. Originally lived only in `dice/dice-window-bounds.ts`;
 * pulled out here once a second window needed the same math, rather than
 * copying it.
 */

export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ViewportSize {
  width: number;
  height: number;
}

export const DEFAULT_WINDOW_WIDTH = 500;
export const DEFAULT_WINDOW_HEIGHT = 620;
export const MIN_WINDOW_WIDTH = 340;
export const MIN_WINDOW_HEIGHT = 380;
export const WINDOW_MARGIN = 8;

export function getViewportSize(): ViewportSize {
  if (typeof window === "undefined") {
    return { width: 1024, height: 768 };
  }
  return {
    width: window.innerWidth ?? 1024,
    height: window.innerHeight ?? 768,
  };
}

/** The width/height both `clampBounds` and `getCenteredBounds` settle on: no
 *  smaller than the caller's minimum, no larger than the viewport allows. */
function clampSize(
  size: { width: number; height: number },
  viewport: ViewportSize,
  minWidth: number,
  minHeight: number,
  margin: number,
): { width: number; height: number } {
  const maxAvailableWidth = Math.max(100, viewport.width - margin * 2);
  const maxAvailableHeight = Math.max(100, viewport.height - margin * 2);

  const effectiveMinWidth = Math.min(minWidth, maxAvailableWidth);
  const effectiveMinHeight = Math.min(minHeight, maxAvailableHeight);

  return {
    width: Math.min(maxAvailableWidth, Math.max(effectiveMinWidth, size.width)),
    height: Math.min(
      maxAvailableHeight,
      Math.max(effectiveMinHeight, size.height),
    ),
  };
}

export function clampBounds(
  bounds: WindowBounds,
  viewport: ViewportSize,
  minWidth = MIN_WINDOW_WIDTH,
  minHeight = MIN_WINDOW_HEIGHT,
  margin = WINDOW_MARGIN,
): WindowBounds {
  const { width, height } = clampSize(
    bounds,
    viewport,
    minWidth,
    minHeight,
    margin,
  );

  const maxX = Math.max(margin, viewport.width - width - margin);
  const maxY = Math.max(margin, viewport.height - height - margin);

  const x = Math.min(maxX, Math.max(margin, bounds.x));
  const y = Math.min(maxY, Math.max(margin, bounds.y));

  return { x, y, width, height };
}

export function getCenteredBounds(
  size: { width: number; height: number } = {
    width: DEFAULT_WINDOW_WIDTH,
    height: DEFAULT_WINDOW_HEIGHT,
  },
  viewport: ViewportSize = getViewportSize(),
  minWidth = MIN_WINDOW_WIDTH,
  minHeight = MIN_WINDOW_HEIGHT,
  margin = WINDOW_MARGIN,
): WindowBounds {
  const { width, height } = clampSize(
    size,
    viewport,
    minWidth,
    minHeight,
    margin,
  );

  const x = Math.max(margin, Math.round((viewport.width - width) / 2));
  const y = Math.max(margin, Math.round((viewport.height - height) / 2));

  return { x, y, width, height };
}

export function loadSavedBounds(
  key: string,
  storage: Storage | null = typeof window !== "undefined"
    ? window.localStorage
    : null,
  viewport: ViewportSize = getViewportSize(),
  defaultSize?: { width: number; height: number },
): WindowBounds {
  if (!storage) {
    return getCenteredBounds(defaultSize, viewport);
  }

  try {
    const raw = storage.getItem(key);
    if (!raw) {
      return getCenteredBounds(defaultSize, viewport);
    }
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.x === "number" &&
      typeof parsed?.y === "number" &&
      typeof parsed?.width === "number" &&
      typeof parsed?.height === "number" &&
      !isNaN(parsed.x) &&
      !isNaN(parsed.y) &&
      !isNaN(parsed.width) &&
      !isNaN(parsed.height)
    ) {
      return clampBounds(parsed, viewport);
    }
  } catch {
    // Ignore JSON errors and fallback
  }

  return getCenteredBounds(defaultSize, viewport);
}

/** The pointer-delta preamble a resize-handle's `pointermove` handler needs
 *  before it can decide its own new width/height: how far the pointer has
 *  travelled since `pointerdown`, and the current viewport to clamp against.
 *  `DiceModal` and `QuickNoteScratchpad` grow in different directions from
 *  there (a fixed corner vs. staying centred), so only this shared part
 *  lives here. */
export function resizePointerDelta(
  e: { clientX: number; clientY: number },
  resizeStart: { x: number; y: number },
): { deltaX: number; deltaY: number; viewport: ViewportSize } {
  return {
    deltaX: e.clientX - resizeStart.x,
    deltaY: e.clientY - resizeStart.y,
    viewport: getViewportSize(),
  };
}

export function saveBounds(
  key: string,
  bounds: WindowBounds,
  storage: Storage | null = typeof window !== "undefined"
    ? window.localStorage
    : null,
): void {
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(bounds));
  } catch {
    // Ignore storage write failures (quota, private mode)
  }
}
