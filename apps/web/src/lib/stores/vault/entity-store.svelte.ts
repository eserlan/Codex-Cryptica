import { vaultEventBus } from "./events";
import * as vaultRelationships from "./relationships";
import type { LocalEntity, BatchCreateInput } from "./types";
import * as vaultEntities from "./entities";
import { VaultRepository } from "@codex/vault-engine";
import type { Entity } from "schema";
import { debugStore } from "../debug.svelte";
import { cacheService } from "../../services/cache.svelte";
import { uiStore } from "../ui.svelte";
import type { InboundMap } from "./relationships";

export interface EntityStoreDependencies {
  repository: VaultRepository;
  activeVaultId: () => string | null;
  isGuest: () => boolean;
  getGuestFile?: (path: string) => Promise<Blob>;
  getActiveVaultHandle: () => Promise<FileSystemDirectoryHandle | undefined>;
  getSpecificVaultHandle: (
    vaultId: string,
  ) => Promise<FileSystemDirectoryHandle | undefined>;
  getActiveSyncHandle: () => Promise<FileSystemDirectoryHandle | undefined>;
  getServices: () => any;
  invalidateUrlCache?: (path: string) => void;
  setStatus: (status: "idle" | "loading" | "saving" | "error") => void;
  setErrorMessage: (msg: string | null) => void;
  // callbacks
  onEntityUpdate?: (entity: LocalEntity) => void;
  onEntityDelete?: (entityId: string) => void;
  onBatchUpdate?: (updates: Record<string, Partial<LocalEntity>>) => void;
  updateEntityCount: (vaultId: string, count: number) => Promise<void>;
}

const SAVE_DEBOUNCE_MS = 400;

export class EntityStore {
  private _contentLoadedIds = $state(new Set<string>());
  private _contentVerifiedIds = $state(new Set<string>());
  private _saveTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private _saveResolvers = new Map<string, Array<() => void>>();

  /**
   * Pre-loaded helper modules to avoid dynamic import overhead.
   */
  private _helpers: {
    readFileAsText?: any;
    parseMarkdown?: any;
  } = {};

  get entities() {
    return this.deps.repository.entities;
  }

  set entities(val: Record<string, LocalEntity>) {
    this.deps.repository.entities = val;
  }

  allEntities: LocalEntity[];
  allActiveEntities: LocalEntity[];
  inboundConnections: InboundMap;
  labelIndex: string[];

  constructor(private deps: EntityStoreDependencies) {
    this.allEntities = $derived.by(() => Object.values(this.entities));
    this.allActiveEntities = $derived.by(() =>
      this.allEntities.filter((e) => e.status !== "draft"),
    );
    this.inboundConnections = $derived.by(() =>
      vaultRelationships.rebuildInboundMap(this.entities),
    );
    this.labelIndex = $derived.by(() => {
      const labels = new Set<string>();
      for (const entity of this.allEntities) {
        if (entity.labels) {
          entity.labels.forEach((l) => labels.add(l));
        }
      }
      return Array.from(labels).sort();
    });

    // BACKGROUND: Pre-load modules needed for content loading
    if (typeof window !== "undefined") {
      import("../../utils/opfs")
        .then((m) => (this._helpers.readFileAsText = m.readFileAsText))
        .catch(() => {});
      import("../../utils/markdown")
        .then((m) => (this._helpers.parseMarkdown = m.parseMarkdown))
        .catch(() => {});
    }

    vaultEventBus.subscribe((event) => {
      if (event.type === "VAULT_OPENING") {
        this._contentLoadedIds.clear();
        this._contentVerifiedIds.clear();
      }
      if (event.type === "SYNC_CHUNK_READY") {
        for (const id of event.newOrChangedIds) {
          const entity = event.entities[id];
          if (entity?.content) {
            this._contentLoadedIds.add(id);
            this._contentVerifiedIds.add(id);
          }
        }
      }
    }, "entity-store-content-tracker");
  }

  // --- Save Coordination ---

