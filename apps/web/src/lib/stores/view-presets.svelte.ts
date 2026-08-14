import { getDB } from "$lib/utils/idb";
import {
  systemClock,
  systemIdGenerator,
  type Clock,
  type IdGenerator,
} from "$lib/utils/runtime-deps";
import {
  parseViewPresets,
  viewPresetsSettingsKey,
  legacyGraphPresetsSettingsKey,
  type ViewPreset,
  type ViewPresetState,
} from "./view-presets";

export interface ViewPresetsDependencies {
  clock?: Clock;
  idGenerator?: IdGenerator;
  getDb?: typeof getDB;
}

export class ViewPresetsStore {
  private clock: Clock;
  private idGenerator: IdGenerator;
  private getDb: typeof getDB;

  presets = $state<ViewPreset[]>([]);
  activePresetId = $state<string | null>(null);
  loadedVaultId = $state<string | null>(null);

  constructor(deps: ViewPresetsDependencies = {}) {
    this.clock = deps.clock ?? systemClock;
    this.idGenerator = deps.idGenerator ?? systemIdGenerator;
    this.getDb = deps.getDb ?? getDB;
  }

  async loadPresets(vaultId: string | null | undefined): Promise<ViewPreset[]> {
    if (!vaultId) {
      this.presets = [];
      this.loadedVaultId = null;
      this.activePresetId = null;
      return [];
    }

    try {
      const db = await this.getDb();
      const primaryKey = viewPresetsSettingsKey(vaultId);
      let raw = await db.get("settings", primaryKey);

      // Backwards compatibility: fallback to legacy graphViewPresets:<vaultId> if primary is empty
      if (!raw) {
        const legacyKey = legacyGraphPresetsSettingsKey(vaultId);
        const legacyRaw = await db.get("settings", legacyKey);
        if (legacyRaw) {
          raw = legacyRaw;
          // Silently migrate legacy presets to the unified key
          await db.put("settings", raw, primaryKey);
        }
      }

      this.presets = parseViewPresets(raw, this.clock);
      this.loadedVaultId = vaultId;
      return this.presets;
    } catch (error) {
      console.error("[ViewPresetsStore] Failed to load view presets:", error);
      this.presets = [];
      this.loadedVaultId = vaultId;
      return [];
    }
  }

  private async persistPresets(vaultId: string): Promise<void> {
    try {
      const db = await this.getDb();
      const key = viewPresetsSettingsKey(vaultId);
      await db.put("settings", $state.snapshot(this.presets), key);
    } catch (error) {
      console.error(
        "[ViewPresetsStore] Failed to persist view presets:",
        error,
      );
    }
  }

  async savePreset(
    vaultId: string,
    name: string,
    state: ViewPresetState,
  ): Promise<ViewPreset | null> {
    const trimmed = name.trim();
    if (!trimmed || !vaultId) return null;

    const now = this.clock.now();
    const preset: ViewPreset = {
      id: this.idGenerator.uuid(),
      name: trimmed,
      createdAt: now,
      updatedAt: now,
      state,
    };

    this.presets = [...this.presets, preset];
    this.activePresetId = preset.id;
    await this.persistPresets(vaultId);
    return preset;
  }

  async renamePreset(vaultId: string, id: string, name: string): Promise<void> {
    const trimmed = name.trim();
    if (!trimmed || !vaultId) return;

    this.presets = this.presets.map((p) =>
      p.id === id
        ? {
            ...p,
            name: trimmed,
            updatedAt: this.clock.now(),
          }
        : p,
    );

    await this.persistPresets(vaultId);
  }

  async deletePreset(vaultId: string, id: string): Promise<void> {
    if (!vaultId) return;
    this.presets = this.presets.filter((p) => p.id !== id);
    if (this.activePresetId === id) {
      this.activePresetId = null;
    }
    await this.persistPresets(vaultId);
  }

  applyPreset(id: string): ViewPreset | null {
    const preset = this.presets.find((p) => p.id === id);
    if (!preset) return null;
    this.activePresetId = id;
    return preset;
  }
}

export const viewPresetsStore = new ViewPresetsStore();
