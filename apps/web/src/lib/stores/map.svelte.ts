import { vault } from "./vault.svelte";
import { uiStore } from "./ui.svelte";
import type { Map, MapPin, Point, ViewportTransform } from "schema";
import { imageToViewport, viewportToImage } from "map-engine";
import { convertToWebP } from "../utils/image-processing";
import { writeOpfsFile } from "../utils/opfs";

const MAP_SETTINGS_STORAGE_PREFIX = "codex-map-settings";
const MAP_PAGE_STATE_STORAGE_PREFIX = "codex-map-page-state";
type PersistedMapSettings = {
  showFog: boolean;
  showGrid: boolean;
  brushRadius: number;
  gridSize: number;
  gridColor: string | null;
};

type PersistedMapPageState = {
  activeMapId: string | null;
  viewports: Record<string, ViewportTransform>;
};

const DEFAULT_MAP_SETTINGS: PersistedMapSettings = {
  showFog: true,
  showGrid: false,
  brushRadius: 50,
  gridSize: 50,
  gridColor: null,
};

const DEFAULT_VIEWPORT: ViewportTransform = {
  pan: { x: 0, y: 0 },
  zoom: 1,
};

export class MapStore {
  activeMapId = $state<string | null>(null);
  viewport = $state<ViewportTransform>({
    pan: { x: 0, y: 0 },
    zoom: 1,
  });
  canvasSize = $state({ width: 0, height: 0 });
  pendingPinCoords = $state<Point | null>(null);
  showFog = $state(true);
  // GM Mode is active whenever we are NOT in Shared Mode (Player View)
  isGMMode = $derived(!uiStore.sharedMode);
  brushRadius = $state(50);
  navigationStack = $state<string[]>([]);
  showGrid = $state(false);
  gridSize = $state(50);
  gridColor = $state<string | null>(null); // null means use theme primary
  private isRestoringSettings = false;
  private pendingActiveMapId = $state<string | null>(null);

  activeMap = $derived.by(() => {
    const maps = vault.maps ?? {};
    return this.activeMapId ? maps[this.activeMapId] : null;
  });

  worldMap = $derived.by(() => {
    return Object.values(vault.maps ?? {}).find((m) => m.isWorldMap) || null;
  });

  canGoBack = $derived(this.navigationStack.length > 0);

  pins = $derived.by(() => {
    return this.activeMap?.pins || [];
  });

