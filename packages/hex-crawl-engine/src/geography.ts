import { getHexNeighbors, getHexRange, hexDistance } from "map-engine";
import {
  toHexKey,
  parseHexKey,
  type HexCoord,
  type HexCrawlState,
  type HexKey,
} from "./model";
import { TERRAIN_POINTS } from "./region/presets";
import { hashSeed } from "./region/seed";
import { hexNoise } from "./region/noise";
import {
  hexEdgeKey,
  hexEdgeFeatureKey,
  parseHexEdgeKey,
  TOPOLOGY_VERSION,
  type CivilisationLevel,
  type HexEdgeFeature,
  type HexEdgeFeatureKey,
  type HexEdgeKey,
  type HexTopology,
  type SettlementSite,
} from "./topology";

export const GEOGRAPHY_MAX_RADIUS = 12;
export interface GeographyRequest {
  centre: HexCoord;
  radius: number;
  seed: string;
  civilisation: CivilisationLevel;
}
export interface GeographyProposal {
  request: GeographyRequest;
  /** New connections and additive features on protected shared edges. */
  edges: Record<HexEdgeKey, HexEdgeFeature>;
  sites: Record<HexKey, SettlementSite>;
  /** Fingerprints prevent accepting a stale preview over changes made meanwhile. */
  topologyStamp: string;
  terrainStamps: Record<HexKey, string>;
}
export interface GeographyInput {
  request: GeographyRequest;
  state: HexCrawlState;
  /** Hexes with existing pins (not all pins are Vault entities). */
  settlements: readonly HexCoord[];
  inBounds: (hex: HexCoord) => boolean;
}

const isWater = (state: HexCrawlState, key: HexKey): boolean =>
  state.hexes[key]?.terrain?.kind === "preset" &&
  state.hexes[key]?.terrain?.id === "water";

function terrainHeight(
  state: HexCrawlState,
  key: HexKey,
  seed: number,
): number {
  const terrain = state.hexes[key]?.terrain;
  const point = terrain?.kind === "preset" ? TERRAIN_POINTS[terrain.id] : null;
  const hex = parseHexKey(key)!;
  return (point?.height ?? 0.4) + (hexNoise(seed, hex, "height") - 0.5) * 0.15;
}

function randomAt(seed: number, key: HexKey): number {
  let n = seed;
  for (let i = 0; i < key.length; i++) {
    n = Math.imul(n ^ key.charCodeAt(i), 16777619);
  }
  return (n >>> 0) / 0x100000000;
}
const coordOrder = (a: HexCoord, b: HexCoord) => a.q - b.q || a.r - b.r;
const keyOrder = (a: string, b: string) =>
  coordOrder(parseHexKey(a)!, parseHexKey(b)!);
const siteTerrainScore: Record<string, number> = {
  plains: 6,
  forest: 4,
  hills: 3,
  coast: 5,
  tundra: 2,
  desert: 1,
  swamp: 0,
  mountains: 0,
  water: 0,
};

