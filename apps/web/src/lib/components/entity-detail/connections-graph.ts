/**
 * Composition for the Connections tab (issue #2350): one entity in the middle,
 * its direct connections arranged around it.
 *
 * The arrangement is deliberate rather than a raw radial dump of the data:
 *
 *  - Satellites live in a top arc and a bottom arc only. The horizontal band
 *    through the middle belongs to the centre entity and its name, so nothing
 *    ever crosses or crowds the focal point (the first pass put nodes at 3 and
 *    9 o'clock, and their labels landed on top of the centre).
 *  - Each satellite gets a width derived from how much room it actually has,
 *    so cards in the same band can never overlap.
 *  - The ring holds a handful of connections; anything past that is listed
 *    below the picture instead of being crammed into it.
 *
 * Positions are percentages of the container box, so the same numbers work on
 * a 330px side panel and a 900px zen view, and the layout is unit-testable
 * without a DOM.
 */

export type ConnectionNodePosition = {
  /** Percentage of the container width / height (0-100). */
  x: number;
  y: number;
  /** Card width as a percentage of the container width. */
  widthPct: number;
};

/** Satellites in the picture. Narrow containers get fewer, and more room each. */
export const RING_CAPACITY_NARROW = 6;
export const RING_CAPACITY_WIDE = 9;
/** Container width (px) at which the wider ring starts to read comfortably. */
export const WIDE_CONTAINER_PX = 420;

export const ringCapacity = (containerWidth: number) =>
  containerWidth >= WIDE_CONTAINER_PX
    ? RING_CAPACITY_WIDE
    : RING_CAPACITY_NARROW;

/**
 * How far a satellite must stay off the horizontal axis, in radians. Sized so
 * the vertical gap it forces (sin(38°) × ry) clears the centre entity's circle
 * and name at every container size we render at.
 */
const ARC_MARGIN = (38 * Math.PI) / 180;
const RADIUS = { rx: 38, ry: 38 };

/** Card widths, as a percentage of the container. */
const MAX_CARD_WIDTH = 32;
/** Cards this close vertically are treated as sharing a band. */
const BAND_HEIGHT = 16;

const round = (value: number) => Math.round(value * 100) / 100;

/** Angles for `count` satellites spread across one arc, endpoints included. */
function arcAngles(count: number, centre: number): number[] {
  if (count <= 0) return [];
  const halfSpan = Math.PI / 2 - ARC_MARGIN;
  if (count === 1) return [centre];
  const start = centre - halfSpan;
  const step = (halfSpan * 2) / (count - 1);
  return Array.from({ length: count }, (_, i) => start + step * i);
}

/**
 * Widths come from the geometry: a card may claim most of the gap to its
 * nearest neighbour in the same horizontal band, and never more room than it
 * has to the container edge. Two cards in a band therefore cannot collide.
 */
function widthFor(
  node: { x: number; y: number },
  all: { x: number; y: number }[],
): number {
  let nearest = Infinity;
  for (const other of all) {
    if (other === node) continue;
    if (Math.abs(other.y - node.y) >= BAND_HEIGHT) continue;
    nearest = Math.min(nearest, Math.abs(other.x - node.x));
  }
  const edgeRoom = 2 * Math.min(node.x, 100 - node.x);
  return round(Math.min(nearest * 0.92, edgeRoom, MAX_CARD_WIDTH));
}

/**
 * Places `count` satellites around the centre: the first half across the top
 * arc, the rest across the bottom, both reading left to right.
 */
export function layoutConnectionGraph(count: number): ConnectionNodePosition[] {
  if (count <= 0) return [];

  const top = Math.ceil(count / 2);
  const angles = [
    ...arcAngles(top, -Math.PI / 2),
    ...arcAngles(count - top, Math.PI / 2),
  ];

  const points = angles.map((angle) => ({
    x: round(50 + Math.cos(angle) * RADIUS.rx),
    y: round(50 + Math.sin(angle) * RADIUS.ry),
  }));

  return points.map((point) => ({
    ...point,
    widthPct: widthFor(point, points),
  }));
}

/**
 * The visible part of a spoke: a segment in the middle of the centre→node
 * line, so the connector never runs under the centre circle or the card.
 */
export function edgeSegment(node: { x: number; y: number }): {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
} {
  const at = (fraction: number) => ({
    x: round(50 + (node.x - 50) * fraction),
    y: round(50 + (node.y - 50) * fraction),
  });
  const start = at(0.26);
  const end = at(0.74);
  return { x1: start.x, y1: start.y, x2: end.x, y2: end.y };
}
