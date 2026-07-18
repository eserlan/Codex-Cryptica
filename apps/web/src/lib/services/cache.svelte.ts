import { entityDb, type GraphEntityRecord } from "../utils/entity-db";
import type { LocalEntity } from "../stores/vault/types";
import { debugStore } from "../stores/debug.svelte";
import { systemClock } from "$lib/utils/runtime-deps";

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

function normalizePath(
  path: string | string[] | undefined,
  filePath: string,
): string[] {
  const raw = path || filePath.split("/");
  return typeof raw === "string" ? raw.split("/") : raw;
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
   * Bulk-loads graph entity metadata and content (but not lore) from Dexie for
   * the given vault into an in-memory map.  Calling this once before iterating
   * over individual OPFS files reduces N per-file IDB round-trips to two table
   * scans, significantly speeding up warm cache loads.
   *
   * `lore` is intentionally excluded — it can be large and is only needed when
   * an entity is actively opened for editing.
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
      const [graphRecords, contentRecords] = await Promise.all([
        entityDb.graphEntities.where("vaultId").equals(vaultId).toArray(),
        entityDb.entityContent.where("vaultId").equals(vaultId).toArray(),
      ]);

      // Build a fast entityId → content lookup so the loop below is O(1) per entity
      const contentByEntityId = new Map(
        contentRecords.map((r) => [r.entityId, r.content]),
      );

      const map = new Map<
        string,
        { lastModified: number; entity: LocalEntity }
      >();

      for (const record of graphRecords) {
        const { vaultId: _vid, lastModified, filePath, ...graphData } = record;
        const entity: LocalEntity = {
          ...graphData,
          content: contentByEntityId.get(String(graphData.id)) ?? "",
          lore: undefined, // lore is large — kept lazy-loaded per entity
          _path: normalizePath(graphData._path, filePath),
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

      // Also load content for this entity (lore stays lazy)
      const contentRecord = await entityDb.entityContent
        .where("[vaultId+entityId]")
        .equals([vaultId, String(graphData.id)])
        .first();

      const entity: LocalEntity = {
        ...graphData,
        content: contentRecord?.content ?? "",
        lore: undefined,
        _path: normalizePath(graphData._path, _fp),
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
      // $state.snapshot() returns a deep non-reactive POJO — Proxies and
      // Symbols are already stripped, so a second JSON round-trip is redundant.
      const raw = $state.snapshot(entity) as Record<string, any>;

      const { vaultId, filePath } = parseKey(path);

      // Separate heavy text from graph metadata
      const { content, lore, ...graphData } = raw;

      // Explicitly shape the Dexie record to match the GraphEntityRecord schema.
      // Since `raw` is a non-reactive deep copy from $state.snapshot(), we can trust its structure.
      const graphRecord = {
        ...graphData,
        updatedAt:
          typeof raw.updatedAt === "number" ? raw.updatedAt : systemClock.now(),
        status: raw.status || "active",
        vaultId,
        lastModified,
        filePath,
      } as unknown as GraphEntityRecord;

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
          content: String(content || ""),
          lore: undefined, // lore stays lazy
          _path: normalizePath(graphData._path, filePath),
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
   * Bulk persists multiple graph entities and their content to Dexie and updates
   * the in-memory preload cache in a single transaction.
   */
  async bulkSet(
    entries: Array<{
      path: string;
      lastModified: number;
      entity: LocalEntity;
    }>,
  ): Promise<void> {
    if (entries.length === 0) return;
    try {
      const graphRecords: GraphEntityRecord[] = [];
      const contentRecords: any[] = [];
      const preloadUpdates: Array<{
        path: string;
        lastModified: number;
        entity: LocalEntity;
      }> = [];

      for (const entry of entries) {
        const { path, lastModified, entity } = entry;
        const raw = $state.snapshot(entity) as Record<string, any>;
        const { vaultId, filePath } = parseKey(path);
        const { content, lore, ...graphData } = raw;

        const graphRecord = {
          ...graphData,
          updatedAt:
            typeof raw.updatedAt === "number"
              ? raw.updatedAt
              : systemClock.now(),
          status: raw.status || "active",
          vaultId,
          lastModified,
          filePath,
        } as unknown as GraphEntityRecord;

        graphRecords.push(graphRecord);
        contentRecords.push({
          entityId: String(raw.id),
          vaultId: String(vaultId),
          content: String(content || ""),
          lore: String(lore || ""),
        });

        preloadUpdates.push({
          path,
          lastModified,
          entity: {
            ...graphData,
            content: String(content || ""),
            lore: undefined, // lore stays lazy
            _path: normalizePath(graphData._path, filePath),
          } as LocalEntity,
        });
      }

      await entityDb.transaction(
        "rw",
        [entityDb.graphEntities, entityDb.entityContent],
        async () => {
          await entityDb.graphEntities.bulkPut(graphRecords);
          await entityDb.entityContent.bulkPut(contentRecords);
        },
      );

      if (this.preloaded) {
        for (const update of preloadUpdates) {
          this.preloaded.set(update.path, {
            lastModified: update.lastModified,
            entity: update.entity,
          });
        }
      }
    } catch (err) {
      debugStore.error(
        `[CacheService] Failed bulk save of ${entries.length} entities to Dexie:`,
        err,
      );
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
            await entityDb.entityContent.delete([vaultId, entityId]);
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
