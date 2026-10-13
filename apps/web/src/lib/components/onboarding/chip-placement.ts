/** A screen rectangle, as `getBoundingClientRect` reports it. */
export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y;

/**
 * Moves the tip chip up until it covers none of `controls` (Story 3,
 * scenario 5), keeping `gap` pixels clear. Floating buttons, such as the
 * graph's on phones, sit right where the chip would land above the Cif button.
 * Returns the new top, or null when there is no clear spot below `minTop`.
 */
export function clearOfControls(
  chip: Box,
  controls: readonly Box[],
  { gap = 8, minTop = 0 }: { gap?: number; minTop?: number } = {},
): number | null {
  let y = chip.y;
  // Each pass moves above at least one control, so this always ends.
  for (let pass = 0; pass <= controls.length; pass++) {
    const hits = controls.filter((c) => overlaps({ ...chip, y }, c));
    if (hits.length === 0) return y;
    y = Math.min(...hits.map((c) => c.y)) - gap - chip.height;
    if (y < minTop) return null;
  }
  return null;
}
