import { type mapStore, type GridType } from "../map.svelte";
import type { Point } from "schema";
import type { HexLabelConfig } from "map-engine";
import type { VTTMessage } from "../../../types/vtt";
import { browserStorage, type StorageLike } from "$lib/utils/runtime-deps";

const GRID_MEASURE_PREFIX = "codex.vtt.grid-measure";

const HEX_LABEL_STYLES = new Set<HexLabelConfig["style"]>([
  "none",
  "off",
  "numeric",
  "alphanumeric",
  "axial",
]);

function isValidHexLabelColumn(value: unknown): boolean {
  return (
    value === undefined ||
    (typeof value === "string" && /^[A-Za-z]{1,3}$/.test(value))
  );
}

function isFiniteOptionalNumber(value: unknown): boolean {
  return (
    value === undefined || (typeof value === "number" && Number.isFinite(value))
  );
}

function isValidHexLabelSeparator(value: unknown): boolean {
  return (
    value === undefined || (typeof value === "string" && value.length <= 1)
  );
}

function isOptionalBoolean(value: unknown): boolean {
  return value === undefined || typeof value === "boolean";
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasValidHexLabelStyle(config: Record<string, unknown>): boolean {
  return HEX_LABEL_STYLES.has(config.style as HexLabelConfig["style"]);
}

function hasValidHexLabelColumns(config: Record<string, unknown>): boolean {
  return ["startCol", "startColumn"].every((key) =>
    isValidHexLabelColumn(config[key]),
  );
}

function hasFiniteHexLabelNumbers(config: Record<string, unknown>): boolean {
  return ["startRow", "rowPadding", "originQ", "originR"].every((key) =>
    isFiniteOptionalNumber(config[key]),
  );
}

function isValidHexLabelConfig(value: unknown): value is HexLabelConfig {
  if (!isPlainRecord(value)) return false;

  return (
    hasValidHexLabelStyle(value) &&
    hasValidHexLabelColumns(value) &&
    hasFiniteHexLabelNumbers(value) &&
    isValidHexLabelSeparator(value.separator) &&
    isOptionalBoolean(value.invertRow)
  );
}

function hasVisibleHexLabels(config: HexLabelConfig): boolean {
  return config.style !== "none" && config.style !== "off";
}

export interface VTTGridManagerDependencies {
  mapStore: typeof mapStore;
  getMapId: () => string | null;
  emit: (message: VTTMessage) => void;
  persistDraft: () => void;
  /** Optional injectable storage; defaults to the SSR-safe browserStorage. */
  storage?: StorageLike;
}

export class VTTGridManager {
  gridUnit = $state("ft");
  gridDistance = $state(5);
  showGridSettings = $state(false);
  gridFitMode = $state(false);
  private _gridMoveMode = $state(false);
  /** Pan snapshot taken when grid-move mode was entered, so the fixed grid
   * renders continuously from wherever it already was instead of jumping
   * to `pan: {0,0}` — see `renderer.ts`'s `grid.fixedPan`. */
  gridFixedPan = $state<Point | null>(null);

  constructor(private deps: VTTGridManagerDependencies) {}

  get gridMoveMode() {
    return this._gridMoveMode;
  }

  set gridMoveMode(active: boolean) {
    this._gridMoveMode = active;
    this.gridFixedPan = active ? { ...this.deps.mapStore.viewport.pan } : null;
  }

  private get storage(): StorageLike {
    return this.deps.storage ?? browserStorage;
  }

  private applyHexLabelSettings(
    showHexCoordinates?: boolean,
    hexLabelConfig?: HexLabelConfig,
  ) {
    if (showHexCoordinates !== undefined) {
      this.deps.mapStore.showHexCoordinates = showHexCoordinates;
      if (hexLabelConfig === undefined) {
        this.deps.mapStore.hexLabelConfig = {
          style: showHexCoordinates ? "numeric" : "none",
        };
      }
    }
    if (!isValidHexLabelConfig(hexLabelConfig)) return;

    this.deps.mapStore.hexLabelConfig = hexLabelConfig;
    this.deps.mapStore.showHexCoordinates = hasVisibleHexLabels(hexLabelConfig);
  }

  loadGridMeasure(mapId: string) {
    if (typeof window === "undefined") return;
    try {
      const raw = this.storage.getItem(`${GRID_MEASURE_PREFIX}:${mapId}`);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (typeof parsed.gridUnit === "string") this.gridUnit = parsed.gridUnit;
      if (typeof parsed.gridDistance === "number")
        this.gridDistance = parsed.gridDistance;
    } catch {
      // ignore corrupt entries
    }
  }

  saveGridMeasure(mapId: string) {
    if (typeof window === "undefined") return;
    try {
      this.storage.setItem(
        `${GRID_MEASURE_PREFIX}:${mapId}`,
        JSON.stringify({
          gridUnit: this.gridUnit,
          gridDistance: this.gridDistance,
        }),
      );
    } catch {
      // ignore storage errors
    }
  }

  setGridSettings(settings: {
    gridSize?: number;
    gridUnit?: string;
    gridDistance?: number;
    gridType?: GridType;
    showHexCoordinates?: boolean;
    hexLabelConfig?: HexLabelConfig;
    fogColor?: string | null;
  }) {
    if (settings.gridSize !== undefined) {
      this.deps.mapStore.gridSize = settings.gridSize;
    }
    if (settings.gridType !== undefined) {
      this.deps.mapStore.gridType = settings.gridType;
    }
    this.applyHexLabelSettings(
      settings.showHexCoordinates,
      settings.hexLabelConfig,
    );
    if (settings.fogColor !== undefined) {
      this.deps.mapStore.fogColor = settings.fogColor;
    }
    if (settings.gridUnit !== undefined) {
      this.gridUnit = settings.gridUnit;
    }
    if (settings.gridDistance !== undefined) {
      this.gridDistance = settings.gridDistance;
    }
    const mapId = this.deps.getMapId();
    if (mapId) {
      this.saveGridMeasure(mapId);
    }
    this.deps.emit({
      type: "SET_GRID_SETTINGS",
      ...settings,
    });
  }

  handleRemoteGridSettings(payload: {
    gridSize?: number;
    gridUnit?: string;
    gridDistance?: number;
    gridType?: GridType;
    showHexCoordinates?: boolean;
    hexLabelConfig?: HexLabelConfig;
    fogColor?: string | null;
  }) {
    if (payload.gridSize !== undefined) {
      this.deps.mapStore.gridSize = payload.gridSize;
    }
    if (payload.gridType !== undefined) {
      this.deps.mapStore.gridType = payload.gridType;
    }
    this.applyHexLabelSettings(
      payload.showHexCoordinates,
      payload.hexLabelConfig,
    );
    if (payload.fogColor !== undefined) {
      this.deps.mapStore.fogColor = payload.fogColor;
    }
    if (payload.gridUnit !== undefined) {
      this.gridUnit = payload.gridUnit;
    }
    if (payload.gridDistance !== undefined) {
      this.gridDistance = payload.gridDistance;
    }
    this.deps.persistDraft();
  }
}