  scheduleSave(entity: LocalEntity | Entity): Promise<void> {
    if (this.deps.onEntityUpdate)
      this.deps.onEntityUpdate(entity as LocalEntity);

    const vaultIdAtStart = this.deps.activeVaultId();
    if (!vaultIdAtStart) return Promise.resolve();

    if (uiStore.isDemoMode) return Promise.resolve();

    const id = entity.id;

    // Debounce: cancel any pending timer for this entity and restart it.
    // All callers that scheduled a save within the window share the same
    // queue enqueue, so only one disk write fires per burst.
    const existing = this._saveTimers.get(id);
    if (existing) clearTimeout(existing);

    return new Promise<void>((resolve) => {
      // Collect resolvers so flushPendingSaves() can drain them immediately.
      const resolvers = this._saveResolvers.get(id) ?? [];
      resolvers.push(resolve);
      this._saveResolvers.set(id, resolvers);

      this._saveTimers.set(
        id,
        setTimeout(() => {
          this._saveTimers.delete(id);
          this._saveResolvers.delete(id);
          this.deps.repository.saveQueue
            .enqueue(id, () => this._persistEntity(id, vaultIdAtStart))
            .then(() => resolvers.forEach((r) => r()))
            .catch(() => resolvers.forEach((r) => r()));
        }, SAVE_DEBOUNCE_MS),
      );
    });
  }

  /**
   * Flush all pending debounce timers immediately, then wait for the
   * save queue to drain. Called by lifecycle before vault switching.
   */
  async flushPendingSaves(): Promise<void> {
    for (const [id, timer] of this._saveTimers) {
      clearTimeout(timer);
      this._saveTimers.delete(id);
      const resolvers = this._saveResolvers.get(id) ?? [];
      this._saveResolvers.delete(id);
      const vaultId = this.deps.activeVaultId();
      if (vaultId) {
        await this.deps.repository.saveQueue.enqueue(id, () =>
          this._persistEntity(id, vaultId),
        );
      }
      resolvers.forEach((r) => r());
    }
    await this.deps.repository.waitForAllSaves();
  }

  private async _persistEntity(
    id: string,
    vaultIdAtStart: string,
  ): Promise<void> {
    let latestEntity = this.entities[id];
    if (!latestEntity) return;

    if (!this.isContentLoaded(id)) {
      await this.internalLoadContent(id);
      latestEntity = this.entities[id] || latestEntity;
    }

    this.deps.setStatus("saving");
    try {
      const vaultHandle =
        await this.deps.getSpecificVaultHandle(vaultIdAtStart);
      if (!vaultHandle) {
        this.deps.setStatus("idle");
        return;
      }

      await this.deps.repository.saveToDisk(
        vaultHandle,
        vaultIdAtStart,
        latestEntity,
        this.deps.isGuest(),
      );

      const path = latestEntity._path || [`${latestEntity.id}.md`];
      await cacheService.set(
        `${vaultIdAtStart}:${path.join("/")}`,
        Date.now(),
        latestEntity,
      );

      this.markContentLoaded(latestEntity.id);
      this.deps.setStatus("idle");
    } catch (error) {
      debugStore.error("[EntityStore] Failed to save entity to disk", error);
      this.deps.setStatus("error");
      this.deps.setErrorMessage("Failed to access storage for saving.");
    }
  }

  // --- CRUD Operations ---

  async createEntity(
    type: Entity["type"],
    title: string,
    initialData: Partial<Entity> = {},
  ): Promise<string> {
    const newEntity = vaultEntities.createEntity(
      title,
      type,
      initialData,
      this.entities,
    );
    const updatedEntities = { ...this.entities };
    updatedEntities[newEntity.id] = newEntity;
    this.entities = updatedEntities;

    this._contentLoadedIds.add(newEntity.id);
    this._contentVerifiedIds.add(newEntity.id);

    const activeVaultId = this.deps.activeVaultId();
    await this.scheduleSave(newEntity);

    if (activeVaultId) {
      await this.deps.updateEntityCount(
        activeVaultId,
        Object.keys(this.entities).length,
      );
    }

    vaultEventBus.emit({
      type: "BATCH_CREATED",
      vaultId: activeVaultId || "unknown",
      entities: [newEntity],
    });

    return newEntity.id;
  }

