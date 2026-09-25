import { describe, it, expect } from "vitest";
import {
  appendEntry,
  createSection,
  endJournal,
  renameSection,
  startOrResumeJournal,
  validateSectionName,
} from "../src/engine";
import type { SessionJournal } from "../src/types";

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
