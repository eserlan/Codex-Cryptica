import type { PresentationTemplate, StatSheetTemplate } from "schema";

/**
 * The Shelf: an origin-level transfer buffer that every vault can read, so an
 * entity authored in one vault can be carried into another without anything
 * leaving the application. See specs/156-entity-shelf/.
 */

/** Which frontmatter reference a shelved file satisfies. */
export type ShelfAssetRole = "image" | "thumbnail" | "soundBite";

/**
 * A copy of one file the shelved entity referenced. Copies rather than
 * references: an entry has to stay complete after its source vault is edited
 * or deleted (FR-005).
 */
export interface ShelfAsset {
  role: ShelfAssetRole;
  /** Vault-relative path as it appeared in the source record. */
  sourcePath: string;
  bytes: Blob;
  mimeType: string;
  originalName: string;
}

/**
 * One snapshot of one entity, self-contained. Nothing it needs lives anywhere
 * else once written, and entries are immutable — re-shelving replaces rather
 * than edits (invariants I2/I4).
 */
export interface ShelfEntry {
  id: string;
  /** The shelving action that produced this entry; a lone entity still gets a group of one. */
  groupId: string;
  /** `stringifyEntity` output — YAML frontmatter plus body, losslessly (FR-004). */
  entityRecord: string;
  /** Only ever used to replace on re-shelve (FR-009); never reused as an id on import. */
  sourceEntityId: string;
  sourceVaultId: string;
  /** Captured at shelving time so it survives that vault being deleted (FR-007). */
  sourceVaultName: string;
  /** Denormalised so the list renders without parsing the record (FR-022). */
  title: string;
  type: string;
  shelvedAt: number;
  assets: ShelfAsset[];
  statSheetTemplate: StatSheetTemplate | null;
  presentationTemplate: PresentationTemplate | null;
  /**
   * Titles of everything this entity points at, captured at shelving time and
   * keyed by source-vault entity id.
   *
   * `Connection.target` and `parent` hold a source-vault **id** and nothing
   * else, and ids mean nothing in another vault. Without this snapshot FR-017's
   * "match by title or alias" has no title to match on, and every connection
   * leaving the shelved batch would be unresolvable by construction.
   */
  referencedTitles: Record<string, { title: string; aliases: string[] }>;
  byteSize: number;
}

/** What the shelf list needs. Deliberately excludes blobs — see ShelfStore.listEntries. */
export type ShelfEntrySummary = Omit<
  ShelfEntry,
  | "entityRecord"
  | "assets"
  | "statSheetTemplate"
  | "presentationTemplate"
  | "referencedTitles"
>;

/**
 * Derived, not stored: a group is the entries sharing a `groupId`, reached via
 * the `by-group` index. There is nothing to keep in sync and no orphan record
 * when the last member is removed.
 */
export interface ShelfGroup {
  id: string;
  shelvedAt: number;
  entries: ShelfEntrySummary[];
}

/**
 * Written before the first artifact of an import and deleted after the last
 * (invariant J1). Everything it lists is minted up front, so a crash at any
 * point leaves a complete record of what to undo.
 *
 * Rollback is pure deletion of things this import created — never a restore —
 * because import only ever creates (FR-013) and never reuses a title
 * (FR-013a). That is what makes compensating rollback sound here without a
 * transaction spanning IndexedDB and OPFS (invariant J2, research R1).
 */
export interface ImportJournal {
  importId: string;
  vaultId: string;
  startedAt: number;
  /** Entity ids minted before any write, so rollback needs no path bookkeeping. */
  entityIds: string[];
  /** Only templates this import will create; reused ones are never listed, so never rolled back. */
  schemaTemplateIds: string[];
  presentationTemplateIds: string[];
}

/** How a template dependency resolves against the target vault. */
export type TemplateDecisionKind =
  | "reuse-existing"
  | "bring-in"
  | "conflict-keep-existing"
  | "conflict-bring-in";

export interface TemplateDecision {
  kind: TemplateDecisionKind;
  templateId: string;
  templateName: string;
  flavour: "schema" | "presentation";
  /** True when the author still has to choose (FR-016). */
  unresolved: boolean;
}

export type UnresolvedReason = "not-found" | "ambiguous";

export interface ConnectionResolution {
  /** Entry whose connection this is. */
  entryId: string;
  /** Target as named in the shelved record. */
  targetRef: string;
  label?: string;
  type: string;
  /** Resolved target entity id in the destination vault, or null if it could not be. */
  resolvedTargetId: string | null;
  reason?: UnresolvedReason;
}

export interface ParentResolution {
  entryId: string;
  parentRef: string;
  resolvedParentId: string | null;
  reason?: UnresolvedReason;
}

export interface TitleAssignment {
  entryId: string;
  originalTitle: string;
  finalTitle: string;
  renamed: boolean;
}

/**
 * Produced before anything is written. Every decision the author has to make
 * lives here, so the write phase runs unattended and no dialog can open inside
 * the journalled section (FR-016a).
 */
export interface ImportPlan {
  importId: string;
  targetVaultId: string;
  entries: ShelfEntry[];
  /** Entity id minted for each entry, keyed by entry id. */
  mintedIds: Record<string, string>;
  titleAssignments: TitleAssignment[];
  templateDecisions: TemplateDecision[];
  connectionResolutions: ConnectionResolution[];
  parentResolutions: ParentResolution[];
}

/** What FR-019 reports back to the author. */
export interface ImportOutcome {
  created: Array<{ entityId: string; title: string }>;
  renamed: Array<{ from: string; to: string }>;
  templatesReused: string[];
  templatesBroughtIn: string[];
  templatesChosenBetween: string[];
  droppedConnections: ConnectionResolution[];
  droppedParents: ParentResolution[];
}

export interface ProgressReport {
  /** 0-based index of the item being worked on. */
  completed: number;
  total: number;
  label: string;
}

export type ProgressFn = (report: ProgressReport) => void;
