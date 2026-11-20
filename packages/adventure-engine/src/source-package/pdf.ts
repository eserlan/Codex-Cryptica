import { extractPageVisualLines } from "./pdf-layout";
import type { PdfTextItemLike, VisualLine } from "./pdf-text-lines";
export type { PdfTextItemLike } from "./pdf-text-lines";
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
