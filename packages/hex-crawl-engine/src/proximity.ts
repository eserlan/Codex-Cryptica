import { hexDistance, type HexCoord } from "map-engine";

/** Only the pin fields proximity needs, so this stays independent of schema. */
export interface PinLike {
  entityId?: string;
  hexCoordinates?: { q: number; r: number };
}

/**
 * Pins that sit on this hex and link to an entity that still exists (the
 * hex contents list). Pins with no entity link, or with no hex, are skipped.
 */
export function pinsInHex<T extends PinLike>(
  pins: readonly T[],
  hex: HexCoord,
  entityExists: (id: string) => boolean,
): T[] {
  return pins.filter(
    (pin) =>
      pin.hexCoordinates !== undefined &&
      pin.hexCoordinates.q === hex.q &&
      pin.hexCoordinates.r === hex.r &&
      pin.entityId !== undefined &&
      entityExists(pin.entityId),
  );
}

export interface LocationCandidate {
  entityId: string;
  title: string;
  hex: HexCoord;
}

export interface NearestLocation {
  entityId: string;
  title: string;
  distance: number;
}

/** Default search radius for the proposed link (FR-024a). */
export const NEAREST_LOCATION_MAX_DISTANCE = 2;

/**
 * The location closest to a hex, within `maxDistance`. Ties are broken by
 * title (locale-insensitive) and then by id, so the choice is deterministic.
 */
export function selectNearestLocation(
  candidates: readonly LocationCandidate[],
  hex: HexCoord,
  maxDistance: number = NEAREST_LOCATION_MAX_DISTANCE,
): NearestLocation | null {
  let best: NearestLocation | null = null;
  for (const candidate of candidates) {
    const distance = hexDistance(candidate.hex, hex);
    if (distance > maxDistance) continue;
    const next = {
      entityId: candidate.entityId,
      title: candidate.title,
      distance,
    };
    if (!best || isBetter(next, best)) best = next;
  }
  return best;
}

function isBetter(a: NearestLocation, b: NearestLocation): boolean {
  if (a.distance !== b.distance) return a.distance < b.distance;
  const byTitle = a.title.localeCompare(b.title, "en", { sensitivity: "base" });
  if (byTitle !== 0) return byTitle < 0;
  return a.entityId < b.entityId;
}
