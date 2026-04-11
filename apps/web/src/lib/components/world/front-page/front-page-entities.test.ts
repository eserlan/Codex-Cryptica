import { describe, expect, it } from "vitest";
import {
  isFrontpageEntity,
  partitionAndSortRecentActivity,
  resolveBriefingSource,
  buildFrontpageEntityContext,
} from "./front-page-entities";

describe("front-page-entities", () => {
  // -----------------------------------------------------------------------
  // isFrontpageEntity
  // -----------------------------------------------------------------------

  describe("isFrontpageEntity", () => {
    it("returns true when tags contains 'frontpage'", () => {
      expect(isFrontpageEntity({ tags: ["frontpage"], labels: [] })).toBe(true);
    });

    it("returns true when tags contains 'frontpage' with different casing", () => {
      expect(isFrontpageEntity({ tags: ["FrontPage"], labels: [] })).toBe(true);
    });

    it("returns true when labels contains 'frontpage'", () => {
      expect(isFrontpageEntity({ tags: [], labels: ["frontpage"] })).toBe(true);
    });

    it("returns true when both tags and labels contain 'frontpage'", () => {
      expect(
        isFrontpageEntity({ tags: ["frontpage"], labels: ["frontpage"] }),
      ).toBe(true);
    });

    it("returns false when neither tags nor labels contain 'frontpage'", () => {
      expect(isFrontpageEntity({ tags: ["npc"], labels: ["location"] })).toBe(
        false,
      );
    });

    it("returns false when tags and labels are undefined", () => {
      expect(isFrontpageEntity({})).toBe(false);
    });

    it("trims whitespace before matching", () => {
      expect(isFrontpageEntity({ tags: ["  frontpage  "], labels: [] })).toBe(
        true,
      );
    });
  });

  // -----------------------------------------------------------------------
  // partitionAndSortRecentActivity
  // -----------------------------------------------------------------------

  describe("partitionAndSortRecentActivity", () => {
    const makeEntity = (
      id: string,
      opts: { tags?: string[]; labels?: string[]; lastModified: number },
    ) => ({
      id,
      tags: opts.tags,
      labels: opts.labels,
      lastModified: opts.lastModified,
    });

    it("pins frontpage-tagged entities before unpinned ones", () => {
      const activities = [
        makeEntity("a", { tags: ["npc"], lastModified: 100 }),
        makeEntity("b", { tags: ["frontpage"], lastModified: 50 }),
        makeEntity("c", { tags: ["location"], lastModified: 200 }),
      ];

      const result = partitionAndSortRecentActivity(activities, 10);
      const ids = result.map((e) => e.id);

      expect(ids[0]).toBe("b"); // pinned
      expect(ids.slice(1)).toEqual(["c", "a"]); // unpinned, sorted desc
    });

    it("pins frontpage-labeled entities before unpinned ones", () => {
      const activities = [
        makeEntity("a", { labels: ["npc"], lastModified: 100 }),
        makeEntity("b", { labels: ["frontpage"], lastModified: 50 }),
      ];

      const result = partitionAndSortRecentActivity(activities, 10);
      expect(result[0].id).toBe("b");
    });

    it("sorts pinned and unpinned groups independently by lastModified desc", () => {
      const activities = [
        makeEntity("p1", { tags: ["frontpage"], lastModified: 10 }),
        makeEntity("p2", { tags: ["frontpage"], lastModified: 30 }),
        makeEntity("u1", { tags: [], lastModified: 20 }),
        makeEntity("u2", { tags: [], lastModified: 40 }),
      ];

      const result = partitionAndSortRecentActivity(activities, 10);
      expect(result.map((e) => e.id)).toEqual(["p2", "p1", "u2", "u1"]);
    });

    it("slices to the given limit", () => {
      const activities = [
        makeEntity("a", { tags: [], lastModified: 100 }),
        makeEntity("b", { tags: [], lastModified: 200 }),
        makeEntity("c", { tags: [], lastModified: 300 }),
      ];

      const result = partitionAndSortRecentActivity(activities, 2);
      expect(result).toHaveLength(2);
      expect(result.map((e) => e.id)).toEqual(["c", "b"]);
    });
  });

  // -----------------------------------------------------------------------
  // resolveBriefingSource
  // -----------------------------------------------------------------------

  describe("resolveBriefingSource", () => {
    it("prefers metadata.description over everything", () => {
      const result = resolveBriefingSource(
        { description: "From metadata" },
        { chronicle: "From chronicle", content: "From content" },
      );
      expect(result).toBe("From metadata");
    });

    it("falls back to chronicle when description is empty", () => {
      const result = resolveBriefingSource(
        { description: "" },
        { chronicle: "From chronicle", content: "From content" },
      );
      expect(result).toBe("From chronicle");
    });

    it("falls back to content when description and chronicle are empty", () => {
      const result = resolveBriefingSource(
        { description: "" },
        { chronicle: "", content: "From content" },
      );
      expect(result).toBe("From content");
    });

    it("returns empty string when no source is available", () => {
      expect(resolveBriefingSource({}, null)).toBe("");
      expect(resolveBriefingSource({}, undefined)).toBe("");
      expect(resolveBriefingSource({}, {})).toBe("");
    });

    it("trims whitespace from the result", () => {
      expect(
        resolveBriefingSource({ description: "  spaced out  " }, null),
      ).toBe("spaced out");
    });
  });

  // -----------------------------------------------------------------------
  // buildFrontpageEntityContext
  // -----------------------------------------------------------------------

  describe("buildFrontpageEntityContext", () => {
    it("returns empty string for no entities", () => {
      expect(buildFrontpageEntityContext([])).toBe("");
    });

    it("skips entities without content", () => {
      const entities = [{ title: "Empty" }];
      expect(buildFrontpageEntityContext(entities)).toBe("");
    });

    it("includes entity headers and content", () => {
      const entities = [
        { title: "Alpha", chronicle: "Alpha content here.", content: "" },
      ];
      const result = buildFrontpageEntityContext(entities);
      expect(result).toContain("--- FRONTPAGE ENTITY: Alpha ---");
      expect(result).toContain("Alpha content here.");
    });

    it("prefers chronicle over content", () => {
      const entities = [
        {
          title: "Beta",
          chronicle: "Chronicle text",
          content: "Content text",
        },
      ];
      const result = buildFrontpageEntityContext(entities);
      expect(result).toContain("Chronicle text");
      expect(result).not.toContain("Content text");
    });

    it("truncates long entity content to the snippet budget", () => {
      const longContent = "word ".repeat(300); // 1500 chars
      const entities = [{ title: "Gamma", chronicle: longContent }];
      const result = buildFrontpageEntityContext(entities);
      expect(result).toContain("... [truncated]");
      expect(result.length).toBeLessThan(longContent.length);
    });

    it("adds an omission suffix when entities are skipped", () => {
      const entities = [
        { title: "A", chronicle: "Content A. ".repeat(500) },
        { title: "B", chronicle: "Content B. ".repeat(500) },
        { title: "C", chronicle: "Content C. ".repeat(500) },
        { title: "D", chronicle: "Content D. ".repeat(500) },
      ];
      const result = buildFrontpageEntityContext(entities);
      expect(result).toContain("omitted for brevity");
    });

    it("uses singular 'entity' when exactly one is omitted", () => {
      // Each entity snippet maxes at ~900 chars body + ~30 header = ~930.
      // Budget is 2400, so ~3 entities fit. With 4 entities, 1 is omitted.
      const entities = [
        { title: "A", chronicle: "X ".repeat(500) },
        { title: "B", chronicle: "Y ".repeat(500) },
        { title: "C", chronicle: "Z ".repeat(500) },
        { title: "D", chronicle: "W ".repeat(500) },
      ];
      const result = buildFrontpageEntityContext(entities);
      expect(result).toContain("1 additional frontpage entity omitted");
    });

    it("uses plural 'entities' when multiple are omitted", () => {
      // With 5 entities, ~3 fit and 2 are omitted
      const entities = [
        { title: "A", chronicle: "X ".repeat(500) },
        { title: "B", chronicle: "Y ".repeat(500) },
        { title: "C", chronicle: "Z ".repeat(500) },
        { title: "D", chronicle: "W ".repeat(500) },
        { title: "E", chronicle: "V ".repeat(500) },
      ];
      const result = buildFrontpageEntityContext(entities);
      expect(result).toContain("2 additional frontpage entities omitted");
    });
  });
});
