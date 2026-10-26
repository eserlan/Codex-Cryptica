import { mapStore } from "$lib/stores/map.svelte";
import { vault } from "$lib/stores/vault.svelte";

interface MapUploadStore {
  uploadMap(file: File, name: string): Promise<string | undefined>;
}

interface MapLinkVaultStore {
  maps: Record<string, { parentEntityId?: string }>;
  saveMaps(): Promise<void>;
}

/**
 * Uploads a rasterized image (e.g. a generator's diagram) and links it to an
 * entity's Map tab, mirroring the manual "Upload Map" flow in
 * DetailMapTab.svelte. Best-effort: a failed upload leaves the entity
 * without a linked map rather than blocking entity creation.
 */
export class EntityMapLinkingService {
  constructor(
    private mapStoreInstance: MapUploadStore = mapStore,
    private vaultInstance: MapLinkVaultStore = vault,
  ) {}

  async linkImageToEntity(
    file: File,
    mapName: string,
    entityId: string,
  ): Promise<string | undefined> {
    const mapId = await this.mapStoreInstance.uploadMap(file, mapName);
    if (!mapId) return undefined;
    const map = this.vaultInstance.maps[mapId];
    if (map) {
      map.parentEntityId = entityId;
      await this.vaultInstance.saveMaps();
    }
    return mapId;
  }
}

export const entityMapLinkingService = new EntityMapLinkingService();
