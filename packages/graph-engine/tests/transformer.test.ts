import { describe, it, expect } from "vitest";
import { GraphTransformer } from "../src/transformer";
import type { Entity } from "schema";

describe("GraphTransformer", () => {
  it("should include dateLabel in node data", () => {
    const mockEntities: Entity[] = [
      {
        id: "e1",
        title: "Entity 1",
        type: "npc",
        connections: [],
        content: "Content 1",
        date: { year: 1240, month: 5, day: 12 }
      },
      {
        id: "e2",
        title: "Entity 2",
        type: "location",
        connections: [],
        content: "Content 2",
        start_date: { year: 1000, label: "Age of Myth" }
      }
    ];

    const elements = GraphTransformer.entitiesToElements(mockEntities);
    const nodes = elements.filter(el => el.group === "nodes");

    expect(nodes[0].data.dateLabel).toBe("1240-05-12");
    expect(nodes[1].data.dateLabel).toBe("Age of Myth");
  });

  it("should pad years to 4 digits", () => {
    const mockEntities: Entity[] = [
      {
        id: "e1",
        title: "Early Entity",
        type: "npc",
        connections: [],
        content: "...",
        date: { year: 1 }
      }
    ];

    const elements = GraphTransformer.entitiesToElements(mockEntities);
    const nodes = elements.filter(el => el.group === "nodes");

    expect(nodes[0].data.dateLabel).toBe("1");
  });

  it("should handle missing dates gracefully", () => {
    const mockEntities: Entity[] = [
      {
        id: "e1",
        title: "Entity 1",
        type: "npc",
        connections: [],
        content: "Content 1"
      }
    ];

    const elements = GraphTransformer.entitiesToElements(mockEntities);
    const nodes = elements.filter(el => el.group === "nodes");

    expect(nodes[0].data.dateLabel).toBe("");
  });
});