function planSettlements(
  keys: readonly HexKey[],
  state: HexCrawlState,
  seed: number,
  civilisation: CivilisationLevel,
  anchors: readonly HexCoord[],
  edges: Readonly<Record<HexEdgeKey, HexEdgeFeature>>,
): HexTopology["sites"] {
  const density = { wilderness: 0.008, frontier: 0.025, settled: 0.055 }[
    civilisation
  ];
  const sites: HexTopology["sites"] = {};
  const occupied = [
    ...anchors,
    ...Object.keys(state.topology?.sites ?? {})
      .map((key) => parseHexKey(key)!)
      .filter(Boolean),
  ];
  const candidates = keys.flatMap((key) => {
    const hex = parseHexKey(key)!;
    const terrain = state.hexes[key]?.terrain;
    const value = terrain?.kind === "preset" ? siteTerrainScore[terrain.id] : 0;
    if (value <= 0 || occupied.some((other) => hexDistance(hex, other) < 3))
      return [];
    const neighbours = getHexNeighbors(hex);
    const water = neighbours.some((n) => isWater(state, toHexKey(n)));
    const river = neighbours.some((n) => {
      const edge = hexEdgeKey(hex, n);
      return edge && edges[edge]?.river;
    });
    const road = neighbours.some((n) => {
      const edge = hexEdgeKey(hex, n);
      return edge && edges[edge]?.road;
    });
    return [
      {
        key,
        hex,
        score:
          value +
          (water ? 4 : 0) +
          (river ? 3 : 0) +
          (road ? 2 : 0) +
          randomAt(seed, key) * 3,
      },
    ];
  });
  candidates.sort((a, b) => b.score - a.score || keyOrder(a.key, b.key));
  const desired = Math.min(24, Math.round(keys.length * density));
  for (const candidate of candidates) {
    if (Object.keys(sites).length >= desired) break;
    if (occupied.some((other) => hexDistance(candidate.hex, other) < 3))
      continue;
    sites[candidate.key] = {
      kind:
        civilisation === "settled" && candidate.score > 10
          ? "town"
          : civilisation === "wilderness"
            ? "hamlet"
            : "village",
      provenance: { source: "generated", rules: TOPOLOGY_VERSION },
    };
    occupied.push(candidate.hex);
  }
  return sites;
}

/**
 * Heuristic (not hydrodynamics): flow strictly from higher to lower coarse
 * terrain height, until sea, a known river or an unmapped region boundary.
 * Strict descent makes cycles impossible; unsuccessful runs are discarded.
 */
