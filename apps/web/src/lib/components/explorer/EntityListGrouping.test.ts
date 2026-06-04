import { describe, it, expect } from "vitest";
import type { Entity } from "schema";
import { groupEntitiesForExplorer } from "./entityListGrouping";

describe("EntityList Grouping Logic", () => {
  const mockEntities: Entity[] = [
    {
      id: "e1",
      title: "A",
      type: "npc",
      status: "active",
      tags: [],
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
      tags: [],
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
      tags: [],
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
      tags: [],
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
});
