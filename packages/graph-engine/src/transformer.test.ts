import { describe, it, expect } from "vitest";
import { GraphTransformer } from "./transformer";
import type { Entity } from "schema";

describe("GraphTransformer", () => {
  it("should transform entities to nodes and edges", () => {
    const entities: Entity[] = [
      {
        id: "n1",
        type: "npc",
        title: "Node 1",
        tags: [],
        connections: [{ target: "n2", type: "knows", strength: 0.5 }],
        content: "",
      },
      {
        id: "n2",
        type: "location",
        title: "Node 2",
        tags: [],
        connections: [],
        content: "",
      },
    ];

    const elements = GraphTransformer.entitiesToElements(entities);

    expect(elements).toHaveLength(3); // 2 nodes + 1 edge

    const node1 = elements.find(
      (e) => e.group === "nodes" && e.data.id === "n1",
    );
    expect(node1).toBeDefined();
    expect(node1?.data.label).toBe("Node 1");

    const edge = elements.find(
      (e) => e.group === "edges" && e.data.source === "n1",
    );
    expect(edge).toBeDefined();
    expect(edge?.data.target).toBe("n2");
    expect(edge?.data.strength).toBe(0.5);
  });

  it("should handle entities with missing connections", () => {
    const entities: any[] = [
      {
        id: "n1",
        type: "npc",
        title: "Node 1",
        content: "",
      },
    ];

    const elements = GraphTransformer.entitiesToElements(entities);
    expect(elements).toHaveLength(1);
    expect(elements[0].group).toBe("nodes");
  });

  it("should handle entities with missing metadata", () => {
    const entities: any[] = [
      {
        id: "n1",
        type: "npc",
        title: "Node 1",
        connections: [],
        content: "",
      },
    ];

    const elements = GraphTransformer.entitiesToElements(entities);
    expect(elements).toHaveLength(1);
    expect((elements[0] as any).position).toBeUndefined();
  });

  it("should transform image field", () => {
    const entities: Entity[] = [
      {
        id: "n1",
        type: "npc",
        title: "Node 1",
        tags: [],
        connections: [],
        content: "",
        image: "http://example.com/img.png",
      },
    ];

    const elements = GraphTransformer.entitiesToElements(entities);
    const node = elements.find(
      (e) => e.group === "nodes" && e.data.id === "n1",
    );
    expect(node?.data.image).toBe("http://example.com/img.png");
  });

  it("should use custom label on edges when provided", () => {
    const entities: Entity[] = [
      {
        id: "n1",
        type: "npc",
        title: "Node 1",
        tags: [],
        connections: [
          { target: "n2", type: "knows", strength: 1, label: "Best Friends" },
        ],
        content: "",
      },
      {
        id: "n2",
        type: "npc",
        title: "Node 2",
        tags: [],
        connections: [],
        content: "",
      },
    ];

    const elements = GraphTransformer.entitiesToElements(entities);
    const edge = elements.find((e) => e.group === "edges") as any;

    expect(edge).toBeDefined();
    expect(edge.data.label).toBe("Best Friends"); // Custom label
    expect(edge.data.connectionType).toBe("knows"); // Original type preserved
  });

  it("should fallback to connection type when no custom label", () => {
    const entities: Entity[] = [
      {
        id: "n1",
        type: "npc",
        title: "Node 1",
        tags: [],
        connections: [{ target: "n2", type: "related_to", strength: 1 }],
        content: "",
      },
      {
        id: "n2",
        type: "npc",
        title: "Node 2",
        tags: [],
        connections: [],
        content: "",
      },
    ];

    const elements = GraphTransformer.entitiesToElements(entities);
    const edge = elements.find((e) => e.group === "edges") as any;

    expect(edge.data.label).toBe("related_to"); // Falls back to type
    expect(edge.data.connectionType).toBe("related_to");
  });

  it("should mark nodes as revealed if tags or labels contain 'revealed' or 'visible'", () => {
    const entities: any[] = [
      {
        id: "n1",
        type: "npc",
        title: "Node 1",
        tags: ["REVEALED"],
        connections: [],
        content: "",
      },
      {
        id: "n2",
        type: "npc",
        title: "Node 2",
        labels: ["visible"],
        connections: [],
        content: "",
      },
      {
        id: "n3",
        type: "npc",
        title: "Node 3",
        tags: ["hidden"],
        connections: [],
        content: "",
      },
    ];

    const elements = GraphTransformer.entitiesToElements(entities);

    const node1 = elements.find((e) => e.data.id === "n1") as any;
    const node2 = elements.find((e) => e.data.id === "n2") as any;
    const node3 = elements.find((e) => e.data.id === "n3") as any;

    expect(node1.data.isRevealed).toBe(true);
    expect(node2.data.isRevealed).toBe(true);
    expect(node3.data.isRevealed).toBeUndefined();
  });
});
