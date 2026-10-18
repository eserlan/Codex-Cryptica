import type { HighlightRect } from "$lib/services/help-assistant/help-highlight.svelte";

/** Rendered size of the pointing Cif, in px (matches `h-12 w-11`). */
export const CIF_POINTER_SIZE = { width: 44, height: 48 } as const;

const GAP = 14;
const EDGE = 8;
/** Room above the ring taken by the text label. */
const LABEL_ROOM = 28;

export type CifPointerSide = "right" | "left" | "below" | "above";

export interface CifPointerPlacement {
  left: number;
  top: number;
  /** Which side of the target Cif lands on. */
  side: CifPointerSide;
  /** Cif faces right (mirrored) when he lands to the left of the target. */
  flip: boolean;
}

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

/**
 * Picks where Cif perches next to a highlighted control: beside it when there
 * is room, else below, else above. Never off-screen, and never over the
 * control itself unless the viewport is too small for any side.
 */
export function placeCifPointer(
  rect: HighlightRect,
  viewport: { width: number; height: number },
): CifPointerPlacement {
  const { width: w, height: h } = CIF_POINTER_SIZE;
  const maxLeft = viewport.width - w - EDGE;
  const maxTop = viewport.height - h - EDGE;
  const midTop = clamp(rect.top + rect.height / 2 - h / 2, EDGE, maxTop);
  const midLeft = clamp(rect.left + rect.width / 2 - w / 2, EDGE, maxLeft);

  const right = rect.left + rect.width + GAP;
  if (right <= maxLeft) {
    return { left: right, top: midTop, side: "right", flip: false };
  }
  const left = rect.left - GAP - w;
  if (left >= EDGE) {
    return { left, top: midTop, side: "left", flip: true };
  }
  const below = rect.top + rect.height + GAP;
  if (below <= maxTop) {
    return { left: midLeft, top: below, side: "below", flip: false };
  }
  const above = rect.top - GAP - h - LABEL_ROOM;
  if (above >= EDGE) {
    return { left: midLeft, top: above, side: "above", flip: false };
  }
  return {
    left: clamp(right, EDGE, maxLeft),
    top: midTop,
    side: "right",
    flip: false,
  };
}
