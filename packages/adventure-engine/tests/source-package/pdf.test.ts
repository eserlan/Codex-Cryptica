import { describe, expect, it, mock } from "bun:test";
import * as pdf from "../../src/source-package/pdf";
import { parseAdventurePdf } from "../../src/index";
import { textItem } from "./pdf-fixtures";

describe("PDF public entry point", () => {
  it("preserves the original runtime exports and package entry-point function", () => {
    expect(Object.keys(pdf).sort()).toEqual([
      "MAX_ADVENTURE_PDF_BYTES",
      "MAX_ADVENTURE_PDF_EXTRACTED_CHARS",
      "MAX_ADVENTURE_PDF_PAGES",
      "parseAdventurePdf",
    ]);
    expect(pdf.parseAdventurePdf).toBe(parseAdventurePdf);
  });

  it("composes a source package through the original module path", async () => {
    const document: pdf.PdfDocumentLike = {
      numPages: 1,
      async getPage() {
        return {
          async getTextContent() {
            return {
              items: [
                textItem("# The Hall", 54, 720),
                textItem("A bright hall.", 54, 700),
              ],
            };
          },
        };
      },
    };
    const result = await pdf.parseAdventurePdf(
      new TextEncoder().encode("%PDF-1.4\n"),
      { fileName: "hall.pdf" },
      { loadPdfDocument: async () => document },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.package.importMethod).toBe("pdf");
      expect(result.package.sections[0]).toMatchObject({
        title: "The Hall",
        body: "A bright hall.",
        pageNumber: 1,
      });
    }
  });

  it("validates input before cancellation and skips loading cancelled input", async () => {
    const controller = new AbortController();
    controller.abort();
    const loader = mock(async (): Promise<pdf.PdfDocumentLike> => {
      throw new Error("Unexpected load");
    });
    const deps: pdf.ParseAdventurePdfDeps = {
      signal: controller.signal,
      loadPdfDocument: loader,
    };
    expect(
      await pdf.parseAdventurePdf(
        new Uint8Array(),
        { fileName: "empty.pdf" },
        deps,
      ),
    ).toMatchObject({
      ok: false,
      error: { code: "EMPTY_INPUT" },
    });
    expect(
      await pdf.parseAdventurePdf(
        new TextEncoder().encode("%PDF-1.4\n"),
        { fileName: "cancel.pdf" },
        deps,
      ),
    ).toMatchObject({
      ok: false,
      error: { code: "ABORTED" },
    });
    expect(loader).not.toHaveBeenCalled();
  });
});
