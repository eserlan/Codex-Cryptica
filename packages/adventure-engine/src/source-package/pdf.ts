import {
  buildAdventureSourcePackageFromSections,
  computeSha256Hex,
} from "./parser";
import {
  abortedPdfError,
  isAborted,
  extractLinesFromPdf,
  type ParseAdventurePdfDeps,
} from "./pdf-document";
import { validatePdfInput } from "./pdf-input";
import { buildRawSectionsFromLines } from "./pdf-sections";
import type { ParseAdventureResult } from "./schema";

export type {
  PdfPageLike,
  PdfDocumentLike,
  PdfDocumentLoader,
  ParseAdventurePdfDeps,
} from "./pdf-document";
export type { PdfTextItemLike } from "./pdf-text-lines";
export {
  MAX_ADVENTURE_PDF_BYTES,
  MAX_ADVENTURE_PDF_PAGES,
  MAX_ADVENTURE_PDF_EXTRACTED_CHARS,
} from "./pdf-input";

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
