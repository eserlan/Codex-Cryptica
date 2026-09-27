import type {
  JournalEntry,
  JournalEntryInput,
  JournalSection,
  SessionJournal,
} from "./types";

/**
 * Pure lifecycle, validation, and ordering logic for Session Journal
 * (#3402 slice 1, #3406). No I/O — the store (`apps/web/src/lib/stores/
 * session-journal.svelte.ts`) is the only thing that persists anything.
 *
 * Every function here operates on the *latest known* journal the caller
 * passes in. The store is responsible for making sure that's actually the
 * latest persisted state (see contracts/session-journal-store-api.md's
 * Concurrency Guarantee) — that discipline is what makes FR-011 hold, not
 * anything in this file.
 */

export interface IdSource {
  uuid(): string;
}

export interface ClockSource {
  now(): number;
}

/**
 * FR-001, FR-013. If `existing` is already active, returns it unchanged
 * (idempotent) rather than creating a second concurrent journal for the
 * vault. Otherwise creates a new active journal.
 */
export function startOrResumeJournal(
  existing: SessionJournal | undefined,
  vaultId: string,
  ids: IdSource,
  clock: ClockSource,
): SessionJournal {
  if (existing && existing.status === "active") return existing;

  const now = clock.now();
  return {
    id: ids.uuid(),
    vaultId,
    title: new Date(now).toLocaleDateString(),
    status: "active",
    startedAt: now,
    sections: [],
    entries: [],
  };
}

export type AppendEntryResult =
  | { ok: true; journal: SessionJournal; entry: JournalEntry }
  | { ok: false; error: string };

/**
 * FR-002, FR-003, FR-007. Rejects a journal whose `status` is `"ended"`
 * rather than silently reopening it. Entries are inserted by `timestamp`
 * order, not merely appended, so a caller with a slightly-stale clock still
 * produces a correctly-ordered list (FR-003).
 */
export function appendEntry(
  journal: SessionJournal,
  input: JournalEntryInput,
  ids: IdSource,
  clock: ClockSource,
): AppendEntryResult {
  if (journal.status === "ended") {
    return {
      ok: false,
      error: "This journal has ended and cannot take new entries.",
    };
  }
  if (
    input.sectionId &&
    !journal.sections.some((s) => s.id === input.sectionId)
  ) {
    return {
      ok: false,
      error: `No section "${input.sectionId}" exists in this journal.`,
    };
  }

  const entry: JournalEntry = {
    ...input,
    id: ids.uuid(),
    timestamp: clock.now(),
  };
  // Appended at the end, not re-sorted by timestamp: the array itself is the
  // displayed order (#3476), so a user's manual reordering (moveEntry) is
  // never undone by the next entry coming in. A new entry's timestamp is
  // `clock.now()`, so appending still reads chronologically in the common
  // case where nothing has been reordered.
  const entries = [...journal.entries, entry];

  return { ok: true, journal: { ...journal, entries }, entry };
}

export type UpdateEntryResult =
  | { ok: true; journal: SessionJournal; entry: JournalEntry }
  | { ok: false; error: string };

/**
 * Edits a typed note's text in place (#3476). Automatic entries (dice rolls,
 * card draws, table results) are a record of what actually happened, not
 * something to rewrite, so only `type: "manual-note"` can be edited. The
 * entry's id, timestamp, type, section and source reference are unchanged.
 */
export function updateEntryContent(
  journal: SessionJournal,
  entryId: string,
  content: string,
): UpdateEntryResult {
  const entry = journal.entries.find((e) => e.id === entryId);
  if (!entry) {
    return { ok: false, error: "That entry no longer exists." };
  }
  if (entry.type !== "manual-note") {
    return { ok: false, error: "Only typed notes can be edited." };
  }
  const trimmed = content.trim();
  if (!trimmed) {
    return { ok: false, error: "A note needs some text." };
  }

  const updated: JournalEntry = { ...entry, content: trimmed };
  const entries = journal.entries.map((e) => (e.id === entryId ? updated : e));
  return { ok: true, journal: { ...journal, entries }, entry: updated };
}

