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
  parseHexEdgeKey,
  TOPOLOGY_VERSION,
  type CivilisationLevel,
  type HexEdgeFeature,
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
  terrainStamps: Record<HexKey, number>;
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
function addRivers(
  keys: readonly HexKey[],
  state: HexCrawlState,
  seed: number,
  edges: Record<HexEdgeKey, HexEdgeFeature>,
  inBounds: (hex: HexCoord) => boolean,
  provenance: { source: "generated"; seed: string; rules: number },
): void {
  const domain = new Set(keys);
  const downstream = new Map<HexKey, HexKey>();
  const hasIncoming = new Set<HexKey>();
  for (const edge of Object.values(edges)) {
    if (!edge.river) continue;
    downstream.set(edge.river.from, edge.river.to);
    hasIncoming.add(edge.river.to);
  }
  const endpoints = keys.filter(
    (key) => hasIncoming.has(key) && !downstream.has(key),
  );
  const heads = keys.filter((key) => {
    const terrain = state.hexes[key]?.terrain;
    return (
      terrain?.kind === "preset" &&
      (terrain.id === "mountains" ||
        terrain.id === "hills" ||
        terrain.id === "forest") &&
      randomAt(seed ^ 0x77abc, key) <
        (terrain.id === "mountains"
          ? 0.27
          : terrain.id === "hills"
            ? 0.11
            : 0.035)
    );
  });
  for (const start of [...endpoints, ...heads].sort(keyOrder)) {
    if (downstream.has(start) || isWater(state, start)) continue;
    const visited = new Set<HexKey>([start]);
    const path: Array<[HexKey, HexKey]> = [];
    let current = start;
    let success = false;
    for (let step = 0; step < keys.length; step++) {
      const from = parseHexKey(current)!;
      const height = terrainHeight(state, current, seed);
      const options = getHexNeighbors(from)
        .map((to) => ({
          to,
          key: toHexKey(to),
        }))
        .filter(
          (n) =>
            domain.has(n.key) &&
            !visited.has(n.key) &&
            (isWater(state, n.key) ||
              terrainHeight(state, n.key, seed) < height - 0.001),
        );
      options.sort(
        (a, b) =>
          Number(isWater(state, b.key)) - Number(isWater(state, a.key)) ||
          terrainHeight(state, a.key, seed) -
            terrainHeight(state, b.key, seed) ||
          keyOrder(a.key, b.key),
      );
      const next = options.find((n) => {
        const edgeKey = hexEdgeKey(from, n.to)!;
        const river = edges[edgeKey]?.river;
        return !river || (river.from === current && river.to === n.key);
      });
      if (!next) break;
      path.push([current, next.key]);
      visited.add(next.key);
      current = next.key;
      const at = parseHexKey(current)!;
      // A mapped boundary is an explicit terminal; never invent a one-sided edge.
      const atBoundary = getHexNeighbors(at).some(
        (n) => inBounds(n) && !domain.has(toHexKey(n)),
      );
      if (isWater(state, current) || downstream.has(current) || atBoundary) {
        success = true;
        break;
      }
    }
    if (!success || path.length < 2) continue;
    for (const [from, to] of path) {
      if (downstream.has(from)) break;
      const edgeKey = hexEdgeKey(parseHexKey(from)!, parseHexKey(to)!)!;
      const prior = edges[edgeKey] ?? {};
      if (prior.river && (prior.river.from !== from || prior.river.to !== to))
        break;
      edges[edgeKey] = {
        ...prior,
        river: prior.river ?? { from, to, provenance },
      };
      downstream.set(from, to);
      hasIncoming.add(to);
    }
  }
}

function stepCost(
  from: HexKey,
  to: HexKey,
  state: HexCrawlState,
  edges: Readonly<Record<HexEdgeKey, HexEdgeFeature>>,
): number {
  const terrain = state.hexes[to]?.terrain;
  if (!terrain || (terrain.kind === "preset" && terrain.id === "water"))
    return Infinity;
  const penalty: Record<string, number> = {
    mountains: 12,
    swamp: 8,
    hills: 3,
    forest: 2,
    coast: 1.5,
    tundra: 3,
    desert: 4,
    plains: 1,
  };
  const edge = edges[hexEdgeKey(parseHexKey(from)!, parseHexKey(to)!)!];
  if (edge?.road) return 0.2;
  return (
    (terrain.kind === "preset" ? (penalty[terrain.id] ?? 2) : 4) +
    (edge?.river ? 7 : 0)
  );
}

