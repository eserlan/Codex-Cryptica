import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseHelpArticle, processHelpArticles } from "./loader";

describe("Help Content Loader", () => {
  describe("parseHelpArticle", () => {
    beforeEach(() => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
    });

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
      const article = parseHelpArticle("/path/to/no-fm.md", rawContent);
      expect(article).toBeNull();
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("Missing frontmatter"),
      );
    });

    it("should return null if id is missing in frontmatter", () => {
      const rawContent = `---
title: No ID
---
Content`;
      const article = parseHelpArticle("/path/to/no-id.md", rawContent);
      expect(article).toBeNull();
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("Missing 'id' in frontmatter"),
      );
    });
  });

  describe("processHelpArticles", () => {
    beforeEach(() => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
    });

    it("should sort articles by rank, then title", () => {
      const modules = {
        "b.md": "---\nid: b\ntitle: Banana\nrank: 20\n---\nContent",
        "a.md": "---\nid: a\ntitle: Apple\nrank: 10\n---\nContent",
        "c.md": "---\nid: c\ntitle: Cherry\nrank: 10\n---\nContent",
        "d.md": "---\nid: d\ntitle: Date\n---\nContent",
      };

      const result = processHelpArticles(modules);

      expect(result.map((a) => a.id)).toEqual(["a", "c", "b", "d"]);
    });

    it("should handle duplicate IDs by overwriting with later paths", () => {
      const modules = {
        "1-first.md": "---\nid: same\ntitle: First\n---\nContent",
        "2-second.md": "---\nid: same\ntitle: Second\n---\nContent",
      };

      const result = processHelpArticles(modules);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Second");
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("Duplicate help article ID found: same"),
      );
    });

    it("should skip invalid articles", () => {
      const modules = {
        "valid.md": "---\nid: valid\ntitle: Valid\n---\nContent",
        "invalid.md": "No frontmatter here",
      };

      const result = processHelpArticles(modules);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("valid");
    });
  });
});
