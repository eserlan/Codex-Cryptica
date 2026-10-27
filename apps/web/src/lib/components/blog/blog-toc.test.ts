import { describe, expect, it } from "vitest";
import { extractBlogToc } from "./blog-toc";

describe("extractBlogToc", () => {
  it("extracts h2 and h3 headings with corresponding slug IDs", () => {
    const md = `
# Title (Ignored for TOC)

Intro text.

## First Section

Body text.

### Detailed Point

More text.

## Second Section
`;
    const toc = extractBlogToc(md);
    expect(toc).toEqual([
      { level: 2, text: "First Section", id: "first-section" },
      { level: 3, text: "Detailed Point", id: "detailed-point" },
      { level: 2, text: "Second Section", id: "second-section" },
    ]);
  });

  it("returns empty array for content without h2/h3", () => {
    expect(extractBlogToc("# Just a title\n\nSome text")).toEqual([]);
    expect(extractBlogToc("")).toEqual([]);
  });
});
