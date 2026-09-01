export type GraphPosition = {
  cx: number;
  cy: number;
};

export type GraphViewBox = {
  width: number;
  height: number;
};

/** Landscape canvas used on wide (desktop/tablet) viewports. */
export const WIDE_VIEWBOX: GraphViewBox = { width: 540, height: 280 };

/** Portrait canvas used below the `sm` breakpoint, where the graph panel is narrow. */
export const COMPACT_VIEWBOX: GraphViewBox = { width: 320, height: 400 };

/**
 * Computes 2D viewBox node coordinates for landing page graph previews.
 * Supports up to 5 steps (4 spokes) and 6 steps (5 spokes) with non-overlapping positions.
 *
 * `compact` swaps in a taller, narrower layout (matching COMPACT_VIEWBOX) so relation
 * badges — which sit at the midpoint of each hub-to-node spoke — get more room to
 * spread out vertically instead of converging on a wide horizontal hub.
 */
export function getPositions(count: number, compact = false): GraphPosition[] {
  if (compact) {
    // Hub sits at the exact centre of COMPACT_VIEWBOX; derive it from the
    // constant so the two can't drift apart if the canvas size changes.
    const hub: GraphPosition = {
      cx: COMPACT_VIEWBOX.width / 2,
      cy: COMPACT_VIEWBOX.height / 2,
    };
    if (count <= 5) {
      return [
        hub,
        { cx: 75, cy: 78 }, // Top Left (Node 1)
        { cx: 245, cy: 78 }, // Top Right (Node 2)
        { cx: 245, cy: 322 }, // Bottom Right (Node 3)
        { cx: 75, cy: 322 }, // Bottom Left (Node 4)
      ];
    }
    return [
      hub,
      { cx: 75, cy: 70 }, // Top Left (Node 1)
      { cx: 245, cy: 70 }, // Top Right (Node 2)
      { cx: 250, cy: 260 }, // Right (Node 3)
      { cx: 160, cy: 370 }, // Bottom Center (Node 4)
      { cx: 70, cy: 260 }, // Left (Node 5)
    ];
  }

  // Hub sits at the exact centre of WIDE_VIEWBOX; derive it from the
  // constant so the two can't drift apart if the canvas size changes.
  const hub: GraphPosition = {
    cx: WIDE_VIEWBOX.width / 2,
    cy: WIDE_VIEWBOX.height / 2,
  };
  if (count <= 5) {
    return [
      hub,
      { cx: 85, cy: 65 }, // Top Left (Node 1)
      { cx: 455, cy: 75 }, // Top Right (Node 2)
      { cx: 435, cy: 220 }, // Bottom Right (Node 3)
      { cx: 105, cy: 220 }, // Bottom Left (Node 4)
    ];
  }
  return [
    hub,
    { cx: 85, cy: 65 }, // Top Left (Node 1)
    { cx: 455, cy: 75 }, // Top Right (Node 2)
    { cx: 445, cy: 215 }, // Bottom Right (Node 3)
    { cx: 270, cy: 225 }, // Bottom Center (Node 4)
    { cx: 95, cy: 215 }, // Bottom Left (Node 5)
  ];
}
