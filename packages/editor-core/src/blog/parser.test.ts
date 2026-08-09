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

describe("parseBlogArticle author", () => {
  const withAuthor = (authorLine: string) => `---
id: test-id
slug: test-slug
title: Title
description: Desc
keywords: ["key"]
publishedAt: 2026-01-01T00:00:00Z
${authorLine}
---
Content`;

  it("keeps an explicit author", () => {
    expect(
      parseBlogArticle("t.md", withAuthor("author: Ada Lovelace"))?.author,
    ).toBe("Ada Lovelace");
  });

  it("trims surrounding whitespace", () => {
    expect(
      parseBlogArticle("t.md", withAuthor('author: "  Ada  "'))?.author,
    ).toBe("Ada");
  });

  it("leaves author undefined when omitted, so the site default applies", () => {
    const article = parseBlogArticle("t.md", withAuthor(""));
    expect(article).not.toBeNull();
    expect(article?.author).toBeUndefined();
  });

  it("treats a blank author as absent rather than an empty byline", () => {
    expect(
      parseBlogArticle("t.md", withAuthor('author: "   "'))?.author,
    ).toBeUndefined();
  });

  it("ignores a non-string author instead of rendering an object", () => {
    expect(
      parseBlogArticle("t.md", withAuthor("author: 42"))?.author,
    ).toBeUndefined();
  });
});

describe("parseBlogArticle updatedAt and topic", () => {
  const front = (extra: string) => `---
id: t
slug: t
title: Title
description: Desc
keywords: ["k"]
publishedAt: 2026-01-01T00:00:00Z
${extra}
---
Body`;

  it("normalises updatedAt to ISO", () => {
    expect(
      parseBlogArticle("t.md", front("updatedAt: 2026-03-04"))?.updatedAt,
    ).toBe("2026-03-04T00:00:00.000Z");
  });

  it("leaves updatedAt absent when the post has never been revised", () => {
    // Absent must not fall back to publishedAt: that would tell every reader
    // that every post was revised on the day it was written.
    expect(parseBlogArticle("t.md", front(""))?.updatedAt).toBeUndefined();
  });

  it("drops an unparseable updatedAt rather than failing the whole post", () => {
    const article = parseBlogArticle("t.md", front("updatedAt: not-a-date"));
    expect(article).not.toBeNull();
    expect(article?.updatedAt).toBeUndefined();
  });

  it("keeps a topic when set and absent when not", () => {
    expect(
      parseBlogArticle("t.md", front("topic: Product updates"))?.topic,
    ).toBe("Product updates");
    expect(parseBlogArticle("t.md", front(""))?.topic).toBeUndefined();
  });
});
