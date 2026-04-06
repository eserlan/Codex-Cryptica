import type { Map } from "schema";
import { getVaultDir, deleteOpfsEntry } from "../utils/opfs";
import { vaultRegistry } from "./vault-registry.svelte";
import { uiStore } from "./ui.svelte";
import { saveMapsToDisk, loadMapsFromDisk } from "./vault/io";
import type { KeyedTaskQueue } from "@codex/vault-engine";

class MapRegistryStore {
  maps = $state<Record<string, Map>>({});
  status = $state<"idle" | "loading" | "saving" | "error">("idle");
  private saveQueue: KeyedTaskQueue | null = null;

  init(saveQueue: KeyedTaskQueue) {
    this.saveQueue = saveQueue;
  }

  async loadFromVault(vaultId: string) {
    if (!vaultRegistry.rootHandle) return;
    this.status = "loading";
    try {
      const vaultDir = await getVaultDir(vaultRegistry.rootHandle, vaultId);
      this.maps = await loadMapsFromDisk(vaultDir);
      this.status = "idle";
    } catch (e) {
      console.error("[MapRegistryStore] Failed to load maps", e);
      this.status = "error";
    }
  }

  async saveMaps() {
    if (
      !vaultRegistry.activeVaultId ||
      !vaultRegistry.rootHandle ||
      !this.saveQueue
    )
      return;
    const vaultId = vaultRegistry.activeVaultId;

    this.status = "saving";
    return this.saveQueue.enqueue("maps-metadata", async () => {
      try {
        const vaultDir = await getVaultDir(vaultRegistry.rootHandle!, vaultId);
        await saveMapsToDisk(vaultDir, this.maps);
        this.status = "idle";
      } catch (err) {
        console.error("[MapRegistryStore] Failed to save maps", err);
        this.status = "error";
        uiStore.notify(
          "Failed to save map data. Please check your storage quota.",
          "error",
        );
      }
    });
  }

  async deleteMap(id: string): Promise<void> {
    const activeVaultId = vaultRegistry.activeVaultId;
    if (!activeVaultId || !vaultRegistry.rootHandle || !this.saveQueue) return;

    if (
      uiStore.isDemoMode &&
      !(typeof window !== "undefined" && (window as any).__E2E__)
    ) {
      uiStore.notify("Deletion is disabled in Demo Mode.", "info");
      return;
    }

    const vaultDir = await getVaultDir(vaultRegistry.rootHandle, activeVaultId);
    const map = this.maps[id];
    if (!map) return;

    const newMaps = { ...this.maps };
    delete newMaps[id];
    this.maps = newMaps;

    return this.saveQueue.enqueue(`delete-map-${id}`, async () => {
      try {
        if (map.assetPath) {
          const pathSegments = map.assetPath.split("/");
          await deleteOpfsEntry(vaultDir, pathSegments, activeVaultId).catch(
            (e) => {
              if (e.name !== "NotFoundError") throw e;
            },
          );
        }

        if (map.fogOfWar?.maskPath) {
          const maskSegments = map.fogOfWar.maskPath.split("/");
          await deleteOpfsEntry(vaultDir, maskSegments, activeVaultId).catch(
            (e) => {
              if (e.name !== "NotFoundError") throw e;
            },
          );
        }

        await saveMapsToDisk(vaultDir, this.maps);
      } catch (err: any) {
        console.error("[MapRegistryStore] Failed to delete map files", err);
        this.status = "error";
        uiStore.notify(`Failed to fully delete map: ${err.message}`, "error");
      }
    });
  }
}

export const mapRegistry = new MapRegistryStore();
