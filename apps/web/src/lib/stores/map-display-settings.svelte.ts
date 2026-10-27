import type { MapGridGeometry } from "schema";
import { MAP_LAYER_ORDER, type HexLabelConfig } from "map-engine";
import { vault as defaultVault } from "./vault.svelte";
import { browserStorage, type StorageLike } from "#lib/utils/runtime-deps.js";
import {
  adoptGridGeometry,
  deviceGridFrom,
  geometryFromDevice,
  resolveGridGeometry,
  writeGridGeometry,
} from "./map-grid-geometry";
import {
  DEFAULT_MAP_SETTINGS,
  gridFieldsFor,
  parseMapSettings,
  type PersistedMapSettings,
} from "./map-settings";

const MAP_SETTINGS_STORAGE_PREFIX = "codex-map-settings";

type SettingsState = PersistedMapSettings & {
  activeMapId: string | null;
  hexLabelConfig: HexLabelConfig;
};

/** Device display settings, reactive persistence and vault grid-geometry adoption. */
export class MapDisplaySettings {
  isRestoringSettings = false;
  private _persistTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly state: SettingsState,
    private readonly storage: StorageLike = browserStorage,
    private readonly vault: Pick<
      typeof defaultVault,
      "maps" | "saveMaps"
    > = defaultVault,
  ) {}

  start() {
    $effect.root(() => {
      $effect(() => {
        this.snapshot();
        // Read individual flags: reading just the record doesn't track edits to a layer.
        for (const layer of MAP_LAYER_ORDER) {
          void this.state.layerVisibility[layer];
          void this.state.layerLocked[layer];
        }
        this.schedulePersistSettings();
      });
    });
  }

  private getSettingsStorageKey(mapId: string) {
    return `${MAP_SETTINGS_STORAGE_PREFIX}:${mapId}`;
  }

  private readPersistedSettings(mapId: string): PersistedMapSettings | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = this.storage.getItem(this.getSettingsStorageKey(mapId));
      return raw ? parseMapSettings(raw) : null;
    } catch {
      return null;
    }
  }

  private schedulePersistSettings() {
    if (this._persistTimer !== null) clearTimeout(this._persistTimer);
    this._persistTimer = setTimeout(() => {
      this._persistTimer = null;
      this.persistSettings();
    }, 250);
  }

  private persistSettings() {
    if (
      typeof window === "undefined" ||
      this.isRestoringSettings ||
      !this.state.activeMapId
    ) {
      return;
    }

    const payload = this.snapshot();

    try {
      this.storage.setItem(
        this.getSettingsStorageKey(this.state.activeMapId),
        JSON.stringify(payload),
      );
    } catch (err) {
      console.warn("[MapStore] Failed to persist map settings", err);
    }

    // Grid geometry is also stored with the map, so it follows the map to other
    // devices. Display preferences above stay device-local (FR-040).
    const geometry = geometryFromDevice({
      gridType: this.state.gridType,
      gridSize: this.state.gridSize,
      gridOffsetX: this.state.gridOffsetX,
      gridOffsetY: this.state.gridOffsetY,
      hexLabelConfig: this.state.hexLabelConfig,
    });
    void writeGridGeometry(
      {
        maps: this.vault.maps,
        saveMaps: async () => {
          await this.vault.saveMaps();
          return true;
        },
      },
      this.state.activeMapId,
      geometry,
    );
  }

  /**
   * The grid geometry this map should show. A map with no geometry adopts this
   * device's, once (FR-038). A stored geometry wins over the device (FR-037).
   */
  private geometryForMap(
    mapId: string | null,
    persisted: PersistedMapSettings | null,
  ): MapGridGeometry | null {
    const map = mapId ? this.vault.maps?.[mapId] : undefined;
    if (!map || !mapId) return null;
    const device = persisted ? deviceGridFrom(persisted) : null;
    if (adoptGridGeometry(this.vault.maps, mapId, device))
      void this.vault.saveMaps();
    return resolveGridGeometry(map, device);
  }

  applySettings(mapId: string | null) {
    const persisted = mapId ? this.readPersistedSettings(mapId) : null;
    const next = persisted ?? DEFAULT_MAP_SETTINGS;
    const geometry = this.geometryForMap(mapId, persisted);

    this.isRestoringSettings = true;
    try {
      this.state.showFog = next.showFog;
      this.state.soloFog = next.soloFog;
      this.state.showGrid = next.showGrid;
      this.state.showHexCoordinates = next.showHexCoordinates;
      this.state.showTerrainIcons = next.showTerrainIcons;
      this.state.brushRadius = next.brushRadius;
      Object.assign(this.state, gridFieldsFor(geometry, next));
      this.state.gridColor = next.gridColor;
      this.state.fogColor = next.fogColor ?? null;
      this.state.showLabels = next.showLabels;
      this.state.visionMode = next.visionMode;
      this.state.visionRange = next.visionRange;
      this.state.layerVisibility = next.layerVisibility;
      this.state.layerLocked = next.layerLocked;
    } finally {
      this.isRestoringSettings = false;
    }
  }

  private snapshot(): PersistedMapSettings {
    return {
      showFog: this.state.showFog,
      soloFog: this.state.soloFog,
      showGrid: this.state.showGrid,
      gridType: this.state.gridType,
      showHexCoordinates: this.state.showHexCoordinates,
      showTerrainIcons: this.state.showTerrainIcons,
      hexLabelConfig: this.state.hexLabelConfig,
      brushRadius: this.state.brushRadius,
      gridSize: this.state.gridSize,
      gridOffsetX: this.state.gridOffsetX,
      gridOffsetY: this.state.gridOffsetY,
      gridColor: this.state.gridColor,
      fogColor: this.state.fogColor,
      showLabels: this.state.showLabels,
      visionMode: this.state.visionMode,
      visionRange: this.state.visionRange,
      layerVisibility: this.state.layerVisibility,
      layerLocked: this.state.layerLocked,
    };
  }
}
