import { describe, expect, it } from "vitest";
import { filterEntities, countEntityTypes } from "./entityListFiltering";
import type { Entity } from "schema";

const mockEntities: Entity[] = [
  {
    id: "e1",
    title: "City Guard",
    type: "npc",
    labels: ["NPC", "Guard"],
    status: "active",
    content: "A city guard patrolling the gates.",
    tags: [],
    aliases: [],
    connections: [],
    updatedAt: 0,
  },
  {
    id: "e2",
    title: "Castle Guard",
    type: "npc",
    labels: ["Guard", "Castle"],
    status: "active",
    content: "Guard inside the castle.",
    tags: [],
    aliases: [],
    connections: [],
    updatedAt: 0,
  },
  {
    id: "e3",
    title: "Merchant",
    type: "npc",
    labels: ["NPC", "MerchantLabel"],
    status: "active",
    content: "Selling goods.",
    tags: [],
    aliases: [],
    connections: [],
    updatedAt: 0,
  },
  {
    id: "e4",
    title: "King Arthur",
    type: "npc",
    labels: [],
    status: "active",
    content: "The legendary king.",
    tags: [],
    aliases: ["Wart"],
    connections: [],
    updatedAt: 0,
  },
  {
    id: "e5",
    title: "Draft NPC",
    type: "npc",
    labels: ["Draft"],
    status: "draft",
    content: "Work in progress.",
    tags: [],
    aliases: [],
    connections: [],
    updatedAt: 0,
  },
];

describe("entityListFiltering pure functions", () => {
  describe("filterEntities", () => {
    it("should filter by search query", () => {
      const result = filterEntities(mockEntities, {
        searchQuery: "Guard",
        typeFilters: new Set(),
        labelFilters: new Set(),
        allowedTypes: null,
        showDraftsOnly: false,
      });
      expect(result.map((r) => r.id)).toEqual(["e2", "e1"]); // Sorted alphabetically by title: "Castle Guard", "City Guard"
    });

    it("should filter by typeFilters", () => {
      const result = filterEntities(mockEntities, {
        searchQuery: "",
        typeFilters: new Set(["location"]),
        labelFilters: new Set(),
        allowedTypes: null,
        showDraftsOnly: false,
      });
      expect(result).toHaveLength(0);
    });

    it("should filter by labelFilters (AND logic)", () => {
      const result = filterEntities(mockEntities, {
        searchQuery: "",
        typeFilters: new Set(),
        labelFilters: new Set(["Guard", "NPC"]),
        allowedTypes: null,
        showDraftsOnly: false,
      });
      expect(result.map((r) => r.id)).toEqual(["e1"]);
    });

    it("matches legacy tags as labels when an entity has no labels", () => {
      const legacy: Entity = {
        id: "legacy",
        title: "Old Timer",
        type: "npc",
        labels: [],
        status: "active",
        content: "Predates labels.",
        tags: ["Guard"],
        aliases: [],
        connections: [],
        updatedAt: 0,
      } as Entity;
      const result = filterEntities([...mockEntities, legacy], {
        searchQuery: "",
        typeFilters: new Set(),
        labelFilters: new Set(["Guard"]),
        allowedTypes: null,
        showDraftsOnly: false,
      });
      expect(result.map((r) => r.id).sort()).toEqual(["e1", "e2", "legacy"]);
    });

    it("matches legacy tags as labels for #label search tokens", () => {
      const legacy: Entity = {
        id: "legacy",
        title: "Old Timer",
        type: "npc",
        labels: [],
        status: "active",
        content: "Predates labels.",
        tags: ["Guard"],
        aliases: [],
        connections: [],
        updatedAt: 0,
      } as Entity;
      const result = filterEntities([...mockEntities, legacy], {
        searchQuery: "#Guard",
        typeFilters: new Set(),
        labelFilters: new Set(),
        allowedTypes: null,
        showDraftsOnly: false,
      });
      expect(result.map((r) => r.id)).toContain("legacy");
    });

    it("should extract search tag queries starting with # or @", () => {
      const result = filterEntities(mockEntities, {
        searchQuery: "#Guard",
        typeFilters: new Set(),
        labelFilters: new Set(),
        allowedTypes: null,
        showDraftsOnly: false,
      });
      expect(result.map((r) => r.id)).toEqual(["e2", "e1"]);
    });

    it("should filter drafts properly", () => {
      const activeResult = filterEntities(mockEntities, {
        searchQuery: "",
        typeFilters: new Set(),
        labelFilters: new Set(),
        allowedTypes: null,
        showDraftsOnly: false,
      });
      expect(activeResult.some((r) => r.status === "draft")).toBe(false);

      const draftResult = filterEntities(mockEntities, {
        searchQuery: "",
        typeFilters: new Set(),
        labelFilters: new Set(),
        allowedTypes: null,
        showDraftsOnly: true,
      });
      expect(draftResult.map((r) => r.id)).toEqual(["e5"]);
    });

    it("should filter by allowedTypes prop", () => {
      const result = filterEntities(mockEntities, {
        searchQuery: "",
        typeFilters: new Set(),
        labelFilters: new Set(),
        allowedTypes: ["location"],
        showDraftsOnly: false,
      });
      expect(result).toHaveLength(0);
    });
  });

  describe("countEntityTypes", () => {
    it("should return the map of type counts for non-drafts by default", () => {
      const counts = countEntityTypes(mockEntities, {
        allowedTypes: null,
        showDraftsOnly: false,
      });
      expect(counts.get("npc")).toBe(4);
    });

    it("should return counts for drafts only if specified", () => {
      const counts = countEntityTypes(mockEntities, {
        allowedTypes: null,
        showDraftsOnly: true,
      });
      expect(counts.get("npc")).toBe(1);
    });
  });
});
