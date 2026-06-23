import type { Map } from "schema";
import { getVaultDir, deleteOpfsEntry } from "../utils/opfs";
import { vaultRegistry } from "./vault-registry.svelte";
import { saveMapsToDisk, loadMapsFromDisk } from "./vault/io";
import type { KeyedTaskQueue } from "@codex/vault-engine";
import { notificationStore } from "$lib/stores/ui/notification.svelte";
import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
import { guestVault } from "./guest-vault.svelte";

class MapRegistryStore {
  _maps = $state<Record<string, Map>>({});
  get maps() {
    if (sessionModeStore.isGuestMode) {
      const record: Record<string, Map> = {};
      for (const m of guestVault.maps) {
        record[m.id] = m;
      }
      return record;
    }
    return this._maps;
  }
  set maps(val: Record<string, Map>) {
    this._maps = val;
  }

  allMaps = $derived.by(() => {
    if (sessionModeStore.isGuestMode) {
      return guestVault.maps;
    }
    return Object.values(this.maps);
  });
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

        // Update dirty tracking timestamp
        import("./vault/registry").then((m) =>
          m.updateLastInternalChange(vaultId),
        );

        this.status = "idle";
      } catch (err) {
        console.error("[MapRegistryStore] Failed to save maps", err);
        this.status = "error";
        notificationStore.notify(
          "Failed to save map data. Please check your storage quota.",
          "error",
        );
      }
    });
  }

  async deleteMap(id: string): Promise<void> {
    const activeVaultId = vaultRegistry.activeVaultId;
    if (!activeVaultId || !vaultRegistry.rootHandle || !this.saveQueue) return;

    if (sessionModeStore.isDemoMode) {
      notificationStore.notify("Deletion is disabled in Demo Mode.", "info");
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

        // Update dirty tracking timestamp
        import("./vault/registry").then((m) =>
          m.updateLastInternalChange(activeVaultId),
        );
      } catch (err: any) {
        console.error("[MapRegistryStore] Failed to delete map files", err);
        this.status = "error";
        notificationStore.notify(
          `Failed to fully delete map: ${err.message}`,
          "error",
        );
      }
    });
  }
}

export const mapRegistry = new MapRegistryStore();
