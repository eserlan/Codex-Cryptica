import { pointToHex, type HexCoord, type HexGridConfig } from "map-engine";
import type { Token } from "../../../types/vtt";
import type { HexCrawlStore } from "./hex-crawl.svelte";

export interface HexCrawlMoveObserverDeps {
  store: Pick<HexCrawlStore, "recordFor" | "setExplored">;
  getActiveMapId: () => string | null;
  /** The active map's hex grid config, or null when the grid is not a hex grid. */
  getHexConfig: () => HexGridConfig | null;
  isHexCrawlOn: (mapId: string) => boolean;
  isGM: () => boolean;
  isSolo: () => boolean;
  /** Invited by a newly explored hex in solo play. Never starts discovery (FR-036). */
  offerExplore: (mapId: string, hex: HexCoord) => void;
}

/**
 * Marks hexes explored when the party's vision sources settle (FR-013, FR-035).
 * Only the end hex of a move counts, and only vision-source tokens (the party)
 * are considered. The observer never generates anything itself.
 */
export class HexCrawlMoveObserver {
  constructor(private readonly deps: HexCrawlMoveObserverDeps) {}

  async onMoveSettled(tokens: readonly Token[]): Promise<void> {
    const mapId = this.deps.getActiveMapId();
    const config = this.deps.getHexConfig();
    if (!mapId || !config || !this.canObserve(mapId)) return;

    for (const hex of endHexesOf(tokens, config)) {
      if (this.deps.store.recordFor(mapId, hex)?.explored) continue;
      const { newlyExplored } = await this.deps.store.setExplored(
        mapId,
        hex,
        true,
        "party",
      );
      if (newlyExplored && this.deps.isSolo())
        this.deps.offerExplore(mapId, hex);
    }
  }

  /** Only the GM, on a map with hex crawl switched on, is observed. */
  private canObserve(mapId: string): boolean {
    return this.deps.isGM() && this.deps.isHexCrawlOn(mapId);
  }
}

/** The end hex of each vision-source token, de-duplicated (only where a move ends counts). */
function endHexesOf(
  tokens: readonly Token[],
  config: HexGridConfig,
): HexCoord[] {
  const unique = new Map<string, HexCoord>();
  for (const token of tokens) {
    if (token.isVisionSource !== true) continue;
    const hex = pointToHex({ x: token.x, y: token.y }, config);
    unique.set(`${hex.q},${hex.r}`, hex);
  }
  return [...unique.values()];
}
