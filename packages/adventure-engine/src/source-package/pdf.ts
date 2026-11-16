import {
  buildAdventureSourcePackageFromSections,
  computeSha256Hex,
  toKebabCase,
  type RawSection,
} from "./parser";
import type {
  AdventureImportError,
  AmbiguityRecord,
  ParseAdventureResult,
} from "./schema";

export interface PdfTextItemLike {
  str?: string;
  transform?: number[];
  width?: number;
  height?: number;
}

export interface PdfPageLike {
  getTextContent(): Promise<{ items: PdfTextItemLike[] }>;
}

export interface PdfDocumentLike {
  numPages: number;
  getPage(pageNumber: number): Promise<PdfPageLike>;
  destroy?: () => Promise<void> | void;
}

export type PdfDocumentLoader = (
  bytes: Uint8Array,
  signal?: AbortSignal,
) => Promise<PdfDocumentLike>;

export interface ParseAdventurePdfDeps {
  loadPdfDocument?: PdfDocumentLoader;
  workerSrc?: string;
  signal?: AbortSignal;
}

/** Maximum PDF file size accepted for a single adventure import. */
export const MAX_ADVENTURE_PDF_BYTES = 20 * 1024 * 1024;
/** Maximum page count accepted for a single adventure PDF import. */
export const MAX_ADVENTURE_PDF_PAGES = 500;
/** Maximum extracted-text characters accepted for a single PDF import. */
export const MAX_ADVENTURE_PDF_EXTRACTED_CHARS = 2_000_000;

function abortedPdfError(): AdventureImportError {
  return {
    code: "ABORTED",
    message: "The PDF import was cancelled before it finished.",
  };
}

function isAborted(signal?: AbortSignal): boolean {
  return signal?.aborted === true;
}

interface PositionedItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
}

interface VisualLine {
  text: string;
  fontSize: number;
  pageNumber: number;
  y: number;
  x: number;
}

const ATX_HEADING_RE = /^(#{1,6})\s+(.+?)\s*#*$/;
const READ_ALOUD_CUE_RE = /^(?:>\s*)?(?:\*\*)?Read aloud:(?:\*\*)?\s*(.*)$/i;
const GM_ONLY_CUE_RE = /^(?:>\s*)?(?:\*\*)?GM only:(?:\*\*)?\s*(.*)$/i;
const SCENE_CONDITION_CUE_RE =
  /^(?:[-*•]\s*)?(?:\*\*)?Scene condition:(?:\*\*)?\s*(.*)$/i;
const ALT_SOLUTION_CUE_RE =
  /^(?:[-*•]\s*)?(?:\*\*)?By ([^:*]+):(?:\*\*)?\s*(.*)$/i;
const MOTIVATION_INLINE_RE = /(?:\*\*)?Motivation:(?:\*\*)?\s*/gi;
const BULLET_LINE_RE = /^(?:[-*•]|\d+[.)])\s+/;
const SOURCE_ID_MARKER_RE = /^<!--\s*source-id:\s*([a-z0-9-]+)\s*-->$/;

function toUint8Array(rawBytes: Uint8Array | ArrayBuffer): Uint8Array {
  return rawBytes instanceof Uint8Array ? rawBytes : new Uint8Array(rawBytes);
}

function hasPdfHeader(bytes: Uint8Array): boolean {
  const headerSlice = bytes.subarray(0, Math.min(bytes.byteLength, 1024));
  return new TextDecoder("latin1").decode(headerSlice).includes("%PDF-");
}

function classifyPdfLoadError(error: unknown): AdventureImportError {
  const name =
    error && typeof error === "object" && "name" in error
      ? String((error as { name?: unknown }).name)
      : "";
  const message = error instanceof Error ? error.message : String(error ?? "");

  if (name === "PasswordException" || /password|encrypt/i.test(message)) {
    return {
      code: "ENCRYPTED_PDF",
      message:
        "Encrypted or password-protected PDFs are not supported. No decryption or bypass is attempted; please export an unencrypted PDF.",
    };
  }

  return {
    code: "INVALID_PDF",
    message: "The selected file is not a valid, readable PDF document.",
    details: message || undefined,
  };
}

async function defaultLoadPdfDocument(
  bytes: Uint8Array,
  workerSrc?: string,
): Promise<PdfDocumentLike> {
  const isBrowser = typeof window !== "undefined";
  const pdfjs = isBrowser
    ? await import("pdfjs-dist")
    : await import("pdfjs-dist/legacy/build/pdf.mjs");
  if (workerSrc && pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
  }
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(bytes),
    verbosity: 0,
  });
  return (await loadingTask.promise) as unknown as PdfDocumentLike;
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

