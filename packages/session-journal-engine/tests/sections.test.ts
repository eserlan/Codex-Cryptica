import { describe, expect, it } from "bun:test";
import { entriesInSection, sectionIsGone } from "../src/sections";
import type { JournalEntry } from "../src/types";

const entry = (id: string, sectionId?: string): JournalEntry => ({
  id,
  timestamp: 1,
  type: "dice-roll",
  content: id,
  ...(sectionId ? { sectionId } : {}),
});

const entries = [
  entry("a", "s1"),
  entry("b", "s2"),
  entry("c", "s1"),
  entry("d"),
];

describe("entriesInSection", () => {
  it("returns only the entries in a section", () => {
    expect(entriesInSection(entries, "s1").map((e) => e.id)).toEqual([
      "a",
      "c",
    ]);
  });

  it("returns every entry when no section is chosen", () => {
    expect(entriesInSection(entries, null)).toHaveLength(4);
    expect(entriesInSection(entries, undefined)).toHaveLength(4);
  });

  it("returns nothing for a section with no entries", () => {
    expect(entriesInSection(entries, "s9")).toEqual([]);
  });
});

describe("sectionIsGone", () => {
  const journal = { sections: [{ id: "s1" }, { id: "s2" }] };

  it("is false for a section that still exists, and for no section", () => {
    expect(sectionIsGone(journal, "s1")).toBe(false);
    expect(sectionIsGone(journal, null)).toBe(false);
  });

  it("is true for a section the journal no longer has", () => {
    expect(sectionIsGone(journal, "s9")).toBe(true);
  });
});
