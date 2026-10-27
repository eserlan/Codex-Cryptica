import { MapDisplaySettings } from "./map-display-settings.svelte";
import { MapNavigation } from "./map-navigation.svelte";
import {
  layerRecord,
  type GridType,
  type TokenVisionMode,
} from "./map-settings";
export type { GridType, TokenVisionMode } from "./map-settings";
import { vault } from "./vault.svelte";
import type { Map, Point, ViewportTransform } from "schema";
import {
  imageToViewport,
  viewportToImage,
  formatHexLabel,
  type HexCoord,
  type HexLabelConfig,
  type MapLayer,
} from "map-engine";
import { sessionModeStore } from "#lib/stores/ui/session-mode.svelte.js";
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
  private records: MapRecords;
  private pinEditor: MapPins;
  private fog: MapFog;
  private settings: MapDisplaySettings;
  private navigation: MapNavigation;

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
    this.records = new MapRecords((id) => this.selectMap(id), idGenerator);
    this.pinEditor = new MapPins(this, idGenerator);
    this.fog = new MapFog(this);
    this.settings = new MapDisplaySettings(this, storage);
    this.navigation = new MapNavigation(this, this.settings, storage);
    if (typeof window !== "undefined") {
      this.settings.applySettings(null);
      this.navigation.restorePageState();
      this.settings.start();
      this.navigation.start();
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
    this.navigation.selectMap(id, pushToStack);
  }
  goBack() {
    this.navigation.goBack();
  }
  updateViewport(pan: Point, zoom: number) {
    this.navigation.updateViewport(pan, zoom);
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
