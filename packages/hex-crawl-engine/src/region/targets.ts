import { getHexNeighbors, getHexRange, hexDistance } from "map-engine";
import {
  toHexKey,
  type HexCoord,
  type HexCrawlState,
  type HexKey,
} from "../model";
import {
  GAP_CORRIDOR_MAX,
  REGION_MAX_HEXES,
  REGION_MAX_RADIUS,
  REGION_MIN_RADIUS,
  type RegionOperation,
  type RegionRefusal,
  type RegionTargets,
} from "./types";

export interface RegionTargetInput {
  operation: RegionOperation;
  state: HexCrawlState;
  centre: HexCoord;
  /** 1 to 12. Ignored for `grow`. */
  radius: number;
  /** True when the hex is on the map. Supplied by the web layer. */
  inBounds: (hex: HexCoord) => boolean;
}

const AXES: readonly HexCoord[] = [
  { q: 1, r: 0 },
  { q: 0, r: 1 },
  { q: 1, r: -1 },
];

const byQThenR = (a: HexCoord, b: HexCoord) => a.q - b.q || a.r - b.r;

function hasTerrain(state: HexCrawlState, hex: HexCoord): boolean {
  return state.hexes[toHexKey(hex)]?.terrain !== undefined;
}

/**
 * Empty hexes reachable from outside the radius by stepping through empty
 * hexes on the map. Off-map positions are walls. Anything empty inside the
 * radius that is not in this set is enclosed.
 */
function openFromOutside(
  state: HexCrawlState,
  centre: HexCoord,
  radius: number,
  inBounds: (hex: HexCoord) => boolean,
): Set<HexKey> {
  const universe = new Set(getHexRange(centre, radius + 1).map(toHexKey));
  const open = (hex: HexCoord) =>
    inBounds(hex) && !hasTerrain(state, hex) && universe.has(toHexKey(hex));

  const reached = new Set<HexKey>();
  const queue: HexCoord[] = [];
  for (const hex of getHexRange(centre, radius + 1)) {
    const onRing = hexDistance(hex, centre) === radius + 1;
    if (onRing && open(hex)) {
      reached.add(toHexKey(hex));
      queue.push(hex);
    }
  }
  while (queue.length > 0) {
    const hex = queue.pop()!;
    for (const next of getHexNeighbors(hex)) {
      const key = toHexKey(next);
      if (reached.has(key) || !open(next)) continue;
      reached.add(key);
      queue.push(next);
    }
  }
  return reached;
}

/**
 * Walk away from an empty hex along one direction through empty hexes.
 * Returns how many empty hexes were passed and whether terrain closed the run.
 */
function walkRun(
  state: HexCrawlState,
  from: HexCoord,
  step: HexCoord,
  inBounds: (hex: HexCoord) => boolean,
): { passed: number; closed: boolean } {
  let passed = 0;
  let cursor: HexCoord = { q: from.q + step.q, r: from.r + step.r };
  while (passed < GAP_CORRIDOR_MAX && inBounds(cursor)) {
    if (hasTerrain(state, cursor)) return { passed, closed: true };
    passed++;
    cursor = { q: cursor.q + step.q, r: cursor.r + step.r };
  }
  return { passed, closed: false };
}

/** Whether an empty hex sits in a straight run of at most GAP_CORRIDOR_MAX empty hexes with terrain at both ends. */
function inNarrowCorridor(
  state: HexCrawlState,
  hex: HexCoord,
  inBounds: (hex: HexCoord) => boolean,
): boolean {
  return AXES.some((axis) => {
    const ahead = walkRun(state, hex, axis, inBounds);
    const behind = walkRun(state, hex, { q: -axis.q, r: -axis.r }, inBounds);
    return (
      ahead.closed &&
      behind.closed &&
      ahead.passed + behind.passed + 1 <= GAP_CORRIDOR_MAX
    );
  });
}

/**
 * Decide which hexes a request may change (research D6). Pure: the state is
 * only read. Never returns a hex off the map, and never a hex whose terrain
 * the operation is not allowed to touch.
 */
export function selectRegionTargets(
  input: RegionTargetInput,
): { ok: true; targets: RegionTargets } | { ok: false; reason: RegionRefusal } {
  const { operation, state, centre, radius, inBounds } = input;
  if (
    operation !== "grow" &&
    (!Number.isInteger(radius) ||
      radius < REGION_MIN_RADIUS ||
      radius > REGION_MAX_RADIUS)
  ) {
    return { ok: false, reason: "invalid-radius" };
  }
  if (!inBounds(centre)) return { ok: false, reason: "centre-off-map" };

  const candidates = (
    operation === "grow"
      ? [centre, ...getHexNeighbors(centre)]
      : getHexRange(centre, radius)
  ).filter(inBounds);
  if (candidates.length > REGION_MAX_HEXES)
    return { ok: false, reason: "too-large" };

  let targets: HexCoord[];
  let kept: number;
  if (operation === "regenerate") {
    targets = candidates.filter((hex) => {
      const record = state.hexes[toHexKey(hex)];
      return record?.terrain !== undefined && record.generated !== undefined;
    });
    kept =
      candidates.filter((hex) => hasTerrain(state, hex)).length -
      targets.length;
  } else {
    const empty = candidates.filter((hex) => !hasTerrain(state, hex));
    kept = candidates.length - empty.length;
    if (operation === "gaps") {
      const reachable = openFromOutside(state, centre, radius, inBounds);
      targets = empty.filter(
        (hex) =>
          !reachable.has(toHexKey(hex)) ||
          inNarrowCorridor(state, hex, inBounds),
      );
    } else {
      targets = empty;
    }
  }

  if (targets.length === 0) return { ok: false, reason: "nothing-to-generate" };
  return {
    ok: true,
    targets: { targets: [...targets].sort(byQThenR), protected: kept },
  };
}