/** Dijkstra: tiny bounded hex graphs, no new dependency or map-wide pathfinder. */
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
    let current: HexKey | null = null;
    for (const k of queue) {
      if (
        current === null ||
        cost.get(k)! < cost.get(current)! ||
        (cost.get(k) === cost.get(current) && keyOrder(k, current) < 0)
      )
        current = k;
    }
    if (!current) break;
    queue.delete(current);
    if (current === to) break;
    for (const neighbour of getHexNeighbors(parseHexKey(current)!)) {
      const nk = toHexKey(neighbour);
      if (!keys.has(nk)) continue;
      const costNext = cost.get(current)! + stepCost(current, nk, state, edges);
      if (costNext >= (cost.get(nk) ?? Infinity)) continue;
      cost.set(nk, costNext);
      previous.set(nk, current);
      queue.add(nk);
    }
  }
  if (!cost.has(to)) return [];
  const path = [to];
  while (path[0] !== from) {
    const prev = previous.get(path[0]);
    if (!prev) return [];
    path.unshift(prev);
  }
  return path;
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
  const targets = [
    ...new Set([
      ...settlements.map(toHexKey),
      ...Object.keys(state.topology?.sites ?? {}),
      ...Object.keys(sites),
    ]),
  ]
    .filter((key) => domain.has(key) && !isWater(state, key))
    .sort(keyOrder);
  if (targets.length < 2) return;
  const connected = new Set<HexKey>([targets.shift()!]);
  for (const target of targets) {
    const nearest = [...connected].sort(
      (a, b) =>
        hexDistance(parseHexKey(a)!, parseHexKey(target)!) -
          hexDistance(parseHexKey(b)!, parseHexKey(target)!) || keyOrder(a, b),
    )[0];
    const path = roadPath(target, nearest, domain, state, edges);
    for (let i = 1; i < path.length; i++) {
      const from = path[i - 1];
      const to = path[i];
      const edgeKey = hexEdgeKey(parseHexKey(from)!, parseHexKey(to)!)!;
      const edge = edges[edgeKey] ?? {};
      const road = edge.road ?? {
        kind:
          civilisation === "settled" ? ("road" as const) : ("path" as const),
        provenance,
      };
      edges[edgeKey] = {
        ...edge,
        road,
        ...(edge.river
          ? {
              crossing:
                edge.crossing ??
                (civilisation === "settled"
                  ? ("bridge" as const)
                  : ("ford" as const)),
            }
          : {}),
      };
    }
    if (path.length) connected.add(target);
  }
}

/** Pure, deterministic proposal: never mutates established terrain, roads, pins or Vault entities. */
export function generateHexGeography(
  input: GeographyInput,
): GeographyProposal | null {
  const { request, state, settlements, inBounds } = input;
  if (
    !Number.isInteger(request.radius) ||
    request.radius < 1 ||
    request.radius > GEOGRAPHY_MAX_RADIUS ||
    !inBounds(request.centre) ||
    !request.seed.trim()
  )
    return null;
  const keys = getHexRange(request.centre, request.radius)
    .filter(inBounds)
    .map(toHexKey)
    .filter((key) => state.hexes[key]?.terrain)
    .sort(keyOrder);
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
  const edges: GeographyProposal["edges"] = {};
  for (const [key, value] of Object.entries(working)) {
    if (JSON.stringify(value) !== JSON.stringify(existing[key]))
      edges[key] = value;
  }
  const terrainStamps = Object.fromEntries(
    keys.map((key) => [key, state.hexes[key]?.updatedAt ?? 0]),
  );
  return {
    request,
    edges,
    sites,
    terrainStamps,
    topologyStamp: JSON.stringify(state.topology ?? null),
  };
}

/**
 * Apply only accepted suggestions. A changed source rejects the entire write,
 * so no river can lose its other endpoint to a stale partial commit.
 * Accepted sites remain proposals in map data, never minted as Vault entities.
 */
export function applyHexGeography(
  state: HexCrawlState,
  proposal: GeographyProposal,
  disabledEdges: ReadonlySet<HexEdgeKey>,
  disabledSites: ReadonlySet<HexKey>,
): HexCrawlState | null {
  if (JSON.stringify(state.topology ?? null) !== proposal.topologyStamp)
    return null;
  for (const [key, stamp] of Object.entries(proposal.terrainStamps)) {
    if ((state.hexes[key]?.updatedAt ?? 0) !== stamp) return null;
  }
  const edges = { ...(state.topology?.edges ?? {}) };
  const sites = { ...(state.topology?.sites ?? {}) };
  for (const [key, feature] of Object.entries(proposal.edges)) {
    if (!disabledEdges.has(key) && parseHexEdgeKey(key)) edges[key] = feature;
  }
  for (const [key, site] of Object.entries(proposal.sites)) {
    if (!disabledSites.has(key) && !sites[key] && state.hexes[key]?.terrain)
      sites[key] = site;
  }
  return { ...state, topology: { version: TOPOLOGY_VERSION, edges, sites } };
}
