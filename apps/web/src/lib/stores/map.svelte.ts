import { vault } from "./vault.svelte";
import type { Map, MapGridGeometry, Point, ViewportTransform } from "schema";
import {
  imageToViewport,
  viewportToImage,
  formatHexLabel,
  MAP_LAYER_ORDER,
  type HexCoord,
  type HexLabelConfig,
  type MapLayer,
} from "map-engine";
import {
  adoptGridGeometry,
  deviceGridFrom,
  geometryFromDevice,
  resolveGridGeometry,
  writeGridGeometry,
} from "./map-grid-geometry";
import { sessionModeStore } from "#lib/stores/ui/session-mode.svelte.js";
import { guestVault } from "./guest-vault.svelte";
import {
  browserStorage,
  type StorageLike,
  type IdGenerator,
  systemIdGenerator,
} from "#lib/utils/runtime-deps.js";

import { MapRecords } from "./map-records";
import { MapPins } from "./map-pins";
import { MapFog } from "./map-fog";
export { BLANK_MAP_SIZE } from "./map-records";

const MAP_SETTINGS_STORAGE_PREFIX = "codex-map-settings";
const MAP_PAGE_STATE_STORAGE_PREFIX = "codex-map-page-state";
export type TokenVisionMode = "party" | "selected";
export type GridType = "square" | "hex-pointy" | "hex-flat";

type PersistedMapSettings = {
  showFog: boolean;
  /** Draw fog fully opaque in GM view, as players see it (solo play). */
  soloFog: boolean;
  showGrid: boolean;
  gridType: GridType;
  showHexCoordinates: boolean;
  /** GM display preference: terrain icons on hex crawl hexes (device-local). */
  showTerrainIcons: boolean;
  hexLabelConfig?: HexLabelConfig;
  brushRadius: number;
  gridSize: number;
  gridOffsetX: number;
  gridOffsetY: number;
  gridColor: string | null;
  /** GM-chosen fog colour (#rrggbb); null means the theme colour. */
  fogColor: string | null;
  showLabels: boolean;
  visionMode: TokenVisionMode;
  /** Vision distance in grid units (e.g. feet), not pixels — converted to
   * pixels using the map's gridSize/gridDistance at reveal time. */
  visionRange: number;
  /** Per-layer view toggle and edit-lock. GM-local, not synced to guests —
   * same tier as showFog/showGrid. */
  layerVisibility: Record<MapLayer, boolean>;
  layerLocked: Record<MapLayer, boolean>;
};

const HEX_LABEL_STYLES = new Set<HexLabelConfig["style"]>([
  "none",
  "off",
  "numeric",
  "alphanumeric",
  "axial",
]);

function isPersistedHexLabelConfig(value: unknown): value is HexLabelConfig {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const style = (value as Record<string, unknown>).style;
  return (
    typeof style === "string" &&
    HEX_LABEL_STYLES.has(style as HexLabelConfig["style"])
  );
}

function layerRecord<T>(value: T): Record<MapLayer, T> {
  return Object.fromEntries(
    MAP_LAYER_ORDER.map((layer) => [layer, value]),
  ) as Record<MapLayer, T>;
}

type PersistedMapPageState = {
  activeMapId: string | null;
  viewports: Record<string, ViewportTransform>;
};

const DEFAULT_MAP_SETTINGS: PersistedMapSettings = {
  showFog: false,
  soloFog: false,
  showGrid: false,
  gridType: "square",
  showHexCoordinates: false,
  showTerrainIcons: false,
  hexLabelConfig: { style: "none" },
  brushRadius: 50,
  gridSize: 50,
  gridOffsetX: 0,
  gridOffsetY: 0,
  gridColor: null,
  fogColor: null,
  showLabels: true,
  visionMode: "party",
  visionRange: 60,
  layerVisibility: layerRecord(true),
  layerLocked: layerRecord(false),
};

const DEFAULT_VIEWPORT: ViewportTransform = {
  pan: { x: 0, y: 0 },
  zoom: 1,
};

/**
 * The grid fields to show: the map's stored geometry where it has one, else this
 * device's persisted settings, else the defaults (FR-037).
 */
