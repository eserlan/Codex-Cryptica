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
  const entries = [...journal.entries, entry].sort(
    (a, b) => a.timestamp - b.timestamp,
  );

  return { ok: true, journal: { ...journal, entries }, entry };
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
