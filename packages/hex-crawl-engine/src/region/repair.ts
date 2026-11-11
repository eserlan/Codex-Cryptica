import { getHexNeighbors } from "map-engine";
import {
  toHexKey,
  type HexCoord,
  type HexCrawlState,
  type HexKey,
} from "../model";
import type { TerrainId } from "../terrain";
import { TERRAIN_POINTS } from "./presets";

export interface RepairInput {
  /** Proposed terrain per target, as classified. Updated in place. */
  proposed: Record<HexKey, TerrainId>;
  /** Targets in the order they are visited (q, then r). */
  targets: readonly HexCoord[];
  state: HexCrawlState;
  inBounds: (hex: HexCoord) => boolean;
  available: ReadonlySet<TerrainId>;
}

type Seen = TerrainId | "wild";
type Terrains = Record<HexKey, TerrainId>;

interface Context extends RepairInput {
  targetKeys: ReadonlySet<HexKey>;
}

// A coast hex needs water (or the chance of it) on one side and something that
// is not water on the other. On a thin strip that other side may itself be coast.
const waterSide = (s: Seen) => s === "wild" || s === "water";
const dryside = (s: Seen) => s === "wild" || s !== "water";
const isLand = (s: Seen) => s !== "wild" && s !== "water" && s !== "coast";

/** What a hex shows: proposed, fixed, or "wild" (undecided, custom or off the map). */
function seen(ctx: Context, map: Terrains, hex: HexCoord): Seen {
  const key = toHexKey(hex);
  const mine = map[key];
  if (mine) return mine;
  if (!ctx.inBounds(hex)) return "wild";
  const terrain = ctx.state.hexes[key]?.terrain;
  return terrain?.kind === "preset" ? terrain.id : "wild";
}

const around = (ctx: Context, map: Terrains, hex: HexCoord): Seen[] =>
  getHexNeighbors(hex).map((n) => seen(ctx, map, n));

function coastSatisfied(ctx: Context, map: Terrains, hex: HexCoord): boolean {
  const near = around(ctx, map, hex);
  return near.some(waterSide) && near.some(dryside);
}

/**
 * Enforce the hard continuity rules (research D3). Undecided neighbours, custom
 * terrain and positions off the map count as "could be either", so a rule is
 * never broken by something a later pass could still complete. Deterministic.
 */
export function repairProposal(input: RepairInput): void {
  const ctx: Context = {
    ...input,
    targetKeys: new Set(input.targets.map(toHexKey)),
  };
  if (input.available.has("coast")) {
    completeFixedCoasts(ctx);
    const base = { ...input.proposed };
    applyCoastRules(ctx, base);
    revertBrokenCoasts(ctx, base);
  }
  lowerLonelyMountains(ctx);
}

/** Fixed coast hexes, in key order, that touch at least one target. */
function fixedCoastsBeside(ctx: Context): HexCoord[] {
  const found = new Map<HexKey, HexCoord>();
  for (const hex of ctx.targets) {
    for (const n of getHexNeighbors(hex)) {
      const nk = toHexKey(n);
      const terrain = ctx.state.hexes[nk]?.terrain;
      const fixedCoast = terrain?.kind === "preset" && terrain.id === "coast";
      if (fixedCoast && !ctx.targetKeys.has(nk) && ctx.inBounds(n))
        found.set(nk, n);
    }
  }
  return [...found.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([, hex]) => hex);
}

/**
 * Terrain committed in an earlier pass is never changed, so a coast hex that
 * was fine with its neighbours still open must be given what it needs by the
 * hexes now filling them in (FR-016).
 */
function completeFixedCoasts(ctx: Context): void {
  for (const fixed of fixedCoastsBeside(ctx)) {
    if (coastSatisfied(ctx, ctx.proposed, fixed)) continue;
    const mine = getHexNeighbors(fixed)
      .filter((n) => ctx.targetKeys.has(toHexKey(n)))
      .sort((a, b) => a.q - b.q || a.r - b.r);
    giveWater(ctx, fixed, mine);
    giveDryGround(ctx, fixed, mine);
  }
}

