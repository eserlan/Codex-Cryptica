import * as vaultEntities from "./entities";
import { vaultEventBus } from "./events.svelte";
import { cacheService } from "../../services/cache.svelte";
import { updateLastInternalChange } from "./registry";
import { sessionModeStore } from "#lib/stores/ui/session-mode.svelte.js";
import {
  runWithConcurrency,
  summarizeBulkMutation,
  type BulkMutationResult,
  type BulkMutationItemResult,
} from "./bulk-results";
import { finishBulkMutation } from "./entity-mutation-effects";
import { removeLocalEntityFile } from "./entity-local-deletion";
import type { EntityMutationContext } from "./entity-mutation-context";
import type { PerformanceRecorder } from "@codex/performance-observability";

interface FileDeletionResult {
  id: string;
  ok: boolean;
  cancelled: boolean;
  error?: unknown;
}

export class EntityDeletionMutations {
  constructor(
    private readonly context: EntityMutationContext,
    private readonly recorder: PerformanceRecorder,
  ) {}

  async deleteEntity(id: string) {
    this.assertWritable();
    if (sessionModeStore.isDemoMode) {
      const updated = { ...this.context.entities };
      delete updated[id];
      this.context.entities = updated;
      this.context.deps.onEntityDelete?.(id);
      return;
    }
    return this.context.deps.repository.enqueueSave(id, () =>
      this.deleteFromVault(id),
    );
  }

  private assertWritable(): void {
    if (this.context.deps.isGuest())
      throw new Error("Cannot delete entities in Guest Mode");
  }

  private async deleteFromVault(id: string): Promise<void> {
    const vaultHandle = await this.context.deps.getActiveVaultHandle();
    const localHandle = await this.context.deps.getActiveFolderHandle();
    const vaultId = this.context.deps.activeVaultId();
    if (!vaultHandle || !vaultId) return;
    const path = this.context.entities[id]?._path || [`${id}.md`];
    const { inboundConnections, childrenIds } = this.deletionIndexes(id);
    const { entities, deletedEntity, modifiedIds } =
      await vaultEntities.deleteEntity(
        vaultHandle,
        this.context.entities,
        id,
        inboundConnections,
        childrenIds,
      );
    if (!deletedEntity) return;
    this.context.entities = entities;
    this.context.deps.onEntityDelete?.(id);
    await updateLastInternalChange(vaultId, {
      kind: "entity",
      ids: [id],
      deleted: true,
    });
    this.scheduleModifiedEntities(modifiedIds);
    this.emitDeleted(vaultId, id);
    await this.updateEntityCount(vaultId);
    await removeLocalEntityFile(localHandle, path);
    await cacheService.remove(`${vaultId}:${path.join("/")}`);
  }

  private deletionIndexes(id: string) {
    const inboundConnections = this.context.deps.getInboundConnections?.();
    const parentToChildren = this.context.deps.getParentToChildren?.();
    const childrenIds = parentToChildren
      ? parentToChildren[id] || []
      : undefined;
    return { inboundConnections, childrenIds };
  }

  private scheduleModifiedEntities(ids: string[]): void {
    for (const id of ids) {
      const entity = this.context.entities[id];
      if (entity) this.context.deps.persistence.scheduleSave(entity);
    }
  }

  private async captureBulkDeleteVault(expectedVaultId?: string) {
    if (
      expectedVaultId !== undefined &&
      expectedVaultId !== this.context.deps.activeVaultId()
    ) {
      return undefined;
    }
    const vaultHandle = await this.context.deps.getActiveVaultHandle();
    if (
      expectedVaultId !== undefined &&
      expectedVaultId !== this.context.deps.activeVaultId()
    ) {
      return undefined;
    }
    const localHandle = await this.context.deps.getActiveFolderHandle();
    const vaultId = this.context.deps.activeVaultId();
    if (expectedVaultId !== undefined && expectedVaultId !== vaultId) {
      return undefined;
    }
    if (!vaultHandle || !vaultId) return null;
    return { vaultHandle, localHandle, vaultId };
  }

