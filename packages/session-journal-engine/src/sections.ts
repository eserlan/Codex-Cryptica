import type { JournalEntry } from "./types";

/**
 * The entries shown for one section, in journal order. With no section chosen
 * every entry is shown (Solo Play Loop, FR-023).
 */
export function entriesInSection(
  entries: readonly JournalEntry[],
  sectionId: string | null | undefined,
): JournalEntry[] {
  if (!sectionId) return [...entries];
  return entries.filter((entry) => entry.sectionId === sectionId);
}

/** True when a chosen section is no longer in the journal (FR-024). */
export function sectionIsGone(
  journal: { sections: readonly { id: string }[] },
  sectionId: string | null | undefined,
): boolean {
  if (!sectionId) return false;
  return !journal.sections.some((section) => section.id === sectionId);
}