function giveWater(
  ctx: Context,
  fixed: HexCoord,
  mine: readonly HexCoord[],
): void {
  const needsWater = !around(ctx, ctx.proposed, fixed).some(waterSide);
  if (needsWater && ctx.available.has("water") && mine[0])
    ctx.proposed[toHexKey(mine[0])] = "water";
}

function giveDryGround(
  ctx: Context,
  fixed: HexCoord,
  mine: readonly HexCoord[],
): void {
  const dry = nearestTo("plains", ctx.available, [
    "water",
    "coast",
    "mountains",
    "swamp",
  ]);
  if (!dry || around(ctx, ctx.proposed, fixed).some(dryside)) return;
  const pick =
    mine.find((n) => ctx.proposed[toHexKey(n)] !== "water") ??
    mine[mine.length - 1];
  if (pick && !isLand(ctx.proposed[toHexKey(pick)]))
    ctx.proposed[toHexKey(pick)] = dry;
}

/** Land beside water becomes coast, specks of land become water, water beside fixed land becomes coast. */
function applyCoastRules(ctx: Context, base: Terrains): void {
  const decided: Terrains = { ...ctx.proposed };
  for (const hex of ctx.targets) {
    const key = toHexKey(hex);
    const here = base[key];
    const near = around(ctx, base, hex);
    if (isLand(here)) {
      if (!near.includes("water")) continue;
      decided[key] = near.some(dryside) ? "coast" : "water";
    } else if (
      here === "water" &&
      touchesFixedLand(ctx, base, hex) &&
      near.some(waterSide)
    ) {
      decided[key] = "coast";
    }
  }
  Object.assign(ctx.proposed, decided);
}

function touchesFixedLand(
  ctx: Context,
  base: Terrains,
  hex: HexCoord,
): boolean {
  return getHexNeighbors(hex).some(
    (n) =>
      !ctx.targetKeys.has(toHexKey(n)) &&
      ctx.inBounds(n) &&
      isLand(seen(ctx, base, n)),
  );
}

/** A coast hex must still border water and dry ground once every change is in. */
function revertBrokenCoasts(ctx: Context, base: Terrains): void {
  const { proposed } = ctx;
  for (const hex of ctx.targets) {
    const key = toHexKey(hex);
    if (proposed[key] === "coast" && !coastSatisfied(ctx, proposed, hex))
      proposed[key] = base[key];
  }
  // A fixed coast hex beside the proposal must be no worse off than the completion left it.
  for (const fixed of fixedCoastsBeside(ctx)) {
    if (coastSatisfied(ctx, proposed, fixed)) continue;
    for (const n of getHexNeighbors(fixed)) {
      const nk = toHexKey(n);
      if (ctx.targetKeys.has(nk)) proposed[nk] = base[nk];
    }
  }
}

/** Mountains rise out of high ground, not out of nothing. */
function lowerLonelyMountains(ctx: Context): void {
  const lower = nearestTo("mountains", ctx.available, [
    "mountains",
    "water",
    "coast",
    "swamp",
  ]);
  if (!lower) return;
  for (const hex of ctx.targets) {
    const key = toHexKey(hex);
    if (ctx.proposed[key] !== "mountains") continue;
    const high = around(ctx, ctx.proposed, hex).some(
      (s) => s === "wild" || s === "hills" || s === "mountains",
    );
    if (!high) ctx.proposed[key] = lower;
  }
}

/** The available terrain whose place on the chart is nearest to `id`'s, leaving out `exclude`. */
function nearestTo(
  id: TerrainId,
  available: ReadonlySet<TerrainId>,
  exclude: readonly TerrainId[],
): TerrainId | null {
  const target = TERRAIN_POINTS[id];
  let best: TerrainId | null = null;
  let bestDistance = Infinity;
  for (const candidate of available) {
    if (exclude.includes(candidate)) continue;
    const p = TERRAIN_POINTS[candidate];
    const d =
      (p.height - target.height) ** 2 + (p.wetness - target.wetness) ** 2;
    if (d < bestDistance) {
      bestDistance = d;
      best = candidate;
    }
  }
  return best;
}
