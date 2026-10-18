/**
 * Window maths for the table entry list (#2247, SC-004, R7).
 *
 * A d100 table is 100 rows, but imported tables run to a thousand, and every
 * row carries a text input plus its own diagnostics. Rendering only the visible
 * slice keeps editing a large table inside the frame budget.
 *
 * Kept out of the component so the arithmetic — the part with the off-by-one
 * risk — is unit-testable without mounting anything.
 */
export interface VirtualWindow {
  start: number;
  end: number;
  /** Spacer heights standing in for the rows outside the window. */
  paddingTop: number;
  paddingBottom: number;
  totalHeight: number;
}

export interface VirtualWindowInput {
  itemCount: number;
  rowHeight: number;
  scrollTop: number;
  viewportHeight: number;
  /** Rows rendered beyond each edge, so a fast scroll does not flash blanks. */
  overscan?: number;
}

export function computeWindow({
  itemCount,
  rowHeight,
  scrollTop,
  viewportHeight,
  overscan = 6,
}: VirtualWindowInput): VirtualWindow {
  const totalHeight = itemCount * rowHeight;
  if (itemCount === 0 || rowHeight <= 0) {
    return {
      start: 0,
      end: 0,
      paddingTop: 0,
      paddingBottom: 0,
      totalHeight: 0,
    };
  }

  const firstVisible = Math.floor(Math.max(0, scrollTop) / rowHeight);
  const visibleCount = Math.ceil(Math.max(0, viewportHeight) / rowHeight) + 1;

  const start = Math.max(0, firstVisible - overscan);
  const end = Math.min(itemCount, firstVisible + visibleCount + overscan);

  return {
    start,
    end,
    paddingTop: start * rowHeight,
    paddingBottom: (itemCount - end) * rowHeight,
    totalHeight,
  };
}
