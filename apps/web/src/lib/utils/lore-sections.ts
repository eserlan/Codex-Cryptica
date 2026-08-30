/**
 * Section-level analysis of an entity's lore (#2588).
 *
 * Lore is one markdown string carrying `##`-headed sections — "Personality &
 * Voice", hooks, relationships, and whatever else the author added. An AI
 * revision replaces that whole string, and nothing obliges the model to return
 * sections it was not asked about. Ask it to "focus on personality" and it can
 * reasonably return only a personality section, destroying the rest.
 *
 * These helpers exist so the apply step can *notice* that and ask, rather than
 * silently merging. Merging is tempting and wrong: a model that renames
 * "Personality & Voice" to "Personality" would leave two contradictory
 * sections, and re-adding a section the user deliberately asked to delete
 * fights a supported instruction.
 *
 * Pure and framework-free so it can be unit-tested without mounting anything.
 */

export interface LoreSection {
  /** Heading text without the leading `##` or surrounding whitespace. */
  heading: string;
  /** Normalised form used for matching; see `normaliseHeading`. */
  key: string;
  /** The section body, excluding the heading line. */
  body: string;
}

export interface LoreStructure {
  /** Text before the first heading. Not a section, but must not be lost. */
  preamble: string;
  sections: LoreSection[];
}

/**
 * Case- and punctuation-insensitive heading key.
 *
 * Deliberately loose: "Personality & Voice", "personality and voice" and
 * "Personality  &  Voice" are the same section to a reader, and treating them
 * as different would report a phantom removal on every revision.
 */
export function normaliseHeading(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Matches an ATX heading of level 2 or deeper at the start of a line. */
const HEADING = /^#{2,6}\s+(.+?)\s*$/;

/** Splits lore into its preamble and `##` sections, in document order. */
export function parseLoreSections(lore: string): LoreStructure {
  const lines = (lore ?? "").split(/\r?\n/);
  const sections: LoreSection[] = [];
  const preamble: string[] = [];
  let current: { heading: string; body: string[] } | null = null;

  for (const line of lines) {
    const match = HEADING.exec(line);
    if (match) {
      if (current) {
        sections.push({
          heading: current.heading,
          key: normaliseHeading(current.heading),
          body: current.body.join("\n").trim(),
        });
      }
      current = { heading: match[1], body: [] };
    } else if (current) {
      current.body.push(line);
    } else {
      preamble.push(line);
    }
  }

  if (current) {
    sections.push({
      heading: current.heading,
      key: normaliseHeading(current.heading),
      body: current.body.join("\n").trim(),
    });
  }

  return { preamble: preamble.join("\n").trim(), sections };
}

export interface LoreSectionDiff {
  /** Sections present before that the revision does not return. */
  removed: LoreSection[];
  /** Headings the revision introduces. */
  added: string[];
  /** Headings present in both. */
  kept: string[];
  /**
   * True when the comparison cannot be trusted and the caller should ask rather
   * than assume. Set when the existing lore has substance but no headings to
   * compare — there is no way to tell a rewrite from a deletion.
   */
  uncertain: boolean;
}

/**
 * Compares existing lore against a proposed revision.
 *
 * Only ever *reports*. Deciding what to do about a removal belongs to the
 * caller, because the right answer depends on whether the user asked for it.
 */
export function diffLoreSections(
  existingLore: string,
  proposedLore: string,
): LoreSectionDiff {
  const existing = parseLoreSections(existingLore);
  const proposed = parseLoreSections(proposedLore);

  const proposedKeys = new Set(proposed.sections.map((section) => section.key));
  const existingKeys = new Set(existing.sections.map((section) => section.key));

  const removed = existing.sections.filter(
    (section) => !proposedKeys.has(section.key),
  );

  // Unheaded existing lore with real content, replaced by something we cannot
  // compare section-by-section: err towards asking.
  const uncertain =
    existing.sections.length === 0 &&
    existing.preamble.length > 0 &&
    proposed.sections.length === 0 &&
    parseLoreSections(proposedLore).preamble !== existing.preamble;

  return {
    removed,
    added: proposed.sections
      .filter((section) => !existingKeys.has(section.key))
      .map((section) => section.heading),
    kept: proposed.sections
      .filter((section) => existingKeys.has(section.key))
      .map((section) => section.heading),
    uncertain,
  };
}

/**
 * Re-attaches sections the user chose to keep.
 *
 * Appended in their original order after the revised content, rather than
 * restored to their old positions: the revision may have reordered things
 * deliberately, and guessing at an interleaving would corrupt both.
 */
export function restoreLoreSections(
  proposedLore: string,
  sections: LoreSection[],
): string {
  if (sections.length === 0) return proposedLore;

  const restored = sections
    .map((section) =>
      section.body
        ? `## ${section.heading}\n\n${section.body}`
        : `## ${section.heading}`,
    )
    .join("\n\n");

  const base = proposedLore.trim();
  return base ? `${base}\n\n${restored}` : restored;
}

/** Human-readable list for the confirmation prompt: "A, B and C". */
export function formatSectionList(sections: LoreSection[]): string {
  const names = sections.map((section) => section.heading);
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
