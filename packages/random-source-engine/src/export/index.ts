import type { RandomSource } from "../types";
import { serialiseRandomSource } from "../parser";
import { parseReferences } from "../resolver";

/**
 * Getting a table or a deck back out (issue 2263).
 *
 * A table somebody has actually built is real work, and until now the only
 * ways out were a whole-vault archive or opening the vault directory by hand.
 *
 * Two jobs, deliberately not merged into one format:
 *
 * - `codex` is the vault's own Markdown. It round-trips through
 *   `parseRandomSource` exactly, so it is the format for keeping and for
 *   moving a source between vaults.
 * - The rest are for everywhere else — notes, a spreadsheet, a forum post,
 *   another VTT — and drop what those places cannot carry.
 */
export type ExportFormat = "codex" | "markdown-table" | "delimited" | "lines";

export interface ExportFile {
  filename: string;
  mimeType: string;
  content: string;
}

export interface ExportFormatInfo {
  id: ExportFormat;
  label: string;
  /** What the reader gets, in the terms someone choosing would care about. */
  summary: string;
  extension: string;
  /** False when the format cannot carry everything the source holds. */
  lossless: boolean;
}

export const EXPORT_FORMATS: ExportFormatInfo[] = [
  {
    id: "codex",
    label: "Codex file",
    summary: "Everything, and imports back exactly as it left.",
    extension: ".md",
    lossless: true,
  },
  {
    id: "markdown-table",
    label: "Markdown table",
    summary: "For pasting into notes or a post.",
    extension: ".md",
    lossless: false,
  },
  {
    id: "delimited",
    label: "Tab-separated",
    summary: "For a spreadsheet, or another tool's importer.",
    extension: ".tsv",
    lossless: false,
  },
  {
    id: "lines",
    label: "Plain lines",
    summary: "Just the text, one per line.",
    extension: ".txt",
    lossless: false,
  },
];

/**
 * Tabs rather than commas for the delimited form: entry text is prose and
 * routinely contains commas, and the paste importer does not implement quoted
 * fields. A tab is the delimiter that does not need escaping to survive.
 */
const TAB = "\t";

/** Keeps a cell on one line and inside its column. */
function flatten(text: string): string {
  return text.replace(/[\r\n]+/g, " ").trim();
}

function escapeCell(text: string): string {
  return flatten(text).replace(/\|/g, "\\|");
}

/** What each entry answers to: its die numbers, or its weight. */
function tableKey(source: RandomSource, index: number): string {
  const entry = (source.entries ?? [])[index];
  if (source.selection?.mode === "ranged") {
    const min = entry.range?.min ?? 1;
    const max = entry.range?.max ?? min;
    return min === max ? `${min}` : `${min}-${max}`;
  }
  return String(entry.weight ?? 1);
}

function toMarkdownTable(source: RandomSource): string {
  const lines: string[] = [];
  if (source.kind === "table") {
    const ranged = source.selection?.mode === "ranged";
    lines.push(`| ${ranged ? "Roll" : "Weight"} | Result |`);
    lines.push("| --- | --- |");
    (source.entries ?? []).forEach((entry, i) => {
      lines.push(`| ${tableKey(source, i)} | ${escapeCell(entry.text)} |`);
    });
  } else {
    lines.push("| Card | Meaning | Reversed |");
    lines.push("| --- | --- | --- |");
    for (const card of source.cards ?? []) {
      lines.push(
        `| ${escapeCell(card.title)} | ${escapeCell(card.body)} | ${escapeCell(
          card.reversedMeaning ?? "",
        )} |`,
      );
    }
  }
  return lines.join("\n") + "\n";
}

function toDelimited(source: RandomSource): string {
  const lines: string[] = [];
  if (source.kind === "table") {
    const ranged = source.selection?.mode === "ranged";
    lines.push([ranged ? "roll" : "weight", "result"].join(TAB));
    (source.entries ?? []).forEach((entry, i) => {
      lines.push([tableKey(source, i), flatten(entry.text)].join(TAB));
    });
  } else {
    lines.push(["card", "meaning", "reversed"].join(TAB));
    for (const card of source.cards ?? []) {
      lines.push(
        [
          flatten(card.title),
          flatten(card.body),
          flatten(card.reversedMeaning ?? ""),
        ].join(TAB),
      );
    }
  }
  return lines.join("\n") + "\n";
}

function toLines(source: RandomSource): string {
  const texts =
    source.kind === "table"
      ? (source.entries ?? []).map((e) => e.text)
      : (source.cards ?? []).map((c) =>
          c.body ? `${c.title} — ${c.body}` : c.title,
        );
  return texts.map(flatten).join("\n") + (texts.length > 0 ? "\n" : "");
}

/**
 * A filename that survives every filesystem, without becoming meaningless.
 * Mirrors the vault archive's approach rather than inventing a second one.
 */
export function exportFilename(name: string, extension: string): string {
  const cleaned = name
    .replace(/[^a-z0-9\-_ ]/gi, "")
    // Trimmed *after* stripping, not before: "What/Now? <>" leaves trailing
    // space once the punctuation goes, which would become a trailing dash.
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `${cleaned.length > 0 ? cleaned : "source"}${extension}`;
}

export function exportSource(
  source: RandomSource,
  format: ExportFormat,
): ExportFile {
  const info = EXPORT_FORMATS.find((f) => f.id === format) ?? EXPORT_FORMATS[0];

  const content =
    format === "codex"
      ? serialiseRandomSource(source)
      : format === "markdown-table"
        ? toMarkdownTable(source)
        : format === "delimited"
          ? toDelimited(source)
          : toLines(source);

  return {
    filename: exportFilename(source.name, info.extension),
    mimeType:
      format === "delimited"
        ? "text/tab-separated-values"
        : format === "lines"
          ? "text/plain"
          : "text/markdown",
    content,
  };
}

/**
 * The names this source pulls in that a reader would not get with it.
 *
 * A reference binds by name, so exporting one table of a nested set hands
 * somebody a file that resolves to nothing on the other end. Naming them is
 * the least this can do — the same courtesy the rename and delete prompts
 * already pay (FR-042).
 */
export function referencedNames(source: RandomSource): string[] {
  const texts =
    source.kind === "table"
      ? (source.entries ?? []).map((e) => e.text)
      : (source.cards ?? []).flatMap((c) => [c.body, c.reversedMeaning ?? ""]);

  // Reuses the roller's own parser rather than a second brace regex, so a
  // reference the engine would resolve is exactly the one named here.
  const names = new Set(
    texts.flatMap((text) => parseReferences(text).map((r) => r.name)),
  );
  return [...names].sort((a, b) => a.localeCompare(b));
}

/** Card art lives in the vault, so no text format can carry it. */
export function imageCount(source: RandomSource): number {
  return (source.cards ?? []).filter((c) => c.imagePath).length;
}
