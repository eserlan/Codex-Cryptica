export const TIMELINE_RENDER_THRESHOLD = 80;
export const DEFAULT_RENDER_OVERSCAN = 6;

export interface RenderWindow {
  start: number;
  end: number;
  topSpacer: number;
  bottomSpacer: number;
  isBounded: boolean;
}

/**
 * Calculates a stable index window for fixed-estimate timeline items.
 * The source collection remains complete; this only limits mounted DOM.
 */
export function getRenderWindow(
  total: number,
  scrollOffset: number,
  viewportSize: number,
  itemExtent: number,
  overscan = DEFAULT_RENDER_OVERSCAN,
  threshold = TIMELINE_RENDER_THRESHOLD,
): RenderWindow {
  const safeTotal = Math.max(0, Math.floor(total));
  const safeExtent = Math.max(1, itemExtent);
  const safeOffset = Math.max(0, scrollOffset);
  const safeViewport = Math.max(1, viewportSize);

  if (safeTotal <= threshold) {
    return {
      start: 0,
      end: safeTotal,
      topSpacer: 0,
      bottomSpacer: 0,
      isBounded: false,
    };
  }

  const visibleStart = Math.min(safeTotal, Math.floor(safeOffset / safeExtent));
  const visibleCount = Math.max(1, Math.ceil(safeViewport / safeExtent));
  const safeOverscan = Math.max(0, Math.floor(overscan));
  const start = Math.max(0, visibleStart - safeOverscan);
  const end = Math.min(safeTotal, visibleStart + visibleCount + safeOverscan);

  return {
    start,
    end,
    topSpacer: start * safeExtent,
    bottomSpacer: Math.max(0, (safeTotal - end) * safeExtent),
    isBounded: true,
  };
}

export function sliceRenderWindow<T>(
  items: readonly T[],
  window: RenderWindow,
) {
  return items.slice(window.start, window.end);
}
