import { describe, expect, it } from "vitest";
import {
  filterEntities,
  countEntityTypes,
  createEntityTextSearchRunner,
  parseEntitySearchQuery,
  searchEntityText,
  evaluateEntityMissingFields,
  hasEntityImage,
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
      const legacy = {
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
      } as unknown as Entity;
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
      const legacy = {
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
      } as unknown as Entity;
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

  describe("hasEntityImage", () => {
    it("returns false for undefined, null, or non-string image", () => {
      expect(hasEntityImage({ image: undefined } as any)).toBe(false);
      expect(hasEntityImage({ image: null } as any)).toBe(false);
      expect(hasEntityImage({ image: 123 } as any)).toBe(false);
      expect(hasEntityImage({} as any)).toBe(false);
    });

    it("returns false for empty or whitespace-only image strings", () => {
      expect(hasEntityImage({ image: "" } as any)).toBe(false);
      expect(hasEntityImage({ image: "   " } as any)).toBe(false);
    });

    it("returns false for silhouette tokens", () => {
      expect(hasEntityImage({ image: "silhouette:character" } as any)).toBe(
        false,
      );
      expect(
        hasEntityImage({ image: "silhouette:location/castle" } as any),
      ).toBe(false);
    });

    it("returns false for literal 'placeholder' or Scabard placeholder URLs", () => {
      expect(hasEntityImage({ image: "placeholder" } as any)).toBe(false);
      expect(
        hasEntityImage({
          image:
            "https://www.scabard.com/images/cross_categories/character.png",
        } as any),
      ).toBe(false);
      expect(
        hasEntityImage({
          image: "https://scabard.com/images/cross_categories/event.png",
        } as any),
      ).toBe(false);
    });

    it("returns true for valid image paths, URLs, and data URIs", () => {
      expect(
        hasEntityImage({ image: "https://example.com/portrait.webp" } as any),
      ).toBe(true);
      expect(
        hasEntityImage({ image: "/api/vault/images/abc.jpg" } as any),
      ).toBe(true);
      expect(hasEntityImage({ image: "character-portrait.png" } as any)).toBe(
        true,
      );
      expect(
        hasEntityImage({ image: "blob:http://localhost/123" } as any),
      ).toBe(true);
    });
  });

  describe("evaluateEntityMissingFields image evaluation", () => {
    it("reports image: true when entity has no valid image, without affecting isIncomplete", () => {
      const missingImageEntity: EntityWithPreview = {
        id: "e-complete-no-img",
        title: "Complete but no image",
        type: "character",
        labels: ["Hero"],
        status: "active",
        content: "Detailed description.",
        aliases: [],
        connections: [],
        image: undefined,
        updatedAt: 0,
      };

      const result = evaluateEntityMissingFields(missingImageEntity, {
        total: 1,
      });

      expect(result.image).toBe(true);
      // Incomplete status remains strictly defined by summary, labels, and connections
      expect(result.isIncomplete).toBe(false);
    });

    it("reports image: false when entity has a valid image", () => {
      const withImageEntity: EntityWithPreview = {
        id: "e-img",
        title: "With image",
        type: "character",
        labels: ["Hero"],
        status: "active",
        content: "Detailed description.",
        aliases: [],
        connections: [],
        image: "https://example.com/portrait.png",
        updatedAt: 0,
      };

      const result = evaluateEntityMissingFields(withImageEntity, {
        total: 1,
      });

      expect(result.image).toBe(false);
      expect(result.isIncomplete).toBe(false);
    });
  });

  describe("vault audit filters: type + missing image (#4018)", () => {
    const auditEntities: Entity[] = [
      {
        id: "char-with-portrait",
        title: "Alice the Cleric",
        type: "character",
        image: "https://example.com/portraits/alice.png",
        status: "active",
        labels: ["Hero"],
        aliases: [],
        connections: [],
        content: "A brave cleric.",
        updatedAt: 100,
      },
      {
        id: "char-missing-portrait-none",
        title: "Bob the Bard",
        type: "character",
        image: undefined,
        status: "active",
        labels: ["Hero"],
        aliases: [],
        connections: [],
        content: "A singing bard with no portrait.",
        updatedAt: 100,
      },
      {
        id: "char-missing-portrait-silhouette",
        title: "Cedric the Rogue",
        type: "character",
        image: "silhouette:character/rogue",
        status: "active",
        labels: ["Scoundrel"],
        aliases: [],
        connections: [],
        content: "A stealthy rogue with a placeholder silhouette.",
        updatedAt: 100,
      },
      {
        id: "char-missing-portrait-scabard",
        title: "Diana the Druid",
        type: "character",
        image: "https://www.scabard.com/images/cross_categories/character.png",
        status: "active",
        labels: ["Nature"],
        aliases: [],
        connections: [],
        content: "A druid with a stock Scabard icon.",
        updatedAt: 100,
      },
      {
        id: "loc-no-image",
        title: "Dark Cave",
        type: "location",
        image: undefined,
        status: "active",
        labels: ["Dungeon"],
        aliases: [],
        connections: [],
        content: "A pitch black cavern.",
        updatedAt: 100,
      },
      {
        id: "loc-with-image",
        title: "Emerald Forest",
        type: "location",
        image: "https://example.com/maps/forest.jpg",
        status: "active",
        labels: ["Wilds"],
        aliases: [],
        connections: [],
        content: "A lush forest.",
        updatedAt: 100,
      },
    ];

    it("filters only characters missing portraits (Type = character AND imageMode = missing_image)", () => {
      const result = filterEntities(auditEntities, {
        searchQuery: "",
        typeFilters: new Set(["character"]),
        labelFilters: new Set(),
        allowedTypes: null,
        showDraftsOnly: false,
        columnFilters: {
          imageMode: "missing_image",
        },
      });

      // Should return only characters lacking genuine portraits: Bob, Cedric, Diana.
      // Must exclude Alice (character with portrait) and Dark Cave (location with no image).
      expect(result.map((e) => e.id)).toEqual([
        "char-missing-portrait-none",
        "char-missing-portrait-silhouette",
        "char-missing-portrait-scabard",
      ]);
    });

    it("filters characters with portraits (Type = character AND imageMode = has_image)", () => {
      const result = filterEntities(auditEntities, {
        searchQuery: "",
        typeFilters: new Set(["character"]),
        labelFilters: new Set(),
        allowedTypes: null,
        showDraftsOnly: false,
        columnFilters: {
          imageMode: "has_image",
        },
      });

      expect(result.map((e) => e.id)).toEqual(["char-with-portrait"]);
    });

    it("combines missing portrait filter with labels and search query", () => {
      const result = filterEntities(auditEntities, {
        searchQuery: "singing",
        typeFilters: new Set(["character"]),
        labelFilters: new Set(["Hero"]),
        allowedTypes: null,
        showDraftsOnly: false,
        columnFilters: {
          imageMode: "missing_image",
        },
      });

      expect(result.map((e) => e.id)).toEqual(["char-missing-portrait-none"]);
    });

    it("returns all entries when imageMode is 'all' or omitted", () => {
      const result = filterEntities(auditEntities, {
        searchQuery: "",
        typeFilters: new Set(["character"]),
        labelFilters: new Set(),
        allowedTypes: null,
        showDraftsOnly: false,
        columnFilters: {
          imageMode: "all",
        },
      });

      expect(result.map((e) => e.id)).toEqual([
        "char-with-portrait",
        "char-missing-portrait-none",
        "char-missing-portrait-silhouette",
        "char-missing-portrait-scabard",
      ]);
    });
  });
});
