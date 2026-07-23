/**
 * Shared "punch a hole in a dark overlay around this element" math, used by
 * both the desktop/general onboarding tour (TourOverlay.svelte) and the
 * mobile graph coach marks (GraphView.svelte), so a highlighted element reads
 * the same way everywhere rather than each caller reimplementing the clip
 * math slightly differently.
 */

export interface SpotlightRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * Builds a CSS `clip-path: polygon(...)` value for a full-viewport overlay
 * with a rectangular hole around `rect` (padded and clamped to the viewport).
 * Returns "" if the padded rect doesn't produce a valid hole (e.g. the target
 * is fully outside the viewport) — callers should skip rendering the overlay
 * in that case rather than draw a dark screen with no visible hole.
 */
export function computeSpotlightClipPath(
  rect: SpotlightRect,
  viewportWidth: number,
  viewportHeight: number,
  padding = 8,
): string {
  if (!viewportWidth || !viewportHeight) return "";

  const x = rect.left - padding;
  const y = rect.top - padding;
  const w = rect.right - rect.left + padding * 2;
  const h = rect.bottom - rect.top + padding * 2;

  const left = Math.max(0, x);
  const top = Math.max(0, y);
  const right = Math.min(viewportWidth, x + w);
  const bottom = Math.min(viewportHeight, y + h);

  if (right <= left || bottom <= top) return "";

  return `clip-path: polygon(
    0% 0%,
    0% 100%,
    ${left}px 100%,
    ${left}px ${top}px,
    ${right}px ${top}px,
    ${right}px ${bottom}px,
    ${left}px ${bottom}px,
    ${left}px 100%,
    100% 100%,
    100% 0%
  );`;
}
