import { describe, expect, it, mock } from "bun:test";
import {
  extractLinesFromPdf,
  type PdfDocumentLike,
  type PdfDocumentLoader,
} from "../../src/source-package/pdf-document";
import {
  MAX_ADVENTURE_PDF_EXTRACTED_CHARS,
  MAX_ADVENTURE_PDF_PAGES,
} from "../../src/source-package/pdf-input";
import type { PdfTextItemLike } from "../../src/source-package/pdf-text-lines";
import { textItem } from "./pdf-fixtures";

const bytes = new TextEncoder().encode("%PDF-1.4\n");

function documentWithPages(pages: PdfTextItemLike[][]): PdfDocumentLike {
  return {
    numPages: pages.length,
    async getPage(pageNumber) {
      return {
        async getTextContent() {
          return { items: pages[pageNumber - 1] };
        },
      };
    },
  };
}

describe("PDF document extraction", () => {
  it("passes bytes and signal to the loader, reads pages in order, and awaits destruction", async () => {
    const controller = new AbortController();
    let destroyed = false;
    const doc = documentWithPages([
      [textItem("First page", 54, 700)],
      [textItem("Second page", 54, 700)],
    ]);
    doc.destroy = mock(async () => {
      await Promise.resolve();
      destroyed = true;
    });
    const loader = mock<PdfDocumentLoader>(async () => doc);
    const result = await extractLinesFromPdf(bytes, {
      loadPdfDocument: loader,
      signal: controller.signal,
    });
    expect(loader).toHaveBeenCalledWith(bytes, controller.signal);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.lines.map((line) => [line.text, line.pageNumber])).toEqual([
        ["First page", 1],
        ["Second page", 2],
      ]);
    }
    expect(doc.destroy).toHaveBeenCalledTimes(1);
    expect(destroyed).toBe(true);
  });

  it("does not load a document when already cancelled", async () => {
    const controller = new AbortController();
    controller.abort();
    const loader = mock(async () => documentWithPages([]));
    expect(
      await extractLinesFromPdf(bytes, {
        loadPdfDocument: loader,
        signal: controller.signal,
      }),
    ).toMatchObject({ ok: false, error: { code: "ABORTED" } });
    expect(loader).not.toHaveBeenCalled();
  });

  it.each([
    [
      Object.assign(new Error("locked"), { name: "PasswordException" }),
      "ENCRYPTED_PDF",
    ],
    [{ name: "PasswordException" }, "ENCRYPTED_PDF"],
    [new Error("Encrypted document"), "ENCRYPTED_PDF"],
    [new Error("Corrupt cross-reference"), "INVALID_PDF"],
    ["unreadable", "INVALID_PDF"],
    [null, "INVALID_PDF"],
  ])("classifies loader errors: %j", async (failure, code) => {
    const result = await extractLinesFromPdf(bytes, {
      async loadPdfDocument() {
        throw failure;
      },
    });
    expect(result).toMatchObject({ ok: false, error: { code } });
    if (!result.ok && code === "INVALID_PDF") {
      expect(result.error.details).toBe(
        failure instanceof Error ? failure.message : failure || undefined,
      );
    }
  });

  it("gives cancellation precedence over a loader failure", async () => {
    const controller = new AbortController();
    const result = await extractLinesFromPdf(bytes, {
      signal: controller.signal,
      async loadPdfDocument() {
        controller.abort();
        throw new Error("password needed");
      },
    });
    expect(result).toMatchObject({ ok: false, error: { code: "ABORTED" } });
  });

  it("rejects too many pages before reading and still destroys the document", async () => {
    const getPage = mock(async () => ({
      async getTextContent() {
        return { items: [] };
      },
    }));
    const destroy = mock(() => {});
    const result = await extractLinesFromPdf(bytes, {
      async loadPdfDocument() {
        return { numPages: MAX_ADVENTURE_PDF_PAGES + 1, getPage, destroy };
      },
    });
    expect(result).toMatchObject({
      ok: false,
      error: { code: "INPUT_TOO_LARGE" },
    });
    expect(getPage).not.toHaveBeenCalled();
    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it("accepts exactly the page limit", async () => {
    const doc = documentWithPages(
      Array.from({ length: MAX_ADVENTURE_PDF_PAGES }, () => [
        textItem("page", 54, 700),
      ]),
    );
    const result = await extractLinesFromPdf(bytes, {
      loadPdfDocument: async () => doc,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.lines).toHaveLength(MAX_ADVENTURE_PDF_PAGES);
      expect(result.lines.at(-1)?.pageNumber).toBe(MAX_ADVENTURE_PDF_PAGES);
    }
  });

  it("accepts the exact extracted-text limit but rejects cumulative overflow", async () => {
    const firstPage = [
      textItem("x".repeat(MAX_ADVENTURE_PDF_EXTRACTED_CHARS), 54, 700),
    ];
    const exact = await extractLinesFromPdf(bytes, {
      loadPdfDocument: async () => documentWithPages([firstPage]),
    });
    expect(exact.ok).toBe(true);

    const doc = documentWithPages([firstPage, [textItem("x", 54, 700)]]);
    doc.destroy = mock(() => {});
    expect(
      await extractLinesFromPdf(bytes, { loadPdfDocument: async () => doc }),
    ).toMatchObject({
      ok: false,
      error: { code: "INPUT_TOO_LARGE" },
    });
    expect(doc.destroy).toHaveBeenCalledTimes(1);
  });

  it("rejects textless documents and releases them", async () => {
    const doc = documentWithPages([[]]);
    doc.destroy = mock(() => {});
    expect(
      await extractLinesFromPdf(bytes, { loadPdfDocument: async () => doc }),
    ).toMatchObject({
      ok: false,
      error: { code: "IMAGE_ONLY_PDF" },
    });
    expect(doc.destroy).toHaveBeenCalledTimes(1);
  });

  it.each(["page", "text"] as const)(
    "releases the document after a %s extraction failure",
    async (stage) => {
      const doc = documentWithPages([[]]);
      doc.getPage = async () => {
        if (stage === "page") throw new Error("Page unavailable");
        return {
          async getTextContent() {
            throw new Error("Text unavailable");
          },
        };
      };
      doc.destroy = mock(() => {});
      expect(
        await extractLinesFromPdf(bytes, { loadPdfDocument: async () => doc }),
      ).toMatchObject({
        ok: false,
        error: {
          code: "INVALID_PDF",
          details: stage === "page" ? "Page unavailable" : "Text unavailable",
        },
      });
      expect(doc.destroy).toHaveBeenCalledTimes(1);
    },
  );

  it("stops after cancellation during text extraction and destroys the document", async () => {
    const controller = new AbortController();
    const doc = documentWithPages([[], []]);
    doc.getPage = mock(async () => ({
      async getTextContent() {
        controller.abort();
        return { items: [textItem("discarded", 54, 700)] };
      },
    }));
    doc.destroy = mock(() => {});
    expect(
      await extractLinesFromPdf(bytes, {
        loadPdfDocument: async () => doc,
        signal: controller.signal,
      }),
    ).toMatchObject({ ok: false, error: { code: "ABORTED" } });
    expect(doc.getPage).toHaveBeenCalledTimes(1);
    expect(doc.destroy).toHaveBeenCalledTimes(1);
  });

  it("gives cancellation precedence over a page extraction failure", async () => {
    const controller = new AbortController();
    const doc = documentWithPages([[]]);
    doc.getPage = async () => {
      controller.abort();
      throw new Error("Page unavailable");
    };
    doc.destroy = mock(() => {});
    const result = await extractLinesFromPdf(bytes, {
      loadPdfDocument: async () => doc,
      signal: controller.signal,
    });
    expect(result).toMatchObject({ ok: false, error: { code: "ABORTED" } });
    expect(doc.destroy).toHaveBeenCalledTimes(1);
  });

  it("continues to propagate a destruction failure", async () => {
    const doc = documentWithPages([[textItem("text", 54, 700)]]);
    doc.destroy = async () => {
      throw new Error("Cleanup failed");
    };
    await expect(
      extractLinesFromPdf(bytes, { loadPdfDocument: async () => doc }),
    ).rejects.toThrow("Cleanup failed");
  });
});
