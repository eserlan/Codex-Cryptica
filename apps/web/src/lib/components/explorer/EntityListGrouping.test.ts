import { describe, it, expect } from "vitest";
import type { Entity } from "schema";

function groupEntities(entities: Entity[], viewMode: "list" | "label") {
  if (viewMode === "list") return null;

  if (viewMode === "label") {
    const groups = new Map<string, Entity[]>();
    const unlabeled: Entity[] = [];

    for (const entity of entities) {
      if (!entity.labels || entity.labels.length === 0) {
        unlabeled.push(entity);
      } else {
        for (const label of entity.labels) {
          if (!groups.has(label)) groups.set(label, []);
          groups.get(label)!.push(entity);
        }
      }
    }

    const sortedLabels = Array.from(groups.keys()).sort((a, b) =>
      a.localeCompare(b),
    );
    return { type: "label", groups, sortedKeys: sortedLabels, unlabeled };
  }

  return null;
}

describe("EntityList Grouping Logic", () => {
  const mockEntities: Entity[] = [
    {
      id: "e1",
      title: "A",
      type: "npc",
      tags: [],
      labels: ["L1"],
      connections: [],
      content: "",
      updatedAt: 0,
    },
    {
      id: "e2",
      title: "B",
      type: "npc",
      tags: [],
      labels: ["L1", "L2"],
      connections: [],
      content: "",
      updatedAt: 0,
    },
    {
      id: "e3",
      title: "C",
      type: "npc",
      tags: [],
      labels: [],
      connections: [],
      content: "",
      updatedAt: 0,
    },
    {
      id: "e4",
      title: "D",
      type: "npc",
      tags: [],
      labels: ["L2"],
      connections: [],
      content: "",
      updatedAt: 0,
    },
  ];

  it("should group by label correctly", () => {
    const result = groupEntities(mockEntities, "label");
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
    expect(groupEntities(mockEntities, "list")).toBeNull();
  });
});
