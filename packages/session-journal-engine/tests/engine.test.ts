import { describe, it, expect } from "vitest";
import {
  appendEntry,
  createSection,
  deleteEntry,
  endJournal,
  moveEntry,
  renameSection,
  startOrResumeJournal,
  updateEntryContent,
  validateSectionName,
} from "../src/engine";
import type { JournalEntry, SessionJournal } from "../src/types";

function ids(prefix = "id") {
  let n = 0;
  return { uuid: () => `${prefix}-${++n}` };
}

function clock(start = 1_000) {
  let now = start;
  return { now: () => now++ };
}

const activeJournal = (
  overrides: Partial<SessionJournal> = {},
): SessionJournal => ({
  id: "j1",
  vaultId: "vault-1",
  title: "Session",
  status: "active",
  startedAt: 1_000,
  sections: [],
  entries: [],
  ...overrides,
});

const entry = (
  id: string,
  content: string,
  overrides: Partial<JournalEntry> = {},
): JournalEntry => ({
  id,
  timestamp: 1_000,
  type: "manual-note",
  content,
  ...overrides,
});

const journalWithEntries = (entries: JournalEntry[]): SessionJournal =>
  activeJournal({ entries });

describe("startOrResumeJournal", () => {
  it("creates a new active journal when none exists", () => {
    const journal = startOrResumeJournal(undefined, "vault-1", ids(), clock());
    expect(journal.status).toBe("active");
    expect(journal.vaultId).toBe("vault-1");
    expect(journal.entries).toEqual([]);
    expect(journal.sections).toEqual([]);
  });

  it("returns the existing journal unchanged when one is already active (FR-013)", () => {
    const existing = activeJournal();
    const result = startOrResumeJournal(existing, "vault-1", ids(), clock());
    expect(result).toBe(existing);
  });

  it("creates a new journal when the existing one has ended", () => {
    const ended = activeJournal({ status: "ended", endedAt: 2_000 });
    const result = startOrResumeJournal(ended, "vault-1", ids(), clock());
    expect(result).not.toBe(ended);
    expect(result.status).toBe("active");
  });
});

describe("appendEntry", () => {
  it("inserts entries in chronological order by timestamp", () => {
    const c = clock();
    const journal = activeJournal();
    const first = appendEntry(
      journal,
      { type: "manual-note", content: "First" },
      ids(),
      c,
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const second = appendEntry(
      first.journal,
      { type: "manual-note", content: "Second" },
      ids(),
      c,
    );
    expect(second.ok).toBe(true);
    if (!second.ok) return;

    expect(second.journal.entries.map((e) => e.content)).toEqual([
      "First",
      "Second",
    ]);
    expect(second.journal.entries[0].timestamp).toBeLessThan(
      second.journal.entries[1].timestamp,
    );
  });

  it("rejects appending to an ended journal (FR-007)", () => {
    const ended = activeJournal({ status: "ended", endedAt: 2_000 });
    const result = appendEntry(
      ended,
      { type: "manual-note", content: "Too late" },
      ids(),
      clock(),
    );
    expect(result.ok).toBe(false);
  });

  it("rejects an entry referencing a section that doesn't exist", () => {
    const journal = activeJournal();
    const result = appendEntry(
      journal,
      { type: "manual-note", content: "Orphan", sectionId: "missing" },
      ids(),
      clock(),
    );
    expect(result.ok).toBe(false);
  });
});

describe("validateSectionName / createSection / renameSection", () => {
  it("creates then renames a section", () => {
    const journal = activeJournal();
    const created = createSection(journal, "Arrival in Port Vane", ids());
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.section.name).toBe("Arrival in Port Vane");

    const renamed = renameSection(
      created.journal,
      created.section.id,
      "The Ambush",
    );
    expect(renamed.ok).toBe(true);
    if (!renamed.ok) return;
    expect(renamed.journal.sections[0].name).toBe("The Ambush");
  });

  it("rejects an empty or whitespace-only name and leaves the prior name in place (FR-005)", () => {
    const journal = activeJournal();
    const created = createSection(journal, "Chapter One", ids());
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    expect(validateSectionName("   ").ok).toBe(false);
    expect(validateSectionName("").ok).toBe(false);

    const renamed = renameSection(created.journal, created.section.id, "   ");
    expect(renamed.ok).toBe(false);
    // The original journal object is untouched — the caller keeps the prior name.
    expect(created.journal.sections[0].name).toBe("Chapter One");
  });

  it("rejects creating a section with an empty name", () => {
    const journal = activeJournal();
    const result = createSection(journal, "", ids());
    expect(result.ok).toBe(false);
  });
});

describe("endJournal", () => {
  it("sets status to ended and records endedAt, even for a journal with zero entries", () => {
    const journal = activeJournal();
    const c = clock(5_000);
    const result = endJournal(journal, c);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.journal.status).toBe("ended");
    expect(result.journal.endedAt).toBe(5_000);
  });

  it("rejects ending an already-ended journal rather than double-transitioning it", () => {
    const ended = activeJournal({ status: "ended", endedAt: 2_000 });
    const result = endJournal(ended, clock());
    expect(result.ok).toBe(false);
  });
});

