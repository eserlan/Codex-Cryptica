import type { DiscoveryPartId } from "hex-crawl-engine";

/**
 * What the discovery review card may ask for. The card depends on this shape
 * only, so tests use fakes and the real controller is wired by the panel.
 */
export type EntityPartId = "landmark" | "encounter";
export type NotePartId = "hazard" | "secret" | "atmosphere";

export interface EntitySaveOptions {
  encounterType?: "event" | "note";
  linkTicked: boolean;
}

export interface HexDiscoveryControls {
  retry(signal: AbortSignal): Promise<unknown>;
  rollTables(): Promise<unknown>;
  regenerate(part: DiscoveryPartId, signal: AbortSignal): Promise<unknown>;
  discardPart(part: DiscoveryPartId): Promise<unknown>;
  discardDraft(): Promise<unknown>;
  saveEntityPart(
    part: EntityPartId,
    options: EntitySaveOptions,
  ): Promise<unknown>;
  saveNotePart(part: NotePartId): Promise<unknown>;
  saveFactionPart(options: { createIfMissing: boolean }): Promise<unknown>;
}

/** Everything the panel needs to explore a hex. Null hides exploring (guests). */
export interface HexDiscoveryWiring {
  explore: (signal: AbortSignal) => Promise<{ failure?: "ai-failed" }>;
  controls: HexDiscoveryControls;
  proposedLink: { entityId: string; title: string } | null;
  factionMatch: { id: string; title: string } | null;
  aiEnabled: boolean;
  customTerrainLabel?: string;
}