  async bulkDelete(
    ids: string[],
    expectedVaultId?: string,
  ): Promise<BulkMutationResult> {
    this.assertWritable();
    const requestedIds = [...new Set(ids)];
    const span = this.recorder.start("vault_bulk_mutation");
    if (sessionModeStore.isDemoMode) {
      const result = this.deleteDemoEntities(requestedIds);
      span.complete(() => ({ changedEntityCount: result.succeededIds.length }));
      return result;
    }
    const capturedVault = await this.captureBulkDeleteVault(expectedVaultId);
    if (capturedVault === undefined) {
      span.cancel(() => ({ changedEntityCount: 0 }));
      return summarizeBulkMutation(
        requestedIds,
        requestedIds.map((id) => ({ id, status: "cancelled" })),
      );
    }
    if (capturedVault === null) {
      span.fail("unexpected", () => ({ changedEntityCount: 0 }));
      return summarizeBulkMutation(
        requestedIds,
        requestedIds.map((id) => ({ id, status: "failed" })),
      );
    }
    const { vaultHandle, localHandle, vaultId } = capturedVault;
    const validIds = requestedIds.filter((id) => this.context.entities[id]);
    const deletedPaths = new Map(
      validIds.map((id) => [
        id,
        this.context.entities[id]._path || [`${id}.md`],
      ]),
    );
    const items: BulkMutationItemResult[] = requestedIds
      .filter((id) => !this.context.entities[id])
      .map((id) => ({ id, status: "skipped" }));
    const tasks = validIds.map(
      (id) => () => this.deleteEntityFiles(id, vaultHandle, vaultId),
    );
    const deletedResults = await runWithConcurrency(tasks, 4);
    if (vaultId !== this.context.deps.activeVaultId()) {
      const result = summarizeBulkMutation(
        requestedIds,
        deletedResults.map((item) => ({
          id: item.id,
          status: item.ok ? "cancelled" : "failed",
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
      items.push(this.fileDeletionItem(result));
    }
    if (deletedIds.length > 0) {
      if (vaultId !== this.context.deps.activeVaultId()) {
        span.cancel(() => ({ changedEntityCount: 0 }));
        return summarizeBulkMutation(
          requestedIds,
          items.map((item) => ({ ...item, status: "cancelled" })),
        );
      }
      const committed = await this.commitBulkDeletion(deletedIds, vaultId);
      if (!committed) {
        span.cancel(() => ({ changedEntityCount: 0 }));
        return summarizeBulkMutation(
          requestedIds,
          items.map((item) => ({ ...item, status: "cancelled" })),
        );
      }
      await this.publishBulkDeletion(
        deletedIds,
        vaultId,
        deletedPaths,
        localHandle,
      );
    }
    return finishBulkMutation(span, summarizeBulkMutation(requestedIds, items));
  }

  private deleteDemoEntities(ids: string[]): BulkMutationResult {
    const next = { ...this.context.entities };
    const items: BulkMutationItemResult[] = [];
    for (const id of ids) {
      if (!next[id]) {
        items.push({ id, status: "skipped" });
        continue;
      }
      delete next[id];
      this.context.deps.onEntityDelete?.(id);
      items.push({ id, status: "success" });
    }
    this.context.entities = next;
    return summarizeBulkMutation(ids, items);
  }

  private async deleteEntityFiles(
    id: string,
    vaultHandle: FileSystemDirectoryHandle,
    vaultId: string,
  ): Promise<FileDeletionResult> {
    const entity = this.context.entities[id];
    if (!entity || this.context.deps.activeVaultId() !== vaultId)
      return { id, ok: false, cancelled: true };
    try {
      await this.context.deps.repository.enqueueSave(id, () =>
        vaultEntities.deleteEntityFiles(vaultHandle, entity),
      );
      return { id, ok: true, cancelled: false };
    } catch (error) {
      return { id, ok: false, cancelled: false, error };
    }
  }

  private fileDeletionItem(result: FileDeletionResult): BulkMutationItemResult {
    return {
      id: result.id,
      status: result.cancelled ? "cancelled" : result.ok ? "success" : "failed",
      error: result.error,
    };
  }

  private async commitBulkDeletion(
    deletedIds: string[],
    vaultId: string,
  ): Promise<boolean> {
    if (vaultId !== this.context.deps.activeVaultId()) return false;
    const applied = vaultEntities.applyBatchDelete(
      this.context.entities,
      deletedIds,
      this.context.deps.getInboundConnections?.(),
      this.context.deps.getParentToChildren?.(),
    );
    const survivorResults =
      await this.context.deps.persistence.persistImmediately(
        Object.values(applied.modified).map((entity) => ({ entity })),
      );
    if (vaultId !== this.context.deps.activeVaultId()) return false;
    const survivorSuccess = new Set(
      survivorResults.filter((result) => result.ok).map((result) => result.id),
    );
    const committed = { ...this.context.entities };
    for (const id of deletedIds) {
      delete committed[id];
      this.context.deps.onEntityDelete?.(id);
    }
    for (const id of Object.keys(applied.modified)) {
      committed[id] = applied.modified[id];
      if (!survivorSuccess.has(id))
        void this.context.deps.persistence.scheduleSave(applied.modified[id]);
    }
    this.context.entities = committed;
    return true;
  }

  private async publishBulkDeletion(
    deletedIds: string[],
    vaultId: string,
    deletedPaths: Map<string, string[]>,
    localHandle: FileSystemDirectoryHandle | undefined,
  ): Promise<void> {
    for (const id of deletedIds) {
      this.emitDeleted(vaultId, id);
      const path = deletedPaths.get(id) || [`${id}.md`];
      await cacheService.remove(`${vaultId}:${path.join("/")}`);
      await removeLocalEntityFile(localHandle, path);
    }
    await updateLastInternalChange(vaultId, {
      kind: "entity",
      ids: [...deletedIds],
      deleted: true,
    });
    await this.updateEntityCount(vaultId);
  }

  private emitDeleted(vaultId: string, id: string): void {
    vaultEventBus.emit({ type: "ENTITY_DELETED", vaultId, entityId: id });
  }

  private async updateEntityCount(vaultId: string): Promise<void> {
    await this.context.deps.updateEntityCount(
      vaultId,
      Object.keys(this.context.entities).length,
    );
  }
}
