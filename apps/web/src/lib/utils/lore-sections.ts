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

/* ------------------------------------------------------------------------ */
/* Section-by-section merge planning                                         */
/* ------------------------------------------------------------------------ */

/**
 * What happened to one section between the current lore and a proposed
 * revision. `unchanged` means the body is byte-identical, so there is nothing
 * for the reader to decide.
 */
export type LoreSectionStatus = "unchanged" | "modified" | "removed" | "added";

/** Which version of a section to write. */
export type LoreSectionChoice = "current" | "proposed" | "both" | "omit";

export interface LoreSectionPlanEntry {
  /** Matching key; the empty string is the unheaded preamble. */
  key: string;
  /** Heading to display. Empty for the preamble. */
  heading: string;
  status: LoreSectionStatus;
  /** Body as it exists today, when there is one. */
  current?: string;
  /** Body the revision proposes, when there is one. */
  proposed?: string;
  /** What to select when the dialog opens. */
  defaultChoice: LoreSectionChoice;
}

export interface LoreMergePlan {
  entries: LoreSectionPlanEntry[];
  /** True when anything needs a decision — i.e. not every entry is unchanged. */
  hasChanges: boolean;
  /** True when a section exists today and the revision drops it. */
  hasRemovals: boolean;
}

/**
 * Builds a per-section comparison of current lore against a proposed revision.
 *
 * Ordering follows the proposal, with dropped sections appended in their
 * original order. That keeps the revision's own structure intact — it may have
 * reordered deliberately — while making sure nothing disappears off the end of
 * the list.
 *
 * Defaults are chosen to be safe rather than clever: a dropped section defaults
 * to being kept, and a modified one defaults to the revision, because the
 * reader asked for a revision. Nothing is destroyed without an explicit choice.
 */
export function buildLoreMergePlan(
  existingLore: string,
  proposedLore: string,
): LoreMergePlan {
  const existing = parseLoreSections(existingLore);
  const proposed = parseLoreSections(proposedLore);

  const existingByKey = new Map(existing.sections.map((s) => [s.key, s]));
  const proposedByKey = new Map(proposed.sections.map((s) => [s.key, s]));
  const entries: LoreSectionPlanEntry[] = [];

  // The preamble is unheaded but is still the author's text; losing it silently
  // would be the same bug in a different place.
  if (existing.preamble || proposed.preamble) {
    const status: LoreSectionStatus = !existing.preamble
      ? "added"
      : !proposed.preamble
        ? "removed"
        : existing.preamble === proposed.preamble
          ? "unchanged"
          : "modified";
    entries.push({
      key: "",
      heading: "",
      status,
      current: existing.preamble || undefined,
      proposed: proposed.preamble || undefined,
      defaultChoice: status === "removed" ? "current" : "proposed",
    });
  }

  for (const section of proposed.sections) {
    const match = existingByKey.get(section.key);
    if (!match) {
      entries.push({
        key: section.key,
        heading: section.heading,
        status: "added",
        proposed: section.body,
        defaultChoice: "proposed",
      });
      continue;
    }
    const unchanged = match.body === section.body;
    entries.push({
      key: section.key,
      heading: section.heading,
      status: unchanged ? "unchanged" : "modified",
      current: match.body,
      proposed: section.body,
      defaultChoice: "proposed",
    });
  }

  for (const section of existing.sections) {
    if (proposedByKey.has(section.key)) continue;
    entries.push({
      key: section.key,
      heading: section.heading,
      status: "removed",
      current: section.body,
      // Safe default: a section the revision dropped is kept unless the reader
      // says otherwise.
      defaultChoice: "current",
    });
  }

  return {
    entries,
    hasChanges: entries.some((entry) => entry.status !== "unchanged"),
    hasRemovals: entries.some((entry) => entry.status === "removed"),
  };
}

/**
 * Renders a plan back into a lore string using the reader's choices.
 *
 * Unlisted keys fall back to the entry's default, so a partially-answered plan
 * still produces something sensible rather than throwing.
 */
export function composeLore(
  plan: LoreMergePlan,
  choices: Record<string, LoreSectionChoice> = {},
): string {
  const parts: string[] = [];

  for (const entry of plan.entries) {
    const choice = choices[entry.key] ?? entry.defaultChoice;
    if (choice === "omit") continue;

    let body: string | undefined;
    if (choice === "current") body = entry.current;
    else if (choice === "proposed") body = entry.proposed;
    else if (choice === "both") {
      body = [entry.proposed, entry.current].filter(Boolean).join("\n\n");
    }

    if (body === undefined) {
      // The chosen side does not exist (e.g. "current" on an added section).
      body = entry.proposed ?? entry.current;
    }
    if (body === undefined) continue;

    if (entry.key === "") {
      if (body.trim()) parts.push(body.trim());
      continue;
    }
    parts.push(
      body.trim()
        ? `## ${entry.heading}\n\n${body.trim()}`
        : `## ${entry.heading}`,
    );
  }

  return parts.join("\n\n");
}