interface RiverContext {
  domain: ReadonlySet<HexKey>;
  state: HexCrawlState;
  seed: number;
  edges: Record<HexEdgeKey, HexEdgeFeature>;
  inBounds: (hex: HexCoord) => boolean;
  provenance: { source: "generated"; seed: string; rules: number };
  downstream: Map<HexKey, HexKey>;
}
function riverHeads(keys: readonly HexKey[], ctx: RiverContext): HexKey[] {
  const thresholds: Record<string, number> = {
    mountains: 0.27,
    hills: 0.11,
    forest: 0.035,
  };
  const incoming = new Set(ctx.downstream.values());
  return keys
    .filter((key) => incoming.has(key) && !ctx.downstream.has(key))
    .concat(
      keys.filter((key) => {
        const terrain = ctx.state.hexes[key]?.terrain;
        return (
          terrain?.kind === "preset" &&
          randomAt(ctx.seed ^ 0x77abc, key) < (thresholds[terrain.id] ?? 0)
        );
      }),
    )
    .sort(keyOrder);
}
function nextRiverHex(
  current: HexKey,
  visited: ReadonlySet<HexKey>,
  ctx: RiverContext,
): HexKey | null {
  const from = parseHexKey(current)!;
  const height = terrainHeight(ctx.state, current, ctx.seed);
  const options = getHexNeighbors(from)
    .map((to) => ({ to, key: toHexKey(to) }))
    .filter(
      (n) =>
        ctx.domain.has(n.key) &&
        !visited.has(n.key) &&
        (isWater(ctx.state, n.key) ||
          terrainHeight(ctx.state, n.key, ctx.seed) < height - 0.001),
    )
    .sort(
      (a, b) =>
        Number(isWater(ctx.state, b.key)) - Number(isWater(ctx.state, a.key)) ||
        terrainHeight(ctx.state, a.key, ctx.seed) -
          terrainHeight(ctx.state, b.key, ctx.seed) ||
        keyOrder(a.key, b.key),
    );
  for (const n of options) {
    const river = ctx.edges[hexEdgeKey(from, n.to)!]?.river;
    if (!river || (river.from === current && river.to === n.key)) return n.key;
  }
  return null;
}
function riverTerminal(key: HexKey, ctx: RiverContext): boolean {
  if (isWater(ctx.state, key) || ctx.downstream.has(key)) return true;
  // A mapped region boundary is a terminal; no one-sided edge is invented.
  return getHexNeighbors(parseHexKey(key)!).some(
    (n) => ctx.inBounds(n) && !ctx.domain.has(toHexKey(n)),
  );
}
function traceRiver(
  start: HexKey,
  limit: number,
  ctx: RiverContext,
): Array<[HexKey, HexKey]> {
  const visited = new Set([start]);
  const path: Array<[HexKey, HexKey]> = [];
  let current = start;
  for (let step = 0; step < limit; step++) {
    const next = nextRiverHex(current, visited, ctx);
    if (!next) break;
    path.push([current, next]);
    visited.add(next);
    current = next;
    if (riverTerminal(current, ctx)) return path.length >= 2 ? path : [];
  }
  return [];
}
function commitRiver(
  path: readonly [HexKey, HexKey][],
  ctx: RiverContext,
): void {
  for (const [from, to] of path) {
    if (ctx.downstream.has(from)) break;
    const edgeKey = hexEdgeKey(parseHexKey(from)!, parseHexKey(to)!)!;
    const prior = ctx.edges[edgeKey] ?? {};
    if (prior.river && (prior.river.from !== from || prior.river.to !== to))
      break;
    ctx.edges[edgeKey] = {
      ...prior,
      river: prior.river ?? { from, to, provenance: ctx.provenance },
    };
    ctx.downstream.set(from, to);
  }
}
function addRivers(
  keys: readonly HexKey[],
  state: HexCrawlState,
  seed: number,
  edges: Record<HexEdgeKey, HexEdgeFeature>,
  inBounds: (hex: HexCoord) => boolean,
  provenance: { source: "generated"; seed: string; rules: number },
): void {
  const downstream = new Map<HexKey, HexKey>();
  for (const edge of Object.values(edges)) {
    if (edge.river) downstream.set(edge.river.from, edge.river.to);
  }
  const ctx: RiverContext = {
    domain: new Set(keys),
    state,
    seed,
    edges,
    inBounds,
    provenance,
    downstream,
  };
  for (const start of riverHeads(keys, ctx)) {
    if (downstream.has(start) || isWater(state, start)) continue;
    commitRiver(traceRiver(start, keys.length, ctx), ctx);
  }
}

const TERRAIN_ROAD_PENALTY: Record<string, number> = {
  mountains: 12,
  swamp: 8,
  hills: 3,
  forest: 2,
  coast: 1.5,
  tundra: 3,
  desert: 4,
  plains: 1,
};

function terrainRoadPenalty(
  terrain: HexCrawlState["hexes"][HexKey]["terrain"],
): number {
  if (!terrain) return Infinity;
  if (terrain.kind !== "preset") return 4;
  if (terrain.id === "water") return Infinity;
  return TERRAIN_ROAD_PENALTY[terrain.id] ?? 2;
}

function stepCost(
  from: HexKey,
  to: HexKey,
  state: HexCrawlState,
  edges: Readonly<Record<HexEdgeKey, HexEdgeFeature>>,
): number {
  const base = terrainRoadPenalty(state.hexes[to]?.terrain);
  if (!Number.isFinite(base)) return Infinity;
  const edge = edges[hexEdgeKey(parseHexKey(from)!, parseHexKey(to)!)!];
  if (edge?.road) return 0.2;
  return base + (edge?.river ? 7 : 0);
}

