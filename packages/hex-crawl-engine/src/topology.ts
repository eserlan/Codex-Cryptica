import { z } from "zod";
import { parseHexKey, toHexKey, type HexCoord, type HexKey } from "./model";

/**
 * Store a shared border exactly once. The stable key is sorted by coordinates,
 * not by the order of traversal. A connection can carry a river and a road.
 */
export type HexEdgeKey = string;
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

/** Malformed edge keys, non-adjacent endpoints and one-sided river directions disappear. */
export function normalizeHexTopology(raw: unknown): HexTopology | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const input = raw as Record<string, unknown>;
  if (input.version !== TOPOLOGY_VERSION) return undefined;
  const edges: HexTopology["edges"] = {};
  if (
    input.edges &&
    typeof input.edges === "object" &&
    !Array.isArray(input.edges)
  ) {
    for (const [key, value] of Object.entries(input.edges)) {
      const pair = parseHexEdgeKey(key);
      const parsed = HexEdgeFeatureSchema.safeParse(value);
      if (!pair || !parsed.success) continue;
      const edge = parsed.data;
      const [a, b] = pair.map(toHexKey);
      if (
        edge.river &&
        !(
          (edge.river.from === a && edge.river.to === b) ||
          (edge.river.from === b && edge.river.to === a)
        )
      )
        continue;
      if (!edge.river && !edge.road && !edge.coast) continue;
      // Crossings are meaningful only with a road and a river.
      if (!edge.road || !edge.river) delete edge.crossing;
      edges[key] = edge;
    }
  }
  const sites: HexTopology["sites"] = {};
  if (
    input.sites &&
    typeof input.sites === "object" &&
    !Array.isArray(input.sites)
  ) {
    for (const [key, value] of Object.entries(input.sites)) {
      if (!parseHexKey(key)) continue;
      const parsed = SiteSchema.safeParse(value);
      if (parsed.success) sites[key] = parsed.data;
    }
  }
  return { version: TOPOLOGY_VERSION, edges, sites };
}
