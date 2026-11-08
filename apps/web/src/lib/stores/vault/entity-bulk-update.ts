import { vaultEventBus } from "./events.svelte";
import type { LocalEntity } from "./types";
import type { EntityMutationContext } from "./entity-mutation-context";
import type {
  ImmediateSaveEntry,
  ImmediateSaveResult,
} from "./entity-persistence";
import {
  summarizeBulkMutation,
  type BulkMutationResult,
  type BulkMutationItemResult,
} from "./bulk-results";
import {
  finishBulkMutation,
  hasLongFormUpdate,
  markMutationContentLoaded,
} from "./entity-mutation-effects";
import { sessionModeStore } from "#lib/stores/ui/session-mode.svelte.js";
import { systemClock } from "#lib/utils/runtime-deps.js";
import type { PerformanceRecorder } from "@codex/performance-observability";

type Patches = Record<string, Partial<LocalEntity>>;
interface StagedUpdate {
  entities: Record<string, LocalEntity>;
  patches: Patches;
  entries: ImmediateSaveEntry[];
  items: BulkMutationItemResult[];
}

export class EntityBulkUpdate {
  constructor(
    private readonly context: EntityMutationContext,
    private readonly recorder: PerformanceRecorder,
  ) {}

  async bulkUpdate(updates: Patches): Promise<BulkMutationResult> {
    const requestedIds = Object.keys(updates);
    const span = this.recorder.start("vault_bulk_mutation");
    const vaultId = this.context.deps.activeVaultId();
    const currentEntities = this.context.entities;
    const staged = this.stageUpdates(updates, currentEntities);
    if (staged.entries.length === 0) {
      span.complete(() => ({ changedEntityCount: 0 }));
      return summarizeBulkMutation(requestedIds, staged.items);
    }
    if (sessionModeStore.isDemoMode || this.context.deps.isGuest()) {
      this.commitLocalUpdates(staged);
    } else {
      const persisted = await this.context.deps.persistence.persistImmediately(
        staged.entries,
      );
      if (vaultId !== this.context.deps.activeVaultId()) {
        for (const id of Object.keys(staged.patches)) {
          staged.items.push({ id, status: "cancelled" });
        }
        span.cancel(() => ({ changedEntityCount: 0 }));
        return summarizeBulkMutation(requestedIds, staged.items);
      }
      this.commitPersistedUpdates(staged, currentEntities, persisted);
    }
    return finishBulkMutation(
      span,
      summarizeBulkMutation(requestedIds, staged.items),
    );
  }

  private stageUpdates(
    updates: Patches,
    currentEntities: Record<string, LocalEntity>,
  ): StagedUpdate {
    const staged: StagedUpdate = {
      entities: { ...currentEntities },
      patches: {},
      entries: [],
      items: [],
    };
    for (const [id, patch] of Object.entries(updates)) {
      const current = currentEntities[id];
      if (!current) {
        staged.items.push({ id, status: "skipped" });
        continue;
      }
      const merged = this.mergePatch(current, patch);
      staged.entities[id] = merged;
      staged.patches[id] = patch;
      this.invalidatePatchImage(current, patch);
      staged.entries.push({
        entity: merged,
        options: { preserveCachedContent: !hasLongFormUpdate(patch) },
      });
    }
    return staged;
  }

  private mergePatch(
    current: LocalEntity,
    patch: Partial<LocalEntity>,
  ): LocalEntity {
    const merged = {
      ...current,
      ...patch,
      metadata:
        patch.metadata !== undefined
          ? { ...(current.metadata ?? {}), ...patch.metadata }
          : current.metadata,
      content: this.resolveContent(current, patch),
      lore: patch.lore !== undefined ? patch.lore : current.lore,
      updatedAt: systemClock.now(),
      modifiedAt: systemClock.now(),
    } as LocalEntity;
    for (const key of Object.keys(patch) as (keyof LocalEntity)[]) {
      if (patch[key] === undefined) delete merged[key];
    }
    return merged;
  }

  private resolveContent(current: LocalEntity, patch: Partial<LocalEntity>) {
    if (patch.content === undefined) return current.content;
    if (
      this.context.deps.isGuest() &&
      patch.content === "" &&
      current.content
    ) {
      return current.content;
    }
    return patch.content;
  }

  private invalidatePatchImage(
    current: LocalEntity,
    patch: Partial<LocalEntity>,
  ): void {
    if (patch.image && this.context.deps.invalidateUrlCache) {
      this.context.deps.invalidateUrlCache(patch.image);
    } else if (
      Object.hasOwn(patch, "image") &&
      patch.image === undefined &&
      current.image &&
      this.context.deps.invalidateUrlCache
    ) {
      this.context.deps.invalidateUrlCache(current.image);
    }
  }

  private commitLocalUpdates(staged: StagedUpdate): void {
    this.context.entities = staged.entities;
    this.context.deps.onBatchUpdate?.(staged.patches);
    const entities: LocalEntity[] = [];
    for (const id in staged.patches) {
      if (!Object.hasOwn(staged.patches, id)) continue;
      staged.items.push({ id, status: "success" });
      entities.push(staged.entities[id]);
    }
    this.emitBatchUpdate(entities, staged.patches);
  }

  private commitPersistedUpdates(
    staged: StagedUpdate,
    currentEntities: Record<string, LocalEntity>,
    persisted: ImmediateSaveResult[],
  ): void {
    const persistedById = new Map(
      persisted.map((result) => [result.id, result]),
    );
    const committed = { ...currentEntities };
    const patches: Patches = {};
    for (const id of Object.keys(staged.patches)) {
      const result = persistedById.get(id);
      if (result?.ok) {
        committed[id] = staged.entities[id];
        patches[id] = staged.patches[id];
        if (hasLongFormUpdate(staged.patches[id])) {
          // Mark the staged record before publishing the committed repository.
          markMutationContentLoaded(this.context, id, staged.entities);
        }
        staged.items.push({ id, status: "success" });
      } else {
        staged.items.push({ id, status: "failed", error: result?.error });
      }
    }
    const entities = Object.keys(patches).map((id) => committed[id]);
    if (entities.length === 0) return;
    this.context.entities = committed;
    this.context.deps.onBatchUpdate?.(patches);
    this.emitBatchUpdate(entities, patches);
  }

  private emitBatchUpdate(entities: LocalEntity[], patches: Patches): void {
    vaultEventBus.emit({
      type: "BATCH_UPDATED",
      vaultId: this.context.deps.activeVaultId() || "unknown",
      entities,
      patches,
    });
  }
}
