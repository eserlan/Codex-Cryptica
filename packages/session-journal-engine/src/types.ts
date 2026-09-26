/**
 * Session Journal (#3402 slice 1, #3406): a persistent, chronological play-
 * session record, distinct from Quicknote/Scratchpad's transient notes.
 *
 * See specs/163-session-journal/data-model.md for field-by-field rationale
 * and invariants. Invariants are enforced in engine.ts, not here — these are
 * plain data shapes.
 */

/** An optional, user-named grouping within a journal (a chapter or scene). */
export interface JournalSection {
  id: string;
  /** Non-empty after trimming — validated by `validateSectionName`, not here. */
  name: string;
}

/**
 * One timestamped item within a journal.
 *
 * `type` and `sourceRef` exist so later slices (#3408 automatic capture,
 * #3409 promote-to-entity) can add new entry types and source references
 * without a data migration (FR-014) — this slice only ever produces
 * `type: "manual-note"` with `sourceRef: undefined`.
 */
export interface JournalEntry {
  id: string;
  timestamp: number;
  type: string;
  content: string;
  /** References a `JournalSection.id` in the same journal, or ungrouped. */
  sectionId?: string;
  /** Opaque structured reference to where an automatically-captured entry
   *  came from. Reserved for future slices. */
  sourceRef?: Record<string, unknown>;
}

/** Data needed to append an entry — the engine assigns `id`/`timestamp`. */
export type JournalEntryInput = Omit<JournalEntry, "id" | "timestamp">;

/** A single vault's ongoing or completed play-session record. */
export interface SessionJournal {
  id: string;
  vaultId: string;
  title: string;
  status: "active" | "ended";
  startedAt: number;
  endedAt?: number;
  /** Ordered. May be empty (FR-006). */
  sections: JournalSection[];
  /** Ordered by `timestamp` ascending (FR-003). */
  entries: JournalEntry[];
}
