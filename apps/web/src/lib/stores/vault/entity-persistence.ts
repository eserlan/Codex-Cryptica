import { debugStore } from "../debug.svelte";
import { retryWithBackoff } from "../../utils/retry";
import { cacheService } from "../../services/cache.svelte";
import type { LocalEntity } from "./types";
import { VaultRepository } from "@codex/vault-engine";
import type { Entity } from "schema";
import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
import { updateLastInternalChange } from "./registry";
import { systemClock } from "$lib/utils/runtime-deps";
import { runWithConcurrency } from "./bulk-results";

import { notificationStore } from "$lib/stores/ui/notification.svelte";

export interface PersistenceDependencies {
  repository: VaultRepository;
  activeVaultId: () => string | null;
  isGuest: () => boolean;
  getSpecificVaultHandle: (
    vaultId: string,
  ) => Promise<FileSystemDirectoryHandle | undefined>;
  setStatus: (
    status:
      "idle" | "loading" | "saving" | "saved" | "needs-permission" | "error",
  ) => void;
  status?: () =>
    "idle" | "loading" | "saving" | "saved" | "needs-permission" | "error";
  setErrorMessage: (msg: string | null) => void;
  onEntityUpdate?: (entity: LocalEntity) => void;
  onPermanentFailure?: (id: string, error?: unknown) => void;
  // loader delegation
  isContentLoaded: (id: string) => boolean;
  loadContent: (id: string) => Promise<void>;
  markContentLoaded: (id: string) => void;
}

export interface ScheduleSaveOptions {
  /**
   * Allows persistence to serialize an unloaded entity with content restored
   * from the cache table instead of hydrating the reactive entity store.
   */
  preserveCachedContent?: boolean;
  /**
   * If true, bypasses the debounce delay and persists immediately.
   */
  immediate?: boolean;
}

export interface ImmediateSaveEntry {
  entity: LocalEntity;
  options?: ScheduleSaveOptions;
}

export interface ImmediateSaveResult {
  id: string;
  ok: boolean;
  error?: unknown;
}

const SAVE_DEBOUNCE_MS = 400;

// Disk-write resilience tuning. A single _persistEntity call retries the OPFS
// write a few times; if it still fails the save is re-queued a bounded number
// of times so a transient failure can't silently and permanently drop the write.
const DISK_WRITE_ATTEMPTS = 3;
const DISK_RETRY_BASE_MS = 50;
const DISK_REQUEUE_BASE_MS = 250;
const MAX_FAILED_SAVE_REQUEUES = 3;

export class EntityPersistenceService {
  private _saveTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private _saveResolvers = new Map<string, Array<() => void>>();
  /** Vault ID captured at scheduleSave time, keyed by entity ID. */
  private _saveVaultIds = new Map<string, string>();
  /** Save options captured across debounced writes, keyed by entity ID. */
  private _saveOptions = new Map<string, ScheduleSaveOptions>();
  /** Bounded retry counter for entities whose disk write keeps failing. */
  private _failedSaveRetries = new Map<string, number>();

  constructor(private deps: PersistenceDependencies) {}

  get entities() {
    return this.deps.repository.entities;
  }

  private _savingSuspended = false;

  suspendSaving() {
    this._savingSuspended = true;
  }

  resumeSaving() {
    this._savingSuspended = false;
  }

  scheduleSave(
    entity: LocalEntity | Entity,
    options: ScheduleSaveOptions = {},
  ): Promise<void> {
    if (this.deps.onEntityUpdate)
      this.deps.onEntityUpdate(entity as LocalEntity);

    const vaultIdAtStart = this.deps.activeVaultId();
    if (!vaultIdAtStart) return Promise.resolve();
    if (sessionModeStore.isDemoMode) return Promise.resolve();

    if (this.deps.status && this.deps.status() === "saved") {
      this.deps.setStatus("idle");
    }

    const id = entity.id;

    // Debounce: cancel any pending timer for this entity and restart it.
    const existing = this._saveTimers.get(id);
    if (existing) {
      clearTimeout(existing);
      this._saveTimers.delete(id);
    }

    // Store the vault ID so flushPendingSaves uses the original context, not
    // whatever vault happens to be active at flush time.
    this._saveVaultIds.set(id, vaultIdAtStart);
    const mergedOpts = mergeScheduleSaveOptions(
      this._saveOptions.get(id),
      options,
    );
    this._saveOptions.set(id, mergedOpts);

    this.deps.setStatus("saving");

    if (this._savingSuspended) {
      return Promise.resolve();
    }

    const delayMs = mergedOpts.immediate ? 0 : SAVE_DEBOUNCE_MS;

    return new Promise<void>((resolve) => {
      const resolvers = this._saveResolvers.get(id) ?? [];
      resolvers.push(resolve);
      this._saveResolvers.set(id, resolvers);

      const doPersist = () => {
        this._saveTimers.delete(id);
        this._saveResolvers.delete(id);
        this._saveVaultIds.delete(id);
        const saveOptions = this._saveOptions.get(id) ?? {};
        this._saveOptions.delete(id);
        this.deps.repository
          .enqueueSave(id, () =>
            this._persistEntity(id, vaultIdAtStart, saveOptions),
          )
          .catch(() => {})
          .finally(() => resolvers.forEach((r) => r()));
      };

      if (delayMs === 0) {
        this._saveTimers.set(id, setTimeout(doPersist, 0));
      } else {
        this._saveTimers.set(id, setTimeout(doPersist, delayMs));
      }
    });
  }

