import {
  applyHexGeography,
  generateHexGeography,
  GEOGRAPHY_MAX_RADIUS,
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

  setRadius(radius: number): boolean {
    if (!Number.isFinite(radius)) return false;
    const clamped = Math.max(
      1,
      Math.min(GEOGRAPHY_MAX_RADIUS, Math.round(radius)),
    );
    return this.rebuild({ radius: clamped });
  }
  setCivilisation(civilisation: CivilisationLevel): boolean {
    return this.rebuild({ civilisation });
  }
  setSeed(value: string): boolean {
    const seed = normalizeSeed(value);
    return seed ? this.rebuild({ seed }) : false;
  }
  reroll(): boolean {
    return this.rebuild({ seed: this.deps.newSeed() });
  }

  toggleEdge(key: HexEdgeKey): void {
    if (!this.review || this.busy || !(key in this.review.proposal.edges))
      return;
    const disabled = new Set(this.review.disabledEdges);
    if (disabled.has(key)) disabled.delete(key);
    else disabled.add(key);
    this.review.disabledEdges = disabled;
  }
  toggleSite(key: HexKey): void {
    if (!this.review || this.busy || !(key in this.review.proposal.sites))
      return;
    const disabled = new Set(this.review.disabledSites);
    if (disabled.has(key)) disabled.delete(key);
    else disabled.add(key);
    this.review.disabledSites = disabled;
  }

  async accept(): Promise<boolean> {
    const review = this.review;
    if (!review || this.busy || !this.deps.canEdit()) return false;
    this.busy = true;
    let stale = false;
    try {
      const written = await this.deps.hexes.applyChange(
        review.mapId,
        (state: HexCrawlState) => {
          const result = applyHexGeography(
            state,
            review.proposal,
            review.disabledEdges,
            review.disabledSites,
          );
          if (!result) {
            stale = true;
            return state;
          }
          return result;
        },
      );
      if (!written || stale) {
        this.message = stale ? "stale" : "failed";
        return false;
      }
      this.review = null;
      this.message = "saved";
      return true;
    } catch {
      this.message = "failed";
      return false;
    } finally {
      this.busy = false;
    }
  }

  cancel(): void {
    if (this.busy) return;
    this.review = null;
  }
  leave(): void {
    this.review = null;
    this.message = null;
    this.mapId = null;
  }
}
