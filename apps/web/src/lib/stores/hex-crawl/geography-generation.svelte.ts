import {
  applyHexGeography,
  generateHexGeography,
  normalizeSeed,
  type CivilisationLevel,
  type GeographyProposal,
  type HexCoord,
  type HexEdgeKey,
  type HexKey,
  type HexCrawlState,
} from "hex-crawl-engine";
import type { RegionHexes } from "./region-generation.svelte";

export interface GeographyDeps {
  hexes: RegionHexes;
  settlements: (mapId: string) => HexCoord[];
  inBounds: (mapId: string, hex: HexCoord) => boolean;
  newSeed: () => string;
  canEdit: () => boolean;
}

export interface GeographyReview {
  mapId: string;
  proposal: GeographyProposal;
  disabledEdges: Set<HexEdgeKey>;
  disabledSites: Set<HexKey>;
}

export class GeographyGenerationStore {
  review = $state<GeographyReview | null>(null);
  message = $state<"saved" | "failed" | "stale" | "empty" | null>(null);
  mapId = $state<string | null>(null);
  busy = $state(false);

  constructor(private readonly deps: GeographyDeps) {}

  open(mapId: string, centre: HexCoord, radius = 6): boolean {
    if (this.busy || !this.deps.canEdit()) return false;
    this.mapId = mapId;
    return this.build(mapId, {
      centre,
      radius,
      seed: this.deps.newSeed(),
      civilisation: "frontier",
    });
  }

  private build(mapId: string, request: GeographyProposal["request"]): boolean {
    const proposal = generateHexGeography({
      request,
      state: this.deps.hexes.stateFor(mapId),
      settlements: this.deps.settlements(mapId),
      inBounds: (hex) => this.deps.inBounds(mapId, hex),
    });
    if (!proposal) {
      this.message = "empty";
      return false;
    }
    this.message = null;
    this.review = {
      mapId,
      proposal,
      disabledEdges: new Set(),
      disabledSites: new Set(),
    };
    return true;
  }

  private rebuild(patch: Partial<GeographyProposal["request"]>): boolean {
    const current = this.review;
    return current && !this.busy
      ? this.build(current.mapId, { ...current.proposal.request, ...patch })
      : false;
  }

  setRad...[truncated]