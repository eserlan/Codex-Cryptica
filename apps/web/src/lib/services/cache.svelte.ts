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

  private _preloadedVaultId: string | null = null;

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
  async preloadVault(
    vaultId: string,
  ): Promise<Map<string, { lastModified: number; entity: LocalEntity }>> {
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
      this._preloadedVaultId = vaultId;
      debugStore.log(
        `[CacheService] Preloaded ${map.size} graph entities in ${(performance.now() - start).toFixed(2)}ms`,
      );
      return map;
    } catch (err) {
      debugStore.error("[CacheService] Preload failed:", err);
      this.preloaded = null;
      this._preloadedVaultId = null;
      return new Map();
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
      // Svelte 5: Ensure we have a non-reactive, serializable clone.
      // We use JSON.parse/stringify as the absolute filter to strip any
      // Proxies, Symbols, or non-serializable garbage that Dexie/IndexedDB might reject.
      const raw = JSON.parse(JSON.stringify($state.snapshot(entity)));

      const { vaultId, filePath } = parseKey(path);

      // Separate heavy text from graph metadata
      const { content, lore, ...graphData } = raw;

      // We manually construct the record to be absolutely sure no hidden
      // non-serializable fields (like Proxies or nested arrays with issues)
      // are passed to Dexie.
      const graphRecord = {
        id: String(raw.id),
        type: String(raw.type),
        title: String(raw.title),
        tags: Array.isArray(raw.tags) ? [...raw.tags] : [],
        labels: Array.isArray(raw.labels) ? [...raw.labels] : [],
        connections: Array.isArray(raw.connections)
          ? JSON.parse(JSON.stringify(raw.connections))
          : [],
        image: raw.image ? String(raw.image) : undefined,
        thumbnail: raw.thumbnail ? String(raw.thumbnail) : undefined,
        metadata: raw.metadata ? JSON.parse(JSON.stringify(raw.metadata)) : {},
        updatedAt:
          typeof raw.updatedAt === "number" ? raw.updatedAt : Date.now(),
        _path: Array.isArray(raw._path) ? [...raw._path] : raw._path,
        vaultId: String(vaultId),
        lastModified: Number(lastModified),
        filePath: String(filePath),
      };

      await entityDb.transaction(
        "rw",
        [entityDb.graphEntities, entityDb.entityContent],
        async () => {
          await entityDb.graphEntities.put(graphRecord);
          await entityDb.entityContent.put({
            entityId: String(raw.id),
            vaultId: String(vaultId),
            content: String(content || ""),
            lore: String(lore || ""),
          });
        },
      );

      // Keep the in-memory graph-entity snapshot consistent.
      if (this.preloaded) {
        const graphEntity: LocalEntity = {
          ...graphData,
          content: "",
          lore: undefined,
        } as LocalEntity;
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
   * Removes a specific entity from the graph metadata and content tables in Dexie.
   * Format of `path` is `"<vaultId>:<filePath>"`.
   */
  async remove(path: string): Promise<void> {
    try {
      const { vaultId, filePath } = parseKey(path);
      const hit = this.preloaded?.get(path);
      const entityId = hit?.entity.id;

      await entityDb.transaction(
        "rw",
        [entityDb.graphEntities, entityDb.entityContent],
        async () => {
          await entityDb.graphEntities
            .where("[vaultId+filePath]")
            .equals([vaultId, filePath])
            .delete();

          if (entityId) {
            await entityDb.entityContent
              .get([vaultId, entityId])
              .then((record) => {
                if (record) entityDb.entityContent.delete([vaultId, entityId]);
              });
          }
        },
      );

      if (this.preloaded) {
        this.preloaded.delete(path);
      }
    } catch (err) {
      debugStore.error(
        `[CacheService] Failed to remove ${path} from Dexie:`,
        err,
      );
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
        [entityDb.graphEntities, entityDb.entityContent, entityDb.searchIndex],
        async () => {
          await entityDb.graphEntities
            .where("vaultId")
            .equals(vaultId)
            .delete();
          await entityDb.entityContent
            .where("vaultId")
            .equals(vaultId)
            .delete();
          await entityDb.searchIndex.delete(vaultId);
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
  getPreloadedEntities(vaultId?: string): LocalEntity[] {
    if (vaultId && this._preloadedVaultId !== vaultId) return [];
    if (!this.preloaded) return [];
    return Array.from(this.preloaded.values()).map((v) => v.entity);
  }

  /**
   * Invalidates the in-memory preload snapshot without touching Dexie.
   * Call this before switching to a different vault so the next `get` call
   * triggers a fresh Dexie lookup for the new vault.
   */
  invalidatePreload(): void {
    this.preloaded = null;
  }

  /**
   * Returns the cached chronicle and lore body text for a specific entity.
   */
  async getEntityContent(
    vaultId: string,
    entityId: string,
  ): Promise<{ content: string; lore: string } | null> {
    try {
      const record = await entityDb.entityContent.get([vaultId, entityId]);
      if (!record) return null;
      return { content: record.content, lore: record.lore };
    } catch (err) {
      debugStore.warn(
        `[CacheService] Failed to get content for ${entityId}:`,
        err,
      );
      return null;
    }
  }

  /**
   * Checks if the entityContent table is empty for a specific vault.
   * Useful for detecting if a cache repair sync is needed.
   */
  async isVaultContentEmpty(vaultId: string): Promise<boolean> {
    try {
      const count = await entityDb.entityContent
        .where("vaultId")
        .equals(vaultId)
        .count();
      return count === 0;
    } catch {
      return true;
    }
  }

  /** @deprecated Use `clearVault` instead. */
  async clear(): Promise<void> {
    this.preloaded = null;
  }
}

export const cacheService = new CacheService();
