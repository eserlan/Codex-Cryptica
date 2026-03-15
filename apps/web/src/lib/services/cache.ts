import { entityDb } from "../utils/entity-db";
import type { LocalEntity } from "../stores/vault/types";
import { debugStore } from "../stores/debug.svelte";

/**
 * Parses the composite cache key used by the vault adapter layer.
 * The key is formatted as `"<vaultId>:<filePath>"` where vaultId is a
 * unique vault identifier (never contains a colon) and filePath is the
 * relative path of the markdown file within the vault directory.
 */
function parseKey(key: string): { vaultId: string; filePath: string } {
  const idx = key.indexOf(":");
  return {
    vaultId: key.substring(0, idx),
    filePath: key.substring(idx + 1),
  };
}

export class CacheService {
  /**
   * In-memory snapshot of the Dexie `graphEntities` table for the currently
   * active vault, keyed by `"<vaultId>:<filePath>"`.  Populated once per
   * vault load via `preloadVault()` and invalidated on vault switch.
   *
   * Only graph metadata is preloaded here — content/lore fields are loaded
   * lazily per-entity via `loadEntityContent` in the vault store.
   */
  private preloaded: Map<
    string,
    { lastModified: number; entity: LocalEntity }
  > | null = null;

  /**
   * Bulk-loads graph entity metadata from the `graphEntities` table (which
   * excludes `content` and `lore` fields stored separately in `entityContent`)
   * for the given vault into an in-memory map.  Calling this once before
   * iterating over individual OPFS files reduces N per-file IDB round-trips to
   * a single table scan, significantly speeding up warm cache loads.
   *
   * `entityContent` is intentionally excluded from this preload to keep the
   * startup read lightweight and to preserve the lazy-loading goal for heavy
   * text fields.
   *
   * Safe to call even when Dexie is unavailable (e.g. in test environments)
   * — any error is swallowed and the service falls back to per-file lookups.
   */
  async preloadVault(vaultId: string): Promise<void> {
    try {
      debugStore.log(`[CacheService] Preloading vault: ${vaultId}`);
      const start = performance.now();
      const graphRecords = await entityDb.graphEntities
        .where("vaultId")
        .equals(vaultId)
        .toArray();

      const map = new Map<
        string,
        { lastModified: number; entity: LocalEntity }
      >();

      for (const record of graphRecords) {
        const { vaultId: _vid, lastModified, filePath, ...graphData } = record;
        const entity: LocalEntity = {
          ...graphData,
          // Content starts as empty — loaded lazily when the entity is opened.
          content: "",
          lore: undefined,
        };
        map.set(`${vaultId}:${filePath}`, { lastModified, entity });
      }

      this.preloaded = map;
      debugStore.log(
        `[CacheService] Preloaded ${map.size} graph entities in ${(performance.now() - start).toFixed(2)}ms`,
      );
    } catch (err) {
      debugStore.error("[CacheService] Preload failed:", err);
      this.preloaded = null;
    }
  }

  /**
   * Returns the cached graph entity for the given composite key, or `null`
   * when no valid cache entry exists.  Content is intentionally omitted from
   * the returned entity — call `loadEntityContent` on the vault store to
   * populate it on demand.
   */
  async get(
    path: string,
  ): Promise<{ lastModified: number; entity: LocalEntity } | null> {
    // Fast path: use the pre-loaded in-memory snapshot when available.
    if (this.preloaded) {
      const hit = this.preloaded.get(path);
      if (hit) {
        return hit;
      }
    }

    // Slow path: individual Dexie lookup (cold start or after vault switch
    // before preloadVault has been called).
    try {
      const { vaultId, filePath } = parseKey(path);
      const record = await entityDb.graphEntities
        .where("[vaultId+filePath]")
        .equals([vaultId, filePath])
        .first();

      if (!record) {
        return null;
      }

      const {
        vaultId: _vid,
        lastModified,
        filePath: _fp,
        ...graphData
      } = record;
      const entity: LocalEntity = {
        ...graphData,
        content: "",
        lore: undefined,
      };
      return { lastModified, entity };
    } catch (err) {
      debugStore.warn(
        `[CacheService] Individual lookup failed for ${path}:`,
        err,
      );
      return null;
    }
  }

  /**
   * Persists the graph data and content of an entity to Dexie and updates the
   * in-memory preload cache (if active) so subsequent reads are consistent.
   *
   * Both writes are wrapped in a Dexie `transaction` so the graph-metadata
   * and content rows commit or rollback together, preventing a partial write
   * where one table succeeds and the other fails.
   */
  async set(
    path: string,
    lastModified: number,
    entity: LocalEntity,
  ): Promise<void> {
    try {
      const { vaultId, filePath } = parseKey(path);
      const { content, lore, ...graphData } = entity;

      await entityDb.transaction(
        "rw",
        [entityDb.graphEntities, entityDb.entityContent],
        async () => {
          await entityDb.graphEntities.put({
            ...graphData,
            vaultId,
            lastModified,
            filePath,
          });
          await entityDb.entityContent.put({
            entityId: entity.id,
            vaultId,
            content: content || "",
            lore,
          });
        },
      );

      // Keep the in-memory graph-entity snapshot consistent.
      if (this.preloaded) {
        const graphEntity: LocalEntity = {
          ...graphData,
          content: "",
          lore: undefined,
        };
        this.preloaded.set(path, { lastModified, entity: graphEntity });
      }
    } catch (err) {
      debugStore.error(
        `[CacheService] Failed to save ${entity.id} to Dexie:`,
        err,
      );
      // Non-fatal — the OPFS file is the source of truth.
    }
  }

  /**
   * Removes all cached entries for the given vault from Dexie.  Called when
   * a vault is deleted or explicitly cleared.
   */
  async clearVault(vaultId: string): Promise<void> {
    try {
      await entityDb.transaction(
        "rw",
        [entityDb.graphEntities, entityDb.entityContent],
        async () => {
          await entityDb.graphEntities
            .where("vaultId")
            .equals(vaultId)
            .delete();
          await entityDb.entityContent
            .where("vaultId")
            .equals(vaultId)
            .delete();
        },
      );
      // Invalidate the in-memory snapshot — it belongs to one vault.
      this.preloaded = null;
    } catch {
      // Non-fatal.
    }
  }

  /**
   * Returns all preloaded entities from the in-memory metadata map.
   * Useful for immediately populating the UI before OPFS sync starts.
   */
  getPreloadedEntities(): LocalEntity[] {
    if (!this.preloaded) return [];
    return Array.from(this.preloaded.values()).map((entry) => entry.entity);
  }

  /**
   * Invalidates the in-memory preload snapshot without touching Dexie.
   * Call this before switching to a different vault so the next `get` call
   * triggers a fresh Dexie lookup for the new vault.
   */
  invalidatePreload(): void {
    this.preloaded = null;
  }

  /** @deprecated Use `clearVault` instead. */
  async clear(): Promise<void> {
    this.preloaded = null;
  }
}

export const cacheService = new CacheService();
