import { type mapStore } from "../map.svelte";
import type { VTTMessage } from "../../../types/vtt";

const GRID_MEASURE_PREFIX = "codex.vtt.grid-measure";

export interface VTTGridManagerDependencies {
  mapStore: typeof mapStore;
  getMapId: () => string | null;
  emit: (message: VTTMessage) => void;
  persistDraft: () => void;
}

export class VTTGridManager {
  gridUnit = $state("ft");
  gridDistance = $state(5);
  showGridSettings = $state(false);
  gridFitMode = $state(false);
  gridMoveMode = $state(false);

  constructor(private deps: VTTGridManagerDependencies) {}

  loadGridMeasure(mapId: string) {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(
        `${GRID_MEASURE_PREFIX}:${mapId}`,
      );
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
      window.localStorage.setItem(
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
  }) {
    if (settings.gridSize !== undefined) {
      this.deps.mapStore.gridSize = settings.gridSize;
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
  }) {
    if (payload.gridSize !== undefined) {
      this.deps.mapStore.gridSize = payload.gridSize;
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