/** Dijkstra: tiny bounded hex graphs, no new dependency or map-wide pathfinder. */
/** Choose the cheapest queued hex, breaking ties by axial coordinates. */
function cheapestNode(
  queue: ReadonlySet<HexKey>,
  cost: ReadonlyMap<HexKey, number>,
): HexKey | null {
  let best: HexKey | null = null;
  for (const key of queue) {
    if (
      best === null ||
      cost.get(key)! < cost.get(best)! ||
      (cost.get(key) === cost.get(best) && keyOrder(key, best) < 0)
    )
      best = key;
  }
  return best;
}
function relaxRoadNeighbours(
  current: HexKey,
  keys: ReadonlySet<HexKey>,
  state: HexCrawlState,
  edges: Readonly<Record<HexEdgeKey, HexEdgeFeature>>,
  cost: Map<HexKey, number>,
  previous: Map<HexKey, HexKey>,
  queue: Set<HexKey>,
): void {
  for (const n of getHexNeighbors(parseHexKey(current)!)) {
    const nk = toHexKey(n);
    if (!keys.has(nk)) continue;
    const nextCost = cost.get(current)! + stepCost(current, nk, state, edges);
    if (nextCost >= (cost.get(nk) ?? Infinity)) continue;
    cost.set(nk, nextCost);
    previous.set(nk, current);
    queue.add(nk);
  }
}
function backtrackRoad(
  from: HexKey,
  to: HexKey,
  previous: ReadonlyMap<HexKey, HexKey>,
): HexKey[] {
  const path = [to];
  while (path[0] !== from) {
    const prev = previous.get(path[0]);
    if (!prev) return [];
    path.unshift(prev);
  }
  return path;
}
/** Dijkstra over bounded hex graphs, favouring roads and easy terrain. */
function roadPath(
  from: HexKey,
  to: HexKey,
  keys: ReadonlySet<HexKey>,
  state: HexCrawlState,
  edges: Readonly<Record<HexEdgeKey, HexEdgeFeature>>,
): HexKey[] {
  const cost = new Map<HexKey, number>([[from, 0]]);
  const previous = new Map<HexKey, HexKey>();
  const queue = new Set<HexKey>([from]);
  while (queue.size) {
    const current = cheapestNode(queue, cost);
    if (!current) break;
    queue.delete(current);
    if (current === to) break;
    relaxRoadNeighbours(current, keys, state, edges, cost, previous, queue);
  }
  return cost.has(to) ? backtrackRoad(from, to, previous) : [];
}

function collectRoadTargets(
  domain: ReadonlySet<HexKey>,
  state: HexCrawlState,
  settlements: readonly HexCoord[],
  sites: HexTopology["sites"],
): HexKey[] {
  return [
    ...new Set([
      ...settlements.map(toHexKey),
      ...Object.keys(state.topology?.sites ?? {}),
      ...Object.keys(sites),
    ]),
  ]
    .filter((key) => domain.has(key) && !isWater(state, key))
    .sort(keyOrder);
}

function applyRoadPath(
  path: readonly HexKey[],
  civilisation: CivilisationLevel,
  edges: Record<HexEdgeKey, HexEdgeFeature>,
  provenance: { source: "generated"; seed: string; rules: number },
): void {
  const roadKind = civilisation === "settled" ? "road" : "path";
  const crossingKind = civilisation === "settled" ? "bridge" : "ford";
  for (let i = 1; i < path.length; i++) {
    const edgeKey = hexEdgeKey(
      parseHexKey(path[i - 1])!,
      parseHexKey(path[i])!,
    )!;
    const edge = edges[edgeKey] ?? {};
    const next: HexEdgeFeature = {
      ...edge,
      road: edge.road ?? { kind: roadKind, provenance },
    };
    if (edge.river && !edge.crossing) next.crossing = crossingKind;
    edges[edgeKey] = next;
  }
}

