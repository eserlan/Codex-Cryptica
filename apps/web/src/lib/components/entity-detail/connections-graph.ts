/**
 * Radial layout for the Connections tab (issue #2350): the entity at the
 * centre, its direct connections around it.
 *
 * Deliberately not a physics simulation — positions are plain percentages of
 * the container box, so the view is responsive by construction (the component
 * places nodes with `left`/`top`) and the layout is testable without a DOM.
 */

export type ConnectionNodePosition = {
  /** Percentage of the container width / height (0-100). */
  x: number;
  y: number;
  ring: number;
};

/** Past this the rings get crowded; the rest are summarised as "+N more". */
export const MAX_CONNECTION_NODES = 20;
/** Fraction of the centre→node distance where the label pill sits. */
export const EDGE_LABEL_FRACTION = 0.5;

const SINGLE_RING_MAX = 9;
const INNER_RING_MAX = 6;

const RING_RADII = [
  { rx: 32, ry: 34 }, // single ring
  { rx: 22, ry: 24 }, // inner ring (two-ring layout)
  { rx: 40, ry: 42 }, // outer ring (two-ring layout)
];

const round = (value: number) => Math.round(value * 100) / 100;

function ringPositions(
  count: number,
  radius: { rx: number; ry: number },
  ring: number,
  angleOffset: number,
): ConnectionNodePosition[] {
  const positions: ConnectionNodePosition[] = [];
  const step = (Math.PI * 2) / Math.max(count, 1);
  for (let i = 0; i < count; i++) {
    // -90° puts the first neighbour straight above the centre, matching the
    // sketch in issue #2350.
    const angle = -Math.PI / 2 + angleOffset + step * i;
    positions.push({
      x: round(50 + Math.cos(angle) * radius.rx),
      y: round(50 + Math.sin(angle) * radius.ry),
      ring,
    });
  }
  return positions;
}

/**
 * Up to nine neighbours sit on one ring; beyond that they split across two
 * interleaved rings so labels stay legible.
 */
export function layoutConnectionGraph(count: number): ConnectionNodePosition[] {
  const shown = Math.min(Math.max(count, 0), MAX_CONNECTION_NODES);
  if (shown === 0) return [];
  if (shown <= SINGLE_RING_MAX) {
    return ringPositions(shown, RING_RADII[0], 0, 0);
  }

  const inner = Math.min(INNER_RING_MAX, Math.ceil(shown * 0.35));
  const outer = shown - inner;
  return [
    ...ringPositions(inner, RING_RADII[1], 1, 0),
    // Half-step offset so outer nodes fall between the inner ones instead of
    // hiding behind them.
    ...ringPositions(outer, RING_RADII[2], 2, Math.PI / Math.max(outer, 1)),
  ];
}

/** Point along the centre→node line where the relationship label is drawn. */
export function edgeLabelPosition(
  node: ConnectionNodePosition,
  fraction = EDGE_LABEL_FRACTION,
): { x: number; y: number } {
  return {
    x: round(50 + (node.x - 50) * fraction),
    y: round(50 + (node.y - 50) * fraction),
  };
}
