import { describe, expect, it } from "vitest";
import {
  filterEntities,
  countEntityTypes,
  createEntityTextSearchRunner,
  parseEntitySearchQuery,
  searchEntityText,
  evaluateEntityMissingFields,
  type EntityWithPreview,
} from "./entityListFiltering";
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

    it("should safely sort entities with missing or undefined titles without throwing", () => {
      const entitiesWithUndefinedTitles = [
        ...mockEntities,
        {
          id: "e-no-title",
          title: undefined as any,
          type: "npc",
          status: "active" as const,
          content: "",
          labels: [],
          tags: [],
          aliases: [],
          connections: [],
          updatedAt: 0,
        },
      ];
      const result = filterEntities(entitiesWithUndefinedTitles, {
        searchQuery: "",
        typeFilters: new Set(),
        labelFilters: new Set(),
        allowedTypes: null,
        showDraftsOnly: false,
      });
      expect(result.length).toBe(5);
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

    it("uses worker match IDs without scanning entity content", () => {
      const result = filterEntities(mockEntities, {
        searchQuery: "guard",
        typeFilters: new Set(),
        labelFilters: new Set(),
        allowedTypes: null,
        showDraftsOnly: false,
        textMatchIds: new Set(["e3"]),
      });

      expect(result.map((entity) => entity.id)).toEqual(["e3"]);
    });

    it("falls back to metadata-only matching when the worker is unavailable", () => {
      const result = filterEntities(mockEntities, {
        searchQuery: "patrolling",
        typeFilters: new Set(),
        labelFilters: new Set(),
        allowedTypes: null,
        showDraftsOnly: false,
        textSearchUnavailable: true,
      });

      expect(result).toEqual([]);
    });

    it("avoids scanning content while a worker query is pending", () => {
      const result = filterEntities(mockEntities, {
        searchQuery: "patrolling",
        typeFilters: new Set(),
        labelFilters: new Set(),
        allowedTypes: null,
        showDraftsOnly: false,
        textSearchPending: true,
      });

      expect(result).toEqual([]);
    });
  });

  describe("worker query helpers", () => {
    it("separates structured label tokens from the text query", () => {
      expect(parseEntitySearchQuery("Dallan #Past @npc")).toEqual({
        labelTokens: ["past", "npc"],
        textQuery: "dallan",
      });
    });

    it("requests all matching worker results and returns their IDs", async () => {
      const search = async (query: string, options?: { limit?: number }) => {
        expect(query).toBe("guard");
        expect(options?.limit).toBe(mockEntities.length);
        return [{ id: "e1" }, { id: "e2" }] as any;
      };

      await expect(
        searchEntityText("guard", mockEntities.length, { search }),
      ).resolves.toEqual({ matchIds: new Set(["e1", "e2"]), error: null });
    });

    it("returns an explicit error result when worker search fails", async () => {
      const search = async () => {
        throw new Error("worker unavailable");
      };

      const result = await searchEntityText("guard", 10, { search });
      expect(result.matchIds).toEqual(new Set());
      expect(result.error?.message).toBe("worker unavailable");
    });

    it("ignores a stale result after a newer query starts", async () => {
      let resolveFirst!: (value: any[]) => void;
      const first = new Promise<any[]>((resolve) => (resolveFirst = resolve));
      const search = (query: string) =>
        query === "first" ? first : Promise.resolve([{ id: "new" }]);
      const runner = createEntityTextSearchRunner({ search });

      const stale = runner.search("first", 10);
      const current = runner.search("second", 10);
      resolveFirst([{ id: "old" }]);

      await expect(current).resolves.toEqual({
        matchIds: new Set(["new"]),
        error: null,
      });
      await expect(stale).resolves.toBeNull();
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

  describe("evaluateEntityMissingFields", () => {
    it("identifies missing summary, labels, and connections", () => {
      const emptyEntity: EntityWithPreview = {
        id: "e-empty",
        title: "Empty Node",
        type: "npc",
        labels: [],
        tags: [],
        aliases: [],
        connections: [],
        content: "",
        summary: "",
        status: "active",
        updatedAt: 0,
      };

      const result = evaluateEntityMissingFields(emptyEntity, { total: 0 });
      expect(result.summary).toBe(true);
      expect(result.labels).toBe(true);
      expect(result.connections).toBe(true);
      expect(result.isIncomplete).toBe(true);
    });

    it("identifies complete entity when all fields are present", () => {
      const completeEntity: EntityWithPreview = {
        id: "e-complete",
        title: "Complete Node",
        type: "npc",
        labels: ["Hero"],
        tags: [],
        aliases: [],
        connections: [],
        content: "Detailed backstory.",
        status: "active",
        updatedAt: 0,
      };

      const result = evaluateEntityMissingFields(completeEntity, { total: 2 });
      expect(result.summary).toBe(false);
      expect(result.labels).toBe(false);
      expect(result.connections).toBe(false);
      expect(result.isIncomplete).toBe(false);
    });
  });

  describe("showIncompleteOnly and columnFilters", () => {
    const testEntities: EntityWithPreview[] = [
      {
        id: "t1",
        title: "Alpha",
        type: "npc",
        labels: ["Hero"],
        tags: [],
        aliases: [],
        connections: [],
        content: "Story of Alpha",
        summary: "Alpha summary",
        status: "active",
        createdAt: 1000,
        updatedAt: 2000,
      },
      {
        id: "t2",
        title: "Beta",
        type: "location",
        labels: [],
        tags: [],
        aliases: [],
        connections: [],
        content: "Story of Beta",
        status: "active",
        updatedAt: 2000,
      },
      {
        id: "t3",
        title: "Gamma",
        type: "item",
        labels: ["Relic"],
        tags: [],
        aliases: [],
        connections: [],
        content: "",
        status: "active",
        updatedAt: 2000,
      },
    ];

    const connectionCounts = {
      t1: { inbound: 1, outbound: 1, total: 2 },
      t2: { inbound: 0, outbound: 0, total: 0 },
      t3: { inbound: 0, outbound: 0, total: 0 },
    };

    it("filters only incomplete entities when showIncompleteOnly is true", () => {
      const result = filterEntities(testEntities, {
        searchQuery: "",
        typeFilters: new Set(),
        labelFilters: new Set(),
        allowedTypes: null,
        showDraftsOnly: false,
        showIncompleteOnly: true,
        connectionCounts,
      });

      // t1 is complete. t2 is missing labels and connections. t3 is missing content/summary and connections.
      expect(result.map((e) => e.id)).toEqual(["t2", "t3"]);
    });

    it("filters by column filters (labels, connections, summary, dates)", () => {
      // Missing labels
      const missingLabelsResult = filterEntities(testEntities, {
        searchQuery: "",
        typeFilters: new Set(),
        labelFilters: new Set(),
        allowedTypes: null,
        showDraftsOnly: false,
        columnFilters: {
          labelMode: "missing",
        },
      });
      expect(missingLabelsResult.map((e) => e.id)).toEqual(["t2"]);

      // Zero connections
      const zeroConnectionsResult = filterEntities(testEntities, {
        searchQuery: "",
        typeFilters: new Set(),
        labelFilters: new Set(),
        allowedTypes: null,
        showDraftsOnly: false,
        connectionCounts,
        columnFilters: {
          connectionsMode: "zero",
        },
      });
      expect(zeroConnectionsResult.map((e) => e.id)).toEqual(["t2", "t3"]);

      // Missing summary
      const missingSummaryResult = filterEntities(testEntities, {
        searchQuery: "",
        typeFilters: new Set(),
        labelFilters: new Set(),
        allowedTypes: null,
        showDraftsOnly: false,
        columnFilters: {
          summaryMode: "missing_summary",
        },
      });
      expect(missingSummaryResult.map((e) => e.id)).toEqual(["t3"]);

      // Created date filter
      const hasDateResult = filterEntities(testEntities, {
        searchQuery: "",
        typeFilters: new Set(),
        labelFilters: new Set(),
        allowedTypes: null,
        showDraftsOnly: false,
        columnFilters: {
          createdMode: "has_date",
        },
      });
      expect(hasDateResult.map((e) => e.id)).toEqual(["t1"]);
    });
  });
});