describe("appendEntry ordering (#3476)", () => {
  it("appends without re-sorting, so a manually reordered list is not undone by a new entry", () => {
    const journal = journalWithEntries([
      entry("a", "First", { timestamp: 2_000 }),
      entry("b", "Second", { timestamp: 1_000 }),
    ]);

    const result = appendEntry(
      journal,
      { type: "manual-note", content: "Third" },
      ids(),
      clock(500),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.journal.entries.map((e) => e.content)).toEqual([
      "First",
      "Second",
      "Third",
    ]);
  });
});

describe("updateEntryContent (#3476)", () => {
  it("changes a typed note's text, keeping its id, timestamp and type", () => {
    const journal = journalWithEntries([
      entry("a", "Original", { timestamp: 500 }),
    ]);

    const result = updateEntryContent(journal, "a", "  Edited text  ");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entry).toEqual({
      id: "a",
      timestamp: 500,
      type: "manual-note",
      content: "Edited text",
    });
    expect(result.journal.entries[0]).toEqual(result.entry);
  });

  it("refuses to edit an automatic entry (negative)", () => {
    const journal = journalWithEntries([
      entry("a", "Rolled 1d20: 14", { type: "dice-roll" }),
    ]);

    const result = updateEntryContent(journal, "a", "Rolled 1d20: 20");

    expect(result).toEqual({
      ok: false,
      error: "Only typed notes can be edited.",
    });
  });

  it("refuses a blank edit and leaves the entry as it was (negative)", () => {
    const journal = journalWithEntries([entry("a", "Kept")]);

    const result = updateEntryContent(journal, "a", "   ");

    expect(result).toEqual({ ok: false, error: "A note needs some text." });
  });

  it("refuses an entry that no longer exists (negative)", () => {
    const journal = journalWithEntries([]);

    const result = updateEntryContent(journal, "gone", "Text");

    expect(result).toEqual({
      ok: false,
      error: "That entry no longer exists.",
    });
  });
});

describe("deleteEntry (#3476)", () => {
  it("removes only the named entry, keeping the others in order", () => {
    const journal = journalWithEntries([
      entry("a", "One"),
      entry("b", "Two"),
      entry("c", "Three"),
    ]);

    const result = deleteEntry(journal, "b");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.journal.entries.map((e) => e.id)).toEqual(["a", "c"]);
  });

  it("leaves the journal unchanged when the entry does not exist (negative)", () => {
    const journal = journalWithEntries([entry("a", "One")]);

    const result = deleteEntry(journal, "gone");

    expect(result).toEqual({
      ok: false,
      error: "That entry no longer exists.",
    });
  });

  it("can empty a journal down to zero entries", () => {
    const journal = journalWithEntries([entry("a", "Only")]);

    const result = deleteEntry(journal, "a");

    expect(result.ok && result.journal.entries).toEqual([]);
  });
});

describe("moveEntry (#3476)", () => {
  it("moves an entry up, swapping with its neighbour, keeping timestamps (SC)", () => {
    const journal = journalWithEntries([
      entry("a", "One", { timestamp: 100 }),
      entry("b", "Two", { timestamp: 200 }),
      entry("c", "Three", { timestamp: 300 }),
    ]);

    const result = moveEntry(journal, "b", "up");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.journal.entries.map((e) => e.id)).toEqual(["b", "a", "c"]);
    expect(result.journal.entries.map((e) => e.timestamp)).toEqual([
      200, 100, 300,
    ]);
  });

  it("moves an entry down", () => {
    const journal = journalWithEntries([
      entry("a", "One"),
      entry("b", "Two"),
      entry("c", "Three"),
    ]);

    const result = moveEntry(journal, "a", "down");

    expect(result.ok && result.journal.entries.map((e) => e.id)).toEqual([
      "b",
      "a",
      "c",
    ]);
  });

  it("refuses to move the first entry up (negative)", () => {
    const journal = journalWithEntries([entry("a", "One"), entry("b", "Two")]);

    const result = moveEntry(journal, "a", "up");

    expect(result).toEqual({
      ok: false,
      error: "This is already the first entry.",
    });
  });

  it("refuses to move the last entry down (negative)", () => {
    const journal = journalWithEntries([entry("a", "One"), entry("b", "Two")]);

    const result = moveEntry(journal, "b", "down");

    expect(result).toEqual({
      ok: false,
      error: "This is already the last entry.",
    });
  });

  it("refuses an entry that no longer exists (negative)", () => {
    const journal = journalWithEntries([entry("a", "One")]);

    const result = moveEntry(journal, "gone", "up");

    expect(result).toEqual({
      ok: false,
      error: "That entry no longer exists.",
    });
  });

  it("moves an automatic entry the same way as a typed note", () => {
    const journal = journalWithEntries([
      entry("a", "Rolled 1d6: 3", { type: "dice-roll" }),
      entry("b", "Note"),
    ]);

    const result = moveEntry(journal, "b", "up");

    expect(result.ok && result.journal.entries.map((e) => e.id)).toEqual([
      "b",
      "a",
    ]);
  });
});
