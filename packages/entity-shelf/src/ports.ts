import type { PresentationTemplate, StatSheetTemplate } from "schema";
import type {
  ImportJournal,
  ShelfAssetRole,
  ShelfEntry,
  ShelfEntrySummary,
} from "./types";

/**
 * Everything that touches browser storage crosses one of these ports, so the
 * rules that matter — titles, connections, template conflicts, rollback — stay
 * pure and directly unit-testable (constitution principles I and VIII).
 */

export interface Clock {
  now(): number;
}

export interface IdFactory {
  next(): string;
}

/** The shelf itself. Origin-level: deliberately not keyed by vault. */
export interface ShelfStore {
  /**
   * Newest first. MUST NOT load blobs — the list has to stay cheap however
   * large the entries are, and it renders identically whichever vault is open
   * (FR-003, FR-022, FR-026).
   */
  listEntries(): Promise<ShelfEntrySummary[]>;
  getEntry(id: string): Promise<ShelfEntry | null>;
  /**
   * Replaces any existing entry with the same `(sourceVaultId, sourceEntityId)`
   * rather than appending a near-duplicate (FR-009, invariant I2).
   */
  putEntry(entry: ShelfEntry): Promise<void>;
  removeEntry(id: string): Promise<void>;
  clear(): Promise<void>;
  /** Bytes the shelf currently occupies, for the storage display (FR-025). */
  totalBytes(): Promise<number>;

  writeJournal(journal: ImportJournal): Promise<void>;
  /** Any journal still present is a crashed import awaiting rollback. */
  readJournals(): Promise<ImportJournal[]>;
  deleteJournal(importId: string): Promise<void>;
}

export interface VaultEntitySummary {
  id: string;
  title: string;
  aliases: string[];
}

/** Reads the source vault while shelving, and the target vault while planning. */
export interface VaultReader {
  /** The entity's `stringifyEntity` output, exactly as the vault stores it. */
  readEntityRecord(entityId: string): Promise<string>;
  /**
   * Returns null rather than throwing for a missing file: an entity whose image
   * has already gone from its own vault should still shelve, minus that asset.
   */
  readAsset(
    path: string,
  ): Promise<{ bytes: Blob; mimeType: string; originalName: string } | null>;
  readStatSheetTemplate(id: string): Promise<StatSheetTemplate | null>;
  readPresentationTemplate(id: string): Promise<PresentationTemplate | null>;
  /**
   * The single input to both title-collision detection and connection
   * resolution, which is what keeps those two from ever disagreeing
   * (research R5).
   */
  listEntities(): Promise<VaultEntitySummary[]>;
  /**
   * Template identifiers already present in this vault.
   *
   * Needed so that bringing a conflicting template in under a fresh id cannot
   * land on one that already exists — which would overwrite a template this
   * import did not create, and put it on the rollback list (invariant J2).
   */
  listStatSheetTemplateIds(): Promise<string[]>;
  listPresentationTemplateIds(): Promise<string[]>;
}

export interface SaveAssetInput {
  entityId: string;
  role: ShelfAssetRole;
  bytes: Blob;
  mimeType: string;
  originalName: string;
}

/**
 * Writes into the target vault, and undoes those writes on rollback.
 *
 * Every `delete*` MUST be idempotent — rollback runs against a journal listing
 * artifacts that a failure may have prevented from ever existing (invariant J3).
 */
export interface VaultWriter {
  /**
   * Creates an entity under an id the caller minted. The caller has already
   * ensured the id is free and the title does not collide, so this MUST NOT
   * overwrite anything (FR-013, FR-013a).
   */
  createEntity(input: { id: string; record: string }): Promise<void>;
  /** Returns the vault-relative reference to store back in the record. */
  saveAsset(input: SaveAssetInput): Promise<{ ref: string }>;
  saveStatSheetTemplate(template: StatSheetTemplate): Promise<void>;
  savePresentationTemplate(template: PresentationTemplate): Promise<void>;

  deleteEntity(id: string): Promise<void>;
  /**
   * Removes every asset attached to an entity. Safe as a rollback step because
   * the entity was created by this import, so all of its assets are ours.
   */
  deleteEntityAssets(entityId: string): Promise<void>;
  deleteStatSheetTemplate(id: string): Promise<void>;
  deletePresentationTemplate(id: string): Promise<void>;
}

export interface ParsedRecord {
  metadata: Record<string, unknown>;
  content: string;
}

/**
 * Frontmatter serialisation, delegated to the vault's own implementation
 * rather than reimplemented here. The shelf carries the vault's serialisation
 * verbatim; it does not define a format of its own (research R4).
 */
export interface RecordCodec {
  parse(record: string): ParsedRecord;
  stringify(metadata: Record<string, unknown>, content: string): string;
}
