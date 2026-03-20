import { getDB } from "../../utils/idb";
import { vaultRegistry } from "../vault-registry.svelte";
import { themeStore } from "../theme.svelte";
import { mapRegistry } from "../map-registry.svelte";
import { canvasRegistry } from "../canvas-registry.svelte";
import type { LocalEntity } from "./types";

export class VaultLifecycleManager {
  constructor(
    private setStatus: (
      status: "idle" | "loading" | "saving" | "error",
    ) => void,
    private setErrorMessage: (msg: string | null) => void,
    private getActiveVaultId: () => string | null,
    private getActiveVaultHandle: () => Promise<
      FileSystemDirectoryHandle | undefined
    >,
    private repository: any,
    private loadFiles: (skipSyncIfWarm?: boolean) => Promise<void>,
    private getEntities: () => Record<string, LocalEntity>,
    private setDemoVaultName: (name: string | null) => void,
    private setInitialized: (val: boolean) => void,
    private getServices: () => any,
    private setHasConflictFiles: (val: boolean) => void,
    private setSelectedEntityId: (id: string | null) => void,
    private vaultRegistry: typeof import("../vault-registry.svelte").vaultRegistry,
    private themeStore: typeof import("../theme.svelte").themeStore,
    private ensureAssetPersisted: (
      path: string,
      handle: FileSystemDirectoryHandle,
    ) => Promise<void>,
  ) {}

  async importFromFolder(handle?: FileSystemDirectoryHandle): Promise<boolean> {
    const vaultDir = await this.getActiveVaultHandle();
    const activeVaultId = this.getActiveVaultId();
    if (!activeVaultId || !vaultDir) {
      this.setStatus("error");
      this.setErrorMessage("Vault not open");
      return false;
    }

    this.setStatus("loading");
    try {
      const { importFromFolder } = await import("./io");
      const result = await importFromFolder(activeVaultId, vaultDir, handle);
      if (result.success) {
        await this.loadFiles(false);
        const db = await getDB();
        const entityCount = Object.keys(this.getEntities()).length;
        const record = await db.get("vaults", activeVaultId);
        if (record) {
          record.entityCount = entityCount;
          await db.put("vaults", record);
          await vaultRegistry.listVaults();
        }
        this.setStatus("idle");
        return true;
      } else {
        if (result.error !== "User cancelled") {
          this.setStatus("error");
          this.setErrorMessage(result.error || "Import failed");
        } else {
          this.setStatus("idle");
        }
        return false;
      }
    } catch (e: any) {
      this.setStatus("error");
      this.setErrorMessage(e.message);
      return false;
    }
  }

  async loadFromFolder(handle: FileSystemDirectoryHandle): Promise<boolean> {
    let id: string;
    try {
      id = await this.createVault(handle.name);
    } catch {
      this.setStatus("error");
      this.setErrorMessage("Failed to create vault from folder");
      return false;
    }
    try {
      const db = await getDB();
      await db.put("settings", handle, `syncHandle_${id}`);
    } catch {
      console.warn("[VaultStore] Could not persist sync handle");
    }
    return this.importFromFolder(handle);
  }

  async switchVault(id: string) {
    if (this.getActiveVaultId() === id) return;
    this.repository.clear();
    mapRegistry.maps = {};
    canvasRegistry.clear();
    this.setSelectedEntityId(null);
    this.setHasConflictFiles(false);
    this.setStatus("loading");

    await vaultRegistry.setActiveVault(id);
    await this.loadFiles(true);
    await themeStore.loadForVault(id);
    this.setStatus("idle");
    window.dispatchEvent(new CustomEvent("vault-switched", { detail: { id } }));
  }

  async createVault(name: string): Promise<string> {
    const newId = await vaultRegistry.createVault(name);
    await this.switchVault(newId);
    return newId;
  }

  async deleteVault(id: string) {
    await vaultRegistry.deleteVault(id);
    if (this.getActiveVaultId() === id) {
      this.repository.clear();
      mapRegistry.maps = {};
      canvasRegistry.clear();
      const nextVault = vaultRegistry.availableVaults[0];
      if (nextVault) {
        await this.switchVault(nextVault.id);
      }
    }
  }

  async loadDemoData(name: string, entities: Record<string, LocalEntity>) {
    this.repository.entities = entities;
    this.setDemoVaultName(name || null);
    this.setInitialized(true);
    this.setStatus("idle");
    const services = this.getServices();
    if (services?.search) {
      await services.search.clear();
      for (const entity of Object.values(
        this.repository.entities,
      ) as LocalEntity[]) {
        await services.search.index({
          id: entity.id,
          title: entity.title,
          content: entity.content,
          type: entity.type,
          path: (entity as LocalEntity)._path?.join("/") || `${entity.id}.md`,
          keywords: [
            ...(entity.tags || []),
            entity.lore || "",
            ...Object.values(entity.metadata || {}).flat(),
          ].join(" "),
          updatedAt: Date.now(),
        });
      }
    }
  }

  async persistToIndexedDB(vaultId: string) {
    this.setStatus("saving");
    try {
      await vaultRegistry.setActiveVault(vaultId);
      const vaultDir = await this.getActiveVaultHandle();
      if (!vaultDir) throw new Error("Could not get vault handle");

      const entities = Object.values(this.getEntities());

      // 1. Migrate associated assets (images/thumbnails) to the new vault folder
      for (const entity of entities) {
        if (entity.image) {
          await this.ensureAssetPersisted(entity.image, vaultDir);
        }
        if (entity.thumbnail) {
          await this.ensureAssetPersisted(entity.thumbnail, vaultDir);
        }
      }

      // 2. Save entities as Markdown files in the new vault
      for (const entity of entities) {
        await this.repository.saveToDisk(vaultDir, vaultId, entity, false);
      }

      this.setDemoVaultName(null);
      this.setStatus("idle");
    } catch (err: any) {
      console.error("[VaultStore] Persistence failed:", err);
      this.setStatus("error");
      this.setErrorMessage("Failed to persist demo data.");
      throw err;
    }
  }
}
