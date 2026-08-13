export type GraphPosition = {
  cx: number;
  cy: number;
};

/**
 * Computes 2D viewBox node coordinates for landing page graph previews (540x280).
 * Supports up to 5 steps (4 spokes) and 6 steps (5 spokes) with non-overlapping positions.
 */
export function getPositions(count: number): GraphPosition[] {
  const hub: GraphPosition = { cx: 270, cy: 140 };
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
