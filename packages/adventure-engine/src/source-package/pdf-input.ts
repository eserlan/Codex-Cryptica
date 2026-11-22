import type { AdventureImportError } from "./schema";

/** Maximum PDF file size accepted for a single adventure import. */
export const MAX_ADVENTURE_PDF_BYTES = 20 * 1024 * 1024;
/** Maximum page count accepted for a single adventure PDF import. */
export const MAX_ADVENTURE_PDF_PAGES = 500;
/** Maximum extracted-text characters accepted for a single PDF import. */
export const MAX_ADVENTURE_PDF_EXTRACTED_CHARS = 2_000_000;

function toUint8Array(rawBytes: Uint8Array | ArrayBuffer): Uint8Array {
  return rawBytes instanceof Uint8Array ? rawBytes : new Uint8Array(rawBytes);
}

function hasPdfHeader(bytes: Uint8Array): boolean {
  const headerSlice = bytes.subarray(0, Math.min(bytes.byteLength, 1024));
  return new TextDecoder("latin1").decode(headerSlice).includes("%PDF-");
}

export function validatePdfInput(
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
