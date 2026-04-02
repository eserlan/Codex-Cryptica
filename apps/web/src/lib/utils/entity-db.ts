import Dexie, { type Table } from "dexie";
import type { LocalEntity } from "../stores/vault/types";

/**
 * The subset of LocalEntity fields stored in the graph-entities table.
 * Content and lore are excluded to keep the graph data lightweight.
 * These are the only fields needed for graph visualization.
 */
export type GraphEntity = Omit<LocalEntity, "content" | "lore">;

/**
 * Row stored in the `graphEntities` Dexie table.
 * Includes vault-scoping and cache-validation fields alongside all graph data.
 */
export interface GraphEntityRecord extends GraphEntity {
  /** Vault this entity belongs to. Part of the compound primary key. */
  vaultId: string;
  /**
   * OPFS file lastModified timestamp used to detect stale cache entries.
   * Matches the `lastModified` property of the File returned by the OPFS API.
   */
  lastModified: number;
  /**
   * Relative path of the source markdown file within the vault directory
   * (e.g. "characters/hero.md"). Used as a secondary lookup key so cache
   * entries can be resolved by file path as well as entity ID.
   */
  filePath: string;
}

/**
 * Row stored in the `entityContent` Dexie table.
 * Holds the heavy text fields that are lazy-loaded on demand.
 */
export interface EntityContentRecord {
  /** Matches the entity's `id` field. Part of the compound primary key. */
  entityId: string;
  /** Vault this content belongs to. Part of the compound primary key. */
  vaultId: string;
  /** Markdown body of the entity (the "chronicle" / status section). */
  content: string;
  /** Hidden lore and relationships section. */
  lore: string;
}

/**
 * Row stored in the `search_index` Dexie table.
 */
export interface SearchIndexRecord {
  /** Vault identifier. Primary key. */
  vaultId: string;
  /** Serialized FlexSearch index data. */
  data: Record<string, any>;
  /** Last update timestamp. */
  updatedAt: number;
}

/**
 * Row stored in the `vaultMetadata` Dexie table.
 * Holds the campaign-level landing page data for a vault.
 */
export interface VaultMetadataRecord {
  /** Vault identifier. Primary key. */
  id: string;
  /** Optional campaign/world title shown in the header. */
  name?: string;
  /** Optional short tagline shown under the title. */
  tagline?: string;
  /** Optional campaign summary shown on the front page. */
  description?: string;
  /** Local OPFS path or external URL to the campaign cover art. */
  coverImage?: string;
  /** Last update timestamp. */
  lastModified: number;
}

/**
 * Row stored in the `appSettings` Dexie table.
 */
export interface AppSettingRecord {
  /** Setting key. Primary key. */
  key: string;
  /** Setting value. */
  value: any;
  /** Last update timestamp. */
  updatedAt: number;
}

/**
 * Dexie database used as the primary graph entity store.
 *
 * The database is intentionally separate from the legacy `CodexCryptica`
 * idb database so that the two stores can evolve independently and the
 * migration path remains straightforward.
 *
 * Schema version history:
 *  1 — initial: graphEntities + entityContent tables.
 *  2 — added search_index table for persistence.
 *  3 — added appSettings table for global configuration (AI keys, tiers).
 *  4 — added vaultMetadata table and graphEntity indexes for front page lookups.
 *  5 — added compound lastModified and label indexes for front page queries.
 */
export class EntityDb extends Dexie {
  graphEntities!: Table<GraphEntityRecord>;
  entityContent!: Table<EntityContentRecord>;
  searchIndex!: Table<SearchIndexRecord>;
  appSettings!: Table<AppSettingRecord>;
  vaultMetadata!: Table<VaultMetadataRecord>;

  constructor() {
    super("CodexEntityDb");
    this.version(1).stores({
      // Compound primary key [vaultId+id]; secondary indexes for bulk vault
      // queries and file-path lookups.
      graphEntities: "[vaultId+id], vaultId, [vaultId+filePath]",
      // Compound primary key [vaultId+entityId]; secondary index for bulk
      // vault queries.
      entityContent: "[vaultId+entityId], vaultId",
    });

    this.version(2).stores({
      searchIndex: "vaultId",
    });

    this.version(3).stores({
      appSettings: "key",
    });

    this.version(4)
      .stores({
        graphEntities:
          "[vaultId+id], vaultId, [vaultId+filePath], lastModified, *tags",
        entityContent: "[vaultId+entityId], vaultId",
        searchIndex: "vaultId",
        appSettings: "key",
        vaultMetadata: "id, lastModified",
      })
      .upgrade(async (_tx) => {
        // Migration logic for vaultMetadata if needed
      });

    this.version(5).stores({
      graphEntities:
        "[vaultId+id], vaultId, [vaultId+filePath], [vaultId+lastModified], lastModified, *tags, *labels",
      entityContent: "[vaultId+entityId], vaultId",
      searchIndex: "vaultId",
      appSettings: "key",
      vaultMetadata: "id, lastModified",
    });
  }
}

/** Singleton instance shared across the application. */
export const entityDb = new EntityDb();
