import { vault } from "./vault.svelte";
import { uiStore } from "./ui.svelte";
import type { Map, MapPin, Point, ViewportTransform } from "schema";
import { imageToViewport, viewportToImage } from "map-engine";
import { convertToWebP } from "../utils/image-processing";

class MapStore {
  activeMapId = $state<string | null>(null);
  viewport = $state<ViewportTransform>({
    pan: { x: 0, y: 0 },
    zoom: 1,
  });
  canvasSize = $state({ width: 0, height: 0 });
  pendingPinCoords = $state<Point | null>(null);
  showFog = $state(true);
  isGMMode = $derived(!uiStore.sharedMode);
  brushRadius = $state(50);
  navigationStack = $state<string[]>([]);
  showGrid = $state(false);
  gridSize = $state(50);

  activeMap = $derived.by(() => {
    return this.activeMapId ? vault.maps[this.activeMapId] : null;
  });

  worldMap = $derived.by(() => {
    return Object.values(vault.maps).find((m) => m.isWorldMap) || null;
  });

  canGoBack = $derived(this.navigationStack.length > 0);

  pins = $derived.by(() => {
    return this.activeMap?.pins || [];
  });

  constructor() {
    // Clear stack on vault switch and handle auto-selection
    if (typeof window !== "undefined") {
      window.addEventListener("vault-switched", () => {
        this.navigationStack = [];
        this.activeMapId = null;
      });

      // Reactive auto-selection when maps are loaded or activeMapId is lost/invalid
      $effect.root(() => {
        $effect(() => {
          const isInvalid = this.activeMapId && !vault.maps[this.activeMapId];
          if ((!this.activeMapId || isInvalid) && this.worldMap) {
            this.selectMap(this.worldMap.id);
          }
        });
      });
    }
  }

  async setAsWorldMap(id: string) {
    // 1. Clear existing world map flag
    for (const mapId of Object.keys(vault.maps)) {
      if (vault.maps[mapId].isWorldMap) {
        vault.maps[mapId] = { ...vault.maps[mapId], isWorldMap: false };
      }
    }

    // 2. Set new world map
    if (vault.maps[id]) {
      vault.maps[id] = { ...vault.maps[id], isWorldMap: true };
      await vault.saveMaps();
    }
  }

  selectMap(id: string, pushToStack = false) {
    if (this.activeMapId === id) return;
    if (pushToStack && this.activeMapId && this.activeMapId !== id) {
      this.navigationStack.push(this.activeMapId);
    }
    this.activeMapId = id;
    this.viewport = { pan: { x: 0, y: 0 }, zoom: 1 };
  }

  goBack() {
    const prevId = this.navigationStack.pop();
    if (prevId) {
      this.activeMapId = prevId;
      this.viewport = { pan: { x: 0, y: 0 }, zoom: 1 };
    }
  }

  updateViewport(pan: Point, zoom: number) {
    this.viewport = { pan, zoom };
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

      const mapsDir = await vaultDir.getDirectoryHandle("maps", {
        create: true,
      });
      const fileHandle = await mapsDir.getFileHandle(storageName, {
        create: true,
      });
      const writable = await fileHandle.createWritable();
      await writable.write(webpBlob);
      await writable.close();
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
        const mapsDir = await vaultDir.getDirectoryHandle("maps", {
          create: true,
        });
        const fileHandle = await mapsDir.getFileHandle(
          `${this.activeMapId}_mask.png`,
          { create: true },
        );
        const writable = await fileHandle.createWritable();

        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) =>
              b
                ? resolve(b)
                : reject(new Error("Failed to create blob from canvas")),
            "image/png",
          );
        });
        await writable.write(blob);
        await writable.close();
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