function gridFieldsFor(
  geometry: MapGridGeometry | null,
  next: PersistedMapSettings,
) {
  if (!geometry) return deviceGridFields(next);
  return {
    gridType: geometry.type,
    gridSize: geometry.size,
    gridOffsetX: geometry.offsetX,
    gridOffsetY: geometry.offsetY,
    hexLabelConfig: geometry.labels ?? deviceLabels(next),
  };
}

function deviceGridFields(next: PersistedMapSettings) {
  return {
    gridType: next.gridType,
    gridSize: next.gridSize,
    gridOffsetX: next.gridOffsetX ?? 0,
    gridOffsetY: next.gridOffsetY ?? 0,
    hexLabelConfig: deviceLabels(next),
  };
}

function deviceLabels(next: PersistedMapSettings): HexLabelConfig {
  return (
    next.hexLabelConfig ?? {
      style: next.showHexCoordinates ? "numeric" : "none",
    }
  );
}

export class MapStore {
  activeMapId = $state<string | null>(null);
  viewport = $state<ViewportTransform>({
    pan: { x: 0, y: 0 },
    zoom: 1,
  });
  canvasSize = $state({ width: 0, height: 0 });
  pendingPinCoords = $state<Point | null>(null);
  showFog = $state(false);
  soloFog = $state(false);
  /**
   * Counts changes to the fog mask. The mask is a canvas, which Svelte cannot
   * watch, so anything drawn from it (pin labels) reads this to know to refresh.
   */
  fogRevision = $state(0);
  showLabels = $state(true);
  // GM Mode is active whenever we are NOT in Shared Mode (Player View)
  isGMMode = $derived(!sessionModeStore.sharedMode);
  /**
   * Fog is drawn fully opaque, so nothing under it shows: always in Player
   * View, and in GM view when the GM turns on solo fog to play their own map.
   */
  fogOpaque = $derived(!this.isGMMode || this.soloFog);
  brushRadius = $state(50);
  navigationStack = $state<string[]>([]);
  showGrid = $state(false);
  gridType = $state<GridType>("square");
  showHexCoordinates = $state(false);
  showTerrainIcons = $state(false);
  hexLabelConfig = $state<HexLabelConfig>({ style: "none" });
  gridSize = $state(50);
  gridOffsetX = $state(0);
  gridOffsetY = $state(0);
  gridColor = $state<string | null>(null); // null means use theme primary
  fogColor = $state<string | null>(null); // null means use theme secondary
  visionMode = $state<TokenVisionMode>("party");
  visionRange = $state(60);
  layerVisibility = $state<Record<MapLayer, boolean>>(layerRecord(true));
  layerLocked = $state<Record<MapLayer, boolean>>(layerRecord(false));
  private isRestoringSettings = false;
  private pendingActiveMapId = $state<string | null>(null);
  private _persistTimer: ReturnType<typeof setTimeout> | null = null;
  private _viewportPersistTimer: ReturnType<typeof setTimeout> | null = null;
  private static _vaultSwitchHandler: (() => void) | null = null;
  private storage: StorageLike;
  private records: MapRecords;
  private pinEditor: MapPins;
  private fog: MapFog;

  activeMap = $derived.by(() => {
    const maps = vault.maps ?? {};
    return this.activeMapId ? maps[this.activeMapId] : null;
  });

  worldMap = $derived.by(() => {
    // ⚡ Bolt Optimization: Replace Object.values().find() with a loop over keys
    // to prevent allocating a new array every time vault.maps changes.
    const maps = vault.maps;
    if (!maps) return null;
    for (const key in maps) {
      if (maps[key].isWorldMap) return maps[key];
    }
    return null;
  });

  canGoBack = $derived(this.navigationStack.length > 0);

  pins = $derived.by(() => {
    return this.activeMap?.pins || [];
  });

