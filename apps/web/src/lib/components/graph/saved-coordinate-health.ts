import { isLayoutCollinear } from "graph-engine";

interface CoordinateEntity {
  metadata?: {
    coordinates?: { x: number; y: number } | null;
  } | null;
}

/** Checks the full saved vault layout, rather than a possibly culled graph view. */
export function hasDegenerateSavedCoordinates(
  entities: readonly CoordinateEntity[],
): boolean {
  const positions: { x: number; y: number }[] = [];
  for (const entity of entities) {
    const coordinates = entity?.metadata?.coordinates;
    if (
      coordinates &&
      Number.isFinite(coordinates.x) &&
      Number.isFinite(coordinates.y)
    ) {
      positions.push({ x: coordinates.x, y: coordinates.y });
    }
  }
  return isLayoutCollinear(positions);
}
