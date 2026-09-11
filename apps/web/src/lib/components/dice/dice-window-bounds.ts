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

export const PLAY_TOOLS_WINDOW_STORAGE_KEY = "codex_play_tools_window_bounds";
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

export function clampBounds(
  bounds: WindowBounds,
  viewport: ViewportSize,
  minWidth = MIN_WINDOW_WIDTH,
  minHeight = MIN_WINDOW_HEIGHT,
  margin = WINDOW_MARGIN,
): WindowBounds {
  const maxAvailableWidth = Math.max(100, viewport.width - margin * 2);
  const maxAvailableHeight = Math.max(100, viewport.height - margin * 2);

  const effectiveMinWidth = Math.min(minWidth, maxAvailableWidth);
  const effectiveMinHeight = Math.min(minHeight, maxAvailableHeight);

  const width = Math.min(
    maxAvailableWidth,
    Math.max(effectiveMinWidth, bounds.width),
  );
  const height = Math.min(
    maxAvailableHeight,
    Math.max(effectiveMinHeight, bounds.height),
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
  const maxAvailableWidth = Math.max(100, viewport.width - margin * 2);
  const maxAvailableHeight = Math.max(100, viewport.height - margin * 2);

  const effectiveMinWidth = Math.min(minWidth, maxAvailableWidth);
  const effectiveMinHeight = Math.min(minHeight, maxAvailableHeight);

  const width = Math.min(
    maxAvailableWidth,
    Math.max(effectiveMinWidth, size.width),
  );
  const height = Math.min(
    maxAvailableHeight,
    Math.max(effectiveMinHeight, size.height),
  );

  const x = Math.max(margin, Math.round((viewport.width - width) / 2));
  const y = Math.max(margin, Math.round((viewport.height - height) / 2));

  return { x, y, width, height };
}

export function loadSavedBounds(
  storage: Storage | null = typeof window !== "undefined"
    ? window.localStorage
    : null,
  viewport: ViewportSize = getViewportSize(),
  key = PLAY_TOOLS_WINDOW_STORAGE_KEY,
): WindowBounds {
  if (!storage) {
    return getCenteredBounds(undefined, viewport);
  }

  try {
    const raw = storage.getItem(key);
    if (!raw) {
      return getCenteredBounds(undefined, viewport);
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

  return getCenteredBounds(undefined, viewport);
}

export function saveBounds(
  bounds: WindowBounds,
  storage: Storage | null = typeof window !== "undefined"
    ? window.localStorage
    : null,
  key = PLAY_TOOLS_WINDOW_STORAGE_KEY,
): void {
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(bounds));
  } catch {
    // Ignore storage write failures (quota, private mode)
  }
}
