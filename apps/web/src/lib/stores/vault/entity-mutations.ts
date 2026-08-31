import { vaultEventBus } from "./events.svelte";
import * as vaultEntities from "./entities";
import { debugStore } from "../debug.svelte";
import { cacheService } from "../../services/cache.svelte";
import type { LocalEntity, BatchCreateInput } from "./types";
import { VaultRepository } from "@codex/vault-engine";
import type { Entity } from "schema";
import type { EntityPersistenceService } from "./entity-persistence";
import type { EntityContentLoader } from "./entity-content-loader.svelte";
import type { IVaultServices } from "./service-registry";
import {
  summarizeBulkMutation,
  runWithConcurrency,
  type BulkMutationResult,
  type BulkMutationItemResult,
} from "./bulk-results";
import type { ImmediateSaveEntry } from "./entity-persistence";
import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
import { updateLastInternalChange } from "./registry";
import { systemClock } from "$lib/utils/runtime-deps";
import {
  performanceRecorder,
  type PerformanceRecorder,
} from "@codex/performance-observability";

export interface MutationDependencies {
  performanceRecorder?: PerformanceRecorder;
  repository: VaultRepository;
  persistence: EntityPersistenceService;
  loader: EntityContentLoader;
  activeVaultId: () => string | null;
  isGuest: () => boolean;
  getActiveVaultHandle: () => Promise<FileSystemDirectoryHandle | undefined>;
  getActiveFolderHandle: () => Promise<FileSystemDirectoryHandle | undefined>;
  updateEntityCount: (vaultId: string, count: number) => Promise<void>;
  invalidateUrlCache?: (path: string) => void;
  getServices: () => IVaultServices | null;
  onEntityDelete?: (entityId: string) => void;
  onBatchUpdate?: (updates: Record<string, Partial<LocalEntity>>) => void;
  onEntitiesUpdated?: (
    oldEntities: Record<string, LocalEntity>,
    newEntities: Record<string, LocalEntity>,
  ) => void;
  onConnectionAdded?: (
    sourceId: string,
    targetId: string,
    connection: any,
  ) => void;
  onConnectionRemoved?: (
    sourceId: string,
    targetId: string,
    connectionType: string,
  ) => void;
  onConnectionUpdated?: (
    sourceId: string,
    targetId: string,
    oldType: string,
    connection: any,
  ) => void;
  getInboundConnections?: () => Record<
    string,
    { sourceId: string; connection: any }[]
  >;
  getParentToChildren?: () => Record<string, string[]>;
}

export class EntityMutationService {
  private performanceRecorder: PerformanceRecorder;

  constructor(public deps: MutationDependencies) {
    this.performanceRecorder = deps.performanceRecorder ?? performanceRecorder;
  }

  registerStoreCallbacks(
    callbacks: Partial<
      Pick<
        MutationDependencies,
        | "onEntityDelete"
        | "onBatchUpdate"
        | "onEntitiesUpdated"
        | "onConnectionAdded"
        | "onConnectionRemoved"
        | "onConnectionUpdated"
        | "getInboundConnections"
        | "getParentToChildren"
      >
    >,
  ) {
    this.deps = {
      ...this.deps,
      ...callbacks,
    };
  }

  get entities() {
    return this.deps.repository.entities;
  }

  set entities(val: Record<string, LocalEntity>) {
    const oldVal = this.deps.repository.entities;
    this.deps.repository.entities = val;
    this.deps.onEntitiesUpdated?.(oldVal, val);
  }

  async createEntity(
    type: Entity["type"],
    title: string,
    initialData: Partial<Entity> = {},
  ): Promise<string> {
    const span = this.performanceRecorder.start("entity_save");
    const newEntity = vaultEntities.createEntity(
      title,
      type,
      initialData,
      this.entities,
    );
    const updatedEntities = { ...this.entities };
    updatedEntities[newEntity.id] = newEntity;
    this.entities = updatedEntities;

    this.deps.loader.markContentLoaded(newEntity.id);

    const activeVaultId = this.deps.activeVaultId();
    await this.deps.persistence.scheduleSave(newEntity, { immediate: true });

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

    span.complete(() => ({ entityCount: Object.keys(this.entities).length }));
    return newEntity.id;
  }

