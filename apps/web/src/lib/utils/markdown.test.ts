import { describe, it, expect, vi } from "vitest";
import {
  renderMarkdown,
  parseMarkdown,
  sanitizeId,
  stringifyEntity,
  deriveIdFromPath,
  upsertMarkdownSection,
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

    it("should handle marked.parse errors and return sanitized fallback", async () => {
      // Mock marked.parse to throw an error to test the catch block
      const { marked } = await import("marked");
      const parseSpy = vi.spyOn(marked, "parse").mockImplementation(() => {
        throw new Error("Simulated parse error");
      });
      const parseInlineSpy = vi
        .spyOn(marked, "parseInline")
        .mockImplementation(() => {
          throw new Error("Simulated parseInline error");
        });
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Test with malicious input to verify sanitization in fallback
      const maliciousText = '<script>alert("xss")</script>Safe text';

      // The function should not throw
      const result = renderMarkdown(maliciousText);

      // Verify error was logged
      expect(consoleSpy).toHaveBeenCalledWith(
        "Markdown rendering failed",
        expect.any(Error),
      );

      // Verify the result is sanitized (script tag removed)
      expect(result).not.toContain("<script>");
      expect(result).toContain("Safe text");

      // Clean up spies
      parseSpy.mockRestore();
      parseInlineSpy.mockRestore();
      consoleSpy.mockRestore();
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

  describe("Vault Round-Trip Integration", () => {
    it("should serialize a fully populated entity and re-parse it with full fidelity", () => {
      const fullEntity = {
        id: "eldrin-shadoweaver",
        type: "character",
        title: "Eldrin Shadoweaver",
        tags: ["mage", "shadow", "ancient"],
        labels: ["important", "past"],
        aliases: ["The Shadow Mage", "Eldrin"],
        connections: [
          {
            targetId: "shadow-keep",
            type: "located_in",
            label: "Home Sanctuary",
          },
        ],
        content:
          "# Eldrin Shadoweaver\nAn ancient shadow mage who dwells in the keeping of shadows.",
        lore: "He was born before the first moon fell.",
        artDirection:
          "Full-body character concept art with sharp focus and weathered robes.",
        image: "images/eldrin.png",
        thumbnail: "images/eldrin_thumb.png",
        date: {
          precision: "day",
          year: 1240,
          unitId: "january",
          day: 12,
          calendarRevision: 1,
        },
        start_date: {
          precision: "year",
          year: 1100,
          calendarRevision: 1,
        },
        end_date: {
          precision: "year",
          year: 1300,
          calendarRevision: 1,
        },
        metadata: {
          coordinates: { x: 150, y: 350 },
          width: 200,
          height: 100,
        },
        status: "active",
        discoverySource: "ancient-scrolls",
        lastUpdated: 1716800000000,
        updatedAt: 1716800000000,
        parent: "mage-guild",
        soundBite: {
          transcript: "The shadows whisper of things to come.",
          voiceMode: "entity",
          voiceProfile: {
            gender: "male",
            ageRange: "elder",
            tone: "gravelly",
          },
        },
        visibility: "visible",
      };

      const serialized = stringifyEntity(fullEntity as any);

      const parsedResult = parseMarkdown(serialized);

      // Verify frontmatter metadata parses back correctly
      expect(parsedResult.metadata.id).toBe(fullEntity.id);
      expect(parsedResult.metadata.type).toBe(fullEntity.type);
      expect(parsedResult.metadata.title).toBe(fullEntity.title);
      expect(parsedResult.metadata.tags).toEqual(fullEntity.tags);
      expect(parsedResult.metadata.labels).toEqual(fullEntity.labels);
      expect(parsedResult.metadata.aliases).toEqual(fullEntity.aliases);
      expect(parsedResult.metadata.connections).toEqual(fullEntity.connections);
      expect(parsedResult.metadata.lore).toBe(fullEntity.lore);
      expect(parsedResult.metadata.artDirection).toBe(fullEntity.artDirection);
      expect(parsedResult.metadata.image).toBe(fullEntity.image);
      expect(parsedResult.metadata.thumbnail).toBe(fullEntity.thumbnail);
      expect(parsedResult.metadata.date).toEqual(fullEntity.date);
      expect(parsedResult.metadata.start_date).toEqual(fullEntity.start_date);
      expect(parsedResult.metadata.end_date).toEqual(fullEntity.end_date);
      expect(parsedResult.metadata.metadata).toEqual(fullEntity.metadata);
      expect(parsedResult.metadata.status).toBe(fullEntity.status);
      expect(parsedResult.metadata.discoverySource).toBe(
        fullEntity.discoverySource,
      );
      expect(parsedResult.metadata.lastUpdated).toBe(fullEntity.lastUpdated);
      expect(parsedResult.metadata.updatedAt).toBe(fullEntity.updatedAt);
      expect(parsedResult.metadata.parent).toBe(fullEntity.parent);
      expect(parsedResult.metadata.soundBite).toEqual(fullEntity.soundBite);
      expect(parsedResult.metadata.visibility).toBe(fullEntity.visibility);

      // Verify content parses back correctly
      expect(parsedResult.content.trim()).toBe(fullEntity.content.trim());
    });
  });

  describe("upsertMarkdownSection", () => {
    it("should append a new section if the title does not exist", () => {
      const content = "Initial content.";
      const result = upsertMarkdownSection(content, "New Section", "Section content here.");
      expect(result).toBe("Initial content.\n\n## New Section\nSection content here.");
    });

    it("should replace the content of an existing section with the same title", () => {
      const content = "Initial content.\n\n## Existing Section\nOld content.\n\n## Another Section\nOther content.";
      const result = upsertMarkdownSection(content, "Existing Section", "New content.");
      expect(result).toBe("Initial content.\n\n## Existing Section\nNew content.\n## Another Section\nOther content.");
    });
  });
});