function addRoads(
  keys: readonly HexKey[],
  state: HexCrawlState,
  settlements: readonly HexCoord[],
  sites: HexTopology["sites"],
  civilisation: CivilisationLevel,
  edges: Record<HexEdgeKey, HexEdgeFeature>,
  provenance: { source: "generated"; seed: string; rules: number },
): void {
  const domain = new Set(keys);
  const targets = collectRoadTargets(domain, state, settlements, sites);
  if (targets.length < 2) return;
  const connected = new Set<HexKey>([targets.shift()!]);
  for (const target of targets) {
    const targetCoord = parseHexKey(target)!;
    const nearest = [...connected].sort(
      (a, b) =>
        hexDistance(parseHexKey(a)!, targetCoord) -
          hexDistance(parseHexKey(b)!, targetCoord) || keyOrder(a, b),
    )[0];
    const path = roadPath(target, nearest, domain, state, edges);
    applyRoadPath(path, civilisation, edges, provenance);
    if (path.length) connected.add(target);
  }
}

function isValidGeographyRequest(
  request: GeographyRequest,
  inBounds: (hex: HexCoord) => boolean,
): boolean {
  return (
    Number.isInteger(request.radius) &&
    request.radius >= 1 &&
    request.radius <= GEOGRAPHY_MAX_RADIUS &&
    inBounds(request.centre) &&
    Boolean(request.seed.trim())
  );
}

function addCoastEdges(
  keys: readonly HexKey[],
  domain: ReadonlySet<HexKey>,
  state: HexCrawlState,
  working: Record<HexEdgeKey, HexEdgeFeature>,
): void {
  // A coast is always the border of a land hex and a known water hex.
  for (const key of keys) {
    const a = parseHexKey(key)!;
    for (const b of getHexNeighbors(a)) {
      const nk = toHexKey(b);
      if (!domain.has(nk) || isWater(state, key) === isWater(state, nk))
        continue;
      const edgeKey = hexEdgeKey(a, b)!;
      working[edgeKey] = { ...working[edgeKey], coast: true };
    }
  }
}

function diffEdges(
  existing: Readonly<Record<HexEdgeKey, HexEdgeFeature>>,
  working: Readonly<Record<HexEdgeKey, HexEdgeFeature>>,
): GeographyProposal["edges"] {
  const edges: GeographyProposal["edges"] = {};
  for (const [key, value] of Object.entries(working)) {
    const before = existing[key] ?? {};
    const additions: HexEdgeFeature = {};
    for (const kind of ["river", "road", "crossing", "coast"] as const) {
      if (
        value[kind] !== undefined &&
        JSON.stringify(value[kind]) !== JSON.stringify(before[kind])
      ) {
        Object.assign(additions, { [kind]: value[kind] });
      }
    }
    if (Object.keys(additions).length) edges[key] = additions;
  }
  return edges;
}

/** Pure, deterministic proposal: never mutates established terrain, roads, pins or Vault entities. */
export function generateHexGeography(
  input: GeographyInput,
): GeographyProposal | null {
  const { request, state, settlements, inBounds } = input;
  if (!isValidGeographyRequest(request, inBounds)) return null;
  const inRangeKeys = getHexRange(request.centre, request.radius)
    .filter(inBounds)
    .map(toHexKey)
    .sort(keyOrder);
  const keys = inRangeKeys.filter((key) => state.hexes[key]?.terrain);
  if (!keys.length) return null;
  const seed = hashSeed(request.seed);
  const provenance = {
    source: "generated" as const,
    seed: request.seed,
    rules: TOPOLOGY_VERSION,
  };
  const existing = state.topology?.edges ?? {};
  const working: Record<HexEdgeKey, HexEdgeFeature> = structuredClone(existing);
  const domain = new Set(keys);

  addCoastEdges(keys, domain, state, working);
  addRivers(keys, state, seed, working, inBounds, provenance);
  const sites = planSettlements(
    keys,
    state,
    seed,
    request.civilisation,
    settlements,
    working,
  );
  for (const site of Object.values(sites)) site.provenance = provenance;
  addRoads(
    keys,
    state,
    settlements,
    sites,
    request.civilisation,
    working,
    provenance,
  );
  const terrainStamps = Object.fromEntries(
    inRangeKeys.map((key) => [
      key,
      JSON.stringify({
        terrain: state.hexes[key]?.terrain ?? null,
        updatedAt: state.hexes[key]?.updatedAt ?? 0,
      }),
    ]),
  );
  return {
    request,
    edges: diffEdges(existing, working),
    sites,
    terrainStamps,
    topologyStamp: JSON.stringify(state.topology ?? null),
  };
}

