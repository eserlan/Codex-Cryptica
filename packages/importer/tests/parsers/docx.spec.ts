import { describe, it, expect, vi } from "vitest";
import { DocxParser } from "../../src/parsers/docx";
import * as mammoth from "mammoth";

// Mock mammoth
vi.mock("mammoth", () => {
  const convertToHtml = vi.fn();
  const inline = vi.fn().mockImplementation((handler) => {
    return { handler }; // Return something that we can use to trigger the handler
  });
  return {
    convertToHtml,
    images: {
      inline,
    },
  };
});

describe("DocxParser", () => {
  const parser = new DocxParser();

  it("accepts docx files", () => {
    const file = new File([""], "test.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    expect(parser.accepts(file)).toBe(true);
  });

  it("parses docx content and handles images", async () => {
    const file = new File([""], "test.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    let capturedHandler: any;
    (mammoth.images.inline as any).mockImplementation((handler: any) => {
      capturedHandler = handler;
      return "mock-inline-handler";
    });

    // Mock mammoth response
    (mammoth.convertToHtml as any).mockResolvedValue({
      value: "<p>Hello</p>",
      messages: [],
    });

    const result = await parser.parse(file);
    expect(result.text).toBe("Hello");

    // Test the captured image handler if it was registered
    if (capturedHandler) {
      const mockElement = {
        contentType: "image/png",
        read: () => Promise.resolve(Buffer.from("fake-image-data")),
      };
      const handlerResult = await capturedHandler(mockElement);
      expect(handlerResult.src).toContain("image-");
      expect(result.assets).toBeDefined();
    }
  });
});
