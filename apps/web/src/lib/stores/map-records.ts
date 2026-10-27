import type { Map } from "schema";
import { vault as defaultVault } from "./vault.svelte";
import { convertToWebP } from "../utils/image-processing";
import { deleteOpfsEntry, writeOpfsFile } from "../utils/opfs";
import {
  systemIdGenerator,
  type IdGenerator,
} from "#lib/utils/runtime-deps.js";

/** Fixed canvas size for a blank map, which has no image to derive size from. */
export const BLANK_MAP_SIZE = 4000;

type MapRecordVault = Pick<
  typeof defaultVault,
  | "maps"
  | "saveMaps"
  | "saveMapsWithResult"
  | "getActiveVaultHandle"
  | "releaseImageUrl"
>;

/** Map creation, image replacement and map-record queries. */
export class MapRecords {
  constructor(
    private readonly selectMap: (id: string) => void,
    private readonly idGenerator: IdGenerator = systemIdGenerator,
    private readonly vault: MapRecordVault = defaultVault,
  ) {}

  async setAsWorldMap(id: string) {
    // 1. Clear existing world map flag
    const maps = this.vault.maps ?? {};
    for (const mapId of Object.keys(maps)) {
      if (maps[mapId].isWorldMap) {
        maps[mapId] = { ...maps[mapId], isWorldMap: false };
      }
    }

    // 2. Set new world map
    if (maps[id]) {
      maps[id] = { ...maps[id], isWorldMap: true };
      await this.vault.saveMaps();
    }
  }

  async uploadMap(file: File, name: string): Promise<string | undefined> {
    const vaultDir = await this.vault.getActiveVaultHandle();
    if (!vaultDir) {
      return undefined;
    }

    const id = this.idGenerator.uuid();
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

    this.vault.maps[id] = map;
    await this.vault.saveMaps();
    this.selectMap(id);
    return id;
  }

  private async rollbackFailedImageReplacement(
    mapId: string,
    previousMap: Map,
    replacementMap: Map,
    vaultDir: FileSystemDirectoryHandle,
    storageName: string,
  ): Promise<void> {
    // Keep edits made while the metadata save was pending, but restore the
    // fields changed by this replacement operation.
    const currentMap = this.vault.maps[mapId];
    if (currentMap?.assetPath === replacementMap.assetPath) {
      this.vault.maps[mapId] = {
        ...currentMap,
        assetPath: previousMap.assetPath,
        dimensions: previousMap.dimensions,
      };
    }

    await deleteOpfsEntry(vaultDir, ["maps", storageName], vaultDir.name).catch(
      (err) =>
        console.warn("[MapStore] Could not remove the unsaved map image", err),
    );
  }

  /**
   * Swaps a map's background image for a new one, keeping its pins, tokens
   * and fog. Used to recover a map whose image is missing or unreadable.
   * Dimensions are reset so they are recomputed from the new image on load.
   */
  async replaceMapImage(mapId: string, file: File): Promise<boolean> {
    const map = this.vault.maps[mapId];
    const vaultDir = await this.vault.getActiveVaultHandle();
    if (!map || !vaultDir) {
      return false;
    }

    const storageName = `${this.idGenerator.uuid()}.webp`;
    try {
      const webpBlob = await convertToWebP(file, 0.85);
      await writeOpfsFile(
        ["maps", storageName],
        webpBlob,
        vaultDir,
        vaultDir.name,
      );
    } catch (err) {
      console.error("[MapStore] Map image replacement failed", err);
      return false;
    }

    const previousPath = map.assetPath;
    const replacementMap: Map = {
      ...map,
      assetPath: `maps/${storageName}`,
      dimensions: { width: 0, height: 0 },
    };
    this.vault.maps[mapId] = replacementMap;
    if (!(await this.vault.saveMapsWithResult())) {
      // saveMaps reports storage errors instead of throwing. Restore the
      // in-memory map and keep the old image, which the on-disk metadata may
      // still reference.
      await this.rollbackFailedImageReplacement(
        mapId,
        map,
        replacementMap,
        vaultDir,
        storageName,
      );
      return false;
    }

    // Best-effort cleanup of the old local file and any cached object URL.
    if (previousPath) {
      this.vault.releaseImageUrl?.(previousPath);
      if (previousPath.startsWith("maps/")) {
        await deleteOpfsEntry(
          vaultDir,
          previousPath.split("/"),
          vaultDir.name,
        ).catch((err) =>
          console.warn("[MapStore] Could not remove the old map image", err),
        );
      }
    }
    return true;
  }

  /**
   * Creates a map with no background image — a fixed-size blank canvas meant
   * to be built up entirely from placed tile-deck tiles.
   */
  async createBlankMap(name: string): Promise<string | undefined> {
    const vaultDir = await this.vault.getActiveVaultHandle();
    if (!vaultDir) {
      return undefined;
    }

    const id = this.idGenerator.uuid();
    const map: Map = {
      id,
      name,
      assetPath: "",
      dimensions: { width: BLANK_MAP_SIZE, height: BLANK_MAP_SIZE },
      pins: [],
      fogOfWar: {
        maskPath: `maps/${id}_mask.png`,
      },
    };

    this.vault.maps[id] = map;
    await this.vault.saveMaps();
    this.selectMap(id);
    return id;
  }

  getEntitySubMap(entityId: string): Map | undefined {
    // ⚡ Bolt Optimization: Replace Object.values().find() with an imperative loop over keys
    // to avoid array allocation during this frequent lookup.
    for (const key in this.vault.maps) {
      if (this.vault.maps[key].parentEntityId === entityId) {
        return this.vault.maps[key];
      }
    }
    return undefined;
  }
}