function hasStaleSources(
  state: HexCrawlState,
  proposal: GeographyProposal,
): boolean {
  if (JSON.stringify(state.topology ?? null) !== proposal.topologyStamp)
    return true;
  return Object.entries(proposal.terrainStamps).some(
    ([key, stamp]) =>
      JSON.stringify({
        terrain: state.hexes[key]?.terrain ?? null,
        updatedAt: state.hexes[key]?.updatedAt ?? 0,
      }) !== stamp,
  );
}

function shouldApplyEdgeFeature(
  key: HexEdgeKey,
  kind: "river" | "road" | "coast",
  candidate:
    HexEdgeFeature["river"] | HexEdgeFeature["road"] | boolean | undefined,
  existing:
    HexEdgeFeature["river"] | HexEdgeFeature["road"] | boolean | undefined,
  disabled: ReadonlySet<HexEdgeFeatureKey>,
): boolean {
  return (
    candidate !== undefined &&
    JSON.stringify(candidate) !== JSON.stringify(existing) &&
    !disabled.has(hexEdgeFeatureKey(key, kind))
  );
}

function addProposedCrossing(
  feature: HexEdgeFeature,
  current: HexEdgeFeature,
  accepted: HexEdgeFeature,
): void {
  if (
    feature.crossing &&
    !current.crossing &&
    accepted.river &&
    accepted.road
  ) {
    accepted.crossing = feature.crossing;
  }
}

function hasEdgeConnection(edge: HexEdgeFeature): boolean {
  return Boolean(edge.river || edge.road || edge.coast);
}

function applyEdgeProposal(
  key: HexEdgeKey,
  feature: HexEdgeFeature,
  existing: HexEdgeFeature | undefined,
  disabled: ReadonlySet<HexEdgeFeatureKey>,
): HexEdgeFeature | null {
  if (!parseHexEdgeKey(key)) return null;
  const current = existing ?? {};
  const accepted: HexEdgeFeature = { ...current };
  for (const kind of ["river", "road", "coast"] as const) {
    const candidate = feature[kind];
    if (shouldApplyEdgeFeature(key, kind, candidate, current[kind], disabled)) {
      Object.assign(accepted, { [kind]: candidate });
    }
  }
  addProposedCrossing(feature, current, accepted);
  return hasEdgeConnection(accepted) ? accepted : null;
}

/**
 * Apply only accepted suggestions. A changed source rejects the entire write,
 * so no river can lose its other endpoint to a stale partial commit.
 * Accepted sites remain proposals in map data, never minted as Vault entities.
 */
export function applyHexGeography(
  state: HexCrawlState,
  proposal: GeographyProposal,
  disabledEdgeFeatures: ReadonlySet<HexEdgeFeatureKey>,
  disabledSites: ReadonlySet<HexKey>,
): HexCrawlState | null {
  if (hasStaleSources(state, proposal)) return null;
  const edges = { ...(state.topology?.edges ?? {}) };
  const sites = { ...(state.topology?.sites ?? {}) };
  for (const [key, feature] of Object.entries(proposal.edges)) {
    const accepted = applyEdgeProposal(
      key,
      feature,
      edges[key],
      disabledEdgeFeatures,
    );
    if (accepted) edges[key] = accepted;
  }
  for (const [key, site] of Object.entries(proposal.sites)) {
    if (!disabledSites.has(key) && !sites[key] && state.hexes[key]?.terrain)
      sites[key] = site;
  }
  return { ...state, topology: { version: TOPOLOGY_VERSION, edges, sites } };
}
