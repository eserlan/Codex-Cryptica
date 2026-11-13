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
  if (!adjacent...[truncated]