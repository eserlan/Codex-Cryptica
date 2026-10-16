import {
  getHexRecord,
  normalizeHexCrawlState,
  upsertHexRecord,
  type HexCoord,
  type HexCrawlState,
  type HexDiscoveryDraft,
  type HexRecord,
  type Terrain,
} from "hex-crawl-engine";
import type { Map as MapRecord } from "schema";

/**
 * Dependencies for the hex crawl store, injected so tests need no vault or
 * browser (Constitution VIII).
 */
export interface HexCrawlStoreDeps {
  getMap: (mapId: string) => MapRecord | undefined;
  saveMaps: () => Promise<boolean>;
  clock: { now: () => number };
  publishCapture: (payload: unknown) => void;
  isGM: () => boolean;
  isGuest: () => boolean;
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
