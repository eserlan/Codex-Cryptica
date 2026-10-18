import { getHexLine, hexDistance, type HexCoord } from "map-engine";

/** Bounds route allocations and the number of per-step UI updates. */
export const MAX_HEX_JOURNEY_STEPS = 1_000;

export type HexJourneyRouteError =
  | "invalid-coordinate"
  | "invalid-grid-distance"
  | "route-too-long"
  | "invalid-distance";

export interface HexJourneyRoute {
  readonly origin: HexCoord;
  readonly destination: HexCoord;
  /** Includes the origin at index zero. */
  readonly hexes: readonly HexCoord[];
  /** Number of moves; always `hexes.length - 1`. */
  readonly steps: number;
  readonly gridDistance: number;
  readonly gridUnit: string;
  readonly totalDistance: number;
}

export type HexJourneyRouteResult =
  | ({ ok: true } & HexJourneyRoute)
  | { ok: false; reason: HexJourneyRouteError };

/** Build an endpoint-inclusive straight line before any movement or persistence. */
export function buildHexJourneyRoute(
  origin: HexCoord,
  destination: HexCoord,
  gridDistance: number,
  gridUnit: string,
): HexJourneyRouteResult {
  if (!isHexCoord(origin) || !isHexCoord(destination))
    return { ok: false, reason: "invalid-coordinate" };
  if (!Number.isFinite(gridDistance) || gridDistance <= 0)
    return { ok: false, reason: "invalid-grid-distance" };

  const steps = hexDistance(origin, destination);
  if (!Number.isSafeInteger(steps))
    return { ok: false, reason: "invalid-coordinate" };
  if (steps > MAX_HEX_JOURNEY_STEPS)
    return { ok: false, reason: "route-too-long" };

  const totalDistance = steps * gridDistance;
  if (!Number.isFinite(totalDistance))
    return { ok: false, reason: "invalid-distance" };

  const hexes = Object.freeze(
    getHexLine(origin, destination).map((hex) => Object.freeze({ ...hex })),
  );
  return Object.freeze({
    ok: true,
    origin: Object.freeze({ ...origin }),
    destination: Object.freeze({ ...destination }),
    hexes,
    steps,
    gridDistance,
    gridUnit,
    totalDistance,
  });
}

export interface HexJourneyEstimateInput {
  totalSteps: number;
  completedSteps: number;
  gridDistance: number;
  gridUnit: string;
  /** Optional time estimate; blank input is passed as null or omitted. */
  hoursPerHex?: number | null;
}

export interface HexJourneyEstimate {
  readonly totalSteps: number;
  readonly completedSteps: number;
  readonly remainingSteps: number;
  readonly totalDistance: number;
  readonly completedDistance: number;
  readonly remainingDistance: number;
  readonly gridUnit: string;
  readonly totalHours: number | null;
  readonly completedHours: number | null;
  readonly remainingHours: number | null;
}

export type HexJourneyEstimateResult =
  | ({ ok: true } & HexJourneyEstimate)
  | {
      ok: false;
      reason:
        | "invalid-progress"
        | "invalid-grid-distance"
        | "invalid-hours-per-hex"
        | "estimate-overflow";
    };

/** Calculate estimates from step counts, keeping the optional pace explicit. */
// fallow-ignore-next-line complexity -- Validates and returns one atomic, internally consistent estimate result.
export function estimateHexJourney(
  input: HexJourneyEstimateInput,
): HexJourneyEstimateResult {
  const { totalSteps, completedSteps, gridDistance, gridUnit, hoursPerHex } =
    input;
  if (
    !Number.isSafeInteger(totalSteps) ||
    totalSteps < 0 ||
    !Number.isSafeInteger(completedSteps) ||
    completedSteps < 0 ||
    completedSteps > totalSteps
  ) {
    return { ok: false, reason: "invalid-progress" };
  }
  if (!Number.isFinite(gridDistance) || gridDistance <= 0)
    return { ok: false, reason: "invalid-grid-distance" };
  if (
    hoursPerHex !== undefined &&
    hoursPerHex !== null &&
    (!Number.isFinite(hoursPerHex) || hoursPerHex <= 0)
  ) {
    return { ok: false, reason: "invalid-hours-per-hex" };
  }

  const remainingSteps = totalSteps - completedSteps;
  const totalDistance = totalSteps * gridDistance;
  const completedDistance = completedSteps * gridDistance;
  const remainingDistance = remainingSteps * gridDistance;
  const hasPace = hoursPerHex !== undefined && hoursPerHex !== null;
  const totalHours = hasPace ? totalSteps * hoursPerHex : null;
  const completedHours = hasPace ? completedSteps * hoursPerHex : null;
  const remainingHours = hasPace ? remainingSteps * hoursPerHex : null;
  if (
    !Number.isFinite(totalDistance) ||
    !Number.isFinite(completedDistance) ||
    !Number.isFinite(remainingDistance) ||
    (totalHours !== null && !Number.isFinite(totalHours)) ||
    (completedHours !== null && !Number.isFinite(completedHours)) ||
    (remainingHours !== null && !Number.isFinite(remainingHours))
  ) {
    return { ok: false, reason: "estimate-overflow" };
  }

  return Object.freeze({
    ok: true,
    totalSteps,
    completedSteps,
    remainingSteps,
    totalDistance,
    completedDistance,
    remainingDistance,
    gridUnit,
    totalHours,
    completedHours,
    remainingHours,
  });
}

function isHexCoord(value: HexCoord): boolean {
  return (
    Number.isSafeInteger(value?.q) &&
    Number.isSafeInteger(value?.r) &&
    Number.isSafeInteger(value.q + value.r)
  );
}
