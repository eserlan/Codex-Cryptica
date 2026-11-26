import type { LocalEntity } from "./types";
import { cacheService } from "../../services/cache.svelte";
import { debugStore } from "../debug.svelte";
import { vaultEventBus } from "./events.svelte";
import type { VaultSyncContext } from "./sync-context";
import type { LoadFilesOptions } from "./sync-types";

// Leave first paint and hydration clear before reading the authoritative OPFS files.
const WARM_RECONCILE_DELAY_MS = 1500;

function isLiveAtLeastAsNew(
  live: LocalEntity | undefined,
  cached: LocalEntity,
): live is LocalEntity {
  return !!live && (live.updatedAt ?? 0) >= (cached.updatedAt ?? 0);
}

/** Cache seeding, post-paint reconciliation and explicit disk recovery. */
export class VaultSyncCache {
  private lastSeededVaultId: string | null = null;
  private warmReconcileTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private context: VaultSyncContext,
    private reload: (
      skipSyncIfWarm?: boolean,
      options?: LoadFilesOptions,
    ) => Promise<void>,
  ) {}

  prepare(vaultId: string): boolean {
    const isSameVault = vaultId === this.lastSeededVaultId;
    // A same-vault preload must leave in-flight writes in memory; a switch must clear them.
    if (!isSameVault) this.context.deps.repository.entities = {};
    return isSameVault;
  }

  async preload(
    vaultId: string,
    isDemo: boolean,
    options: LoadFilesOptions,
  ): ReturnType<typeof cacheService.preloadVault> {
    if (isDemo) return new Map();
    return options.reuseCache
      ? cacheService.preloadVault(vaultId, { reuse: true })
      : cacheService.preloadVault(vaultId);
  }

  seed(
    vaultId: string,
    cachedMap: Awaited<ReturnType<typeof cacheService.preloadVault>>,
    isSameVault: boolean,
  ) {
    // Read the LIVE map at seed time (not a pre-await snapshot): on a
    // same-vault reload it still holds any writes that landed during the
    // async preload above.
    const liveEntities = isSameVault
      ? this.context.deps.repository.entities
      : {};
    const entityMap: Record<string, LocalEntity> = {};
    let reseedChanged = !isSameVault;
    for (const { entity } of cachedMap.values()) {
      // If the live entity is newer than (or the same revision as) the
      // cached copy, keep the live one: a debounced save may not have
      // landed yet, and an identical copy would only replace every entity
      // object, which makes everything reading them (the graph included)
      // rebuild for nothing.
      const live = liveEntities[entity.id];
      if (isLiveAtLeastAsNew(live, entity)) {
        entityMap[entity.id] = live;
      } else {
        entityMap[entity.id] = { ...entity };
        reseedChanged = true;
      }
    }
    // Preserve live entities created during this reload that the cache
    // snapshot hasn't captured yet (e.g. an in-flight import), so the
    // reseed can't drop brand-new entities either.
    for (const id in liveEntities) {
      if (!(id in entityMap)) entityMap[id] = liveEntities[id];
    }
    this.lastSeededVaultId = vaultId;
    // A same-vault reload whose cache matches memory has nothing to seed.
    if (reseedChanged) {
      this.context.deps.repository.entities = entityMap;
      vaultEventBus.emit({
        type: "CACHE_LOADED",
        vaultId,
        entities: entityMap,
      });
    }
  }

  /**
   * Re-reads the vault from OPFS after a warm-cache paint (#2619).
   *
   * Deferred rather than awaited so the instant load the cache exists for is
   * unaffected: the user already has their vault on screen before this starts.
   * `loadFiles(false)` takes the cold path, which reads OPFS and syncs the
   * local folder, so anything the cache was missing or holding stale is
   * corrected — and because it is the cold path, it cannot re-enter this.
   */
  scheduleReconcile(vaultIdAtStart: string): void {
    if (this.warmReconcileTimer) return;
    this.warmReconcileTimer = setTimeout(() => {
      this.warmReconcileTimer = null;
      // The user may have switched vaults while we waited; reconciling the
      // wrong vault would be worse than not reconciling at all.
      if (this.context.isStale(vaultIdAtStart)) return;
      void this.reload(false, { reuseCache: true }).catch((err) => {
        debugStore.warn("[SyncStore] Warm-cache reconcile failed:", err);
      });
    }, WARM_RECONCILE_DELAY_MS);
  }

  cancelReconcile(): void {
    if (!this.warmReconcileTimer) return;
    clearTimeout(this.warmReconcileTimer);
    this.warmReconcileTimer = null;
  }

  /**
   * Discards the fast-start cache and re-reads the vault from OPFS (#2619).
   *
   * The recovery action that did not exist. Every other path that clears the
   * cache is reached only by a Google Drive pull, so a local-only user whose
   * cache had drifted from disk had no way back — switching vaults does not do
   * it either, since `invalidatePreload()` drops the in-memory snapshot without
   * touching Dexie. Needs no linked folder: OPFS is the source of truth.
   */
  async reloadFromDisk(): Promise<void> {
    const activeVaultId = this.context.deps.activeVaultId();
    if (!activeVaultId) return;

    // Anything still sitting in the debounce would be lost by the reseed.
    await this.context.waitForSaves();
    await cacheService.clearVault(activeVaultId);
    await this.reload(false);
  }
}
