import { describe, expect, it } from "bun:test";
import {
  MAX_ADVENTURE_PDF_BYTES,
  validatePdfInput,
} from "../../src/source-package/pdf-input";

const options = { fileName: "adventure.pdf" };
const header = new TextEncoder().encode("%PDF-1.4\n");

describe("PDF input validation", () => {
  it("preserves a valid byte view and accepts an ArrayBuffer", () => {
    const bytes = new Uint8Array(header);
    const result = validatePdfInput(bytes, options);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.bytes).toBe(bytes);
    expect(validatePdfInput(bytes.buffer, options)).toEqual({
      ok: true,
      bytes,
    });
  });

  it.each([undefined, { fileName: " " }, { fileName: 1 }])(
    "rejects invalid options before validating bytes: %j",
    (invalidOptions) => {
      const result = validatePdfInput(
        new Uint8Array(),
        invalidOptions as unknown as typeof options,
      );
      expect(result).toEqual({
        ok: false,
        error: {
          code: "INVALID_OPTIONS",
          message: "A non-empty options.fileName is required.",
        },
      });
    },
  );

  it("rejects empty and non-PDF input with their distinct errors", () => {
    expect(validatePdfInput(new Uint8Array(), options)).toMatchObject({
      ok: false,
      error: { code: "EMPTY_INPUT" },
    });
    expect(validatePdfInput(new TextEncoder().encode("text"), options)).toEqual(
      {
        ok: false,
        error: {
          code: "INVALID_PDF",
          message:
            "The selected file is not a valid PDF document (missing %PDF- header).",
        },
      },
    );
  });

  it("accepts the exact byte limit and rejects an oversized buffer before its header", () => {
    const bytes = new Uint8Array(MAX_ADVENTURE_PDF_BYTES);
    bytes.set(header);
    expect(validatePdfInput(bytes, options).ok).toBe(true);
    expect(
      validatePdfInput(new Uint8Array(MAX_ADVENTURE_PDF_BYTES + 1), options),
    ).toMatchObject({ ok: false, error: { code: "INPUT_TOO_LARGE" } });
  });

  it("only searches the first 1024 bytes for the PDF header", () => {
    const inside = new Uint8Array(1100);
    inside.set(header, 1000);
    expect(validatePdfInput(inside, options).ok).toBe(true);

    const outside = new Uint8Array(1100);
    outside.set(header, 1024);
    expect(validatePdfInput(outside, options)).toMatchObject({
      ok: false,
      error: { code: "INVALID_PDF" },
    });
  });
});
