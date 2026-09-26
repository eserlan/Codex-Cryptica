import type { JournalEntry, SessionJournal } from "./types";

/**
 * Session Journal (#3402 slice 4, #3409): pure logic that turns part of a
 * journal into the name and text of a vault entity. No I/O, never throws,
 * never changes the journal it is given (FR-041). The exact text format is in
 * specs/163-session-journal/contracts/session-journal-store-api.md.
 */

export type PromotionScope =
  | { kind: "entry"; entryId: string }
  | { kind: "section"; sectionId: string }
  | { kind: "journal" }
  | { kind: "selection"; entryIds: string[]; sectionIds: string[] };

export interface PromotionOptions {
  /** Local time of day for an entry, e.g. "14:05". Injected so the engine is
   *  pure and tests do not depend on the machine's locale. */
  formatTime: (timestamp: number) => string;
}

export type PromotionResult =
  | {
      ok: true;
      /** The default name offered in the form. */
      title: string;
      /** Plain text / simple markdown body. */
      content: string;
      entryCount: number;
      /** Back-reference tag, e.g. "journal:j1:entry:e9". */
      source: string;
    }
  | { ok: false; error: string };

export const PROMOTION_ERRORS = {
  missing: "That part of the journal no longer exists.",
  nothing: "There is nothing here to turn into an entity yet.",
} as const;

const AUTOMATIC_LABELS: Record<string, string> = {
  "dice-roll": "Dice roll",
  "card-draw": "Card draw",
  "table-result": "Table result",
};
const GENERIC_AUTOMATIC_LABEL = "Automatic entry";
const MANUAL_NOTE = "manual-note";

/** The label of an automatic entry type, or `undefined` for a typed note. */
export function entryTypeLabel(type: string): string | undefined {
  if (type === MANUAL_NOTE) return undefined;
  return AUTOMATIC_LABELS[type] ?? GENERIC_AUTOMATIC_LABEL;
}

const NAME_MAX = 60;
const NAME_MIN_WORD_BREAK = 30;
const FALLBACK_JOURNAL_TITLE = "Session journal";
const FALLBACK_ENTRY_NAME = "Journal entry";

/** An entry's text as it reads in a body: typed notes as written, automatic
 *  entries led by their label. Only `content` is used, never `sourceRef`. */
function entryText(entry: JournalEntry): string {
  const label = entryTypeLabel(entry.type);
  return label ? `${label} — ${entry.content}` : entry.content;
}

function entryLines(
  entry: JournalEntry,
  formatTime: PromotionOptions["formatTime"],
): string[] {
  const [first, ...rest] = entryText(entry).split("\n");
  return [
    `- ${formatTime(entry.timestamp)} — ${first}`,
    ...rest.map((line) => `  ${line}`),
  ];
}

