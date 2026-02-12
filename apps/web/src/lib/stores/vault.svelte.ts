// apps/web/src/lib/stores/vault.svelte.ts
import { getDB } from "../utils/idb";
import { getVaultDir } from "../utils/opfs";
import { KeyedTaskQueue } from "../utils/queue";
import type { Entity } from "schema";
import type { IStorageAdapter } from "../cloud-bridge/types";
import { debugStore } from "./debug.svelte";
import type { LocalEntity } from "./vault/types";
export type { LocalEntity };

import * as vaultIO from "./vault/io";
import * as vaultAssets from "./vault/assets";
import * as vaultMigration from "./vault/migration";
import * as vaultRelationships from "./vault/relationships";
import * as vaultEntities from "./vault/entities";
import { vaultRegistry } from "./vault-registry.svelte";

// Service Interfaces for Dependency Injection
export interface IVaultServices {
  search: {
    index: (data: any) => Promise<void>;
    remove: (id: string) => Promise<void>;
    clear: () => Promise<void>;
  };
  ai: {
    clearStyleCache: () => void;
  };
}

class VaultStore {
  entities = $state<Record<string, LocalEntity>>({});
  status = $state<"idle" | "loading" | "saving" | "error">("idle");
  isInitialized = $state(false);
  errorMessage = $state<string | null>(null);
  selectedEntityId = $state<string | null>(null);
  migrationRequired = $state(false);

  // Fog of War Settings
  defaultVisibility = $state<"visible" | "hidden">("visible");

  // State (Mirrored/Proxied from Registry or local)
  isOpfs = $state(true);
  isGuest = $state(false);
  storageAdapter: IStorageAdapter | null = null;

  // Services (Injected)
  private services: IVaultServices | null = null;

  // Registry Accessors
  get activeVaultId() {
    return vaultRegistry.activeVaultId;
  }
  get vaultName() {
    return vaultRegistry.vaultName;
  }
  get availableVaults() {
    return vaultRegistry.availableVaults;
  }

  // Derived adjacency map - automatically stays in sync with entities!
  inboundConnections = $derived.by(() => {
    return vaultRelationships.rebuildInboundMap(this.entities);
  });

  labelIndex = $derived.by(() => {
    const seen = new Set<string>();
    for (const entity of Object.values(this.entities)) {
      for (const label of entity.labels || []) {
        seen.add(label.trim().toLowerCase());
      }
    }
    return Array.from(seen).sort((a, b) => a.localeCompare(b));
  });

  get allEntities() {
    return Object.values(this.entities);
  }

  #legacyFSAHandle: FileSystemDirectoryHandle | undefined = undefined;

  private async getActiveVaultHandle(): Promise<
    FileSystemDirectoryHandle | undefined
  > {
    if (!vaultRegistry.rootHandle || !this.activeVaultId) return undefined;
    return await getVaultDir(vaultRegistry.rootHandle, this.activeVaultId);
  }

  private saveQueue = new KeyedTaskQueue();

  get pendingSaveCount() {
    return this.saveQueue.totalPendingCount;
  }

  constructor() {
    console.log("[VaultStore] New Instance Created", Date.now());
  }

  async createVault(name: string): Promise<string> {
    const id = await vaultRegistry.createVault(name);
    await this.switchVault(id);
    return id;
  }

