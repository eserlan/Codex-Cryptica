import {
  DEFAULT_REGION_SETTINGS,
  applyRegionProposal,
  generateRegion,
  normalizeRegionSettings,
  normalizeSeed,
  selectRegionTargets,
  undoRegion,
  type HexCoord,
  type HexCrawlState,
  type HexKey,
  type LandscapePresetId,
  type RegionAdjustments,
  type RegionOperation,
  type RegionProposal,
  type RegionRefusal,
  type RegionSettings,
  type RegionUndo,
  type Terrain,
  type TerrainId,
  type TerrainLevel,
} from "hex-crawl-engine";
import type { StorageLike } from "#lib/stores/ui/persistence.js";

export const REGION_STORAGE_PREFIX = "codex-hex-region:";

/** What the region store needs from the hex crawl store, so tests need no vault. */
export interface RegionHexes {
  stateFor(mapId: string): HexCrawlState;
  applyChange(
    mapId: string,
    change: (state: HexCrawlState) => HexCrawlState,
  ): Promise<boolean>;
  revision: number;
}

export interface RegionGenerationDeps {
  hexes: RegionHexes;
  inBounds: (mapId: string, hex: HexCoord) => boolean;
  /** A fresh readable seed. */
  newSeed: () => string;
  storage: StorageLike | null;
  clock: { now: () => number };
  canEdit: () => boolean;
}

export interface RegionReview {
  mapId: string;
  operation: RegionOperation;
  centre: HexCoord;
  radius: number;
  seed: string;
  settings: RegionSettings;
  proposal: RegionProposal;
  adjustments: RegionAdjustments;
}

export type RegionMessage =
  | { kind: "refused"; reason: RegionRefusal }
  | { kind: "saved"; applied: number; skipped: number }
  | { kind: "failed" }
  | { kind: "undone" }
  | { kind: "undo-blocked" };

interface Remembered {
  seed: string;
  settings: RegionSettings;
}

/**
 * Preview, accept and undo for Generate Region. Everything here is in memory
 * except the remembered seed and settings; the only write to the map is the
 * single `applyChange` on accept.
 */
export class RegionGenerationStore {
  review = $state<RegionReview | null>(null);
  message = $state<RegionMessage | null>(null);
  busy = $state(false);
  private undoRecord = $state<(RegionUndo & { revision: number }) | null>(null);

  constructor(private readonly deps: RegionGenerationDeps) {}

  /** Undo is offered only while nothing else has been saved since the accept. */
  get undoAvailable(): boolean {
    return (
      this.undoRecord !== null &&
      this.undoRecord.revision === this.deps.hexes.revision
    );
  }

  private key(mapId: string): string {
    return `${REGION_STORAGE_PREFIX}${mapId}`;
  }

  remembered(mapId: string): Remembered | null {
    try {
      const raw = this.deps.storage?.getItem(this.key(mapId));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { seed?: unknown; settings?: unknown };
      const seed =
        typeof parsed.seed === "string" ? normalizeSeed(parsed.seed) : null;
      if (!seed) return null;
      return { seed, settings: normalizeRegionSettings(parsed.settings) };
    } catch {
      return null;
    }
  }

  private remember(review: RegionReview): void {
    try {
      this.deps.storage?.setItem(
        this.key(review.mapId),
        JSON.stringify({ seed: review.seed, settings: review.settings }),
      );
    } catch {
      // Remembering is a convenience; never block generation on it.
    }
  }

  /** Start a preview. Returns false, with a message, when nothing can be proposed. */
  open(
    mapId: string,
    operation: RegionOperation,
    centre: HexCoord,
    radius = 3,
  ): boolean {
    if (!this.deps.canEdit()) return false;
    const memory = this.remembered(mapId);
    return this.build({
      mapId,
      operation,
      centre,
      radius,
      seed: this.deps.newSeed(),
      settings: memory?.settings ?? DEFAULT_REGION_SETTINGS,
    });
  }

