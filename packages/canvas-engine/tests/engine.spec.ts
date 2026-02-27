import { describe, it, expect } from "vitest";
import { CanvasStore } from "../src/store.svelte";

describe("CanvasStore", () => {
  it("should add a node", () => {
    const store = new CanvasStore();
    const nodeId = store.addNode("entity-1", { x: 100, y: 200 });

    expect(store.nodes).toHaveLength(1);
    expect(store.nodes[0]).toMatchObject({
      id: nodeId,
      entityId: "entity-1",
      position: { x: 100, y: 200 },
    });
  });

  it("should remove a node and its edges", () => {
    const store = new CanvasStore();
    const n1 = store.addNode("e1", { x: 0, y: 0 });
    const n2 = store.addNode("e2", { x: 10, y: 10 });
    store.addEdge(n1, n2);

    expect(store.nodes).toHaveLength(2);
    expect(store.edges).toHaveLength(1);

    store.removeNode(n1);
    expect(store.nodes).toHaveLength(1);
    expect(store.edges).toHaveLength(0);
  });

  it("should export snapshot", () => {
    const store = new CanvasStore();
    store.addNode("e1", { x: 5, y: 5 });
    const data = store.export();

    expect(data.nodes).toHaveLength(1);
    expect(data.nodes[0].entityId).toBe("e1");
  });

  it("should update a node's position using updateNode", () => {
    const store = new CanvasStore();
    const nodeId = store.addNode("entity-1", { x: 0, y: 0 });

    store.updateNode(nodeId, { position: { x: 50, y: 60 } });

    expect(store.nodes).toHaveLength(1);
    expect(store.nodes[0]).toMatchObject({
      id: nodeId,
      entityId: "entity-1",
      position: { x: 50, y: 60 },
    });
  });

  it("should remove an edge using removeEdge", () => {
    const store = new CanvasStore();
    const n1 = store.addNode("e1", { x: 0, y: 0 });
    const n2 = store.addNode("e2", { x: 10, y: 10 });
    const edgeId = store.addEdge(n1, n2);

    expect(store.edges).toHaveLength(1);

    store.removeEdge(edgeId);

    expect(store.edges).toHaveLength(0);
  });
});
