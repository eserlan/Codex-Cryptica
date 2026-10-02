export type DetailLevel = "low" | "medium" | "high";

/**
 * Zoom below which the graph is drawn with less detail. Labels are already too
 * small to draw below about 0.8 (10px text, 8px minimum), so "medium" loses
 * nothing visible; "low" is an overview where nodes are a few pixels wide.
 */
export const MEDIUM_DETAIL_ZOOM = 0.5;
export const LOW_DETAIL_ZOOM = 0.2;
/**
 * Leaving a level needs this much more zoom than entering it, so scrolling
 * around a threshold does not restyle every element on each wheel step.
 */
const EXIT_MARGIN = 1.1;

export function detailLevelForZoom(
  zoom: number,
  previous: DetailLevel | null = null,
): DetailLevel {
  const lowLimit =
    previous === "low" ? LOW_DETAIL_ZOOM * EXIT_MARGIN : LOW_DETAIL_ZOOM;
  const mediumLimit =
    previous === "low" || previous === "medium"
      ? MEDIUM_DETAIL_ZOOM * EXIT_MARGIN
      : MEDIUM_DETAIL_ZOOM;
  if (zoom < lowLimit) return "low";
  if (zoom < mediumLimit) return "medium";
  return "high";
}

/** Tags elements with the class for a detail level, clearing the other one. */
export function applyDetailLevel(
  eles: { addClass(c: string): any; removeClass(c: string): any },
  level: DetailLevel,
) {
  if (level === "low") eles.addClass("lod-low").removeClass("lod-medium");
  else if (level === "medium")
    eles.addClass("lod-medium").removeClass("lod-low");
  else eles.removeClass("lod-low lod-medium");
}
