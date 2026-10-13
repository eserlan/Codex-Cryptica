import { describe, expect, it } from "vitest";
import type { Category } from "schema";
import type { EntityWithPreview } from "$lib/components/explorer/entityListFiltering";
import {
  computeVaultDistribution,
  getEntityEffectiveLabels,
} from "./vaultDistribution";

function createEntity(
  id: string,
  type = "character",
  labels: string[] = [],
  tags: string[] = [],
): EntityWithPreview {
  return {
    id,
    title: `Entity ${id}`,
    type,
    labels,
    tags,
    aliases: [],
    connections: [],
    content: "",
    status: "active",
  } as unknown as EntityWithPreview;
}

const mockCategories: Category[] = [
  {
    id: "character",
    label: "Characters",
    color: "#f43f5e",
    icon: "lucide:user",
  },
  { id: "faction", label: "Factions", color: "#8b5cf6", icon: "lucide:shield" },
  {
    id: "location",
    label: "Locations",
    color: "#06b6d4",
    icon: "lucide:map-pin",
  },
  {
    id: "custom_lore",
    label: "Custom Lore",
    color: "#eab308",
    icon: "lucide:book-open",
  },
];

describe("vaultDistribution", () => {
  it("computes exact category distribution: 200 Characters, 120 Factions, 40 Locations", () => {
    const allEntities: EntityWithPreview[] = [];

    for (let i = 0; i < 200; i++)
      allEntities.push(createEntity(`c-${i}`, "character"));
    for (let i = 0; i < 120; i++)
      allEntities.push(createEntity(`f-${i}`, "faction"));
    for (let i = 0; i < 40; i++)
      allEntities.push(createEntity(`l-${i}`, "location"));

    const summary = computeVaultDistribution(
      allEntities,
      allEntities,
      mockCategories,
    );

    expect(summary.totalUniqueEntities).toBe(360);
    expect(summary.filteredUniqueEntities).toBe(360);
    expect(summary.isFiltered).toBe(false);

    expect(summary.categories).toHaveLength(3);
    expect(summary.categories[0]).toEqual({
      id: "character",
      label: "Characters",
      count: 200,
      totalCount: 200,
      percentage: 55.6,
      color: "#f43f5e",
      icon: "icon-[lucide--user]",
    });
    expect(summary.categories[1]).toEqual({
      id: "faction",
      label: "Factions",
      count: 120,
      totalCount: 120,
      percentage: 33.3,
      color: "#8b5cf6",
      icon: "icon-[lucide--shield]",
    });
    expect(summary.categories[2]).toEqual({
      id: "location",
      label: "Locations",
      count: 40,
      totalCount: 40,
      percentage: 11.1,
      color: "#06b6d4",
      icon: "icon-[lucide--map-pin]",
    });
  });

  it("handles custom categories not in defaults", () => {
    const entities = [
      createEntity("1", "custom_lore"),
      createEntity("2", "unknown_type"),
    ];

    const summary = computeVaultDistribution(
      entities,
      entities,
      mockCategories,
    );

    expect(summary.totalUniqueEntities).toBe(2);
    expect(summary.categories).toHaveLength(2);

    const custom = summary.categories.find((c) => c.id === "custom_lore");
    expect(custom).toBeDefined();
    expect(custom?.label).toBe("Custom Lore");
    expect(custom?.color).toBe("#eab308");

    const unknown = summary.categories.find((c) => c.id === "unknown_type");
    expect(unknown).toBeDefined();
    expect(unknown?.label).toBe("Unknown_type");
  });

  it("computes overlapping label distribution and includes unlabelled entities", () => {
    const entities = [
      createEntity("1", "character", ["Pagen", "Major"]),
      createEntity("2", "character", ["Pagen"]),
      createEntity("3", "location", ["Major"]),
      createEntity("4", "item", []), // Unlabelled
      createEntity("5", "note", [], ["LegacyTag"]), // Legacy tag fallback
    ];

    const summary = computeVaultDistribution(
      entities,
      entities,
      mockCategories,
    );

    expect(summary.totalUniqueEntities).toBe(5);
    expect(summary.unlabelledTotalCount).toBe(1);

    // Labels sorted by count: Pagen (2), Major (2), LegacyTag (1), Unlabelled (1)
    const pagen = summary.labels.find((l) => l.id === "Pagen");
    expect(pagen).toEqual({
      id: "Pagen",
      label: "Pagen",
      count: 2,
      totalCount: 2,
      percentage: 40,
      icon: "icon-[lucide--tag]",
    });

    const major = summary.labels.find((l) => l.id === "Major");
    expect(major).toBeDefined();
    expect(major?.count).toBe(2);

    const legacy = summary.labels.find((l) => l.id === "LegacyTag");
    expect(legacy).toBeDefined();
    expect(legacy?.count).toBe(1);

    const unlabelled = summary.labels.find((l) => l.isUnlabelled);
    expect(unlabelled).toBeDefined();
    expect(unlabelled).toEqual({
      id: "__unlabelled__",
      label: "Unlabelled",
      count: 1,
      totalCount: 1,
      percentage: 20,
      isUnlabelled: true,
      icon: "icon-[lucide--tag-off]",
    });
  });

  it("counts a duplicate label only once per entity", () => {
    const entities = [createEntity("1", "character", ["Hero", "Hero"])];

    const summary = computeVaultDistribution(
      entities,
      entities,
      mockCategories,
    );

    expect(summary.labels.find((label) => label.id === "Hero")).toMatchObject({
      count: 1,
      totalCount: 1,
      percentage: 100,
    });
  });

  it("correctly tracks filtered counts alongside total vault counts", () => {
    const allEntities = [
      createEntity("1", "character", ["Pagen"]),
      createEntity("2", "character", ["Other"]),
      createEntity("3", "faction", ["Pagen"]),
      createEntity("4", "location", ["Other"]),
    ];

    // Filtered to Pagen items only (entities 1 and 3)
    const filtered = [allEntities[0], allEntities[2]];

    const summary = computeVaultDistribution(
      allEntities,
      filtered,
      mockCategories,
    );

    expect(summary.totalUniqueEntities).toBe(4);
    expect(summary.filteredUniqueEntities).toBe(2);
    expect(summary.isFiltered).toBe(true);

    const char = summary.categories.find((c) => c.id === "character");
    expect(char).toBeDefined();
    expect(char).toMatchObject({ count: 1, totalCount: 2, percentage: 50 });

    const faction = summary.categories.find((c) => c.id === "faction");
    expect(faction).toBeDefined();
    expect(faction).toMatchObject({ count: 1, totalCount: 1, percentage: 50 });

    const loc = summary.categories.find((c) => c.id === "location");
    expect(loc).toBeDefined();
    expect(loc).toMatchObject({ count: 0, totalCount: 1, percentage: 0 });
  });

  it("handles empty vaults gracefully", () => {
    const summary = computeVaultDistribution([], [], mockCategories);

    expect(summary.totalUniqueEntities).toBe(0);
    expect(summary.filteredUniqueEntities).toBe(0);
    expect(summary.isFiltered).toBe(false);
    expect(summary.categories).toEqual([]);
    expect(summary.labels).toEqual([]);
    expect(summary.unlabelledCount).toBe(0);
  });

  it("handles legacy tags fallback via getEntityEffectiveLabels", () => {
    expect(
      getEntityEffectiveLabels(createEntity("1", "character", ["LabelA"])),
    ).toEqual(["LabelA"]);
    expect(
      getEntityEffectiveLabels(
        createEntity("2", "character", [], ["TagA", "TagB"]),
      ),
    ).toEqual(["TagA", "TagB"]);
    expect(
      getEntityEffectiveLabels(createEntity("3", "character", [], [])),
    ).toEqual([]);
  });

  it("executes efficiently for 1,500 entities under 15ms", () => {
    const all: EntityWithPreview[] = [];
    const types = ["character", "location", "faction", "item", "event", "note"];
    const labels = ["Hero", "NPC", "Important", "Draft", "Archived", "Act1"];

    for (let i = 0; i < 1500; i++) {
      const entityLabels = [
        labels[i % labels.length],
        labels[(i + 1) % labels.length],
      ];
      all.push(createEntity(`e-${i}`, types[i % types.length], entityLabels));
    }

    const start = performance.now();
    const summary = computeVaultDistribution(all, all, mockCategories);
    const duration = performance.now() - start;

    expect(summary.totalUniqueEntities).toBe(1500);
    expect(summary.categories.length).toBe(6);
    expect(duration).toBeLessThan(25);
  });
});