  constructor(
    storage: StorageLike = browserStorage,
    idGenerator: IdGenerator = systemIdGenerator,
  ) {
    this.storage = storage;
    this.records = new MapRecords((id) => this.selectMap(id), idGenerator);
    this.pinEditor = new MapPins(this, idGenerator);
    this.fog = new MapFog(this);
    if (typeof window !== "undefined") {
      this.applySettings(null);
      this.restorePageState();

      $effect.root(() => {
        $effect(() => {
          const tracked = [
            this.showFog,
            this.soloFog,
            this.showGrid,
            this.gridType,
            this.showHexCoordinates,
            this.showTerrainIcons,
            this.hexLabelConfig,
            this.brushRadius,
            this.gridSize,
            this.gridOffsetX,
            this.gridOffsetY,
            this.gridColor,
            this.fogColor,
            this.showLabels,
            this.visionMode,
            this.visionRange,
            // Individual properties, not the object references — Svelte's
            // $state proxy only tracks reads at property-access granularity,
            // so reading the Record itself wouldn't re-run this effect when
            // a single layer's flag toggles.
            ...MAP_LAYER_ORDER.map((layer) => this.layerVisibility[layer]),
            ...MAP_LAYER_ORDER.map((layer) => this.layerLocked[layer]),
          ];
          void tracked;
          this.schedulePersistSettings();
        });
      });
    }

    // Clear stack on vault switch and handle auto-selection
    if (typeof window !== "undefined") {
      if (MapStore._vaultSwitchHandler) {
        window.removeEventListener(
          "vault-switched",
          MapStore._vaultSwitchHandler,
        );
      }
      MapStore._vaultSwitchHandler = () => {
        this.navigationStack = [];
        this.pendingActiveMapId = null;
        this.restorePageState();
      };
      window.addEventListener("vault-switched", MapStore._vaultSwitchHandler);

      // Reactive auto-selection when maps are loaded or activeMapId is lost/invalid
      $effect.root(() => {
        $effect(() => {
          const maps = vault.maps ?? {};
          const pendingMapId = this.pendingActiveMapId;
          if (pendingMapId && maps[pendingMapId]) {
            this.pendingActiveMapId = null;
            this.selectMap(pendingMapId);
            return;
          }

          const hasLoadedMaps = Object.keys(maps).length > 0;
          const isInvalid =
            hasLoadedMaps && this.activeMapId ? !maps[this.activeMapId] : false;
          if ((!this.activeMapId || isInvalid) && !pendingMapId) {
            if (this.worldMap) {
              this.selectMap(this.worldMap.id);
            } else if (
              hasLoadedMaps &&
              (!sessionModeStore.isGuestMode || guestVault.publishId)
            ) {
              this.selectMap(Object.keys(maps)[0]);
            }
          }
        });
      });
    }
  }

  private getSettingsStorageKey(mapId: string) {
    return `${MAP_SETTINGS_STORAGE_PREFIX}:${mapId}`;
  }

