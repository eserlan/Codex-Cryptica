import type { TableEntry } from "../types";

/**
 * Paste-import.
 *
 * The governing rule is that no single bad row aborts a batch (FR-035): a
 * hundred-row table pasted out of a PDF will always have a few rows that do not
 * parse, and making the user fix them before seeing *anything* is exactly the
 * adoption barrier this feature exists to remove. Unparseable rows come back
 * with a `problem` attached and the rest come through intact.
 */

export type ImportFormat = "lines" | "delimited" | "markdown-table";

export interface ColumnMapping {
  /** Column index holding the result text. */
  text: number;
  /** Column index holding a weight, if any. */
  weight?: number;
  /** Column index holding a range like "01-05", if any. */
  range?: number;
}

export interface ImportRow {
  raw: string;
  entry?: TableEntry;
  problem?: string;
}

export interface ImportPreview {
  format: ImportFormat;
  mode: "weighted" | "ranged";
  rows: ImportRow[];
  columns: ColumnMapping;
}

const RANGE = /^(\d+)\s*(?:-|–|—|to)\s*(\d+)$/;
const SINGLE_NUMBER = /^\d+$/;

/** Best-guess format for pasted text. Always overridable by the caller. */
export function detectFormat(pasted: string): ImportFormat {
  const lines = nonEmptyLines(pasted);
  if (lines.length === 0) return "lines";

  const pipeRows = lines.filter((l) => l.trim().startsWith("|")).length;
  if (pipeRows >= Math.max(2, lines.length * 0.6)) return "markdown-table";

  const delimited = lines.filter(
    (l) => l.includes("\t") || l.includes(","),
  ).length;
  if (delimited >= lines.length * 0.6) return "delimited";

  return "lines";
}

export function parseImport(
  pasted: string,
  format: ImportFormat = detectFormat(pasted),
  mapping?: ColumnMapping,
): ImportPreview {
  switch (format) {
    case "markdown-table":
      return parseTabular(pasted, "markdown-table", mapping);
    case "delimited":
      return parseTabular(pasted, "delimited", mapping);
    default:
      return parseLines(pasted);
  }
}

/** One entry per line, all equal weight (FR-031). */
function parseLines(pasted: string): ImportPreview {
  const rows: ImportRow[] = nonEmptyLines(pasted).map((raw, i) => {
    const text = raw.trim();
    return text.length === 0
      ? { raw, problem: "This line is empty." }
      : { raw, entry: { id: `imported-${i + 1}`, text, weight: 1 } };
  });

  return {
    format: "lines",
    mode: "weighted",
    rows,
    columns: { text: 0 },
  };
}

/** Delimited or Markdown-table input (FR-032, FR-033). */
function parseTabular(
  pasted: string,
  format: Exclude<ImportFormat, "lines">,
  provided?: ColumnMapping,
): ImportPreview {
  const split =
    format === "markdown-table" ? splitMarkdownRow : splitDelimitedRow;

  let lines = nonEmptyLines(pasted);
  if (format === "markdown-table") {
    lines = lines.filter((l) => l.trim().startsWith("|"));
    // Drop the alignment row (---|---), and the header above it.
    const alignIndex = lines.findIndex((l) => /^\|[\s:|-]+\|?$/.test(l.trim()));
    if (alignIndex > 0) lines = lines.slice(alignIndex + 1);
  }

  const cellRows = lines.map(split);
  const columns = provided ?? inferColumns(cellRows);
  const mode = columns.range !== undefined ? "ranged" : "weighted";

  const rows: ImportRow[] = cellRows.map((cells, i) => {
    const raw = lines[i];
    const text = (cells[columns.text] ?? "").trim();
    if (text.length === 0) {
      return { raw, problem: "No result text in the mapped column." };
    }

    const entry: TableEntry = { id: `imported-${i + 1}`, text };

    if (columns.range !== undefined) {
      const cell = (cells[columns.range] ?? "").trim();
      const parsed = parseRange(cell);
      if (!parsed) {
        return {
          raw,
          problem: `"${cell}" is not a range like 1-5, so this row has no die values.`,
        };
      }
      entry.range = parsed;
    } else if (columns.weight !== undefined) {
      const cell = (cells[columns.weight] ?? "").trim();
      const weight = Number(cell);
      if (!Number.isFinite(weight) || weight <= 0) {
        return { raw, problem: `"${cell}" is not a usable weight.` };
      }
      entry.weight = weight;
    } else {
      entry.weight = 1;
    }

    return { raw, entry };
  });

  return { format, mode, rows, columns };
}

/**
 * Picks the text column and, if present, a range or weight column.
 *
 * A range column is recognised first because "01-05" is unambiguous, whereas a
 * bare number could be either a weight or a d100 row label.
 */
function inferColumns(rows: string[][]): ColumnMapping {
  const width = Math.max(0, ...rows.map((r) => r.length));
  if (width <= 1) return { text: 0 };

  const sample = rows.slice(0, 20);
  const score = (predicate: (cell: string) => boolean) =>
    Array.from(
      { length: width },
      (_, col) => sample.filter((r) => predicate((r[col] ?? "").trim())).length,
    );

  const rangeScores = score((c) => RANGE.test(c));
  const numberScores = score((c) => SINGLE_NUMBER.test(c));
  const threshold = Math.max(1, sample.length * 0.6);

  const rangeCol = rangeScores.findIndex((s) => s >= threshold);
  if (rangeCol !== -1) {
    return { text: firstOther(width, rangeCol), range: rangeCol };
  }

  const numberCol = numberScores.findIndex((s) => s >= threshold);
  if (numberCol !== -1) {
    return { text: firstOther(width, numberCol), weight: numberCol };
  }

  return { text: width - 1 };
}

function firstOther(width: number, taken: number): number {
  for (let i = width - 1; i >= 0; i--) if (i !== taken) return i;
  return 0;
}

function parseRange(cell: string): { min: number; max: number } | undefined {
  const match = cell.match(RANGE);
  if (match) {
    const min = Number(match[1]);
    const max = Number(match[2]);
    return min <= max ? { min, max } : { min: max, max: min };
  }
  if (SINGLE_NUMBER.test(cell)) {
    const value = Number(cell);
    return { min: value, max: value };
  }
  return undefined;
}

function splitDelimitedRow(row: string): string[] {
  return row.includes("\t") ? row.split("\t") : splitCsv(row);
}

/** CSV split honouring double-quoted cells. */
function splitCsv(row: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"') {
      if (quoted && row[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (ch === "," && !quoted) {
      cells.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current);
  return cells;
}

function splitMarkdownRow(row: string): string[] {
  const trimmed = row.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((c) => c.trim());
}

function nonEmptyLines(text: string): string[] {
  return text.split(/\r?\n/).filter((l) => l.trim().length > 0);
}