  async flushPendingSaves(timeoutMs?: number): Promise<void> {
    const promises: Promise<void>[] = [];
    const pendingIds = Array.from(this._saveVaultIds.keys());

    for (const id of pendingIds) {
      const timer = this._saveTimers.get(id);
      if (timer) {
        clearTimeout(timer);
        this._saveTimers.delete(id);
      }
      const resolvers = this._saveResolvers.get(id) ?? [];
      this._saveResolvers.delete(id);
      // Use the vault ID captured when the save was scheduled, not the vault
      // that happens to be active at flush time — the two can differ during
      // rapid vault switches.
      const vaultId = this._saveVaultIds.get(id);
      this._saveVaultIds.delete(id);
      const saveOptions = this._saveOptions.get(id) ?? {};
      this._saveOptions.delete(id);
      if (vaultId) {
        const p = this.deps.repository
          .enqueueSave(id, () => this._persistEntity(id, vaultId, saveOptions))
          .catch(() => {})
          .finally(() => {
            resolvers.forEach((r) => r());
          })
          .then(() => undefined);
        promises.push(p);
      } else {
        resolvers.forEach((r) => r());
      }
    }
    await Promise.all(promises);
    await this.deps.repository.waitForAllSaves(timeoutMs);
  }

  /**
   * Persist a finite batch immediately, bypassing the continuous-edit debounce.
   * Per-entity repository queues still serialize writes to the same file while
   * the worker pool prevents a large batch from flooding OPFS.
   */
  async persistImmediately(
    entries: ImmediateSaveEntry[],
    concurrency = 4,
  ): Promise<ImmediateSaveResult[]> {
    const vaultId = this.deps.activeVaultId();
    if (!vaultId || sessionModeStore.isDemoMode || entries.length === 0) {
      return entries.map(({ entity }) => ({ id: entity.id, ok: false }));
    }

    const tasks = entries.map(
      (entry) => async (): Promise<ImmediateSaveResult> => {
        if (this.deps.activeVaultId() !== vaultId) {
          return { id: entry.entity.id, ok: false };
        }

        try {
          const ok = await this.deps.repository.enqueueSave(
            entry.entity.id,
            () =>
              this._persistEntity(
                entry.entity.id,
                vaultId,
                entry.options ?? {},
                entry.entity,
                false,
              ),
          );
          return { id: entry.entity.id, ok };
        } catch (error) {
          return { id: entry.entity.id, ok: false, error };
        }
      },
    );

    return runWithConcurrency(tasks, concurrency);
  }