  // fallow-ignore-next-line complexity
  private readPersistedSettings(mapId: string): PersistedMapSettings | null {
    if (typeof window === "undefined") return null;

    try {
      const raw = this.storage.getItem(this.getSettingsStorageKey(mapId));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<PersistedMapSettings>;
      return {
        showFog:
          typeof parsed.showFog === "boolean"
            ? parsed.showFog
            : DEFAULT_MAP_SETTINGS.showFog,
        soloFog:
          typeof parsed.soloFog === "boolean"
            ? parsed.soloFog
            : DEFAULT_MAP_SETTINGS.soloFog,
        showGrid:
          typeof parsed.showGrid === "boolean"
            ? parsed.showGrid
            : DEFAULT_MAP_SETTINGS.showGrid,
        gridType:
          parsed.gridType === "hex-pointy" ||
          parsed.gridType === "hex-flat" ||
          parsed.gridType === "square"
            ? parsed.gridType
            : DEFAULT_MAP_SETTINGS.gridType,
        showHexCoordinates:
          typeof parsed.showHexCoordinates === "boolean"
            ? parsed.showHexCoordinates
            : DEFAULT_MAP_SETTINGS.showHexCoordinates,
        showTerrainIcons:
          typeof parsed.showTerrainIcons === "boolean"
            ? parsed.showTerrainIcons
            : DEFAULT_MAP_SETTINGS.showTerrainIcons,
        hexLabelConfig: isPersistedHexLabelConfig(parsed.hexLabelConfig)
          ? parsed.hexLabelConfig
          : {
              style:
                typeof parsed.showHexCoordinates === "boolean" &&
                parsed.showHexCoordinates
                  ? "numeric"
                  : "none",
            },
        brushRadius:
          typeof parsed.brushRadius === "number"
            ? parsed.brushRadius
            : DEFAULT_MAP_SETTINGS.brushRadius,
        gridSize:
          typeof parsed.gridSize === "number"
            ? parsed.gridSize
            : DEFAULT_MAP_SETTINGS.gridSize,
        gridOffsetX:
          typeof parsed.gridOffsetX === "number"
            ? parsed.gridOffsetX
            : DEFAULT_MAP_SETTINGS.gridOffsetX,
        gridOffsetY:
          typeof parsed.gridOffsetY === "number"
            ? parsed.gridOffsetY
            : DEFAULT_MAP_SETTINGS.gridOffsetY,
        gridColor:
          typeof parsed.gridColor === "string" || parsed.gridColor === null
            ? parsed.gridColor
            : DEFAULT_MAP_SETTINGS.gridColor,
        fogColor:
          typeof parsed.fogColor === "string" || parsed.fogColor === null
            ? parsed.fogColor
            : DEFAULT_MAP_SETTINGS.fogColor,
        showLabels:
          typeof parsed.showLabels === "boolean"
            ? parsed.showLabels
            : DEFAULT_MAP_SETTINGS.showLabels,
        visionMode:
          parsed.visionMode === "party" || parsed.visionMode === "selected"
            ? parsed.visionMode
            : DEFAULT_MAP_SETTINGS.visionMode,
        visionRange:
          typeof parsed.visionRange === "number"
            ? parsed.visionRange
            : DEFAULT_MAP_SETTINGS.visionRange,
        // Spread-merged over defaults (not a bare typeof check) so an old
        // persisted blob missing a since-added layer doesn't produce
        // `undefined` for it.
        layerVisibility:
          parsed.layerVisibility && typeof parsed.layerVisibility === "object"
            ? {
                ...DEFAULT_MAP_SETTINGS.layerVisibility,
                ...parsed.layerVisibility,
              }
            : DEFAULT_MAP_SETTINGS.layerVisibility,
        layerLocked:
          parsed.layerLocked && typeof parsed.layerLocked === "object"
            ? { ...DEFAULT_MAP_SETTINGS.layerLocked, ...parsed.layerLocked }
            : DEFAULT_MAP_SETTINGS.layerLocked,
      };
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
      !this.activeMapId
    ) {
      return;
    }

    const payload: PersistedMapSettings = {
      showFog: this.showFog,
      soloFog: this.soloFog,
      showGrid: this.showGrid,
      gridType: this.gridType,
      showHexCoordinates: this.showHexCoordinates,
      showTerrainIcons: this.showTerrainIcons,
      hexLabelConfig: this.hexLabelConfig,
      brushRadius: this.brushRadius,
      gridSize: this.gridSize,
      gridOffsetX: this.gridOffsetX,
      gridOffsetY: this.gridOffsetY,
      gridColor: this.gridColor,
      fogColor: this.fogColor,
      showLabels: this.showLabels,
      visionMode: this.visionMode,
      visionRange: this.visionRange,
      layerVisibility: this.layerVisibility,
      layerLocked: this.layerLocked,
    };

    try {
      this.storage.setItem(
        this.getSettingsStorageKey(this.activeMapId),
        JSON.stringify(payload),
      );
    } catch (err) {
      console.warn("[MapStore] Failed to persist map settings", err);
    }

    // Grid geometry is also stored with the map, so it follows the map to other
    // devices. Display preferences above stay device-local (FR-040).
    const geometry = geometryFromDevice({
      gridType: this.gridType,
      gridSize: this.gridSize,
      gridOffsetX: this.gridOffsetX,
      gridOffsetY: this.gridOffsetY,
      hexLabelConfig: this.hexLabelConfig,
    });
    void writeGridGeometry(
      {
        maps: vault.maps,
        saveMaps: async () => {
          await vault.saveMaps();
          return true;
        },
      },
      this.activeMapId,
      geometry,
    );
  }