function extractPositionedItems(items: PdfTextItemLike[]): PositionedItem[] {
  const positioned: PositionedItem[] = [];
  for (const item of items) {
    const converted = toPositionedItem(item);
    if (converted) positioned.push(converted);
  }
  return positioned;
}

function groupItemsByY(items: PositionedItem[]): PositionedItem[][] {
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

function joinRowItems(
  row: PositionedItem[],
  pageNumber: number,
): VisualLine | null {
  row.sort((a, b) => a.x - b.x);
  let text = row[0].str.replace(/^\s+/, "");
  let prevEndX = row[0].x + row[0].width;
  let weightedFontSum = row[0].fontSize * row[0].str.trim().length;
  let totalChars = row[0].str.trim().length;

  for (let i = 1; i < row.length; i++) {
    const part = row[i];
    const trimmedLen = part.str.trim().length;
    weightedFontSum += part.fontSize * trimmedLen;
    totalChars += trimmedLen;

    const gap = part.x - prevEndX;
    const spaceThreshold = Math.max(1.5, part.fontSize * 0.18);
    const needsSpace =
      !/\s$/.test(text) && !/^\s/.test(part.str) && gap > spaceThreshold;
    text += needsSpace ? ` ${part.str}` : part.str;
    prevEndX = Math.max(prevEndX, part.x + part.width);
  }

  const normalized = text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
  if (normalized.length === 0) return null;

  return {
    text: normalized,
    fontSize: totalChars > 0 ? weightedFontSum / totalChars : row[0].fontSize,
    pageNumber,
    y: row[0].y,
    x: row[0].x,
  };
}

function buildVisualLinesFromItems(
  items: PositionedItem[],
  pageNumber: number,
): VisualLine[] {
  if (items.length === 0) return [];
  const lines: VisualLine[] = [];
  for (const row of groupItemsByY(items)) {
    const line = joinRowItems(row, pageNumber);
    if (line) lines.push(line);
  }
  return lines;
}

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
  const line = joinRowItems([...items], pageNumber);
  if (line) target.push(line);
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
      const line = joinRowItems([...row], pageNumber);
      if (line) out.push(line);
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

function extractPageVisualLines(
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

function computeBodyFontSize(lines: VisualLine[]): number {
  const counts = new Map<number, number>();
  for (const line of lines) {
    const rounded = Math.round(line.fontSize * 2) / 2;
    counts.set(rounded, (counts.get(rounded) ?? 0) + line.text.length);
  }
  let bestSize = 10;
  let bestWeight = -1;
  for (const [size, weight] of counts) {
    if (weight > bestWeight) {
      bestWeight = weight;
      bestSize = size;
    }
  }
  return bestSize;
}

function isCueLine(text: string): boolean {
  return (
    READ_ALOUD_CUE_RE.test(text) ||
    GM_ONLY_CUE_RE.test(text) ||
    SCENE_CONDITION_CUE_RE.test(text) ||
    ALT_SOLUTION_CUE_RE.test(text)
  );
}

function detectHeadingLevelMap(
  lines: VisualLine[],
  bodyFontSize: number,
): Map<number, number> {
  const headingSizes = new Set<number>();
  for (const line of lines) {
    if (ATX_HEADING_RE.test(line.text)) continue;
    if (isCueLine(line.text) || SOURCE_ID_MARKER_RE.test(line.text)) continue;
    const rounded = Math.round(line.fontSize * 2) / 2;
    if (
      (rounded >= bodyFontSize * 1.15 || rounded - bodyFontSize >= 1.5) &&
      line.text.length <= 120
    ) {
      headingSizes.add(rounded);
    }
  }

  const sortedDesc = [...headingSizes].sort((a, b) => b - a);
  const levelMap = new Map<number, number>();
  sortedDesc.forEach((size, index) => {
    levelMap.set(size, Math.min(6, index + 1));
  });
  return levelMap;
}

function classifyHeading(
  line: VisualLine,
  levelMap: Map<number, number>,
): { level: number; title: string } | null {
  const atx = line.text.match(ATX_HEADING_RE);
  if (atx) {
    return { level: atx[1].length, title: atx[2].trim() };
  }
  if (isCueLine(line.text) || SOURCE_ID_MARKER_RE.test(line.text)) {
    return null;
  }
  const rounded = Math.round(line.fontSize * 2) / 2;
  const inferredLevel = levelMap.get(rounded);
  if (inferredLevel !== undefined && line.text.length <= 120) {
    return { level: inferredLevel, title: line.text };
  }
  return null;
}

type ActiveCueBlock =
  | { kind: "read-aloud"; text: string }
  | { kind: "gm-only"; text: string }
  | { kind: "scene-condition"; text: string }
  | { kind: "alt-solution"; method: string; text: string }
  | { kind: "prose"; text: string };

function matchCueBlock(text: string): ActiveCueBlock | null {
  const readAloud = text.match(READ_ALOUD_CUE_RE);
  if (readAloud) return { kind: "read-aloud", text: readAloud[1].trim() };

  const gmOnly = text.match(GM_ONLY_CUE_RE);
  if (gmOnly) return { kind: "gm-only", text: gmOnly[1].trim() };

  const condition = text.match(SCENE_CONDITION_CUE_RE);
  if (condition) {
    return { kind: "scene-condition", text: condition[1].trim() };
  }

  const altSolution = text.match(ALT_SOLUTION_CUE_RE);
  if (altSolution) {
    return {
      kind: "alt-solution",
      method: altSolution[1].trim(),
      text: altSolution[2].trim(),
    };
  }

  return null;
}

function flushCueBlock(block: ActiveCueBlock | null, out: string[]): void {
  if (!block) return;
  switch (block.kind) {
    case "read-aloud":
      out.push(`> **Read aloud:** ${block.text.trim()}`, "");
      break;
    case "gm-only":
      out.push(`> **GM only:** ${block.text.trim()}`, "");
      break;
    case "scene-condition":
      out.push(`- **Scene condition:** ${block.text.trim()}`);
      break;
    case "alt-solution":
      out.push(`- **By ${block.method}:** ${block.text.trim()}`);
      break;
    case "prose": {
      const normalized = block.text
        .trim()
        .replace(MOTIVATION_INLINE_RE, "**Motivation:** ");
      out.push(normalized);
      break;
    }
  }
}

function shouldContinueBlock(
  prevLine: VisualLine | null,
  line: VisualLine,
): boolean {
  if (!prevLine || prevLine.pageNumber !== line.pageNumber) return false;
  if (BULLET_LINE_RE.test(line.text)) return false;
  const maxFont = Math.max(line.fontSize, prevLine.fontSize);
  return prevLine.y - line.y <= maxFont * 1.65;
}

const EMBEDDED_CUE_RE = /\b(?:Read aloud|GM only):/gi;

function splitEmbeddedCueLines(line: VisualLine): VisualLine[] {
  const markers = [...line.text.matchAll(EMBEDDED_CUE_RE)];
  if (markers.length === 0) return [line];
  if (markers.length === 1 && (markers[0].index ?? 0) === 0) return [line];
  const segments: VisualLine[] = [];
  const firstIndex = markers[0].index ?? 0;
  const prefix = line.text.slice(0, firstIndex).trim();
  if (prefix.length > 0) segments.push({ ...line, text: prefix });
  markers.forEach((marker, i) => {
    const start = marker.index ?? 0;
    const end = markers[i + 1]?.index ?? line.text.length;
    const text = line.text.slice(start, end).trim();
    if (text.length > 0) segments.push({ ...line, text });
  });
  return segments;
}

function normalizeSectionLines(lines: VisualLine[]): string[] {
  const out: string[] = [];
  let active: ActiveCueBlock | null = null;
  let prevLine: VisualLine | null = null;

  for (const line of lines.flatMap(splitEmbeddedCueLines)) {
    const text = line.text;
    if (SOURCE_ID_MARKER_RE.test(text)) {
      flushCueBlock(active, out);
      active = null;
      out.push(text);
      prevLine = line;
      continue;
    }

    const cue = matchCueBlock(text);
    if (cue) {
      flushCueBlock(active, out);
      active = cue;
      prevLine = line;
      continue;
    }

    if (active && shouldContinueBlock(prevLine, line)) {
      active.text = `${active.text} ${text}`.trim();
    } else {
      flushCueBlock(active, out);
      active = { kind: "prose", text };
    }
    prevLine = line;
  }

  flushCueBlock(active, out);
  return out;
}

function deriveFallbackTitle(fileName: string): string {
  const base = fileName
    .trim()
    .replace(/^.*[/\\]/, "")
    .replace(/\.pdf$/i, "")
    .trim();
  return base || "Imported Adventure";
}

function validatePdfInput(
  rawBytes: Uint8Array | ArrayBuffer,
  options: { fileName: string },
):
  { ok: true; bytes: Uint8Array } | { ok: false; error: AdventureImportError } {
  if (
    !options ||
    typeof options.fileName !== "string" ||
    options.fileName.trim().length === 0
  ) {
    return {
      ok: false,
      error: {
        code: "INVALID_OPTIONS",
        message: "A non-empty options.fileName is required.",
      },
    };
  }

  const bytes = toUint8Array(rawBytes);
  if (bytes.byteLength > MAX_ADVENTURE_PDF_BYTES) {
    return {
      ok: false,
      error: {
        code: "INPUT_TOO_LARGE",
        message: "Adventure PDF files must be 20 MiB or smaller.",
      },
    };
  }
  if (bytes.byteLength === 0) {
    return {
      ok: false,
      error: {
        code: "EMPTY_INPUT",
        message: "Input PDF file buffer is empty.",
      },
    };
  }

  if (!hasPdfHeader(bytes)) {
    return {
      ok: false,
      error: {
        code: "INVALID_PDF",
        message:
          "The selected file is not a valid PDF document (missing %PDF- header).",
      },
    };
  }

  return { ok: true, bytes };
}

async function collectPageLines(
  pdfDoc: PdfDocumentLike,
  signal: AbortSignal | undefined,
  allLines: VisualLine[],
): Promise<AdventureImportError | null> {
  if (pdfDoc.numPages > MAX_ADVENTURE_PDF_PAGES) {
    return {
      code: "INPUT_TOO_LARGE",
      message: `Adventure PDF files must be ${MAX_ADVENTURE_PDF_PAGES} pages or fewer.`,
    };
  }
  let extractedChars = 0;
  for (let pageNumber = 1; pageNumber <= pdfDoc.numPages; pageNumber++) {
    if (isAborted(signal)) return abortedPdfError();
    const page = await pdfDoc.getPage(pageNumber);
    const textContent = await page.getTextContent();
    if (isAborted(signal)) return abortedPdfError();
    const pageLines = extractPageVisualLines(textContent.items, pageNumber);
    extractedChars += pageLines.reduce(
      (total, line) => total + line.text.length,
      0,
    );
    if (extractedChars > MAX_ADVENTURE_PDF_EXTRACTED_CHARS) {
      return {
        code: "INPUT_TOO_LARGE",
        message:
          "This PDF contains too much extractable text for a single adventure import.",
      };
    }
    allLines.push(...pageLines);
  }
  return null;
}

async function loadPdfDocumentOrError(
  bytes: Uint8Array,
  deps: ParseAdventurePdfDeps,
): Promise<
  | { ok: true; doc: PdfDocumentLike }
  | { ok: false; error: AdventureImportError }
> {
  try {
    const doc = deps.loadPdfDocument
      ? await deps.loadPdfDocument(bytes, deps.signal)
      : await defaultLoadPdfDocument(bytes, deps.workerSrc);
    return { ok: true, doc };
  } catch (error) {
    if (isAborted(deps.signal)) return { ok: false, error: abortedPdfError() };
    return { ok: false, error: classifyPdfLoadError(error) };
  }
}

async function extractLinesFromPdf(
  bytes: Uint8Array,
  deps: ParseAdventurePdfDeps,
): Promise<
  { ok: true; lines: VisualLine[] } | { ok: false; error: AdventureImportError }
> {
  if (isAborted(deps.signal)) return { ok: false, error: abortedPdfError() };
  const loaded = await loadPdfDocumentOrError(bytes, deps);
  if (!loaded.ok) return loaded;
  const pdfDoc = loaded.doc;

  const allLines: VisualLine[] = [];
  try {
    const collectError = await collectPageLines(pdfDoc, deps.signal, allLines);
    if (collectError) return { ok: false, error: collectError };
  } catch (error) {
    if (isAborted(deps.signal)) return { ok: false, error: abortedPdfError() };
    return { ok: false, error: classifyPdfLoadError(error) };
  } finally {
    await pdfDoc.destroy?.();
  }

  if (allLines.length === 0) {
    return {
      ok: false,
      error: {
        code: "IMAGE_ONLY_PDF",
        message:
          "This PDF contains no extractable text (it appears to be scanned or image-only). OCR is not available; please import a text-based PDF or Markdown file.",
      },
    };
  }

  return { ok: true, lines: allLines };
}

interface GroupedPdfSection {
  level: number;
  title: string;
  visualLines: VisualLine[];
  lineNumber: number;
  pageNumber: number;
  pageEnd: number;
}

function groupLinesByHeading(
  allLines: VisualLine[],
  headingLevelMap: Map<number, number>,
): { preambleLines: VisualLine[]; grouped: GroupedPdfSection[] } {
  const preambleLines: VisualLine[] = [];
  const grouped: GroupedPdfSection[] = [];

  for (let idx = 0; idx < allLines.length; idx++) {
    const line = allLines[idx];
    const heading = classifyHeading(line, headingLevelMap);
    if (heading) {
      grouped.push({
        level: heading.level,
        title: heading.title,
        visualLines: [],
        lineNumber: idx + 1,
        pageNumber: line.pageNumber,
        pageEnd: line.pageNumber,
      });
      continue;
    }

    const current = grouped[grouped.length - 1];
    if (current) {
      current.visualLines.push(line);
      current.pageEnd = Math.max(current.pageEnd, line.pageNumber);
    } else {
      preambleLines.push(line);
    }
  }

  return { preambleLines, grouped };
}

function buildFallbackRawSection(
  allLines: VisualLine[],
  fileName: string,
): { rawSections: RawSection[]; ambiguities: AmbiguityRecord[] } {
  const fallbackTitle = deriveFallbackTitle(fileName);
  const firstPage = allLines[0]?.pageNumber ?? 1;
  const lastPage = allLines[allLines.length - 1]?.pageNumber ?? firstPage;
  return {
    ambiguities: [
      {
        id: "amb-missing-heading-pdf",
        code: "MISSING_HEADING",
        message:
          "No section headings were detected in this PDF; all extracted text was placed in a single fallback section.",
        sourceId: toKebabCase(fallbackTitle),
        provenance: "unresolved",
      },
    ],
    rawSections: [
      {
        level: 1,
        title: fallbackTitle,
        lines: normalizeSectionLines(allLines),
        lineNumber: 1,
        pageNumber: firstPage,
        ...(lastPage > firstPage ? { pageEnd: lastPage } : {}),
        forceUnresolvedProvenance: true,
      },
    ],
  };
}

function buildRawSectionsFromLines(
  allLines: VisualLine[],
  fileName: string,
): { rawSections: RawSection[]; ambiguities: AmbiguityRecord[] } {
  const bodyFontSize = computeBodyFontSize(allLines);
  const headingLevelMap = detectHeadingLevelMap(allLines, bodyFontSize);
  const { preambleLines, grouped } = groupLinesByHeading(
    allLines,
    headingLevelMap,
  );

  if (grouped.length === 0) {
    return buildFallbackRawSection(allLines, fileName);
  }

  const ambiguities: AmbiguityRecord[] = [];
  const preambleText = preambleLines
    .map((l) => l.text)
    .join(" ")
    .trim();
  const preambleSections: RawSection[] = [];
  if (preambleText.length > 0) {
    ambiguities.push({
      id: "amb-unanchored-preamble",
      code: "UNANCHORED_PREAMBLE",
      message:
        "Document contains text before the first heading; it was preserved in an unresolved introductory section.",
      context: preambleText.slice(0, 200),
      provenance: "unresolved",
    });
    const firstPage = preambleLines[0]?.pageNumber ?? 1;
    const lastPage =
      preambleLines[preambleLines.length - 1]?.pageNumber ?? firstPage;
    preambleSections.push({
      level: 1,
      title: "Introduction",
      lines: normalizeSectionLines(preambleLines),
      lineNumber: 1,
      pageNumber: firstPage,
      ...(lastPage > firstPage ? { pageEnd: lastPage } : {}),
      forceUnresolvedProvenance: true,
    });
  }

  return {
    ambiguities,
    rawSections: [
      ...preambleSections,
      ...grouped.map((section) => ({
        level: section.level,
        title: section.title,
        lines: normalizeSectionLines(section.visualLines),
        lineNumber: section.lineNumber,
        pageNumber: section.pageNumber,
        ...(section.pageEnd > section.pageNumber
          ? { pageEnd: section.pageEnd }
          : {}),
      })),
    ],
  };
}

export async function parseAdventurePdf(
  rawBytes: Uint8Array | ArrayBuffer,
  options: { fileName: string },
  deps: ParseAdventurePdfDeps = {},
): Promise<ParseAdventureResult> {
  const validated = validatePdfInput(rawBytes, options);
  if (!validated.ok) return validated;
  if (isAborted(deps.signal)) return { ok: false, error: abortedPdfError() };

  const documentHash = await computeSha256Hex(validated.bytes);
  const extracted = await extractLinesFromPdf(validated.bytes, deps);
  if (!extracted.ok) return extracted;

  const { rawSections, ambiguities } = buildRawSectionsFromLines(
    extracted.lines,
    options.fileName,
  );
  const pkg = buildAdventureSourcePackageFromSections({
    fileName: options.fileName,
    documentHash,
    importMethod: "pdf",
    rawSections,
    ambiguities,
    emitMissingSourceIdAmbiguity: false,
  });

  return { ok: true, package: pkg };
}