export type DeleteEntryResult =
  { ok: true; journal: SessionJournal } | { ok: false; error: string };

/** Removes one entry, of either kind (#3476). */
export function deleteEntry(
  journal: SessionJournal,
  entryId: string,
): DeleteEntryResult {
  if (!journal.entries.some((e) => e.id === entryId)) {
    return { ok: false, error: "That entry no longer exists." };
  }
  return {
    ok: true,
    journal: {
      ...journal,
      entries: journal.entries.filter((e) => e.id !== entryId),
    },
  };
}

export type MoveEntryDirection = "up" | "down";

export type MoveEntryResult =
  { ok: true; journal: SessionJournal } | { ok: false; error: string };

/**
 * Swaps an entry with its neighbour in the displayed order (#3476). Neither
 * entry's timestamp changes, so each still shows the time it actually
 * happened, even when that puts the list out of strict chronological order —
 * reordering is about how the session reads, not about rewriting when
 * something happened. Works the same for a typed note and an automatic entry.
 */
export function moveEntry(
  journal: SessionJournal,
  entryId: string,
  direction: MoveEntryDirection,
): MoveEntryResult {
  const index = journal.entries.findIndex((e) => e.id === entryId);
  if (index === -1) {
    return { ok: false, error: "That entry no longer exists." };
  }
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= journal.entries.length) {
    return {
      ok: false,
      error:
        direction === "up"
          ? "This is already the first entry."
          : "This is already the last entry.",
    };
  }

  const entries = [...journal.entries];
  [entries[index], entries[target]] = [entries[target], entries[index]];
  return { ok: true, journal: { ...journal, entries } };
}

export type SectionNameValidation = { ok: true } | { ok: false; error: string };

/** FR-005. Rejects an empty or whitespace-only name. */
export function validateSectionName(name: string): SectionNameValidation {
  if (name.trim().length === 0) {
    return { ok: false, error: "A section needs a name." };
  }
  return { ok: true };
}

export type CreateSectionResult =
  | { ok: true; journal: SessionJournal; section: JournalSection }
  | { ok: false; error: string };

/** FR-004. */
export function createSection(
  journal: SessionJournal,
  name: string,
  ids: IdSource,
): CreateSectionResult {
  const validation = validateSectionName(name);
  if (!validation.ok) return { ok: false, error: validation.error };

  const section: JournalSection = { id: ids.uuid(), name: name.trim() };
  return {
    ok: true,
    journal: { ...journal, sections: [...journal.sections, section] },
    section,
  };
}

export type RenameSectionResult =
  { ok: true; journal: SessionJournal } | { ok: false; error: string };

/** FR-005. On rejection, `journal` is returned unmodified. */
export function renameSection(
  journal: SessionJournal,
  sectionId: string,
  name: string,
): RenameSectionResult {
  const validation = validateSectionName(name);
  if (!validation.ok) return { ok: false, error: validation.error };

  if (!journal.sections.some((s) => s.id === sectionId)) {
    return {
      ok: false,
      error: `No section "${sectionId}" exists in this journal.`,
    };
  }

  const sections = journal.sections.map((s) =>
    s.id === sectionId ? { ...s, name: name.trim() } : s,
  );
  return { ok: true, journal: { ...journal, sections } };
}

export type EndJournalResult =
  { ok: true; journal: SessionJournal } | { ok: false; error: string };

/**
 * FR-007, FR-008. Rejects an already-ended journal rather than
 * double-transitioning it (idempotent failure, not a silent no-op success —
 * a caller trying to end an already-ended journal has a bug worth surfacing).
 */
export function endJournal(
  journal: SessionJournal,
  clock: ClockSource,
): EndJournalResult {
  if (journal.status === "ended") {
    return { ok: false, error: "This journal has already ended." };
  }
  return {
    ok: true,
    journal: { ...journal, status: "ended", endedAt: clock.now() },
  };
}
