import { describe, it, expect } from "vitest";
import {
  GraphTransformer,
  getGraphStyle,
  type GraphEdge,
  type GraphNode,
} from "./transformer";
import type { Entity } from "schema";

describe("GraphTransformer", () => {
  it("should transform entities to nodes and edges", () => {
    const entities: Entity[] = [
      {
        id: "n1",
        type: "npc",
        title: "Node 1",
        tags: [],
        labels: [],
        connections: [{ target: "n2", type: "knows", strength: 0.5 }],
        content: "",
      },
      {
        id: "n2",
        type: "location",
        title: "Node 2",
        tags: [],
        labels: [],
        connections: [],
        content: "",
      },
    ];

    const elements = GraphTransformer.entitiesToElements(entities);

    expect(elements).toHaveLength(3); // 2 nodes + 1 edge

    const node1 = elements.find(
      (e): e is GraphNode => e.group === "nodes" && e.data.id === "n1",
    );
    expect(node1).toBeDefined();
    expect(node1?.data.label).toBe("Node 1");

    const edge = elements.find(
      (e): e is GraphEdge => e.group === "edges" && e.data.source === "n1",
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
    expect((elements[0] as any).position).toBeDefined();
    expect((elements[0] as any).position).toHaveProperty("x");
    expect((elements[0] as any).position).toHaveProperty("y");
  });

  it("should transform image field", () => {
    const entities: Entity[] = [
      {
        id: "n1",
        type: "npc",
        title: "Node 1",
        tags: [],
        labels: [],
        connections: [],
        content: "",
        image: "http://example.com/img.png",
      },
    ];

    const elements = GraphTransformer.entitiesToElements(entities);
    const node = elements.find(
      (e): e is GraphNode => e.group === "nodes" && e.data.id === "n1",
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
        labels: [],
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
        labels: [],
        connections: [],
        content: "",
      },
    ];

    const elements = GraphTransformer.entitiesToElements(entities);
    const edge = elements.find((e): e is GraphEdge => e.group === "edges");

    expect(edge).toBeDefined();
    expect(edge?.data.label).toBe("Best Friends"); // Custom label
    expect(edge?.data.connectionType).toBe("knows"); // Original type preserved
  });

  it("should fallback to connection type when no custom label", () => {
    const entities: Entity[] = [
      {
        id: "n1",
        type: "npc",
        title: "Node 1",
        tags: [],
        labels: [],
        connections: [{ target: "n2", type: "related_to", strength: 1 }],
        content: "",
      },
      {
        id: "n2",
        type: "npc",
        title: "Node 2",
        tags: [],
        labels: [],
        connections: [],
        content: "",
      },
    ];

    const elements = GraphTransformer.entitiesToElements(entities);
    const edge = elements.find((e): e is GraphEdge => e.group === "edges");

    expect(edge?.data.label).toBe("related_to"); // Falls back to type
    expect(edge?.data.connectionType).toBe("related_to");
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

    const node1 = elements.find(
      (e): e is GraphNode => e.group === "nodes" && e.data.id === "n1",
    );
    const node2 = elements.find(
      (e): e is GraphNode => e.group === "nodes" && e.data.id === "n2",
    );
    const node3 = elements.find(
      (e): e is GraphNode => e.group === "nodes" && e.data.id === "n3",
    );

    expect(node1).toBeDefined();
    expect(node2).toBeDefined();
    expect(node3).toBeDefined();

    expect((node1?.data as any).isRevealed).toBe(true);
    expect((node2?.data as any).isRevealed).toBe(true);
    expect((node3?.data as any).isRevealed).toBeUndefined();
  });

  it("should format dates correctly", () => {
    const entities: Entity[] = [
      {
        id: "n1",
        type: "event",
        title: "Year Only",
        date: { year: 2026 },
        content: "",
      },
      {
        id: "n2",
        type: "event",
        title: "Year Month",
        date: { year: 2026, month: 2 },
        content: "",
      },
      {
        id: "n3",
        type: "event",
        title: "Full Date",
        date: { year: 2026, month: 2, day: 12 },
        content: "",
      },
      {
        id: "n4",
        type: "event",
        title: "With Label",
        date: { year: 1000, label: "Ancient Era" },
        content: "",
      },
      {
        id: "n5",
        type: "event",
        title: "Invalid Date",
        date: {} as any, // Missing year
        content: "",
      },
      {
        id: "n6",
        type: "event",
        title: "Single Digit Day",
        date: { year: 2026, month: 12, day: 5 },
        content: "",
      },
      {
        id: "n7",
        type: "event",
        title: "Double Digit Month",
        date: { year: 2026, month: 12 },
        content: "",
      },
    ];

    const elements = GraphTransformer.entitiesToElements(entities);

    const getNode = (id: string) =>
      elements.find(
        (e): e is GraphNode => e.group === "nodes" && e.data.id === id,
      );

    expect(getNode("n1")?.data.dateLabel).toBe("2026");
    expect(getNode("n2")?.data.dateLabel).toBe("2026-02");
    expect(getNode("n3")?.data.dateLabel).toBe("2026-02-12");
    expect(getNode("n4")?.data.dateLabel).toBe("Ancient Era");
    expect(getNode("n5")?.data.dateLabel).toBe("");
    expect(getNode("n6")?.data.dateLabel).toBe("2026-12-05");
    expect(getNode("n7")?.data.dateLabel).toBe("2026-12");
  });

  it("should respect provided validIds set", () => {
    const entities: Entity[] = [
      {
        id: "n1",
        type: "npc",
        title: "Node 1",
        tags: [],
        labels: [],
        connections: [{ target: "n2", type: "knows", strength: 1 }],
        content: "",
      },
    ];

    // Case 1: n2 is NOT in validIds
    const validIds1 = new Set(["n1"]);
    const elements1 = GraphTransformer.entitiesToElements(entities, validIds1);
    const edge1 = elements1.find((e) => e.group === "edges");
    expect(edge1).toBeUndefined(); // Edge should be filtered out because target n2 is not in validIds

    // Case 2: n2 IS in validIds (simulating it existing elsewhere)
    const validIds2 = new Set(["n1", "n2"]);
    const elements2 = GraphTransformer.entitiesToElements(entities, validIds2);
    const edge2 = elements2.find((e) => e.group === "edges");
    expect(edge2).toBeDefined(); // Edge should exist
  });

  it("should filter out entities with missing ID", () => {
    const entities: any[] = [
      { id: "valid-1", type: "npc", title: "Valid" },
      { type: "npc", title: "Broken Node" },
    ];

    const elements = GraphTransformer.entitiesToElements(entities);
    expect(elements).toHaveLength(1);
    expect(elements[0].data.id).toBe("valid-1");
  });

  it("should include background-image-crossorigin in getGraphStyle", () => {
    const mockTemplate = {
      tokens: { primary: "#000", background: "#fff", text: "#333", surface: "#eee", fontHeader: "Arial", fontBody: "Arial" },
      graph: { nodeShape: "ellipse", nodeBorderWidth: 1, edgeWidth: 1, edgeColor: "#ccc", edgeStyle: "solid" }
    } as any;
    const style = getGraphStyle(mockTemplate, [], true);
    const resolvedImageStyle = style.find((s: any) => s.selector.includes("resolvedImage"));
    expect(resolvedImageStyle.style["background-image-crossorigin"]).toBe("null");
  });
});