function defaultEntryName(content: string): string {
  const line = content.split("\n").find((l) => l.trim().length > 0);
  const text = line?.trim() ?? "";
  if (!text) return FALLBACK_ENTRY_NAME;
  if (text.length <= NAME_MAX) return text;
  const cut = text.slice(0, NAME_MAX);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace >= NAME_MIN_WORD_BREAK ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** The `##` heading to write before an entry, if its section differs from the
 *  previous entry's. `previous` is `null` for the first entry, which has no
 *  previous entry: a sectioned first entry gets its heading and an unsectioned
 *  one gets none. */
function sectionHeading(
  current: string | undefined,
  previous: string | undefined | null,
  journal: SessionJournal,
): string | undefined {
  if (current === undefined) {
    return typeof previous === "string" ? "## No section" : undefined;
  }
  if (current === previous) return undefined;
  const name = journal.sections.find((s) => s.id === current)?.name;
  return `## ${name ?? "Section"}`;
}

/** Entries in order, with a heading wherever the section changes. */
function renderEntries(
  entries: JournalEntry[],
  journal: SessionJournal,
  formatTime: PromotionOptions["formatTime"],
): string[] {
  const out: string[] = [];
  let previous: string | undefined | null = null;
  for (const entry of entries) {
    const heading = sectionHeading(entry.sectionId, previous, journal);
    if (heading) {
      if (out.length > 0) out.push("");
      out.push(heading, "");
    }
    out.push(...entryLines(entry, formatTime));
    previous = entry.sectionId;
  }
  return out;
}

const fail = (error: string): PromotionResult => ({ ok: false, error });

function promoteEntry(
  journal: SessionJournal,
  entryId: string,
): PromotionResult {
  const entry = journal.entries.find((e) => e.id === entryId);
  if (!entry) return fail(PROMOTION_ERRORS.missing);
  if (!entry.content.trim()) return fail(PROMOTION_ERRORS.nothing);
  return {
    ok: true,
    title: defaultEntryName(entry.content),
    content: entryText(entry),
    entryCount: 1,
    source: `journal:${journal.id}:entry:${entry.id}`,
  };
}

function promoteSection(
  journal: SessionJournal,
  sectionId: string,
  options: PromotionOptions,
): PromotionResult {
  const section = journal.sections.find((s) => s.id === sectionId);
  if (!section) return fail(PROMOTION_ERRORS.missing);
  const entries = journal.entries.filter((e) => e.sectionId === sectionId);
  if (entries.length === 0) return fail(PROMOTION_ERRORS.nothing);
  return {
    ok: true,
    title: section.name,
    content: entries
      .flatMap((entry) => entryLines(entry, options.formatTime))
      .join("\n"),
    entryCount: entries.length,
    source: `journal:${journal.id}:section:${section.id}`,
  };
}

function promoteJournal(
  journal: SessionJournal,
  options: PromotionOptions,
): PromotionResult {
  if (journal.entries.length === 0) return fail(PROMOTION_ERRORS.nothing);
  const title = journal.title.trim() || FALLBACK_JOURNAL_TITLE;
  const body = renderEntries(journal.entries, journal, options.formatTime);
  return {
    ok: true,
    title,
    content: [`# ${title}`, "", ...body].join("\n"),
    entryCount: journal.entries.length,
    source: `journal:${journal.id}`,
  };
}

function promoteSelection(
  journal: SessionJournal,
  scope: Extract<PromotionScope, { kind: "selection" }>,
  options: PromotionOptions,
): PromotionResult {
  if (scope.entryIds.length === 0 && scope.sectionIds.length === 0) {
    return fail(PROMOTION_ERRORS.nothing);
  }
  const knownEntries = new Set(journal.entries.map((e) => e.id));
  const knownSections = new Set(journal.sections.map((s) => s.id));
  if (
    scope.entryIds.some((id) => !knownEntries.has(id)) ||
    scope.sectionIds.some((id) => !knownSections.has(id))
  ) {
    return fail(PROMOTION_ERRORS.missing);
  }
  const chosenEntries = new Set(scope.entryIds);
  const chosenSections = new Set(scope.sectionIds);
  const entries = journal.entries.filter(
    (e) =>
      chosenEntries.has(e.id) ||
      (e.sectionId !== undefined && chosenSections.has(e.sectionId)),
  );
  if (entries.length === 0) return fail(PROMOTION_ERRORS.nothing);
  const title = journal.title.trim() || FALLBACK_JOURNAL_TITLE;
  return {
    ok: true,
    title: `${title} — selection`,
    content: renderEntries(entries, journal, options.formatTime).join("\n"),
    entryCount: entries.length,
    source: `journal:${journal.id}:selection`,
  };
}

/**
 * Builds the default name and body for turning `scope` of `journal` into an
 * entity, or says why there is nothing to make.
 */
export function buildPromotion(
  journal: SessionJournal,
  scope: PromotionScope,
  options: PromotionOptions,
): PromotionResult {
  try {
    switch (scope.kind) {
      case "entry":
        return promoteEntry(journal, scope.entryId);
      case "section":
        return promoteSection(journal, scope.sectionId, options);
      case "journal":
        return promoteJournal(journal, options);
      case "selection":
        return promoteSelection(journal, scope, options);
      default:
        return fail(PROMOTION_ERRORS.missing);
    }
  } catch {
    return fail(PROMOTION_ERRORS.missing);
  }
}
