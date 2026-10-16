import {
  getHexRecord,
  normalizeHexCrawlState,
  terrainLabel,
  upsertHexRecord,
  type HexCoord,
  type HexCrawlState,
  type HexDiscoveryDraft,
  type HexRecord,
  type Terrain,
} from "hex-crawl-engine";
import {
  formatHexExplored,
  type JournalCapturePayload,
} from "session-journal-engine";
import type { Map as MapRecord } from "schema";

/** Who marked a hex explored: a party move or the GM by hand (FR-019). */
export type ExploredVia = "gm" | "party";

/**
 * Dependencies for the hex crawl store, injected so tests need no vault or
 * browser (Constitution VIII).
 */
export interface HexCrawlStoreDeps {
  getMap: (mapId: string) => MapRecord | undefined;
  saveMaps: () => Promise<boolean>;
  clock: { now: () => number };
  publishCapture: (payload: JournalCapturePayload) => void;
  isGM: () => boolean;
  isGuest: () => boolean;
  /** Label for a hex in the journal, e.g. "B03". Defaults to "q,r". */
  formatHex?: (mapId: string, hex: HexCoord) => string;
}

export interface SelectedHex {
  mapId: string;
  hex: HexCoord;
}

/**
 * Reads and writes hex crawl data on maps. Writes are GM-only and never happen
 * in guest vaults. Every write goes through the engine's upsert, so empty
 * records are pruned (FR-011) and the input is never mutated.
 */
export class HexCrawlStore {
  selectedHex = $state<SelectedHex | null>(null);
  private opener: HTMLElement | null = null;

  constructor(private readonly deps: HexCrawlStoreDeps) {}

  private stateFor(mapId: string): HexCrawlState {
    return normalizeHexCrawlState(this.deps.getMap(mapId)?.hexCrawl);
  }

  isEnabled(mapId: string): boolean {
    return this.stateFor(mapId).enabled;
  }

  recordFor(mapId: string, hex: HexCoord): HexRecord | undefined {
    return getHexRecord(this.stateFor(mapId), hex);
  }

  /**
   * Mark a hex explored or unexplored (FR-016, FR-017). Publishes one journal
   * capture when a hex goes from not explored to explored, whichever side
   * made the move, and nothing otherwise (FR-019). `via` is kept for the solo
   * offer, which only party moves trigger.
   */
  async setExplored(
    mapId: string,
    hex: HexCoord,
    explored: boolean,
    _via: ExploredVia,
  ): Promise<{ newlyExplored: boolean }> {
    const wasExplored = this.recordFor(mapId, hex)?.explored === true;
    const written = await this.patchHex(mapId, hex, { explored });
    const newlyExplored = written && explored && !wasExplored;
    if (newlyExplored) {
      const terrain = this.recordFor(mapId, hex)?.terrain;
      this.deps.publishCapture(
        formatHexExplored({
          mapId,
          hex,
          hexLabel: this.deps.formatHex?.(mapId, hex) ?? `${hex.q},${hex.r}`,
          terrainLabel: terrain ? terrainLabel(terrain) : null,
        }),
      );
    }
    return { newlyExplored };
  }

  private canWrite(): boolean {
    return this.deps.isGM() && !this.deps.isGuest();
  }

  /** Apply one change to the map's hex state and save. Returns false if nothing was written. */
  private async commit(
    mapId: string,
    change: (state: HexCrawlState) => HexCrawlState,
  ): Promise<boolean> {
    if (!this.canWrite()) return false;
    const map = this.deps.getMap(mapId);
    if (!map) return false;
    map.hexCrawl = change(this.stateFor(mapId));
    await this.deps.saveMaps();
    return true;
  }

  private patchHex(
    mapId: string,
    hex: HexCoord,
    patch: Partial<HexRecord>,
  ): Promise<boolean> {
    return this.commit(mapId, (state) =>
      upsertHexRecord(state, hex, patch, this.deps.clock.now()),
    );
  }

  setEnabled(mapId: string, enabled: boolean): Promise<boolean> {
    return this.commit(mapId, (state) => ({ ...state, enabled }));
  }

  setTerrain(
    mapId: string,
    hex: HexCoord,
    terrain: Terrain | null,
  ): Promise<boolean> {
    return this.patchHex(mapId, hex, { terrain: terrain ?? undefined });
  }

  setNotes(mapId: string, hex: HexCoord, notes: string): Promise<boolean> {
    return this.patchHex(mapId, hex, { notes });
  }

  setAiNotes(mapId: string, hex: HexCoord, aiNotes: string): Promise<boolean> {
    return this.patchHex(mapId, hex, { aiNotes });
  }

  /** Apply several fields to one hex in a single save (used by discovery saves). */
  updateHex(
    mapId: string,
    hex: HexCoord,
    patch: Partial<HexRecord>,
  ): Promise<boolean> {
    return this.patchHex(mapId, hex, patch);
  }

  setDraft(
    mapId: string,
    hex: HexCoord,
    draft: HexDiscoveryDraft | null,
  ): Promise<boolean> {
    return this.patchHex(mapId, hex, { draft: draft ?? undefined });
  }

  /** Open the panel for a hex. The opener is remembered so focus can return to it (FR-003c). */
  openHex(mapId: string, hex: HexCoord, opener?: HTMLElement): void {
    this.opener = opener ?? null;
    this.selectedHex = { mapId, hex };
  }

  closeHex(): void {
    this.selectedHex = null;
    const opener = this.opener;
    this.opener = null;
    opener?.focus?.();
  }
}