  private build(input: Omit<RegionReview, "proposal" | "adjustments">) {
    const state = this.deps.hexes.stateFor(input.mapId);
    const inBounds = (hex: HexCoord) => this.deps.inBounds(input.mapId, hex);
    const targets = selectRegionTargets({
      operation: input.operation,
      state,
      centre: input.centre,
      radius: input.radius,
      inBounds,
    });
    if (!targets.ok) return this.refuse(targets.reason);
    if (targets.targets.targets.length === 0)
      return this.refuse("nothing-to-generate");
    const result = generateRegion({
      request: {
        operation: input.operation,
        centre: input.centre,
        radius: input.radius,
        seed: input.seed,
        settings: input.settings,
      },
      state,
      targets: targets.targets,
      inBounds,
    });
    if (!result.ok) return this.refuse(result.reason);
    this.message = null;
    this.review = { ...input, proposal: result.proposal, adjustments: {} };
    this.remember(this.review);
    return true;
  }

  private refuse(reason: RegionRefusal): false {
    this.message = { kind: "refused", reason };
    return false;
  }

  private rebuild(patch: Partial<RegionReview>): boolean {
    const current = this.review;
    if (!current) return false;
    const { proposal: _p, adjustments: _a, ...rest } = current;
    const ok = this.build({ ...rest, ...patch });
    if (!ok) this.review = current;
    return ok;
  }

  setRadius(radius: number): boolean {
    return this.rebuild({ radius });
  }

  /** Returns false for an empty or over-long seed, leaving the preview unchanged. */
  setSeed(text: string): boolean {
    const seed = normalizeSeed(text);
    return seed ? this.rebuild({ seed }) : false;
  }

  reroll(): boolean {
    return this.rebuild({ seed: this.deps.newSeed() });
  }

  setPreset(preset: LandscapePresetId): boolean {
    const settings = this.review?.settings;
    return settings
      ? this.rebuild({ settings: { ...settings, preset } })
      : false;
  }

  setLevel(terrain: TerrainId, level: TerrainLevel): boolean {
    const settings = this.review?.settings;
    if (!settings) return false;
    const levels = { ...settings.levels };
    if (level === "normal") delete levels[terrain];
    else levels[terrain] = level;
    return this.rebuild({ settings: { ...settings, levels } });
  }

  /** Change one proposed hex by hand; null puts the proposal back. */
  adjust(key: HexKey, terrain: Terrain | null): void {
    const current = this.review;
    if (!current || !(key in current.proposal.hexes)) return;
    const adjustments = { ...current.adjustments };
    if (terrain) adjustments[key] = terrain;
    else delete adjustments[key];
    this.review = { ...current, adjustments };
  }

  /** Write the reviewed terrain in one save. Nothing is written on failure. */
  async accept(): Promise<boolean> {
    const current = this.review;
    if (!current || this.busy || !this.deps.canEdit()) return false;
    this.busy = true;
    const now = this.deps.clock.now();
    let outcome: ReturnType<typeof applyRegionProposal> | null = null;
    try {
      const written = await this.deps.hexes.applyChange(
        current.mapId,
        (state) => {
          outcome = applyRegionProposal(
            state,
            current.proposal,
            current.adjustments,
            now,
          );
          return outcome.state;
        },
      );
      const done = outcome as ReturnType<typeof applyRegionProposal> | null;
      if (!written || !done) {
        this.message = { kind: "failed" };
        return false;
      }
      this.undoRecord = {
        mapId: current.mapId,
        ...done.undo,
        revision: this.deps.hexes.revision,
      };
      this.message = {
        kind: "saved",
        applied: done.applied.length,
        skipped: done.skipped.length,
      };
      this.review = null;
      return true;
    } catch {
      this.message = { kind: "failed" };
      return false;
    } finally {
      this.busy = false;
    }
  }

  cancel(): void {
    this.review = null;
  }

  /** Put every hex the last accept changed back, if none has been touched since. */
  async undo(): Promise<boolean> {
    const record = this.undoRecord;
    if (!record || !this.undoAvailable || this.busy) return false;
    this.busy = true;
    let blocked = false;
    try {
      const written = await this.deps.hexes.applyChange(
        record.mapId,
        (state) => {
          const restored = undoRegion(state, record);
          if (!restored) {
            blocked = true;
            return state;
          }
          return restored;
        },
      );
      if (blocked || !written) {
        this.message = { kind: blocked ? "undo-blocked" : "failed" };
        return false;
      }
      this.undoRecord = null;
      this.message = { kind: "undone" };
      return true;
    } catch {
      this.message = { kind: "failed" };
      return false;
    } finally {
      this.busy = false;
    }
  }

  dismissMessage(): void {
    this.message = null;
  }

  /** Called when the map or mode changes: drop the preview and the undo. */
  leave(): void {
    this.review = null;
    this.message = null;
    this.undoRecord = null;
  }
}