  async switchVault(id: string): Promise<void> {
    if (this.activeVaultId === id && this.isInitialized) return;

    await this.saveQueue.waitForAll();
    this.entities = {};

    // Clear chat history in DB before switching
    const db = await getDB();
    try {
      const tx = db.transaction("chat_history", "readwrite");
      await tx.store.clear();
      await tx.done;
    } catch (e) {
      console.warn("[VaultStore] Failed to clear chat history", e);
    }

    this.status = "loading";
    this.errorMessage = null;

    await vaultRegistry.setActiveVault(id);

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("vault-switched", { detail: { id } }),
      );
    }

    await this.loadFiles();
  }

  async init(injectedServices?: IVaultServices) {
    this.isInitialized = false;
    this.status = "loading";
    debugStore.log(`Vault initializing (v${__APP_VERSION__}) [OPFS Mode]...`);

    // Handle Dependency Injection
    if (injectedServices) {
      this.services = injectedServices;
    } else if (typeof window !== "undefined") {
      // Lazy load real services if not injected (browser runtime)
      const { searchService } = await import("../services/search");
      const { aiService } = await import("../services/ai");
      this.services = {
        search: searchService,
        ai: aiService,
      };
    }

    try {
      await vaultRegistry.init();
      const opfsRoot = vaultRegistry.rootHandle;
      if (!opfsRoot) throw new Error("OPFS Root failed to initialize");

      const db = await getDB();
      const savedVisibility = await db.get("settings", "defaultVisibility");
      if (savedVisibility) {
        this.defaultVisibility = savedVisibility;
      }

      const migration = await vaultMigration.checkForMigration();
      if (migration.required && migration.handle) {
        this.migrationRequired = true;
        await vaultMigration.runMigration(
          opfsRoot,
          migration.handle,
          true,
          () => this.loadFiles(),
          (status, err) => {
            this.status = status;
            if (err) this.errorMessage = err;
          },
        );
      }

      await vaultMigration.migrateStructure(opfsRoot);

      // If we have an active vault from registry, load it
      if (this.activeVaultId) {
        await this.loadFiles();
      }
    } catch (err) {
      console.error("[VaultStore] Init failed", err);
      debugStore.error("Vault Store initialization failed", err);
      this.status = "error";
      this.errorMessage =
        "Failed to initialize storage. Please check browser support for OPFS.";
    } finally {
      this.isInitialized = true;
      if (this.status !== "error") this.status = "idle";
    }
  }

  async syncToLocal() {
    const vaultDir = await this.getActiveVaultHandle();
    if (!this.activeVaultId || !vaultDir) {
      this.status = "error";
      this.errorMessage = "No active vault to sync.";
      return;
    }

    await vaultIO.syncToLocal(this.activeVaultId, vaultDir, (status, msg) => {
      this.status = status;
      if (status === "error") this.errorMessage = msg || "Sync failed";
    });
  }

  async importFromFolder(handle?: FileSystemDirectoryHandle): Promise<boolean> {
    const vaultDir = await this.getActiveVaultHandle();
    if (!this.activeVaultId || !vaultDir) {
      this.status = "error";
      this.errorMessage = "Vault not open";
      return false;
    }

    this.status = "loading";
    const result = await vaultIO.importFromFolder(
      this.activeVaultId,
      vaultDir,
      handle,
    );

    if (result.success) {
      await this.loadFiles();
      const db = await getDB();
      const entityCount = Object.keys(this.entities).length;
      const record = await db.get("vaults", this.activeVaultId);
      if (record) {
        record.entityCount = entityCount;
        await db.put("vaults", record);
        await vaultRegistry.listVaults();
      }
      return true;
    } else {
      if (result.error !== "User cancelled") {
        this.status = "error";
        this.errorMessage = result.error || "Import failed";
      }
      this.status = "idle";
      return false;
    }
  }

  async loadFiles() {
    const vaultDir = await this.getActiveVaultHandle();
    if (!this.activeVaultId || !vaultDir) return;

    this.status = "loading";
    try {
      if (this.services) this.services.ai.clearStyleCache();

      const { entities } = await vaultIO.loadVaultFiles(
        this.activeVaultId,
        vaultDir,
      );
      this.entities = entities;
      this.status = "idle";
    } catch (err) {
      console.error("[VaultStore] loadFiles failed", err);
      this.status = "error";
      this.errorMessage = "Failed to load vault files";
    } finally {
      this.isInitialized = true;
    }
  }

  async saveToDisk(entity: Entity, targetVaultId?: string | null) {
    const vid = targetVaultId || this.activeVaultId;
    if (!vid || !vaultRegistry.rootHandle) return;
    const vaultDir = await getVaultDir(vaultRegistry.rootHandle, vid);

    try {
      await vaultIO.saveEntityToDisk(
        vaultDir,
        vid,
        entity as LocalEntity,
        this.isGuest,
      );
      if (this.services) {
        const path =
          (entity as LocalEntity)._path?.join("/") || `${entity.id}.md`;
        const keywords = [
          ...(entity.tags || []),
          entity.lore || "",
          ...Object.values(entity.metadata || {}).flat(),
        ].join(" ");
        await this.services.search.index({
          id: entity.id,
          title: entity.title,
          content: entity.content,
          type: entity.type,
          path,
          keywords,
          updatedAt: Date.now(),
        });
      }
    } catch (err: any) {
      this.status = "error";
      this.errorMessage = `Failed to save ${entity.title}: ${err.message}`;
      debugStore.error(`Save to OPFS failed for ${entity.id}`, err);
    }
  }

  scheduleSave(entity: Entity) {
    this.status = "saving";
    const targetVaultId = this.activeVaultId;
    this.saveQueue
      .enqueue(entity.id, async () => {
        await this.saveToDisk(entity, targetVaultId);
        this.status = "idle";
      })
      .catch((err) => {
        console.error("Save failed for", entity.title, err);
        this.status = "error";
      });
  }

  async createEntity(
    type: Entity["type"] = "note",
    title = "New Entity",
    initialData: Partial<Entity> = {},
  ): Promise<string> {
    const newEntity = vaultEntities.createEntity(
      title,
      type,
      initialData,
      this.entities,
    );
    this.entities[newEntity.id] = newEntity;
    this.scheduleSave(newEntity);
    return newEntity.id;
  }

  updateEntity(id: string, updates: Partial<Entity>): boolean {
    const { entities, updated } = vaultEntities.updateEntity(
      this.entities,
      id,
      updates,
    );
    if (!updated) return false;

    this.entities = entities;

    const styleKeywords = [
      "art style",
      "visual aesthetic",
      "world guide",
      "style",
    ];
    if (
      styleKeywords.some(
        (kw) =>
          updated.title.toLowerCase().includes(kw) ||
          (updates.title && updates.title.toLowerCase().includes(kw)),
      )
    ) {
      if (this.services) this.services.ai.clearStyleCache();
    }

    this.scheduleSave(updated);
    return true;
  }

  async deleteEntity(id: string): Promise<void> {
    if (this.isGuest) throw new Error("Cannot delete entities in Guest Mode");
    const vaultDir = await this.getActiveVaultHandle();
    if (!vaultDir) return;

    const { entities, deletedEntity, modifiedIds } =
      await vaultEntities.deleteEntity(vaultDir, this.entities, id);
    if (deletedEntity) {
      this.entities = entities;
      modifiedIds.forEach((mId) => {
        const entity = this.entities[mId];
        if (entity) this.scheduleSave(entity);
      });
      if (this.services) await this.services.search.remove(id);
    }
  }

  addLabel(id: string, label: string): boolean {
    const { entities, updated } = vaultEntities.addLabel(
      this.entities,
      id,
      label,
    );
    if (updated) {
      this.entities = entities;
      this.scheduleSave(updated);
      return true;
    }
    return false;
  }

  removeLabel(id: string, label: string): boolean {
    const { entities, updated } = vaultEntities.removeLabel(
      this.entities,
      id,
      label,
    );
    if (updated) {
      this.entities = entities;
      this.scheduleSave(updated);
      return true;
    }
    return false;
  }

  addConnection(
    sourceId: string,
    targetId: string,
    type: string,
    label?: string,
  ): boolean {
    const { entities, updatedSource } = vaultEntities.addConnection(
      this.entities,
      sourceId,
      targetId,
      type,
      label,
    );
    if (updatedSource) {
      this.entities = entities;
      this.scheduleSave(updatedSource);
      return true;
    }
    return false;
  }

  updateConnection(
    sourceId: string,
    targetId: string,
    oldType: string,
    newType: string,
    newLabel?: string,
  ): boolean {
    const { entities, updatedSource } = vaultEntities.updateConnection(
      this.entities,
      sourceId,
      targetId,
      oldType,
      newType,
      newLabel,
    );
    if (updatedSource) {
      this.entities = entities;
      this.scheduleSave(updatedSource);
      return true;
    }
    return false;
  }

  removeConnection(sourceId: string, targetId: string, type: string): boolean {
    const { entities, updatedSource } = vaultEntities.removeConnection(
      this.entities,
      sourceId,
      targetId,
      type,
    );
    if (updatedSource) {
      this.entities = entities;
      this.scheduleSave(updatedSource);
      return true;
    }
    return false;
  }

  async saveImageToVault(
    blob: Blob,
    entityId: string,
    originalName?: string,
  ): Promise<string> {
    if (this.isGuest) throw new Error("Cannot save images in Guest Mode");
    const vaultDir = await this.getActiveVaultHandle();
    if (!vaultDir) throw new Error("Vault not open");

    const entity = this.entities[entityId];
    if (!entity) throw new Error(`Entity ${entityId} not found`);

    const { image, thumbnail } = await vaultAssets.saveImageToVault(
      vaultDir,
      blob,
      entityId,
      originalName,
    );
    this.updateEntity(entityId, { image, thumbnail });
    return image;
  }

  async batchCreateEntities(
    batch: {
      type: Entity["type"];
      title: string;
      initialData?: Partial<Entity>;
    }[],
  ): Promise<string[]> {
    const createdIds: string[] = [];
    for (const item of batch) {
      try {
        const id = await this.createEntity(
          item.type,
          item.title,
          item.initialData,
        );
        createdIds.push(id);
      } catch (err) {
        console.warn(`Batch item failed: ${item.title}`, err);
      }
    }
    return createdIds;
  }

  async resolveImageUrl(path: string): Promise<string> {
    const vaultDir = await this.getActiveVaultHandle();
    return await vaultAssets.resolveImageUrl(vaultDir, path);
  }

  async setDefaultVisibility(visibility: "visible" | "hidden") {
    this.defaultVisibility = visibility;
    const db = await getDB();
    await db.put("settings", visibility, "defaultVisibility");
  }
}

const VAULT_KEY = "__codex_vault_instance__";
export const vault: VaultStore =
  (globalThis as any)[VAULT_KEY] ??
  ((globalThis as any)[VAULT_KEY] = new VaultStore());
