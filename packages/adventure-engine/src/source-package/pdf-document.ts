import { extractPageVisualLines } from "./pdf-layout";
import {
  MAX_ADVENTURE_PDF_PAGES,
  MAX_ADVENTURE_PDF_EXTRACTED_CHARS,
} from "./pdf-input";
import type { PdfTextItemLike, VisualLine } from "./pdf-text-lines";
import type { AdventureImportError } from "./schema";

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

export function abortedPdfError(): AdventureImportError {
  return {
    code: "ABORTED",
    message: "The PDF import was cancelled before it finished.",
  };
}

export function isAborted(signal?: AbortSignal): boolean {
  return signal?.aborted === true;
}

function pdfErrorName(error: unknown): string {
  return error && typeof error === "object" && "name" in error
    ? String((error as { name?: unknown }).name)
    : "";
}

function classifyPdfLoadError(
  error: unknown,
  signal?: AbortSignal,
): AdventureImportError {
  if (isAborted(signal)) return abortedPdfError();
  const name = pdfErrorName(error);
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
    return { ok: false, error: classifyPdfLoadError(error, deps.signal) };
  }
}

export async function extractLinesFromPdf(
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
    return { ok: false, error: classifyPdfLoadError(error, deps.signal) };
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