  async updateEntity(
    id: string,
    updates: Partial<LocalEntity>,
  ): Promise<boolean> {
    const existing = this.entities[id];
    if (!existing) return false;
    const span = this.performanceRecorder.start("entity_save");

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
      updates.labels !== undefined
    ) {
      this.deps.loader.markContentLoaded(id);
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

    const hasLongFormUpdate =
      updates.content !== undefined || updates.lore !== undefined;

    try {
      await this.deps.persistence.scheduleSave(updated, {
        immediate: hasLongFormUpdate,
      });
    } catch (error) {
      span.fail("unexpected", () => ({
        entityCount: Object.keys(this.entities).length,
      }));
      throw error;
    }

    vaultEventBus.emit({
      type: "ENTITY_UPDATED",
      vaultId: this.deps.activeVaultId() || "unknown",
      entity: updated,
      patch: updates,
    });

    span.complete(() => ({ entityCount: Object.keys(this.entities).length }));
    return true;
  }

  async batchUpdate(
    updates: Record<string, Partial<LocalEntity>>,
  ): Promise<boolean> {
    const result = await this.bulkUpdate(updates);
    return result.succeededIds.length > 0;
  }

  async bulkUpdate(
    updates: Record<string, Partial<LocalEntity>>,
  ): Promise<BulkMutationResult> {
    const requestedIds = Object.keys(updates);
    const span = this.performanceRecorder.start("vault_bulk_mutation");
    const mutationVaultId = this.deps.activeVaultId();
    const currentEntities = this.entities;
    const stagedEntities = { ...currentEntities };
    const appliedUpdates: Record<string, Partial<LocalEntity>> = {};
    const entries: ImmediateSaveEntry[] = [];
    const items: BulkMutationItemResult[] = [];

    for (const [id, patch] of Object.entries(updates)) {
      const current = currentEntities[id];
      if (!current) {
        items.push({ id, status: "skipped" });
        continue;
      }

      const preserveGuestContent =
        this.deps.isGuest() && patch.content === "" && !!current.content;
      const merged = {
        ...current,
        ...patch,
        metadata:
          patch.metadata !== undefined
            ? { ...(current.metadata ?? {}), ...patch.metadata }
            : current.metadata,
        content:
          patch.content !== undefined
            ? preserveGuestContent
              ? current.content
              : patch.content
            : current.content,
        lore: patch.lore !== undefined ? patch.lore : current.lore,
        updatedAt: systemClock.now(),
        modifiedAt: systemClock.now(),
      } as LocalEntity;

      stagedEntities[id] = merged;
      appliedUpdates[id] = patch;
      if (patch.image && this.deps.invalidateUrlCache) {
        this.deps.invalidateUrlCache(patch.image);
      }
      entries.push({
        entity: merged,
        options: {
          preserveCachedContent:
            patch.content === undefined && patch.lore === undefined,
        },
      });
    }

    if (entries.length === 0) {
      span.complete(() => ({ changedEntityCount: 0 }));
      return summarizeBulkMutation(requestedIds, items);
    }

    if (sessionModeStore.isDemoMode || this.deps.isGuest()) {
      this.entities = stagedEntities;
      this.deps.onBatchUpdate?.(appliedUpdates);
      for (const id of Object.keys(appliedUpdates)) {
        items.push({ id, status: "success" });
      }
      vaultEventBus.emit({
        type: "BATCH_UPDATED",
        vaultId: this.deps.activeVaultId() || "unknown",
        entities: Object.keys(appliedUpdates).map((id) => stagedEntities[id]),
        patches: appliedUpdates,
      });
    } else {
      const persisted = await this.deps.persistence.persistImmediately(entries);
      const persistedById = new Map(
        persisted.map((result) => [result.id, result]),
      );
      const committedEntities = { ...currentEntities };
      const committedUpdates: Record<string, Partial<LocalEntity>> = {};

      if (mutationVaultId !== this.deps.activeVaultId()) {
        for (const id of Object.keys(appliedUpdates)) {
          items.push({
            id,
            status: "cancelled",
          });
        }
        span.cancel(() => ({ changedEntityCount: 0 }));
        return summarizeBulkMutation(requestedIds, items);
      }

      for (const id of Object.keys(appliedUpdates)) {
        const result = persistedById.get(id);
        if (result?.ok) {
          committedEntities[id] = stagedEntities[id];
          committedUpdates[id] = appliedUpdates[id];
          this.deps.loader.markContentLoaded(id);
          items.push({ id, status: "success" });
        } else {
          items.push({ id, status: "failed", error: result?.error });
        }
      }

      if (Object.keys(committedUpdates).length > 0) {
        this.entities = committedEntities;
        this.deps.onBatchUpdate?.(committedUpdates);
        vaultEventBus.emit({
          type: "BATCH_UPDATED",
          vaultId: this.deps.activeVaultId() || "unknown",
          entities: Object.keys(committedUpdates).map(
            (id) => committedEntities[id],
          ),
          patches: committedUpdates,
        });
      }
    }

    const result = summarizeBulkMutation(requestedIds, items);
    if (result.failedIds.length > 0 || result.cancelledIds.length > 0) {
      span.fail("unexpected", () => ({
        changedEntityCount: result.succeededIds.length,
      }));
    } else {
      span.complete(() => ({
        changedEntityCount: result.succeededIds.length,
      }));
    }
    return result;
  }

