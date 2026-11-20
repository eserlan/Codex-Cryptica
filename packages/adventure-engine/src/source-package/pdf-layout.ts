import {
  buildVisualLinesFromItems,
  extractPositionedItems,
  groupItemsByY,
  appendRowLine,
  type PdfTextItemLike,
  type PositionedItem,
  type VisualLine,
} from "./pdf-text-lines";

function findGutterMidpoint(
  yGroups: PositionedItem[][],
  searchLeft: number,
  searchRight: number,
): number | null {
  const candidateMidpoints: number[] = [];
  for (const group of yGroups) {
    const sorted = [...group].sort((a, b) => a.x - b.x);
    for (let i = 0; i < sorted.length - 1; i++) {
      const gapStart = sorted[i].x + sorted[i].width;
      const gapEnd = sorted[i + 1].x;
      const mid = (gapStart + gapEnd) / 2;
      if (gapEnd - gapStart >= 12 && mid >= searchLeft && mid <= searchRight) {
        candidateMidpoints.push(mid);
      }
    }
  }
  if (candidateMidpoints.length < 2) return null;
  candidateMidpoints.sort((a, b) => a - b);
  return candidateMidpoints[Math.floor(candidateMidpoints.length / 2)];
}

function findColumnBand(
  yGroups: PositionedItem[][],
  gutterMid: number,
): { minY: number; maxY: number } | null {
  const splitYValues: number[] = [];

  for (const group of yGroups) {
    const rowY = group[0].y;
    const crosses = group.some(
      (item) => item.x < gutterMid - 2 && item.x + item.width > gutterMid + 2,
    );
    if (crosses) continue;
    const hasLeft = group.some((item) => item.x + item.width <= gutterMid + 2);
    const hasRight = group.some((item) => item.x >= gutterMid - 2);
    if (hasLeft && hasRight) {
      splitYValues.push(rowY);
    }
  }

  if (splitYValues.length < 2) return null;
  const maxY = Math.max(...splitYValues) + 4;
  const minY = Math.min(...splitYValues) - 4;
  return { minY, maxY };
}

function rowCrossesGutter(row: PositionedItem[], gutterMid: number): boolean {
  return row.some(
    (item) => item.x < gutterMid - 2 && item.x + item.width > gutterMid + 2,
  );
}

function joinColumnSide(
  row: PositionedItem[],
  side: "left" | "right",
  gutterMid: number,
  pageNumber: number,
  target: VisualLine[],
): void {
  const items = row.filter((item) =>
    side === "left"
      ? item.x + item.width <= gutterMid + 2
      : item.x >= gutterMid - 2,
  );
  if (items.length === 0) return;
  appendRowLine(items, pageNumber, target);
}

function buildColumnBandLines(
  bandItems: PositionedItem[],
  gutterMid: number,
  pageNumber: number,
): VisualLine[] {
  const out: VisualLine[] = [];
  let leftLines: VisualLine[] = [];
  let rightLines: VisualLine[] = [];
  const flushColumns = (): void => {
    out.push(...leftLines, ...rightLines);
    leftLines = [];
    rightLines = [];
  };

  for (const row of groupItemsByY(bandItems)) {
    if (rowCrossesGutter(row, gutterMid)) {
      flushColumns();
      appendRowLine([...row], pageNumber, out);
      continue;
    }
    joinColumnSide(row, "left", gutterMid, pageNumber, leftLines);
    joinColumnSide(row, "right", gutterMid, pageNumber, rightLines);
  }
  flushColumns();
  return out;
}

function detectTwoColumnSplit(
  items: PositionedItem[],
  pageNumber: number,
): VisualLine[] | null {
  if (items.length < 4) return null;

  const minX = Math.min(...items.map((i) => i.x));
  const maxX = Math.max(...items.map((i) => i.x + i.width));
  const span = maxX - minX;
  if (span < 120) return null;

  const yGroups = groupItemsByY(items);
  if (yGroups.length < 4) return null;

  const gutterMid = findGutterMidpoint(
    yGroups,
    minX + span * 0.25,
    minX + span * 0.75,
  );
  if (gutterMid === null) return null;

  const band = findColumnBand(yGroups, gutterMid);
  if (!band) return null;

  const headerItems = items.filter((item) => item.y > band.maxY);
  const footerItems = items.filter((item) => item.y < band.minY);
  const bandItems = items.filter(
    (item) => item.y >= band.minY && item.y <= band.maxY,
  );

  return [
    ...buildVisualLinesFromItems(headerItems, pageNumber),
    ...buildColumnBandLines(bandItems, gutterMid, pageNumber),
    ...buildVisualLinesFromItems(footerItems, pageNumber),
  ];
}

export function extractPageVisualLines(
  items: PdfTextItemLike[],
  pageNumber: number,
): VisualLine[] {
  const positioned = extractPositionedItems(items);
  if (positioned.length === 0) return [];
  return (
    detectTwoColumnSplit(positioned, pageNumber) ??
    buildVisualLinesFromItems(positioned, pageNumber)
  );
}
