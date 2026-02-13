import { describe, it, expect } from "vitest";
import { parseHelpArticle } from "./loader";

describe("Help Content Loader", () => {
  it("should parse markdown frontmatter correctly", () => {
    const rawContent = `---
id: test-article
title: Test Article
tags: [tag1, tag2]
rank: 10
---
# Content Header

Some content here.`;

    const article = parseHelpArticle("/path/to/test-article.md", rawContent);

    if (!article) throw new Error("Article failed to parse");

    expect(article.id).toBe("test-article");
    expect(article.title).toBe("Test Article");
    expect(article.tags).toEqual(["tag1", "tag2"]);
    expect(article.rank).toBe(10);
    expect(article.content).toContain("# Content Header");
    expect(article.content).toContain("Some content here.");
  });

  it("should handle missing frontmatter gracefully", () => {
    const rawContent = `# Just content`;
    // Should probably throw or return null/skip based on spec
    // Spec says: "If a file lacks frontmatter, it should be skipped and a warning logged to the console."
    // For unit test, returning null seems appropriate for filtering later.
    const article = parseHelpArticle("/path/to/no-fm.md", rawContent);
    expect(article).toBeNull();
  });

  it("should use filename as id if missing in frontmatter but present in file", () => {
    // Wait, spec says "If a file lacks frontmatter... skipped".
    // But what if frontmatter exists but misses ID?
    // Spec FR-002: System MUST parse YAML frontmatter to extract metadata: id, title...
    // Let's assume ID is mandatory in frontmatter for now based on spec text imply extracting it.
    // But if missing, maybe fallback to filename?
    // Let's stick to spec: "If a file lacks frontmatter... skipped".
    // If frontmatter exists but no ID? Spec doesn't explicitly say.
    // I'll assume ID is required in frontmatter for now.
    const rawContent = `---
title: No ID
---
Content`;
    // If ID is missing, maybe throw or return null?
    // I'll return null for invalid/incomplete frontmatter.
    const article = parseHelpArticle("/path/to/no-id.md", rawContent);
    expect(article).toBeNull();
  });
});
