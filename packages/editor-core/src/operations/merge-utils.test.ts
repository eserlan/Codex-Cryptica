import { describe, it, expect } from "vitest";
import { mergeFrontmatter, concatenateBody, INodeContent } from "./merge-utils";

describe("merge-utils", () => {
  const nodeA: INodeContent = {
    id: "A",
    frontmatter: { tags: ["tag1"], type: "npc" },
    body: "Content A",
    connections: [],
  };

  const nodeB: INodeContent = {
    id: "B",
    frontmatter: { tags: ["tag2"], location: "forest" },
    body: "Content B",
    connections: [],
  };

  describe("mergeFrontmatter", () => {
    it("should merge tags and deduplicate", () => {
      const merged = mergeFrontmatter(nodeA, [nodeB]);
      expect(merged.tags).toEqual(["tag1", "tag2"]);
    });

    it("should preserve target scalar values if conflict", () => {
      const nodeC: INodeContent = {
        ...nodeB,
        frontmatter: { type: "location" },
      };
      const merged = mergeFrontmatter(nodeA, [nodeC]);
      expect(merged.type).toBe("npc"); // Target (A) wins
    });

    it("should add new scalar values from source", () => {
      const merged = mergeFrontmatter(nodeA, [nodeB]);
      expect(merged.location).toBe("forest");
    });
  });

  describe("concatenateBody", () => {
    it("should concatenate bodies with double newline separator", () => {
      const merged = concatenateBody(nodeA, [nodeB]);
      expect(merged).toContain("Content A");
      expect(merged).toContain("Content B");
      expect(merged).toContain("\n\n---\n\n");
    });
  });
});
