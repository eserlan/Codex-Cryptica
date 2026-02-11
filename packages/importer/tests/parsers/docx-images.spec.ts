import { describe, it, expect, vi } from "vitest";
import { DocxParser } from "../../src/parsers/docx";
import * as mammoth from "mammoth";

// Mock mammoth
vi.mock("mammoth", () => ({
  convertToHtml: vi.fn(),
  images: {
    inline: vi.fn().mockImplementation((handler) => handler),
  },
}));

describe("DocxParser Image Extraction", () => {
  const parser = new DocxParser();

  it("extracts images from docx", async () => {
    const file = new File([""], "test.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    // Create a mock base64 image
    const mockBase64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVR4nGNiAAAABgADNjd8qAAAAABJRU5ErkJggg==";

    // Mock mammoth to simulate an image in the output
    (mammoth.convertToHtml as any).mockImplementation(
      async (input: any, options: any) => {
        // If the options provide a convertImage handler, call it to simulate finding an image
        if (options && options.convertImage) {
          const imageElement = {
            read: async () => Buffer.from(mockBase64, "base64"),
            contentType: "image/png",
          };
          const attributes = {};
          // Execute the handler which should populate our assets array
          await options.convertImage(imageElement, attributes);

          // Return HTML with an img tag using the stored reference (which the parser should handle)
          // Note: The parser logic needs to be robust enough to handle this flow.
          return {
            value: '<img src="mapped-image-id" />',
            messages: [],
          };
        }
        return { value: "", messages: [] };
      },
    );

    const result = await parser.parse(file);

    expect(result.assets.length).toBeGreaterThan(0);
    expect(result.assets[0].mimeType).toBe("image/png");
    // The text should contain a reference to the image (optional depending on how turndown handles it,
    // but we care about the asset array here)
  });
});
