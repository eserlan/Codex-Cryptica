import { describe, expect, it } from "vitest";
import { entitySnippet } from "../entityTableSnippet";

describe("entitySnippet", () => {
  it("returns empty string when there is no body", () => {
    expect(entitySnippet({ content: "", lore: undefined })).toBe("");
    expect(entitySnippet({ content: "   ", lore: "   " })).toBe("");
  });

  it("falls back to lore when content is empty", () => {
    expect(entitySnippet({ content: "", lore: "Ancient ruins." })).toBe(
      "Ancient ruins.",
    );
  });

  it("strips markdown formatting", () => {
    const md =
      "# Heading\n\nA **bold** and _italic_ line with a [link](http://x).";
    expect(entitySnippet({ content: md })).toBe(
      "Heading A bold and italic line with a link.",
    );
  });

  it("removes code fences and inline code", () => {
    const md = "Run `npm test` then:\n\n```\nconst x = 1;\n```\ndone";
    expect(entitySnippet({ content: md })).toBe("Run then: done");
  });

  it("collapses whitespace", () => {
    expect(entitySnippet({ content: "a\n\n\n   b\t c" })).toBe("a b c");
  });

  it("truncates long text with an ellipsis", () => {
    const long = "word ".repeat(60).trim();
    const out = entitySnippet({ content: long }, 20);
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(21);
  });

  it("does not truncate text within the limit", () => {
    expect(entitySnippet({ content: "short" }, 20)).toBe("short");
  });
});
