import { describe, it, expect, vi } from "vitest";
import { PdfParser } from "../../src/parsers/pdf";
import * as pdfjs from "pdfjs-dist";

vi.mock("pdfjs-dist", () => ({
  getDocument: vi.fn(),
  GlobalWorkerOptions: {
    workerSrc: "",
  },
  version: "mock-version",
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

    (pdfjs.getDocument as any).mockReturnValue({
      promise: Promise.resolve(mockPdf),
    });

    const result = await parser.parse(file);

    expect(result.text).toContain("Hello PDF");
    expect(result.metadata.numPages).toBe(1);
  });
});
