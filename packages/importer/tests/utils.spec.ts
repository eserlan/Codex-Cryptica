import { describe, it, expect } from "vitest";
import { htmlToMarkdown, calculateFileHash } from "../src/utils";

describe("htmlToMarkdown", () => {
  it("converts basic HTML to markdown", () => {
    const html = "<p>Hello <strong>World</strong>!</p>";
    expect(htmlToMarkdown(html)).toBe("Hello **World**!");
  });

  it("uses ATX style headings", () => {
    const h1 = "<h1>Heading 1</h1>";
    const h2 = "<h2>Heading 2</h2>";
    expect(htmlToMarkdown(h1)).toBe("# Heading 1");
    expect(htmlToMarkdown(h2)).toBe("## Heading 2");
  });

  it("uses fenced code blocks", () => {
    const code = "<pre><code>const x = 1;</code></pre>";
    const result = htmlToMarkdown(code);
    expect(result).toContain("```");
    expect(result).toContain("const x = 1;");
  });

  it("handles links and images", () => {
    const html =
      '<a href="https://example.com">Link</a><img src="img.png" alt="Alt text">';
    const result = htmlToMarkdown(html);
    expect(result).toContain("[Link](https://example.com)");
    expect(result).toContain("![Alt text](img.png)");
  });

  it("handles lists", () => {
    const ul = "<ul><li>Item 1</li><li>Item 2</li></ul>";
    const ol = "<ol><li>First</li><li>Second</li></ol>";

    const ulResult = htmlToMarkdown(ul);
    expect(ulResult).toContain("Item 1");
    expect(ulResult).toContain("Item 2");
    expect(ulResult).toMatch(/^\*\s+/m);

    const olResult = htmlToMarkdown(ol);
    expect(olResult).toContain("First");
    expect(olResult).toContain("Second");
    expect(olResult).toMatch(/^1\.\s+/m);
  });

  it("handles empty strings", () => {
    expect(htmlToMarkdown("")).toBe("");
  });

  it("handles nested elements", () => {
    const html =
      "<div><p>Paragraph with <em>italic <strong>bold</strong></em></p></div>";
    expect(htmlToMarkdown(html)).toBe("Paragraph with *italic **bold***");
  });
});

describe("calculateFileHash", () => {
  it("generates a consistent SHA-256 hash for a blob", async () => {
    const content = "Hello World";
    const blob = new Blob([content], { type: "text/plain" });
    const hash = await calculateFileHash(blob);

    // sha256("Hello World")
    expect(hash).toBe(
      "a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e",
    );
  });

  it("generates different hashes for different content", async () => {
    const blob1 = new Blob(["Content 1"]);
    const blob2 = new Blob(["Content 2"]);

    const hash1 = await calculateFileHash(blob1);
    const hash2 = await calculateFileHash(blob2);

    expect(hash1).not.toBe(hash2);
  });
});