  async updateEntity(
    id: string,
    updates: Partial<LocalEntity>,
  ): Promise<boolean> {
    const existing = this.entities[id];
    if (!existing) return false;

    // SAFETY: Never overwrite existing content/lore with null/undefined from a partial update.
    const safeUpdates = {
      ...updates,
      content:
        updates.content !== undefined ? updates.content : existing.content,
      lore: updates.lore !== undefined ? updates.lore : existing.lore,
    };

    const { entities, updated } = vaultEntities.updateEntity(
      this.entities,
      id,
      safeUpdates,
    );
    if (!updated) return false;

    this.entities = entities;

    if (
      updates.content !== undefined ||
      updates.lore !== undefined ||
      updates.title !== undefined ||
      updates.tags !== undefined
    ) {
      this._contentLoadedIds.add(id);
      this._contentVerifiedIds.add(id);
    }

    if (updates.image && this.deps.invalidateUrlCache) {
      this.deps.invalidateUrlCache(updates.image);
    }

    const services = this.deps.getServices();
    if (
      services?.ai &&
      ["art style", "style", "visual aesthetic"].some((kw) =>
        updated.title.toLowerCase().includes(kw),
      )
    ) {
      services.ai.clearStyleCache();
    }

    await this.scheduleSave(updated);

    vaultEventBus.emit({
      type: "ENTITY_UPDATED",
      vaultId: this.deps.activeVaultId() || "unknown",
      entity: updated,
      patch: updates,
    });

    return true;
  }

  async batchUpdate(
    updates: Record<string, Partial<LocalEntity>>,
  ): Promise<boolean> {
    let hasChanges = false;
    const currentEntities = this.entities;
    const newEntities = { ...currentEntities };
    const appliedUpdates: Record<string, Partial<LocalEntity>> = {};
    const savePromises: Promise<void>[] = [];

    for (const [id, patch] of Object.entries(updates)) {
      if (!currentEntities[id]) continue;
      const current = currentEntities[id];

      // SAFETY: Preserve content/lore if not in patch.
      const merged = {
        ...current,
        ...patch,
        metadata:
          patch.metadata !== undefined
            ? { ...(current.metadata ?? {}), ...patch.metadata }
            : current.metadata,
        content:
          patch.content !== undefined
            ? this.deps.isGuest() && patch.content === "" && current.content
              ? current.content
              : patch.content
            : current.content,
        lore: patch.lore !== undefined ? patch.lore : current.lore,
        updatedAt: Date.now(),
      } as LocalEntity;

      newEntities[id] = merged;
      appliedUpdates[id] = patch;
      hasChanges = true;

      if (
        patch.content !== undefined ||
        patch.lore !== undefined ||
        patch.title !== undefined ||
        patch.tags !== undefined
      ) {
        this._contentLoadedIds.add(id);
        this._contentVerifiedIds.add(id);
      }

      if (patch.image && this.deps.invalidateUrlCache) {
        this.deps.invalidateUrlCache(patch.image);
      }

      savePromises.push(this.scheduleSave(merged));
    }

    if (hasChanges) {
      this.entities = newEntities;
      if (this.deps.onBatchUpdate) this.deps.onBatchUpdate(appliedUpdates);
      await Promise.all(savePromises);

      vaultEventBus.emit({
        type: "BATCH_UPDATED",
        vaultId: this.deps.activeVaultId() || "unknown",
        entities: Object.keys(appliedUpdates).map((id) => newEntities[id]),
        patches: appliedUpdates,
      });

      return true;
    }
    return false;
  }

  async deleteEntity(id: string) {
    if (this.deps.isGuest())
      throw new Error("Cannot delete entities in Guest Mode");
    if (uiStore.isDemoMode) {
      const updated = { ...this.entities };
      delete updated[id];
      this.entities = updated;
      if (this.deps.onEntityDelete) this.deps.onEntityDelete(id);
      return;
    }

    const lockKey = id;
    return this.deps.repository.saveQueue.enqueue(lockKey, async () => {
      const vaultHandle = await this.deps.getActiveVaultHandle();
      const localHandle = await this.deps.getActiveSyncHandle();
      const activeVaultId = this.deps.activeVaultId();

      if (vaultHandle && activeVaultId) {
        const entity = this.entities[id];
        const path = entity?._path || [`${id}.md`];

        // 1. Delete from memory and OPFS
        const { entities, deletedEntity, modifiedIds } =
          await vaultEntities.deleteEntity(vaultHandle, this.entities, id);

        if (deletedEntity) {
          this.entities = entities;
          if (this.deps.onEntityDelete) this.deps.onEntityDelete(id);

          modifiedIds.forEach((mId) => {
            const modEntity = this.entities[mId];
            if (modEntity) {
              this.scheduleSave(modEntity);
            }
          });

          vaultEventBus.emit({
            type: "ENTITY_DELETED",
            vaultId: activeVaultId,
            entityId: id,
          });

          await this.deps.updateEntityCount(
            activeVaultId,
            Object.keys(this.entities).length,
          );

          // 2. Delete from Local FS
          if (localHandle) {
            try {
              const permission = await localHandle.queryPermission({
                mode: "readwrite",
              });
              if (permission === "granted") {
                const fileName = path[path.length - 1];
                const dirPath = path.slice(0, -1);
                let targetDir: FileSystemDirectoryHandle | undefined =
                  localHandle;

                for (const part of dirPath) {
                  targetDir = await targetDir
                    ?.getDirectoryHandle(part, { create: false })
                    .catch(() => undefined);
                  if (!targetDir) break;
                }

                if (targetDir) {
                  await targetDir.removeEntry(fileName, { recursive: true });
                  debugStore.log(
                    `[EntityStore] Deleted ${path.join("/")} from local filesystem`,
                  );
                }
              }
            } catch (e) {
              debugStore.warn(
                `[EntityStore] Failed to delete ${path.join("/")} from local filesystem`,
                e,
              );
            }
          }

          // 3. Remove from Dexie Cache
          await cacheService.remove(`${activeVaultId}:${path.join("/")}`);
        }
      }
    });
  }

