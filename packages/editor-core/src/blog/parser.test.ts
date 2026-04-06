import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseBlogArticle } from "./parser";

describe("parseBlogArticle", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation((msg) => {
      console.log("ERROR LOGGED:", msg);
    });
  });

  it("should parse valid blog article content", () => {
    const raw =
      "---" +
      "\n" +
      "id: test-id" +
      "\n" +
      "slug: test-slug" +
      "\n" +
      "title: Test Title" +
      "\n" +
      "description: Test Description" +
      "\n" +
      'keywords: ["key1", "key2"]' +
      "\n" +
      "publishedAt: 2026-02-28T18:10:45Z" +
      "\n" +
      "---" +
      "\n" +
      "# Content here";
    const result = parseBlogArticle("test.md", raw);
    expect(result).toEqual({
      id: "test-id",
      slug: "test-slug",
      title: "Test Title",
      description: "Test Description",
      keywords: ["key1", "key2"],
      publishedAt: "2026-02-28T18:10:45.000Z",
      content: "# Content here",
    });
  });

  it("should return null if frontmatter is missing", () => {
    const raw = "# Just content";
    const result = parseBlogArticle("test.md", raw);
    expect(result).toBeNull();
  });

  it("should return null if required fields are missing", () => {
    const raw = `---
id: test-id
slug: test-slug
---
Content`;
    const result = parseBlogArticle("test.md", raw);
    expect(result).toBeNull();
  });

  it("should return null if keywords is not an array", () => {
    const raw = `---
id: test-id
slug: test-slug
title: Title
description: Desc
keywords: not-an-array
publishedAt: 2026-02-28T18:10:45Z
---
Content`;
    const result = parseBlogArticle("test.md", raw);
    expect(result).toBeNull();
  });

  it("should return null if date is invalid", () => {
    const raw = `---
id: test-id
slug: test-slug
title: Title
description: Desc
keywords: ["key"]
publishedAt: invalid-date
---
Content`;
    const result = parseBlogArticle("test.md", raw);
    expect(result).toBeNull();
  });

  it("should handle invalid YAML gracefully", () => {
    const raw = `---
invalid: yaml: : :
---
Content`;
    const result = parseBlogArticle("test.md", raw);
    expect(result).toBeNull();
  });
});