  constructor() {
    if (typeof window !== "undefined") {
      this.applySettings(null);
      this.restorePageState();

      $effect.root(() => {
        $effect(() => {
          const tracked = [
            this.showFog,
            this.showGrid,
            this.brushRadius,
            this.gridSize,
            this.gridColor,
          ];
          void tracked;
          this.persistSettings();
        });
      });
    }

    // Clear stack on vault switch and handle auto-selection
    if (typeof window !== "undefined") {
      window.addEventListener("vault-switched", () => {
        this.navigationStack = [];
        this.pendingActiveMapId = null;
        this.restorePageState();
      });

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
          if (
            (!this.activeMapId || isInvalid) &&
            !pendingMapId &&
            this.worldMap
          ) {
            this.selectMap(this.worldMap.id);
          }
        });
      });
    }
  }

  private getSettingsStorageKey(mapId: string) {
    return `${MAP_SETTINGS_STORAGE_PREFIX}:${mapId}`;
  }

  private readPersistedSettings(mapId: string): PersistedMapSettings | null {
    if (typeof window === "undefined") return null;

    try {
      const raw = window.localStorage.getItem(
        this.getSettingsStorageKey(mapId),
      );
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<PersistedMapSettings>;
      return {
        showFog:
          typeof parsed.showFog === "boolean"
            ? parsed.showFog
            : DEFAULT_MAP_SETTINGS.showFog,
        showGrid:
          typeof parsed.showGrid === "boolean"
            ? parsed.showGrid
            : DEFAULT_MAP_SETTINGS.showGrid,
        brushRadius:
          typeof parsed.brushRadius === "number"
            ? parsed.brushRadius
            : DEFAULT_MAP_SETTINGS.brushRadius,
        gridSize:
          typeof parsed.gridSize === "number"
            ? parsed.gridSize
            : DEFAULT_MAP_SETTINGS.gridSize,
        gridColor:
          typeof parsed.gridColor === "string" || parsed.gridColor === null
            ? parsed.gridColor
            : DEFAULT_MAP_SETTINGS.gridColor,
      };
    } catch {
      return null;
    }
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
      showGrid: this.showGrid,
      brushRadius: this.brushRadius,
      gridSize: this.gridSize,
      gridColor: this.gridColor,
    };

    try {
      window.localStorage.setItem(
        this.getSettingsStorageKey(this.activeMapId),
        JSON.stringify(payload),
      );
    } catch (err) {
      console.warn("[MapStore] Failed to persist map settings", err);
    }
  }

  private getPageStateStorageKey(vaultId = vault.activeVaultId ?? "default") {
    return `${MAP_PAGE_STATE_STORAGE_PREFIX}:${vaultId}`;
  }

  private readPageState(): PersistedMapPageState | null {
    if (typeof window === "undefined") return null;

    try {
      const raw = window.localStorage.getItem(this.getPageStateStorageKey());
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
      window.localStorage.setItem(
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

  private applySettings(mapId: string | null) {
    const persisted = mapId ? this.readPersistedSettings(mapId) : null;
    const next = persisted ?? DEFAULT_MAP_SETTINGS;

    this.isRestoringSettings = true;
    try {
      this.showFog = next.showFog;
      this.showGrid = next.showGrid;
      this.brushRadius = next.brushRadius;
      this.gridSize = next.gridSize;
      this.gridColor = next.gridColor;
    } finally {
      this.isRestoringSettings = false;
    }
  }

  async setAsWorldMap(id: string) {
    // 1. Clear existing world map flag
    const maps = vault.maps ?? {};
    for (const mapId of Object.keys(maps)) {
      if (maps[mapId].isWorldMap) {
        maps[mapId] = { ...maps[mapId], isWorldMap: false };
      }
    }

    // 2. Set new world map
    if (maps[id]) {
      maps[id] = { ...maps[id], isWorldMap: true };
      await vault.saveMaps();
    }
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
    this.persistPageState();
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
    const vaultDir = await vault.getActiveVaultHandle();
    if (!vaultDir) {
      return undefined;
    }

    const id = crypto.randomUUID();
    const storageName = `${id}.webp`;

    // 1. Convert to WebP and Save to OPFS
    try {
      const webpBlob = await convertToWebP(file, 0.85);
      await writeOpfsFile(
        ["maps", storageName],
        webpBlob,
        vaultDir,
        vaultDir.name,
      );
    } catch (err) {
      console.error("[MapStore] Map upload failed", err);
      return undefined;
    }

    // 2. Create Map entity
    const map: Map = {
      id,
      name,
      assetPath: `maps/${storageName}`,
      dimensions: { width: 0, height: 0 }, // Will be updated on first load
      pins: [],
      fogOfWar: {
        maskPath: `maps/${id}_mask.png`,
      },
    };

    vault.maps[id] = map;
    await vault.saveMaps();
    this.selectMap(id);
    return id;
  }

  async saveMask(canvas: HTMLCanvasElement) {
    if (!this.activeMap?.fogOfWar || !this.activeMapId) return;
    const vaultDir = await vault.getActiveVaultHandle();
    if (!vaultDir) return;

    return vault.saveQueue.enqueue(`mask-${this.activeMapId}`, async () => {
      try {
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) =>
              b
                ? resolve(b)
                : reject(new Error("Failed to create blob from canvas")),
            "image/png",
          );
        });
        await writeOpfsFile(
          ["maps", `${this.activeMapId}_mask.png`],
          blob,
          vaultDir,
          vaultDir.name,
        );
      } catch (err) {
        console.error("[MapStore] Failed to save mask", err);
      }
    });
  }

  async loadMask(width: number, height: number): Promise<HTMLCanvasElement> {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;

    // Default: transparent (everything hidden by fog)
    // The fog renderer uses destination-out, meaning OPAQUE mask pixels erase the fog,
    // and TRANSPARENT mask pixels leave the fog intact.
    ctx.clearRect(0, 0, width, height);

    if (!this.activeMap?.fogOfWar || !this.activeMapId) {
      return canvas;
    }

    const maskPath = this.activeMap.fogOfWar.maskPath;
    const isRemoteMask =
      /^([a-z]+:)?\/\//i.test(maskPath) ||
      maskPath.startsWith("blob:") ||
      maskPath.startsWith("data:");

    if (isRemoteMask) {
      try {
        const response = await fetch(maskPath);
        if (!response.ok) {
          throw new Error(`Failed to fetch remote fog mask: ${maskPath}`);
        }
        const blob = await response.blob();
        const bitmap = await createImageBitmap(blob);
        ctx.drawImage(bitmap, 0, 0, width, height);
        return canvas;
      } catch (e) {
        console.error("[MapStore] Failed to load remote fog mask:", e);
        return canvas;
      }
    }

    const vaultDir = await vault.getActiveVaultHandle();
    if (!vaultDir) {
      return canvas;
    }

    try {
      const mapsDir = await vaultDir.getDirectoryHandle("maps");
      const fileHandle = await mapsDir.getFileHandle(
        `${this.activeMapId}_mask.png`,
      );
      const file = await fileHandle.getFile();
      const bitmap = await createImageBitmap(file);
      ctx.drawImage(bitmap, 0, 0, width, height);
    } catch (e: any) {
      if (e.name !== "NotFoundError") {
        console.error("[MapStore] Failed to load mask from disk:", e);
      }
      // No saved mask or not found: canvas is already transparent (fully hidden fog)
    }

    return canvas;
  }

  async addPin(entityId: string | undefined, coordinates: Point) {
    if (!this.activeMapId || !vault.maps[this.activeMapId]) return;

    let visuals = {};
    if (entityId) {
      const entity = vault.entities[entityId];
      if (entity) {
        const { categories } = await import("./categories.svelte");
        visuals = {
          color: categories.getColor(entity.type),
          // For now we don't have icon mapping, but could add it later
        };
      }
    }

    const newPin: MapPin = {
      id: crypto.randomUUID(),
      mapId: this.activeMapId,
      entityId,
      coordinates,
      visuals,
    };

    const map = vault.maps[this.activeMapId];
    if (map) {
      map.pins = [...map.pins, newPin];
      await vault.saveMaps();
    }
  }

  async removePin(pinId: string) {
    if (!this.activeMapId || !vault.maps[this.activeMapId]) {
      return;
    }

    const map = vault.maps[this.activeMapId];
    if (map) {
      map.pins = map.pins.filter((p) => p.id !== pinId);
      await vault.saveMaps();
    }
  }

  jumpToPin(pinId: string) {
    const pin = this.pins.find((p) => p.id === pinId);
    if (pin) {
      // Use a balanced zoom level for inspection
      const zoom = Math.max(1.2, this.viewport.zoom);
      this.viewport = {
        pan: {
          x: -pin.coordinates.x * zoom,
          y: -pin.coordinates.y * zoom,
        },
        zoom,
      };
    }
  }

  getEntitySubMap(entityId: string): Map | undefined {
    return Object.values(vault.maps).find((m) => m.parentEntityId === entityId);
  }
}

export const mapStore = new MapStore();

if (typeof window !== "undefined") {
  (window as any).__mapStore = mapStore;
}