  private getPageStateStorageKey(vaultId = vault.activeVaultId ?? "default") {
    return `${MAP_PAGE_STATE_STORAGE_PREFIX}:${vaultId}`;
  }

  private readPageState(): PersistedMapPageState | null {
    if (typeof window === "undefined") return null;

    try {
      const raw = this.storage.getItem(this.getPageStateStorageKey());
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<PersistedMapPageState>;
      return {
        activeMapId:
          typeof parsed.activeMapId === "string" || parsed.activeMapId === null
            ? parsed.activeMapId
            : null,
        viewports:
          parsed.viewports && typeof parsed.viewports === "object"
            ? Object.fromEntries(
                Object.entries(parsed.viewports).filter(([, viewport]) =>
                  this.isViewportTransform(viewport),
                ),
              )
            : {},
      };
    } catch {
      return null;
    }
  }

  private isViewportTransform(value: unknown): value is ViewportTransform {
    if (!value || typeof value !== "object") return false;
    const viewport = value as ViewportTransform;
    return (
      !!viewport.pan &&
      typeof viewport.pan.x === "number" &&
      typeof viewport.pan.y === "number" &&
      typeof viewport.zoom === "number"
    );
  }

  private persistPageState() {
    if (typeof window === "undefined" || this.isRestoringSettings) {
      return;
    }

    const pageState = this.readPageState() ?? {
      activeMapId: null,
      viewports: {},
    };

    if (this.activeMapId) {
      pageState.activeMapId = this.activeMapId;
      pageState.viewports = {
        ...pageState.viewports,
        [this.activeMapId]: {
          pan: { ...this.viewport.pan },
          zoom: this.viewport.zoom,
        },
      };
    } else {
      pageState.activeMapId = null;
    }

    try {
      this.storage.setItem(
        this.getPageStateStorageKey(),
        JSON.stringify(pageState),
      );
    } catch (err) {
      console.warn("[MapStore] Failed to persist map page state", err);
    }
  }

  private restorePageState() {
    const pageState = this.readPageState();
    const nextMapId = pageState?.activeMapId ?? null;
    const nextViewport =
      nextMapId && pageState?.viewports[nextMapId]
        ? pageState.viewports[nextMapId]
        : DEFAULT_VIEWPORT;

    this.isRestoringSettings = true;
    try {
      this.pendingActiveMapId = nextMapId;
      this.activeMapId = null;
      this.viewport = nextViewport;
      this.applySettings(nextMapId);
    } finally {
      this.isRestoringSettings = false;
    }
  }

  /**
   * The grid geometry this map should show. A map with no geometry adopts this
   * device's, once (FR-038). A stored geometry wins over the device (FR-037).
   */
  private geometryForMap(
    mapId: string | null,
    persisted: PersistedMapSettings | null,
  ): MapGridGeometry | null {
    const map = mapId ? vault.maps?.[mapId] : undefined;
    if (!map || !mapId) return null;
    const device = persisted ? deviceGridFrom(persisted) : null;
    if (adoptGridGeometry(vault.maps, mapId, device)) void vault.saveMaps();
    return resolveGridGeometry(map, device);
  }

  private applySettings(mapId: string | null) {
    const persisted = mapId ? this.readPersistedSettings(mapId) : null;
    const next = persisted ?? DEFAULT_MAP_SETTINGS;
    const geometry = this.geometryForMap(mapId, persisted);

    this.isRestoringSettings = true;
    try {
      this.showFog = next.showFog;
      this.soloFog = next.soloFog;
      this.showGrid = next.showGrid;
      this.showHexCoordinates = next.showHexCoordinates;
      this.showTerrainIcons = next.showTerrainIcons;
      this.brushRadius = next.brushRadius;
      Object.assign(this, gridFieldsFor(geometry, next));
      this.gridColor = next.gridColor;
      this.fogColor = next.fogColor ?? null;
      this.showLabels = next.showLabels;
      this.visionMode = next.visionMode;
      this.visionRange = next.visionRange;
      this.layerVisibility = next.layerVisibility;
      this.layerLocked = next.layerLocked;
    } finally {
      this.isRestoringSettings = false;
    }
  }

