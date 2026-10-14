import {
  matchCardImages,
  type Card,
  type CardImageMatchMethod,
  type ColumnMapping,
  type TableEntry,
} from "random-source-engine";

export type RowChoice = { text?: string; skipped?: boolean };
export type FilteredRow = { rowIndex: number; entry: TableEntry };
export type ImageAssignment = {
  fileIndex: number;
  method: CardImageMatchMethod | "chosen";
};

export function splitCard(text: string): { title: string; body: string } {
  const parts = text.includes("\t") ? text.split("\t") : text.split("|");
  return {
    title: (parts[0] ?? "").trim(),
    body: parts.slice(1).join(" ").trim(),
  };
}

export function buildFilteredRows(
  rows: { entry?: TableEntry }[],
  choices: Record<number, RowChoice>,
  uuid: () => string,
): FilteredRow[] {
  const built: FilteredRow[] = [];
  for (const [index, row] of rows.entries()) {
    const choice = choices[index];
    if (choice?.skipped) continue;
    const text = choice?.text ?? row.entry?.text;
    if (text === undefined || text.trim().length === 0) continue;
    built.push({
      rowIndex: index,
      entry: { ...(row.entry ?? { weight: 1 }), id: uuid(), text },
    });
  }
  return built;
}

export function buildImageAssignments(
  cards: Card[],
  images: File[],
  cardRows: number[],
  overrides: Record<number, number>,
): ImageAssignment[] {
  const assignments = matchImagesByName(cards, images);
  applyImageOverrides(assignments, cardRows, overrides);
  return assignments;
}

function matchImagesByName(cards: Card[], images: File[]): ImageAssignment[] {
  if (images.length === 0) return [];
  const assignments: ImageAssignment[] = [];
  for (const match of matchCardImages(
    cards.map((card) => card.title),
    images.map((file) => file.name),
  )) {
    assignments[match.cardIndex] = {
      fileIndex: match.fileIndex,
      method: match.method,
    };
  }
  return assignments;
}

function applyImageOverrides(
  assignments: ImageAssignment[],
  cardRows: number[],
  overrides: Record<number, number>,
): void {
  for (const [cardIndex, rowIndex] of cardRows.entries()) {
    const override = overrides[rowIndex];
    if (override === undefined) continue;
    if (override === -1) {
      delete assignments[cardIndex];
      continue;
    }
    removeDuplicateAssignment(assignments, cardIndex, override);
    assignments[cardIndex] = { fileIndex: override, method: "chosen" };
  }
}

function removeDuplicateAssignment(
  assignments: ImageAssignment[],
  cardIndex: number,
  fileIndex: number,
): void {
  for (const [other, assigned] of assignments.entries()) {
    if (other !== cardIndex && assigned?.fileIndex === fileIndex) {
      delete assignments[other];
    }
  }
}

export function findUnmatchedImages(
  images: File[],
  assignments: ImageAssignment[],
) {
  const used = new Set(
    assignments.filter(Boolean).map((assignment) => assignment.fileIndex),
  );
  return images.flatMap((file, index) =>
    used.has(index) ? [] : [{ file, index }],
  );
}

export function highestRangeValue(entries: TableEntry[]): number {
  return Math.max(1, ...entries.map((entry) => entry.range?.max ?? 0));
}

export function nextUniqueName(
  base: string,
  isTaken: (name: string) => boolean,
): string {
  let n = 2;
  while (isTaken(`${base} ${n}`)) n++;
  return `${base} ${n}`;
}

export function updateColumnMapping(
  mapping: ColumnMapping | undefined,
  previewColumns: ColumnMapping | undefined,
  role: keyof ColumnMapping,
  value: number | undefined,
): ColumnMapping {
  const next: ColumnMapping = { ...(mapping ?? previewColumns ?? { text: 0 }) };
  if (role === "text") next.text = value ?? 0;
  else if (value === undefined) delete next[role];
  else {
    next[role] = value;
    if (role === "range") delete next.weight;
    else delete next.range;
  }
  return next;
}

export function buildImportedTable(input: {
  mode: "weighted" | "ranged";
  entries: TableEntry[];
  target: import("random-source-engine").RandomSource | undefined;
  collision: "replace" | "merge" | "new" | undefined;
  name: string;
  createSource: (name: string) => import("random-source-engine").RandomSource;
  uniqueName: (name: string) => string;
}): import("random-source-engine").RandomSource {
  const selection =
    input.mode === "ranged"
      ? {
          mode: "ranged" as const,
          die: { sides: highestRangeValue(input.entries) },
        }
      : { mode: "weighted" as const };
  if (input.target && input.collision === "merge") {
    return {
      ...input.target,
      entries: [...(input.target.entries ?? []), ...input.entries],
    };
  }
  if (input.target && input.collision === "replace") {
    return { ...input.target, selection, entries: input.entries };
  }
  const name = input.target ? input.uniqueName(input.name) : input.name;
  return { ...input.createSource(name), selection, entries: input.entries };
}
