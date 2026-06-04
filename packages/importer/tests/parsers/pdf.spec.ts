import { describe, it, expect, vi } from "vitest";
import { PdfParser, PDFJS_CDN } from "../../src/parsers/pdf";

const mockGetDocument = vi.fn();

vi.mock(PDFJS_CDN, () => ({
  getDocument: mockGetDocument,
  GlobalWorkerOptions: {
    workerSrc: "",
  },
}));

describe("PdfParser", () => {
  const parser = new PdfParser("/mock/worker.js");

  it("accepts pdf files", () => {
    const file = new File([""], "test.pdf", { type: "application/pdf" });
    expect(parser.accepts(file)).toBe(true);
  });

  it("parses text from pdf", async () => {
    const file = new File([""], "test.pdf", { type: "application/pdf" });

    const mockPage = {
      getTextContent: vi.fn().mockResolvedValue({
        items: [{ str: "Hello" }, { str: "PDF" }],
      }),
    };

    const mockPdf = {
      numPages: 1,
      getPage: vi.fn().mockResolvedValue(mockPage),
    };

    mockGetDocument.mockReturnValue({
      promise: Promise.resolve(mockPdf),
    });

    const result = await parser.parse(file);

    expect(result.text).toContain("Hello PDF");
    expect(result.metadata.numPages).toBe(1);
  });
});
