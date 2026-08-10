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
import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
import { updateLastInternalChange } from "./registry";
import { systemClock } from "$lib/utils/runtime-deps";
import {
  performanceRecorder,
  type PerformanceRecorder,
} from "@codex/performance-observability";

export interface EntityDelta {
  id: string;
  before: LocalEntity | null;
  after: LocalEntity | null;
  patch?: Partial<LocalEntity>;
  kind: "added" | "updated" | "deleted";
}

export interface BatchMutationFailure {
  id: string;
  error: string;
}

export interface BatchMutationResult {
  succeededIds: string[];
  failed: BatchMutationFailure[];
  skippedIds: string[];
  cancelled: boolean;
}

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
  onEntityDelta?: (delta: EntityDelta) => void;
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
        | "onEntityDelta"
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

  private replaceEntities(
    val: Record<string, LocalEntity>,
    deltas: EntityDelta[] = [],
  ) {
    const oldVal = this.deps.repository.entities;
    this.deps.repository.entities = val;
    for (const delta of deltas) this.deps.onEntityDelta?.(delta);
    this.deps.onEntitiesUpdated?.(oldVal, val);
  }

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

    this.deps.loader.markContentLoaded(newEntity.id);

    const activeVaultId = this.deps.activeVaultId();
    await this.deps.persistence.scheduleSave(newEntity);

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

    this.replaceEntities(entities, [
      {
        id,
        before: existing,
        after: updated,
        patch: updates,
        kind: "updated",
      },
    ]);

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

    try {
      await this.deps.persistence.scheduleSave(updated);
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
    let hasChanges = false;
    const currentEntities = this.entities;
    const newEntities = { ...currentEntities };
    const appliedUpdates: Record<string, Partial<LocalEntity>> = {};
    const savePromises: Promise<void>[] = [];

    for (const [id, patch] of Object.entries(updates)) {
      if (!currentEntities[id]) continue;
      const current = currentEntities[id];

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

      newEntities[id] = merged;
      appliedUpdates[id] = patch;
      hasChanges = true;

      if (
        patch.content !== undefined ||
        patch.lore !== undefined ||
        patch.title !== undefined ||
        patch.labels !== undefined
      ) {
        this.deps.loader.markContentLoaded(id);
      }

      if (patch.image && this.deps.invalidateUrlCache) {
        this.deps.invalidateUrlCache(patch.image);
      }

      savePromises.push(
        this.deps.persistence.scheduleSave(merged, {
          preserveCachedContent: isCoordinateOnlyPatch(patch),
        }),
      );
    }

    if (hasChanges) {
      this.replaceEntities(
        newEntities,
        Object.entries(appliedUpdates).map(([id, patch]) => ({
          id,
          before: currentEntities[id],
          after: newEntities[id],
          patch,
          kind: "updated" as const,
        })),
      );
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

  async batchChangeEntityType(
    ids: string[],
    type: Entity["type"],
  ): Promise<BatchMutationResult> {
    const skippedIds: string[] = [];
    const validIds: string[] = [];
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id) || !this.entities[id]) {
        skippedIds.push(id);
        continue;
      }
      seen.add(id);
      validIds.push(id);
    }

    const currentEntities = this.entities;
    const nextEntities = { ...currentEntities };
    const changed: LocalEntity[] = [];
    const deltas: EntityDelta[] = [];
    for (const id of validIds) {
      const before = currentEntities[id];
      if (before.type === type) {
        skippedIds.push(id);
        continue;
      }
      const after = {
        ...before,
        type,
        updatedAt: systemClock.now(),
        modifiedAt: systemClock.now(),
      };
      nextEntities[id] = after;
      changed.push(after);
      deltas.push({
        id,
        before,
        after,
        patch: { type },
        kind: "updated",
      });
    }

    if (changed.length === 0) {
      return { succeededIds: [], failed: [], skippedIds, cancelled: false };
    }

    const vaultIdAtStart = this.deps.activeVaultId();
    this.replaceEntities(nextEntities, deltas);
    const saveResult = await this.deps.persistence.persistBatch(changed);
    const cancelled = this.deps.activeVaultId() !== vaultIdAtStart;
    if (cancelled) {
      return {
        succeededIds: saveResult.succeededIds,
        failed: saveResult.failed,
        skippedIds,
        cancelled: true,
      };
    }
    vaultEventBus.emit({
      type: "BATCH_UPDATED",
      vaultId: vaultIdAtStart || "unknown",
      entities: changed,
      patches: Object.fromEntries(
        changed.map((entity) => [entity.id, { type }]),
      ),
    });

    return {
      succeededIds: saveResult.succeededIds,
      failed: saveResult.failed,
      skippedIds,
      cancelled,
    };
  }

  async batchDeleteEntities(ids: string[]): Promise<BatchMutationResult> {
    if (this.deps.isGuest()) {
      throw new Error("Cannot delete entities in Guest Mode");
    }

    const skippedIds: string[] = [];
    const validIds: string[] = [];
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id) || !this.entities[id]) {
        skippedIds.push(id);
        continue;
      }
      seen.add(id);
      validIds.push(id);
    }
    if (validIds.length === 0) {
      return { succeededIds: [], failed: [], skippedIds, cancelled: false };
    }

    if (sessionModeStore.isDemoMode) {
      const nextEntities = { ...this.entities };
      const deltas = validIds.map((id) => {
        const before = nextEntities[id];
        delete nextEntities[id];
        return { id, before, after: null, kind: "deleted" as const };
      });
      this.replaceEntities(nextEntities, deltas);
      for (const id of validIds) this.deps.onEntityDelete?.(id);
      return {
        succeededIds: validIds,
        failed: [],
        skippedIds,
        cancelled: false,
      };
    }

    const vaultId = this.deps.activeVaultId();
    const vaultHandle = await this.deps.getActiveVaultHandle();
    if (!vaultId || !vaultHandle) {
      return {
        succeededIds: [],
        failed: validIds.map((id) => ({
          id,
          error: "Active vault is unavailable.",
        })),
        skippedIds,
        cancelled: false,
      };
    }

    const initialEntities = this.entities;
    let nextEntities = { ...initialEntities };
    const inbound = this.deps.getInboundConnections?.();
    const parentToChildren = this.deps.getParentToChildren?.();
    const deleted: LocalEntity[] = [];
    const modifiedIds = new Set<string>();
    const failed: BatchMutationFailure[] = [];

    for (const id of validIds) {
      if (this.deps.activeVaultId() !== vaultId) break;
      try {
        const result = await vaultEntities.deleteEntity(
          vaultHandle,
          nextEntities,
          id,
          inbound,
          parentToChildren?.[id],
        );
        if (!result.deletedEntity) {
          skippedIds.push(id);
          continue;
        }
        nextEntities = result.entities;
        deleted.push(result.deletedEntity);
        for (const modifiedId of result.modifiedIds)
          modifiedIds.add(modifiedId);
      } catch (error) {
        failed.push({
          id,
          error:
            error instanceof Error ? error.message : "Failed to delete entity.",
        });
      }
    }

    const cancelled = this.deps.activeVaultId() !== vaultId;
    if (deleted.length === 0) {
      return { succeededIds: [], failed, skippedIds, cancelled };
    }
    if (cancelled) {
      return {
        succeededIds: deleted.map((entity) => entity.id),
        failed,
        skippedIds,
        cancelled: true,
      };
    }

    const deltas: EntityDelta[] = deleted.map((entity) => ({
      id: entity.id,
      before: entity,
      after: null,
      kind: "deleted",
    }));
    for (const id of modifiedIds) {
      if (initialEntities[id] && nextEntities[id]) {
        deltas.push({
          id,
          before: initialEntities[id],
          after: nextEntities[id],
          kind: "updated",
        });
      }
    }
    this.replaceEntities(nextEntities, deltas);
    const localHandle = await this.deps.getActiveFolderHandle();
    for (const entity of deleted) {
      this.deps.onEntityDelete?.(entity.id);
      const path = entity._path || [`${entity.id}.md`];
      await cacheService.remove(`${vaultId}:${path.join("/")}`);
      vaultEventBus.emit({
        type: "ENTITY_DELETED",
        vaultId,
        entityId: entity.id,
      });

      if (localHandle) {
        try {
          const permission = await localHandle.queryPermission({
            mode: "readwrite",
          });
          if (permission === "granted") {
            const fileName = path[path.length - 1];
            let targetDir: FileSystemDirectoryHandle | undefined = localHandle;
            for (const part of path.slice(0, -1)) {
              targetDir = await targetDir
                ?.getDirectoryHandle(part, { create: false })
                .catch(() => undefined);
              if (!targetDir) break;
            }
            if (targetDir) {
              await targetDir.removeEntry(fileName, { recursive: true });
            }
          }
        } catch (error) {
          debugStore.warn(
            `[EntityMutation] Failed to delete ${path.join("/")} from local filesystem`,
            error,
          );
        }
      }
    }

    const modifiedEntities = Array.from(modifiedIds)
      .map((id) => nextEntities[id])
      .filter((entity): entity is LocalEntity => Boolean(entity));
    const saveResult =
      await this.deps.persistence.persistBatch(modifiedEntities);
    failed.push(...saveResult.failed);
    await updateLastInternalChange(vaultId);
    await this.deps.updateEntityCount(
      vaultId,
      Object.keys(nextEntities).length,
    );

    return {
      succeededIds: deleted
        .map((entity) => entity.id)
        .filter((id) => !failed.some((failure) => failure.id === id)),
      failed,
      skippedIds,
      cancelled,
    };
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

function isCoordinateOnlyPatch(patch: Partial<LocalEntity>): boolean {
  const keys = Object.keys(patch);
  if (keys.length !== 1 || !("metadata" in patch)) return false;

  const metadata = patch.metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return false;
  }

  const metadataKeys = Object.keys(metadata);
  if (metadataKeys.length !== 1 || !("coordinates" in metadata)) return false;

  const coordinates = (metadata as any).coordinates;
  return (
    coordinates != null &&
    typeof coordinates === "object" &&
    Number.isFinite(coordinates.x) &&
    Number.isFinite(coordinates.y)
  );
}
