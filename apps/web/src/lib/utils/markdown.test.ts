import { describe, it, expect, vi } from "vitest";
import {
  renderMarkdown,
  parseMarkdown,
  sanitizeId,
  stringifyEntity,
  deriveIdFromPath,
} from "./markdown";

describe("markdown.ts utility", () => {
  describe("renderMarkdown", () => {
    it("should return empty string for empty input", () => {
      expect(renderMarkdown("")).toBe("");
    });

    it("should render basic markdown to HTML", () => {
      const html = renderMarkdown("# Hello");
      expect(html).toContain("<h1>Hello</h1>");
    });

    it("should highlight search queries using <mark> tags", () => {
      const text = "The quick brown fox";
      const html = renderMarkdown(text, { query: "quick" });
      expect(html).toContain(
        '<mark class="bg-yellow-200 dark:bg-yellow-900/50 text-inherit rounded-sm px-0.5">quick</mark>',
      );
    });

    it("should handle regex special characters in query highlighting", () => {
      const text = "Special characters [ ] ( ) world";
      const html = renderMarkdown(text, { query: "[ ]" });
      expect(html).toContain(
        '<mark class="bg-yellow-200 dark:bg-yellow-900/50 text-inherit rounded-sm px-0.5">[ ]</mark>',
      );
    });

    it("should support inline rendering mode", () => {
      const text = "**bold** text";
      const html = renderMarkdown(text, { inline: true });
      // marked.parseInline usually returns without <p> tags
      expect(html).toContain("<strong>bold</strong>");
      expect(html).not.toContain("<p>");
    });
  });

  describe("parseMarkdown", () => {
    it("should parse valid frontmatter and content", () => {
      const raw = "---\ntitle: Test\ntype: NPC\n---\n# Body Content";
      const result = parseMarkdown(raw);
      expect(result.metadata.title).toBe("Test");
      expect(result.metadata.type).toBe("NPC");
      expect(result.content).toBe("# Body Content");
    });

    it("should return full text as content if no frontmatter is found", () => {
      const raw = "# Just Content";
      const result = parseMarkdown(raw);
      expect(result.metadata).toEqual({});
      expect(result.content).toBe("# Just Content");
    });

    it("should handle malformed YAML gracefully", () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const raw = "---\n: malformed: yaml\n---\n# Content";
      const result = parseMarkdown(raw);
      expect(result.metadata).toEqual({});
      expect(result.content).toBe("# Content");
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to parse frontmatter",
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });
  });

  describe("sanitizeId", () => {
    it("should convert title to kebab-case and remove special characters", () => {
      expect(sanitizeId("Hello World!")).toBe("hello-world");
      expect(sanitizeId("  Trim Me  ")).toBe("trim-me");
      expect(sanitizeId("Multiple---Dashes")).toBe("multiple-dashes");
    });
  });

  describe("deriveIdFromPath", () => {
    it("should derive ID from simple path", () => {
      expect(deriveIdFromPath(["vault", "NPCs", "Eldrin.md"])).toBe("eldrin");
    });

    it("should handle mixed extensions", () => {
      expect(deriveIdFromPath(["vault", "Location.markdown"])).toBe("location");
      expect(deriveIdFromPath(["vault", "UPPERCASE.MD"])).toBe("uppercase");
    });
  });

  describe("stringifyEntity", () => {
    it("should convert entity to markdown with frontmatter", () => {
      const entity = {
        id: "id1",
        title: "Test",
        type: "NPC",
        content: "Body",
        updatedAt: 1000,
        connections: [],
      };
      const result = stringifyEntity(entity as any);
      expect(result).toContain("---");
      expect(result).toContain("updatedAt: 1000");
      expect(result).toContain("title: Test");
      expect(result).toContain("---\nBody");
    });

    it("should ensure updatedAt is the first property", () => {
      const entity = {
        title: "Test",
        updatedAt: 1000,
        content: "Body",
      };
      const result = stringifyEntity(entity as any);
      const lines = result.split("\n");
      // Line 0 is ---, Line 1 should be updatedAt
      expect(lines[1]).toContain("updatedAt: 1000");
    });
  });
});