  formatHex(hex: HexCoord): string {
    const orientation = this.gridType === "hex-flat" ? "flat" : "pointy";
    return formatHexLabel(hex, this.hexLabelConfig, orientation);
  }

  async setAsWorldMap(id: string) {
    return this.records.setAsWorldMap(id);
  }

  selectMap(id: string, pushToStack = false) {
    if (this.activeMapId === id) return;
    if (pushToStack && this.activeMapId && this.activeMapId !== id) {
      this.navigationStack.push(this.activeMapId);
    }
    this.persistPageState();
    this.pendingActiveMapId = null;
    this.activeMapId = id;
    this.applySettings(id);
    const pageState = this.readPageState();
    this.viewport = pageState?.viewports[id] ?? {
      pan: { x: 0, y: 0 },
      zoom: 1,
    };
    this.persistPageState();
  }

  goBack() {
    const prevId = this.navigationStack.pop();
    if (prevId) {
      this.persistPageState();
      this.pendingActiveMapId = null;
      this.activeMapId = prevId;
      this.applySettings(prevId);
      const pageState = this.readPageState();
      this.viewport = pageState?.viewports[prevId] ?? {
        pan: { x: 0, y: 0 },
        zoom: 1,
      };
      this.persistPageState();
    }
  }

  updateViewport(pan: Point, zoom: number) {
    this.viewport = { pan, zoom };
    // Called on every pointermove while panning/dragging (including a map
    // being nudged under a fixed grid for fine-tuning) — persisting
    // synchronously here does a blocking localStorage read+write per frame,
    // which was dropping frames badly enough to look like the drag was
    // snapping to grid increments. Debounce it like schedulePersistSettings.
    this.schedulePersistPageState();
  }

  private schedulePersistPageState() {
    if (this._viewportPersistTimer !== null) {
      clearTimeout(this._viewportPersistTimer);
    }
    this._viewportPersistTimer = setTimeout(() => {
      this._viewportPersistTimer = null;
      this.persistPageState();
    }, 250);
  }

  setCanvasSize(width: number, height: number) {
    this.canvasSize = { width, height };
  }

  project(point: Point): Point {
    return imageToViewport(point, this.viewport, this.canvasSize);
  }

  unproject(point: Point): Point {
    return viewportToImage(point, this.viewport, this.canvasSize);
  }

  async uploadMap(file: File, name: string): Promise<string | undefined> {
    return this.records.uploadMap(file, name);
  }
  async replaceMapImage(mapId: string, file: File): Promise<boolean> {
    return this.records.replaceMapImage(mapId, file);
  }
  async createBlankMap(name: string): Promise<string | undefined> {
    return this.records.createBlankMap(name);
  }
  async saveMask(canvas: HTMLCanvasElement) {
    return this.fog.saveMask(canvas);
  }
  async loadMask(width: number, height: number): Promise<HTMLCanvasElement> {
    return this.fog.loadMask(width, height);
  }

  async addPin(entityId: string | undefined, coordinates: Point) {
    return this.pinEditor.addPin(entityId, coordinates);
  }
  updatePinCoordinatesInMemory(pinId: string, coordinates: Point) {
    this.pinEditor.updatePinCoordinatesInMemory(pinId, coordinates);
  }
  snapPinCoordinatesInMemory(pinId: string) {
    this.pinEditor.snapPinCoordinatesInMemory(pinId);
  }
  async removePin(pinId: string) {
    return this.pinEditor.removePin(pinId);
  }
  async removePinsForEntity(entityId: string) {
    return this.pinEditor.removePinsForEntity(entityId);
  }
  jumpToPin(pinId: string) {
    this.pinEditor.jumpToPin(pinId);
  }
  getEntitySubMap(entityId: string): Map | undefined {
    return this.records.getEntitySubMap(entityId);
  }
}

export const mapStore = new MapStore();

if (typeof window !== "undefined") {
  (window as any).__mapStore = mapStore;
}