  private async _persistEntity(
    id: string,
    vaultIdAtStart: string,
    options: ScheduleSaveOptions = {},
    entityOverride?: LocalEntity,
    requeueOnFailure = true,
  ): Promise<boolean> {
    if (this.deps.activeVaultId() !== vaultIdAtStart) {
      debugStore.log(
        `[EntityPersistence] Discarding save for ${id} - vault changed.`,
      );
      return false;
    }

    let latestEntity = entityOverride ?? this.entities[id];
    if (!latestEntity) return false;

    let restoredCachedContent = false;
    let hydratedContent = this.deps.isContentLoaded(id);
    if (!hydratedContent && options.preserveCachedContent) {
      const cachedContent = await cacheService.getEntityContent(
        vaultIdAtStart,
        id,
      );
      if (cachedContent) {
        restoredCachedContent = true;
        latestEntity = {
          ...latestEntity,
          content: cachedContent.content,
          lore: cachedContent.lore,
        };
      }
    }

    if (!hydratedContent && !restoredCachedContent) {
      await this.deps.loadContent(id);
      latestEntity = this.entities[id] || latestEntity;
      hydratedContent = true;
    }

    this.deps.setStatus("saving");
    try {
      const vaultHandle =
        await this.deps.getSpecificVaultHandle(vaultIdAtStart);
      if (!vaultHandle) {
        if (
          this._saveTimers.size === 0 &&
          (this.deps.repository.pendingSaveCount ?? 0) <= 1
        ) {
          this.deps.setStatus("saved");
        } else {
          this.deps.setStatus("idle");
        }
        // Preserve the historical no-handle behavior used by guest/test
        // adapters: there is no durable target to write, but the in-memory
        // mutation itself remains valid.
        return true;
      }

      // Retry the disk write a few times before giving up. Bulk imports issue
      // many OPFS writes in quick succession and a transient failure here used
      // to be swallowed, silently dropping the write (e.g. an entity's freshly
      // added connections) while the in-memory/cache copy still looked saved.
      await this._saveToDiskWithRetry(
        vaultHandle,
        vaultIdAtStart,
        latestEntity,
      );

      // Disk write succeeded — clear any prior failure bookkeeping for this id.
      this._failedSaveRetries.delete(id);

      await updateLastInternalChange(vaultIdAtStart);

      const path = latestEntity._path || [`${latestEntity.id}.md`];
      await cacheService.set(
        `${vaultIdAtStart}:${path.join("/")}`,
        systemClock.now(),
        latestEntity,
      );

      if (hydratedContent) {
        this.deps.markContentLoaded(latestEntity.id);
      }
      if (
        this._saveTimers.size === 0 &&
        (this.deps.repository.pendingSaveCount ?? 0) <= 1
      ) {
        this.deps.setStatus("saved");
      } else {
        this.deps.setStatus("idle");
      }
      return true;
    } catch (error) {
      debugStore.error(
        "[EntityPersistence] Failed to save entity to disk",
        error,
      );
      this.deps.setStatus("error");
      this.deps.setErrorMessage("Failed to access storage for saving.");

      // Don't silently drop the write: re-queue a bounded number of times so a
      // transient OPFS failure during a bulk import can't permanently corrupt
      // the on-disk file (which the cache would otherwise mask).
      if (requeueOnFailure) {
        this._requeueFailedSave(id, vaultIdAtStart, options);
      }
      return false;
    }
  }

  private async _saveToDiskWithRetry(
    vaultHandle: FileSystemDirectoryHandle,
    vaultIdAtStart: string,
    entity: LocalEntity,
  ): Promise<void> {
    await retryWithBackoff(
      () =>
        this.deps.repository.saveToDisk(
          vaultHandle,
          vaultIdAtStart,
          entity,
          this.deps.isGuest(),
        ),
      {
        attempts: DISK_WRITE_ATTEMPTS,
        delayMs: (attempt) => DISK_RETRY_BASE_MS * (attempt + 1),
      },
    );
  }

  private _requeueFailedSave(
    id: string,
    vaultIdAtStart: string,
    options: ScheduleSaveOptions,
  ): void {
    const retries = this._failedSaveRetries.get(id) ?? 0;
    if (retries >= MAX_FAILED_SAVE_REQUEUES) {
      this._failedSaveRetries.delete(id);
      this.deps.setStatus("error");
      this.deps.setErrorMessage(
        "Failed to save entity to storage after multiple attempts.",
      );
      if (this.deps.onPermanentFailure) {
        this.deps.onPermanentFailure(id);
      } else {
        try {
          notificationStore.notify(
            "Failed to save entity to storage. Storage write error.",
            "error",
          );
        } catch {
          // Safe fallback in test environments
        }
      }
      return;
    }
    this._failedSaveRetries.set(id, retries + 1);
    setTimeout(
      () => {
        if (this.deps.activeVaultId() !== vaultIdAtStart) return;
        void this.deps.repository
          .enqueueSave(id, () =>
            this._persistEntity(id, vaultIdAtStart, options),
          )
          .catch(() => {});
      },
      DISK_REQUEUE_BASE_MS * (retries + 1),
    );
  }
}

function mergeScheduleSaveOptions(
  previous: ScheduleSaveOptions | undefined,
  next: ScheduleSaveOptions,
): ScheduleSaveOptions {
  return {
    preserveCachedContent:
      (previous?.preserveCachedContent ?? true) &&
      next.preserveCachedContent === true,
    immediate: (previous?.immediate ?? false) || next.immediate === true,
  };
}
