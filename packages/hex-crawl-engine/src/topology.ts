import { z } from "zod";
import type { HexCoord, HexKey } from "./model";

const HEX_COORD_PATTERN = /^(-?\d+),(-?\d+)$/;
const toHexKey = (hex: HexCoord): HexKey => `${hex.q},${hex.r}`;
function parseHexKey(key: string): HexCoord | null {
  const match = HEX_COORD_PATTERN.exec(key);
  return match ? { q: Number(match[1]), r: Number(match[2]) } : null;
}

/**
 * Store a shared border exactly once. The stable key is sorted by coordinates,
 * not by the order of traversal. A connection can carry a river and a road.
 */
export type HexEdgeKey = string;
export type HexEdgeFeatureKind = "river" | "road" | "coast";
export type HexEdgeFeatureKey = string;
export const hexEdgeFeatureKey = (
  edge: HexEdgeKey,
  feature: HexEdgeFeatureKind,
): HexEdgeFeatureKey => `${edge}#${feature}`;
export const TOPOLOGY_VERSION = 1 as const;
export type CivilisationLevel = "wilderness" | "frontier" | "settled";
export type FeatureOrigin = "manual" | "generated";

export interface FeatureProvenance {
  source: FeatureOrigin;
  seed?: string;
  rules?: number;
}

export interface HexEdgeFeature {
  river?: { from: HexKey; to: HexKey; provenance: FeatureProvenance };
  road?: { kind: "road" | "path"; provenance: FeatureProvenance };
  crossing?: "ford" | "bridge";
  coast?: boolean;
}

export interface SettlementSite {
  provenance: FeatureProvenance;
  kind: "hamlet" | "village" | "town";
}

export interface HexTopology {
  version: typeof TOPOLOGY_VERSION;
  edges: Record<HexEdgeKey, HexEdgeFeature>;
  sites: Record<HexKey, SettlementSite>;
}

const ProvenanceSchema = z.object({
  source: z.enum(["manual", "generated"]),
  seed: z.string().max(32).optional(),
  rules: z.number().int().positive().optional(),
});
const HexEdgeFeatureSchema = z.object({
  river: z
    .object({
      from: z.string(),
      to: z.string(),
      provenance: ProvenanceSchema,
    })
    .optional(),
  road: z
    .object({
      kind: z.enum(["road", "path"]),
      provenance: ProvenanceSchema,
    })
    .optional(),
  crossing: z.enum(["ford", "bridge"]).optional(),
  coast: z.boolean().optional(),
});
const SiteSchema = z.object({
  provenance: ProvenanceSchema,
  kind: z.enum(["hamlet", "village", "town"]),
});

export function adjacent(a: HexCoord, b: HexCoord): boolean {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  return Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr)) === 1;
}

export function hexEdgeKey(a: HexCoord, b: HexCoord): HexEdgeKey | null {
  if (!adjacent(a, b)) return null;
  const ak = toHexKey(a);
  const bk = toHexKey(b);
  return ak < bk ? `${ak}|${bk}` : `${bk}|${ak}`;
}

export function parseHexEdgeKey(key: HexEdgeKey): [HexCoord, HexCoord] | null {
  const parts = key.split("|");
  if (parts.length !== 2) return null;
  const a = parseHexKey(parts[0]);
  const b = parseHexKey(parts[1]);
  return a && b && hexEdgeKey(a, b) === key ? [a, b] : null;
}

function hasValidRiverFlow(
  river: HexEdgeFeature["river"],
  pair: [HexCoord, HexCoord],
): boolean {
  if (!river) return true;
  const [a, b] = pair.map(toHexKey);
  return (
    (river.from === a && river.to === b) || (river.from === b && river.to === a)
  );
}

function validEdge(key: string, raw: unknown): HexEdgeFeature | null {
  const pair = parseHexEdgeKey(key);
  if (!pair) return null;
  const parsed = HexEdgeFeatureSchema.safeParse(raw);
  if (!parsed.success) return null;
  const edge = parsed.data;
  if (!edge.river && !edge.road && !edge.coast) return null;
  if (!hasValidRiverFlow(edge.river, pair)) return null;
  if (!edge.road || !edge.river) delete edge.crossing;
  return edge;
}
function normalizeEdges(raw: unknown): HexTopology["edges"] {
  const edges: HexTopology["edges"] = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return edges;
  for (const [key, value] of Object.entries(raw)) {
    const edge = validEdge(key, value);
    if (edge) edges[key] = edge;
  }
  return edges;
}
function normalizeSites(raw: unknown): HexTopology["sites"] {
  const sites: HexTopology["sites"] = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return sites;
  for (const [key, value] of Object.entries(raw)) {
    if (!parseHexKey(key)) continue;
    const parsed = SiteSchema.safeParse(value);
    if (parsed.success) sites[key] = parsed.data;
  }
  return sites;
}
/** Malformed edge keys, non-adjacent endpoints and mismatched river directions disappear. */
export function normalizeHexTopology(raw: unknown): HexTopology | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const input = raw as Record<string, unknown>;
  if (input.version !== TOPOLOGY_VERSION) return undefined;
  return {
    version: TOPOLOGY_VERSION,
    edges: normalizeEdges(input.edges),
    sites: normalizeSites(input.sites),
  };
}