  async deleteEntity(id: string) {
    if (this.deps.isGuest())
      throw new Error("Cannot delete entities in Guest Mode");
    if (sessionModeStore.isDemoMode) {
      const updated = { ...this.entities };
      delete updated[id];
      this.entities = updated;
      if (this.deps.onEntityDelete) this.deps.onEntityDelete(id);
      return;
    }

    const lockKey = id;
    return this.deps.repository.enqueueSave(lockKey, async () => {
      const vaultHandle = await this.deps.getActiveVaultHandle();
      const localHandle = await this.deps.getActiveFolderHandle();
      const activeVaultId = this.deps.activeVaultId();

      if (vaultHandle && activeVaultId) {
        const entity = this.entities[id];
        const path = entity?._path || [`${id}.md`];

        const inboundConns = this.deps.getInboundConnections?.();
        const parentToChildren = this.deps.getParentToChildren?.();
        const childrenIds = parentToChildren
          ? parentToChildren[id] || []
          : undefined;

        const { entities, deletedEntity, modifiedIds } =
          await vaultEntities.deleteEntity(
            vaultHandle,
            this.entities,
            id,
            inboundConns,
            childrenIds,
          );

        if (deletedEntity) {
          this.entities = entities;
          if (this.deps.onEntityDelete) this.deps.onEntityDelete(id);

          await updateLastInternalChange(activeVaultId);

          modifiedIds.forEach((mId) => {
            const modEntity = this.entities[mId];
            if (modEntity) {
              this.deps.persistence.scheduleSave(modEntity);
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
                }
              }
            } catch (e) {
              debugStore.warn(
                `[EntityMutation] Failed to delete ${path.join("/")} from local filesystem`,
                e,
              );
            }
          }

          await cacheService.remove(`${activeVaultId}:${path.join("/")}`);
        }
      }
    });
  }

  async bulkDelete(ids: string[]): Promise<BulkMutationResult> {
    if (this.deps.isGuest()) {
      throw new Error("Cannot delete entities in Guest Mode");
    }

    const requestedIds = [...new Set(ids)];
    const span = this.performanceRecorder.start("vault_bulk_mutation");
    if (sessionModeStore.isDemoMode) {
      const next = { ...this.entities };
      const items: BulkMutationItemResult[] = [];
      for (const id of requestedIds) {
        if (!next[id]) {
          items.push({ id, status: "skipped" });
          continue;
        }
        delete next[id];
        this.deps.onEntityDelete?.(id);
        items.push({ id, status: "success" });
      }
      this.entities = next;
      const result = summarizeBulkMutation(requestedIds, items);
      span.complete(() => ({ changedEntityCount: result.succeededIds.length }));
      return result;
    }

    const vaultHandle = await this.deps.getActiveVaultHandle();
    const localHandle = await this.deps.getActiveFolderHandle();
    const vaultId = this.deps.activeVaultId();
    if (!vaultHandle || !vaultId) {
      const result = summarizeBulkMutation(
        requestedIds,
        requestedIds.map((id) => ({ id, status: "failed" as const })),
      );
      span.fail("unexpected", () => ({ changedEntityCount: 0 }));
      return result;
    }

    const validIds = requestedIds.filter((id) => this.entities[id]);
    const deletedPaths = new Map(
      validIds.map((id) => [id, this.entities[id]._path || [`${id}.md`]]),
    );
    const items: BulkMutationItemResult[] = requestedIds
      .filter((id) => !this.entities[id])
      .map((id) => ({ id, status: "skipped" as const }));
    const deleteTasks = validIds.map((id) => async () => {
      const entity = this.entities[id];
      if (!entity || this.deps.activeVaultId() !== vaultId) {
        return { id, ok: false, cancelled: true };
      }
      try {
        await this.deps.repository.enqueueSave(id, () =>
          vaultEntities.deleteEntityFiles(vaultHandle, entity),
        );
        return { id, ok: true, cancelled: false };
      } catch (error) {
        return { id, ok: false, cancelled: false, error };
      }
    });
    const deletedResults = await runWithConcurrency(deleteTasks, 4);
    if (vaultId !== this.deps.activeVaultId()) {
      const result = summarizeBulkMutation(
        requestedIds,
        deletedResults.map((item) => ({
          id: item.id,
          status: item.ok ? ("cancelled" as const) : ("failed" as const),
          error: item.error,
        })),
      );
      span.cancel(() => ({ changedEntityCount: 0 }));
      return result;
    }
    const deletedIds = deletedResults
      .filter((result) => result.ok)
      .map((result) => result.id);

    for (const result of deletedResults) {
      items.push({
        id: result.id,
        status: result.cancelled
          ? "cancelled"
          : result.ok
            ? "success"
            : "failed",
        error: result.error,
      });
    }

    if (deletedIds.length > 0) {
      const applied = vaultEntities.applyBatchDelete(
        this.entities,
        deletedIds,
        this.deps.getInboundConnections?.(),
        this.deps.getParentToChildren?.(),
      );
      const survivorEntries: ImmediateSaveEntry[] = Object.values(
        applied.modified,
      ).map((entity) => ({ entity }));
      const survivorResults =
        await this.deps.persistence.persistImmediately(survivorEntries);
      const survivorSuccess = new Set(
        survivorResults
          .filter((result) => result.ok)
          .map((result) => result.id),
      );
      const committed = { ...this.entities };
      for (const id of deletedIds) {
        delete committed[id];
        this.deps.onEntityDelete?.(id);
      }
      for (const id of Object.keys(applied.modified)) {
        committed[id] = applied.modified[id];
        if (!survivorSuccess.has(id)) {
          void this.deps.persistence.scheduleSave(applied.modified[id]);
        }
      }
      this.entities = committed;

      for (const id of deletedIds) {
        vaultEventBus.emit({
          type: "ENTITY_DELETED",
          vaultId,
          entityId: id,
        });
        const path = deletedPaths.get(id) || [`${id}.md`];
        await cacheService.remove(`${vaultId}:${path.join("/")}`);
        await removeLocalEntityFile(localHandle, path);
      }
      await updateLastInternalChange(vaultId);
      await this.deps.updateEntityCount(
        vaultId,
        Object.keys(this.entities).length,
      );
    }

    const result = summarizeBulkMutation(requestedIds, items);
    if (result.failedIds.length > 0 || result.cancelledIds.length > 0) {
      span.fail("unexpected", () => ({
        changedEntityCount: result.succeededIds.length,
      }));
    } else {
      span.complete(() => ({
        changedEntityCount: result.succeededIds.length,
      }));
    }
    return result;
  }

  async addConnection(
    sourceId: string,
    targetId: string,
    type: string,
    label?: string,
    strength: number = 1.0,
  ): Promise<boolean> {
    if (!this.deps.loader.isContentLoaded(sourceId)) {
      await this.deps.loader.loadEntityContent(sourceId);
    }
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
      await this.deps.persistence.scheduleSave(updatedSource);

      const newConn = updatedSource.connections.find(
        (c) => c.target === targetId && c.type === type,
      );
      if (newConn && this.deps.onConnectionAdded) {
        this.deps.onConnectionAdded(sourceId, targetId, newConn);
      }

      vaultEventBus.emit({
        type: "CONNECTION_ADDED",
        vaultId: this.deps.activeVaultId() || "unknown",
        sourceId,
        targetId,
        connectionType: type,
        label,
        strength,
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
    if (!this.deps.loader.isContentLoaded(sourceId)) {
      await this.deps.loader.loadEntityContent(sourceId);
    }
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
      await this.deps.persistence.scheduleSave(updatedSource);

      const updatedConn = updatedSource.connections.find(
        (c) => c.target === targetId && c.type === newType,
      );
      if (updatedConn && this.deps.onConnectionUpdated) {
        this.deps.onConnectionUpdated(sourceId, targetId, oldType, updatedConn);
      }

      vaultEventBus.emit({
        type: "CONNECTION_UPDATED",
        vaultId: this.deps.activeVaultId() || "unknown",
        sourceId,
        targetId,
        oldType,
        newType,
        newLabel,
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
    if (!this.deps.loader.isContentLoaded(sourceId)) {
      await this.deps.loader.loadEntityContent(sourceId);
    }
    const { entities, updatedSource } = vaultEntities.removeConnection(
      this.entities,
      sourceId,
      targetId,
      type,
    );
    if (updatedSource) {
      this.entities = entities;
      await this.deps.persistence.scheduleSave(updatedSource);

      if (this.deps.onConnectionRemoved) {
        this.deps.onConnectionRemoved(sourceId, targetId, type);
      }

      // CONNECTION_REMOVED carries the full semantic; ENTITY_UPDATED with a
      // connections-only patch was redundant and triggered unnecessary fan-out.
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
      await this.deps.persistence.scheduleSave(updated);

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
      await this.deps.persistence.scheduleSave(updated);

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
      const savePromises: Promise<void>[] = [];
      for (const id of modifiedIds) {
        const entity = entities[id];
        if (entity) {
          savePromises.push(this.deps.persistence.scheduleSave(entity));
          changed.push(entity);
        }
      }
      await Promise.all(savePromises);
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
      const savePromises: Promise<void>[] = [];
      for (const id of modifiedIds) {
        const entity = entities[id];
        if (entity) {
          savePromises.push(this.deps.persistence.scheduleSave(entity));
          changed.push(entity);
        }
      }
      await Promise.all(savePromises);
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
      this.deps.loader.markContentLoaded(entity.id);
      await this.deps.persistence.scheduleSave(entity);
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
}

async function removeLocalEntityFile(
  localHandle: FileSystemDirectoryHandle | undefined,
  path: string[],
): Promise<void> {
  if (!localHandle) return;
  try {
    const permission = await localHandle.queryPermission({ mode: "readwrite" });
    if (permission !== "granted") return;

    const fileName = path[path.length - 1];
    const dirPath = path.slice(0, -1);
    let targetDir: FileSystemDirectoryHandle | undefined = localHandle;
    for (const part of dirPath) {
      targetDir = await targetDir
        ?.getDirectoryHandle(part, { create: false })
        .catch(() => undefined);
      if (!targetDir) return;
    }
    await targetDir?.removeEntry(fileName, { recursive: true });
  } catch (error) {
    debugStore.warn(
      `[EntityMutation] Failed to delete ${path.join("/")} from local filesystem`,
      error,
    );
  }
}
