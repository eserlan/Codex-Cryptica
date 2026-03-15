import { entityDb } from "../utils/entity-db";
import type { EntityContentRecord } from "../utils/entity-db";
import type { LocalEntity } from "../stores/vault/types";

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
   */
  private preloaded: Map<
    string,
    { lastModified: number; entity: LocalEntity }
  > | null = null;

  /**
   * Pre-loaded content records keyed by `entityId`.  Stored separately from
   * the graph-entity map to avoid attaching undeclared properties to typed
   * `LocalEntity` objects.  Used by `loadEntityContent` (via `VaultStore`) to
   * serve Dexie content without an extra round-trip.
   */
  private preloadedContent: Map<string, EntityContentRecord> | null = null;

  /**
   * Bulk-loads all graph entities and their content for the given vault from
   * Dexie into in-memory maps.  Calling this once before iterating over
   * individual files reduces N per-file IDB round-trips to a single
   * parallel pair of queries.
   *
   * Safe to call even when Dexie is unavailable (e.g. in test environments)
   * — any error is swallowed and the service falls back to per-file lookups.
   */
  async preloadVault(vaultId: string): Promise<void> {
    try {
      const [graphRecords, contentRecords] = await Promise.all([
        entityDb.graphEntities.where("vaultId").equals(vaultId).toArray(),
        entityDb.entityContent.where("vaultId").equals(vaultId).toArray(),
      ]);

      const contentMap = new Map<string, EntityContentRecord>(
        contentRecords.map((r) => [r.entityId, r]),
      );
      const map = new Map<string, { lastModified: number; entity: LocalEntity }>();

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
      this.preloadedContent = contentMap;
    } catch {
      this.preloaded = null;
      this.preloadedContent = null;
    }
  }

  /**
   * Returns the pre-loaded content record for an entity, if available.
   * Used by `VaultStore.loadEntityContent` to serve content without an extra
   * Dexie round-trip after `preloadVault` has run.
   */
  getPreloadedContent(entityId: string): EntityContentRecord | undefined {
    return this.preloadedContent?.get(entityId);
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
      return this.preloaded.get(path) ?? null;
    }

    // Slow path: individual Dexie lookup (cold start or after vault switch
    // before preloadVault has been called).
    try {
      const { vaultId, filePath } = parseKey(path);
      const record = await entityDb.graphEntities
        .where("[vaultId+filePath]")
        .equals([vaultId, filePath])
        .first();

      if (!record) return null;

      const { vaultId: _vid, lastModified, filePath: _fp, ...graphData } =
        record;
      const entity: LocalEntity = {
        ...graphData,
        content: "",
        lore: undefined,
      };
      return { lastModified, entity };
    } catch {
      return null;
    }
  }

  /**
   * Persists the graph data and content of an entity to Dexie and updates the
   * in-memory preload cache (if active) so subsequent reads are consistent.
   */
  async set(
    path: string,
    lastModified: number,
    entity: LocalEntity,
  ): Promise<void> {
    try {
      const { vaultId, filePath } = parseKey(path);
      const { content, lore, ...graphData } = entity;

      await Promise.all([
        entityDb.graphEntities.put({
          ...graphData,
          vaultId,
          lastModified,
          filePath,
        }),
        entityDb.entityContent.put({
          entityId: entity.id,
          vaultId,
          content: content || "",
          lore,
        }),
      ]);

      // Keep the in-memory snapshots consistent.
      if (this.preloaded) {
        const graphEntity: LocalEntity = {
          ...graphData,
          content: "",
          lore: undefined,
        };
        this.preloaded.set(path, { lastModified, entity: graphEntity });
      }
      if (this.preloadedContent) {
        this.preloadedContent.set(entity.id, {
          entityId: entity.id,
          vaultId,
          content: content || "",
          lore,
        });
      }
    } catch {
      // Non-fatal — the OPFS file is the source of truth.
    }
  }

  /**
   * Removes all cached entries for the given vault from Dexie.  Called when
   * a vault is deleted or explicitly cleared.
   */
  async clearVault(vaultId: string): Promise<void> {
    try {
      await Promise.all([
        entityDb.graphEntities.where("vaultId").equals(vaultId).delete(),
        entityDb.entityContent.where("vaultId").equals(vaultId).delete(),
      ]);
      // Invalidate the entire preloaded maps — they belong to one vault.
      this.preloaded = null;
      this.preloadedContent = null;
    } catch {
      // Non-fatal.
    }
  }

  /**
   * Invalidates the in-memory preload snapshots without touching Dexie.
   * Call this before switching to a different vault so the next `get` call
   * triggers a fresh Dexie lookup for the new vault.
   */
  invalidatePreload(): void {
    this.preloaded = null;
    this.preloadedContent = null;
  }

  /** @deprecated Use `clearVault` instead. */
  async clear(): Promise<void> {
    this.preloaded = null;
    this.preloadedContent = null;
  }
}

export const cacheService = new CacheService();
