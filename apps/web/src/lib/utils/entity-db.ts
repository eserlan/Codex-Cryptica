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
  /** Optional deep-lore text field. */
  lore?: string;
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
 */
export class EntityDb extends Dexie {
  graphEntities!: Table<GraphEntityRecord>;
  entityContent!: Table<EntityContentRecord>;

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
  }
}

/** Singleton instance shared across the application. */
export const entityDb = new EntityDb();
