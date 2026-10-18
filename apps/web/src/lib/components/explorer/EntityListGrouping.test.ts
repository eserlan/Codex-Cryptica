import { describe, it, expect } from "vitest";
import type { Entity } from "schema";
import {
  groupEntitiesForExplorer,
  flattenGroupedEntities,
} from "./entityListGrouping";

describe("EntityList Grouping Logic", () => {
  const mockEntities: Entity[] = [
    {
      id: "e1",
      title: "A",
      type: "npc",
      status: "active",
      labels: ["L1"],
      aliases: [],
      connections: [],
      content: "",
      updatedAt: 0,
    },
    {
      id: "e2",
      title: "B",
      type: "npc",
      status: "active",
      labels: ["L1", "L2"],
      aliases: [],
      connections: [],
      content: "",
      updatedAt: 0,
    },
    {
      id: "e3",
      title: "C",
      type: "location",
      status: "active",
      labels: [],
      aliases: [],
      connections: [],
      content: "",
      updatedAt: 0,
    },
    {
      id: "e4",
      title: "D",
      type: "npc",
      status: "active",
      labels: ["L2"],
      aliases: [],
      connections: [],
      content: "",
      updatedAt: 0,
    },
  ];

  it("should group by label correctly", () => {
    const result = groupEntitiesForExplorer(mockEntities, "label");
    expect(result?.type).toBe("label");
    expect(result?.sortedKeys).toEqual(["L1", "L2"]);
    expect(result?.groups.get("L1")?.length).toBe(2);
    expect(result?.groups.get("L2")?.length).toBe(2);
    if (result && "unlabeled" in result && result.unlabeled) {
      expect(result.unlabeled.length).toBe(1);
      expect(result.unlabeled[0].id).toBe("e3");
    } else {
      throw new Error("unlabeled missing in result");
    }
  });

  it("should not group anything in list mode", () => {
    expect(groupEntitiesForExplorer(mockEntities, "list")).toBeNull();
  });

  it("should group by category while preserving all matching entities", () => {
    const result = groupEntitiesForExplorer(mockEntities, "category");

    expect(result?.type).toBe("category");
    expect(result?.sortedKeys).toEqual(["location", "npc"]);
    expect(result?.groups.get("npc")?.map((entity) => entity.id)).toEqual([
      "e1",
      "e2",
      "e4",
    ]);
    expect(result?.groups.get("location")?.map((entity) => entity.id)).toEqual([
      "e3",
    ]);
  });

  describe("flattenGroupedEntities", () => {
    it("should return empty array for null groupedEntities", () => {
      expect(
        flattenGroupedEntities(null, new Set(), new Set(), (id) =>
          id.toUpperCase(),
        ),
      ).toEqual([]);
    });

    it("should flatten label groups with collapsed state and unlabeled section", () => {
      const grouped = groupEntitiesForExplorer(mockEntities, "label");
      // Collapse L2
      const collapsedLabels = new Set(["L2"]);
      const entries = flattenGroupedEntities(
        grouped,
        collapsedLabels,
        new Set(),
        (id) => id,
      );

      // Groups: L1 (expanded), L2 (collapsed), unlabeled
      const groupHeaders = entries.filter((e) => e.kind === "group");
      expect(groupHeaders.map((g) => (g as any).groupKey)).toEqual([
        "L1",
        "L2",
        "unlabeled",
      ]);

      // L1 should have entities
      const l1Entities = entries.filter(
        (e) => e.kind === "entity" && (e as any).groupKey === "L1",
      );
      expect(l1Entities.length).toBe(2);

      // L2 is collapsed, should have no entity entries
      const l2Entities = entries.filter(
        (e) => e.kind === "entity" && (e as any).groupKey === "L2",
      );
      expect(l2Entities.length).toBe(0);

      // Unlabeled should have e3
      const unlabeledEntities = entries.filter(
        (e) => e.kind === "entity" && (e as any).groupKey === "unlabeled",
      );
      expect(unlabeledEntities.length).toBe(1);
      expect((unlabeledEntities[0] as any).entity.id).toBe("e3");
    });

    it("should flatten category groups using getCategoryLabel and respect collapsed state", () => {
      const grouped = groupEntitiesForExplorer(mockEntities, "category");
      const collapsedCategories = new Set(["npc"]);
      const entries = flattenGroupedEntities(
        grouped,
        new Set(),
        collapsedCategories,
        (id) => (id === "location" ? "Places" : "NPCs"),
      );

      const groupHeaders = entries.filter((e) => e.kind === "group");
      expect(
        groupHeaders.map((g) => ({
          key: (g as any).groupKey,
          title: (g as any).title,
        })),
      ).toEqual([
        { key: "location", title: "Places" },
        { key: "npc", title: "NPCs" },
      ]);

      // location is expanded: should have 1 entity
      const locationEntities = entries.filter(
        (e) => e.kind === "entity" && (e as any).groupKey === "location",
      );
      expect(locationEntities.length).toBe(1);

      // npc is collapsed: should have 0 entity entries
      const npcEntities = entries.filter(
        (e) => e.kind === "entity" && (e as any).groupKey === "npc",
      );
      expect(npcEntities.length).toBe(0);
    });
  });
});
