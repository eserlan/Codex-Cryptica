export interface PdfTextItemLike {
  str?: string;
  transform?: number[];
  width?: number;
  height?: number;
}

export interface PositionedItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
}

export interface VisualLine {
  text: string;
  fontSize: number;
  pageNumber: number;
  y: number;
  x: number;
}

function resolveItemSize(
  item: PdfTextItemLike,
  a: number,
  b: number,
): { fontSize: number; width: number; height: number } {
  const fontSize = Math.hypot(a, b) || Number(item.height) || 10;
  const hasWidth = typeof item.width === "number" && item.width >= 0;
  const width = hasWidth
    ? (item.width as number)
    : (item.str?.length ?? 0) * fontSize * 0.5;
  const hasHeight = typeof item.height === "number" && item.height > 0;
  const height = hasHeight ? (item.height as number) : fontSize;
  return { fontSize, width, height };
}

function toPositionedItem(item: PdfTextItemLike): PositionedItem | null {
  if (typeof item.str !== "string" || item.str.trim().length === 0) {
    return null;
  }
  const transform = Array.isArray(item.transform)
    ? item.transform
    : [10, 0, 0, 10, 0, 0];
  const { fontSize, width, height } = resolveItemSize(
    item,
    Number(transform[0] ?? 10),
    Number(transform[1] ?? 0),
  );

  return {
    str: item.str,
    x: Number(transform[4] ?? 0),
    y: Number(transform[5] ?? 0),
    width,
    height,
    fontSize,
  };
}

export function extractPositionedItems(
  items: PdfTextItemLike[],
): PositionedItem[] {
  const positioned: PositionedItem[] = [];
  for (const item of items) {
    const converted = toPositionedItem(item);
    if (converted) positioned.push(converted);
  }
  return positioned;
}

export function groupItemsByY(items: PositionedItem[]): PositionedItem[][] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: PositionedItem[][] = [];
  for (const item of sorted) {
    const lastRow = rows[rows.length - 1];
    if (!lastRow) {
      rows.push([item]);
      continue;
    }
    const anchor = lastRow[0];
    const tolerance = Math.max(
      2,
      Math.max(anchor.fontSize, item.fontSize) * 0.45,
    );
    if (Math.abs(anchor.y - item.y) <= tolerance) {
      lastRow.push(item);
    } else {
      rows.push([item]);
    }
  }
  return rows;
}

function joinRowText(row: PositionedItem[]): string {
  let text = row[0].str.replace(/^\s+/, "");
  let prevEndX = row[0].x + row[0].width;

  for (let i = 1; i < row.length; i++) {
    const part = row[i];
    const gap = part.x - prevEndX;
    const spaceThreshold = Math.max(1.5, part.fontSize * 0.18);
    const needsSpace =
      !/\s$/.test(text) && !/^\s/.test(part.str) && gap > spaceThreshold;
    text += needsSpace ? ` ${part.str}` : part.str;
    prevEndX = Math.max(prevEndX, part.x + part.width);
  }

  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function computeRowFontSize(row: PositionedItem[]): number {
  let weightedFontSum = row[0].fontSize * row[0].str.trim().length;
  let totalChars = row[0].str.trim().length;
  for (let i = 1; i < row.length; i++) {
    const trimmedLen = row[i].str.trim().length;
    weightedFontSum += row[i].fontSize * trimmedLen;
    totalChars += trimmedLen;
  }
  return totalChars > 0 ? weightedFontSum / totalChars : row[0].fontSize;
}

function joinRowItems(
  row: PositionedItem[],
  pageNumber: number,
): VisualLine | null {
  row.sort((a, b) => a.x - b.x);
  const text = joinRowText(row);
  if (text.length === 0) return null;

  return {
    text,
    fontSize: computeRowFontSize(row),
    pageNumber,
    y: row[0].y,
    x: row[0].x,
  };
}

export function appendRowLine(
  row: PositionedItem[],
  pageNumber: number,
  target: VisualLine[],
): void {
  const line = joinRowItems(row, pageNumber);
  if (line) target.push(line);
}

export function buildVisualLinesFromItems(
  items: PositionedItem[],
  pageNumber: number,
): VisualLine[] {
  if (items.length === 0) return [];
  const lines: VisualLine[] = [];
  for (const row of groupItemsByY(items)) {
    appendRowLine(row, pageNumber, lines);
  }
  return lines;
}