  async addConnection(
    sourceId: string,
    targetId: string,
    type: string,
    label?: string,
    strength: number = 1.0,
  ): Promise<boolean> {
    const { entities, updatedSource } = vaultEntities.addConnection(
      this.entities,
      sourceId,
      targetId,
      type,
      label,
      strength,
    );
    if (updatedSource) {
      this.entities = entities;
      await this.scheduleSave(updatedSource);

      vaultEventBus.emit({
        type: "ENTITY_UPDATED",
        vaultId: this.deps.activeVaultId() || "unknown",
        entity: updatedSource,
        patch: { connections: updatedSource.connections },
      });

      return true;
    }
    return false;
  }

  async updateConnection(
    sourceId: string,
    targetId: string,
    oldType: string,
    newType: string,
    newLabel?: string,
  ): Promise<boolean> {
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
      await this.scheduleSave(updatedSource);

      vaultEventBus.emit({
        type: "ENTITY_UPDATED",
        vaultId: this.deps.activeVaultId() || "unknown",
        entity: updatedSource,
        patch: { connections: updatedSource.connections },
      });

      return true;
    }
    return false;
  }

  async removeConnection(
    sourceId: string,
    targetId: string,
    type: string,
  ): Promise<boolean> {
    const { entities, updatedSource } = vaultEntities.removeConnection(
      this.entities,
      sourceId,
      targetId,
      type,
    );
    if (updatedSource) {
      this.entities = entities;
      await this.scheduleSave(updatedSource);

      vaultEventBus.emit({
        type: "ENTITY_UPDATED",
        vaultId: this.deps.activeVaultId() || "unknown",
        entity: updatedSource,
        patch: { connections: updatedSource.connections },
      });

      vaultEventBus.emit({
        type: "CONNECTION_REMOVED",
        vaultId: this.deps.activeVaultId() || "unknown",
        sourceId,
        targetId,
        connectionType: type,
      });

      return true;
    }
    return false;
  }

  async addLabel(id: string, label: string): Promise<boolean> {
    const { entities, updated } = vaultEntities.addLabel(
      this.entities,
      id,
      label,
    );
    if (updated) {
      this.entities = entities;
      await this.scheduleSave(updated);

      vaultEventBus.emit({
        type: "ENTITY_UPDATED",
        vaultId: this.deps.activeVaultId() || "unknown",
        entity: updated,
        patch: { labels: updated.labels },
      });

      return true;
    }
    return false;
  }

  async removeLabel(id: string, label: string): Promise<boolean> {
    const { entities, updated } = vaultEntities.removeLabel(
      this.entities,
      id,
      label,
    );
    if (updated) {
      this.entities = entities;
      await this.scheduleSave(updated);

      vaultEventBus.emit({
        type: "ENTITY_UPDATED",
        vaultId: this.deps.activeVaultId() || "unknown",
        entity: updated,
        patch: { labels: updated.labels },
      });

      return true;
    }
    return false;
  }

  async bulkAddLabel(ids: string[], label: string): Promise<number> {
    const { entities, modifiedIds } = vaultEntities.bulkAddLabel(
      this.entities,
      ids,
      label,
    );
    if (modifiedIds.length > 0) {
      this.entities = entities;
      const changed: LocalEntity[] = [];
      for (const id of modifiedIds) {
        const entity = entities[id];
        if (entity) {
          await this.scheduleSave(entity);
          changed.push(entity);
        }
      }
      vaultEventBus.emit({
        type: "BATCH_UPDATED",
        vaultId: this.deps.activeVaultId() || "unknown",
        entities: changed,
      });
    }
    return modifiedIds.length;
  }

  async bulkRemoveLabel(ids: string[], label: string): Promise<number> {
    const { entities, modifiedIds } = vaultEntities.bulkRemoveLabel(
      this.entities,
      ids,
      label,
    );
    if (modifiedIds.length > 0) {
      this.entities = entities;
      const changed: LocalEntity[] = [];
      for (const id of modifiedIds) {
        const entity = entities[id];
        if (entity) {
          await this.scheduleSave(entity);
          changed.push(entity);
        }
      }
      vaultEventBus.emit({
        type: "BATCH_UPDATED",
        vaultId: this.deps.activeVaultId() || "unknown",
        entities: changed,
      });
    }
    return modifiedIds.length;
  }

  async batchCreateEntities(newEntitiesList: BatchCreateInput[]) {
    const { entities, created } = vaultEntities.batchCreateEntities(
      this.entities,
      newEntitiesList,
    );
    this.entities = entities;

    const savePromises = created.map(async (entity) => {
      this._contentLoadedIds.add(entity.id);
      this._contentVerifiedIds.add(entity.id);
      await this.scheduleSave(entity);
    });

    const activeVaultId = this.deps.activeVaultId();
    await Promise.all(savePromises);

    if (activeVaultId) {
      await this.deps.updateEntityCount(
        activeVaultId,
        Object.keys(this.entities).length,
      );
    }

    vaultEventBus.emit({
      type: "BATCH_CREATED",
      vaultId: activeVaultId || "unknown",
      entities: created,
    });
  }
  // --- Content Loading ---

  async loadEntityContent(id: string): Promise<void> {
    if (!id) return;
    const currentEntity = this.entities[id];
    if (!currentEntity) return;

    const isGuest = this.deps.isGuest();
    if (
      this._contentVerifiedIds.has(id) &&
      (!isGuest || !!currentEntity.content)
    )
      return;

    const activeVaultId = this.deps.activeVaultId();
    const guestFileFetcher = this.deps.getGuestFile;
    const parseMarkdown =
      this._helpers.parseMarkdown ||
      (await import("../../utils/markdown")).parseMarkdown;

    if (isGuest) {
      if (currentEntity.content) {
        this._contentLoadedIds.add(id);
        this._contentVerifiedIds.add(id);
        return;
      }

      const path = currentEntity._path || [`${id}.md`];
      const requestPath = path.join("/");
      if (!guestFileFetcher || !requestPath) return;

      try {
        const file = await guestFileFetcher(requestPath);
        const text = await file.text();
        if (!text) {
          this._contentVerifiedIds.add(id);
          return;
        }

        const { content: freshContent } = parseMarkdown(text);
        this.deps.repository.entities[id] = {
          ...currentEntity,
          content: freshContent || currentEntity.content || "",
          lore: "",
        };
        this._contentLoadedIds.add(id);
        this._contentVerifiedIds.add(id);
      } catch (err) {
        debugStore.warn(
          `[EntityStore] Guest content fetch failed for ${id}`,
          err,
        );
      }
      return;
    }

    if (!activeVaultId) return;

    // PRIORITY 1: Cache
    let cached: { content: string; lore: string } | null = null;
    let cacheErrored = false;
    try {
      cached = await cacheService.getEntityContent(activeVaultId, id);
      if (cached !== null) {
        const latest = this.entities[id];
        if (latest && (!latest.content || latest.lore === undefined)) {
          this.deps.repository.entities[id] = {
            ...latest,
            content: cached.content,
            lore: cached.lore,
          };
          this._contentLoadedIds.add(id);
          debugStore.log(
            `[EntityStore] Priority 1 hit: Loaded chronicle/lore from cache for ${id}`,
          );
        }
      }
    } catch (cacheErr) {
      cacheErrored = true;
      debugStore.warn(
        `[EntityStore] Priority 1 cache load failed for ${id}`,
        cacheErr,
      );
    }

    if (this._contentVerifiedIds.has(id)) return;

    try {
      // PRIORITY 2: OPFS (canonical source of truth)
      let result = await this._readFromOpfs(id);

      // PRIORITY 3: Local FS fallback if OPFS had nothing
      if (!result) {
        const path = currentEntity._path || [`${id}.md`];
        const localHandle = await this.deps.getActiveSyncHandle();
        if (localHandle) {
          try {
            if (
              (await localHandle.queryPermission({ mode: "read" })) ===
              "granted"
            ) {
              const readFileAsText =
                this._helpers.readFileAsText ||
                (await import("../../utils/opfs")).readFileAsText;
              const text = await readFileAsText(localHandle, path);
              if (text) {
                const { metadata, content } = parseMarkdown(text);
                result = { content, lore: (metadata as any).lore || "" };
              }
            }
          } catch (err) {
            debugStore.warn(
              `[EntityStore] Local FS fallback failed for ${id}`,
              err,
            );
          }
        }
      }

      if (result) {
        const entityToUpdate = this.entities[id];
        if (entityToUpdate) {
          const finalContent = result.content || entityToUpdate.content || "";
          const finalLore = result.lore || entityToUpdate.lore || "";
          const path = entityToUpdate._path || [`${id}.md`];

          const updatedEntity = {
            ...entityToUpdate,
            content: finalContent,
            lore: finalLore,
          };

          this.deps.repository.entities[id] = updatedEntity;
          this._contentLoadedIds.add(id);
          this._contentVerifiedIds.add(id);

          debugStore.log(
            `[EntityStore] Verified ${id} from source: contentLen=${finalContent.length}, loreLen=${finalLore.length}`,
          );

          const isStale =
            finalContent !== (cached?.content ?? null) ||
            finalLore !== (cached?.lore ?? null);
          const hasContent = finalContent || finalLore;

          if (isStale && (cached !== null || hasContent)) {
            cacheService.set(
              `${activeVaultId}:${path.join("/")}`,
              Date.now(),
              updatedEntity,
            );
          }
        }
      } else if (cached === null && !cacheErrored) {
        this._contentVerifiedIds.add(id);
        debugStore.warn(
          `[EntityStore] Content truly missing for ${id} in all tiers`,
        );
      }
    } catch (err) {
      debugStore.error(`[EntityStore] Failed to load content for ${id}:`, err);
    }
  }

  /**
   * Read an entity's content directly from OPFS. Returns null if the file
   * cannot be found or read. Shared by loadEntityContent and internalLoadContent.
   */
  private async _readFromOpfs(
    id: string,
  ): Promise<{ content: string; lore: string } | null> {
    const entity = this.entities[id];
    if (!entity) return null;
    const path = entity._path || [`${id}.md`];
    const vaultDir = await this.deps.getActiveVaultHandle();
    if (!vaultDir) return null;
    const readFileAsText =
      this._helpers.readFileAsText ||
      (await import("../../utils/opfs")).readFileAsText;
    const text = await readFileAsText(vaultDir, path).catch(() => null);
    if (!text) return null;
    const parseMarkdown =
      this._helpers.parseMarkdown ||
      (await import("../../utils/markdown")).parseMarkdown;
    const { metadata, content } = parseMarkdown(text);
    return { content, lore: (metadata as any).lore || "" };
  }

  /**
   * Load content from OPFS without going through the task queue.
   * Used as a pre-save hydration step inside scheduleSave.
   */
  async internalLoadContent(id: string): Promise<void> {
    const currentEntity = this.entities[id];
    if (!currentEntity) return;
    try {
      const result = await this._readFromOpfs(id);
      if (result) {
        this.deps.repository.entities[id] = {
          ...currentEntity,
          content: result.content,
          lore: result.lore,
        };
        this._contentLoadedIds.add(id);
        this._contentVerifiedIds.add(id);
      }
    } catch (err) {
      debugStore.error(
        `[EntityStore] internalLoadContent failed for ${id}:`,
        err,
      );
    }
  }

  isContentLoaded(id: string) {
    return this._contentLoadedIds.has(id);
  }

  isContentVerified(id: string) {
    return this._contentVerifiedIds.has(id);
  }

  markContentLoaded(id: string) {
    this._contentLoadedIds.add(id);
    this._contentVerifiedIds.add(id);
  }
}
