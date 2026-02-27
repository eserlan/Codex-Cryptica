import { type CanvasNode, type CanvasEdge, type Canvas } from "./types";

export class CanvasStore {
  nodes = $state<CanvasNode[]>([]);
  edges = $state<CanvasEdge[]>([]);

  constructor(initialData?: Canvas) {
    if (initialData) {
      this.nodes = initialData.nodes;
      this.edges = initialData.edges;
    }
  }

  addNode(entityId: string, position: { x: number; y: number }) {
    const newNode: CanvasNode = {
      id: `node-${crypto.randomUUID()}`,
      type: "entity",
      entityId,
      x: position.x,
      y: position.y,
    };
    this.nodes = [...this.nodes, newNode];
    return newNode.id;
  }

  removeNode(nodeId: string) {
    this.nodes = this.nodes.filter((n) => n.id !== nodeId);
    this.edges = this.edges.filter(
      (e) => e.source !== nodeId && e.target !== nodeId,
    );
  }

  updateNode(
    nodeId: string,
    updates: Partial<Pick<CanvasNode, "x" | "y" | "width" | "height">>,
  ) {
    this.nodes = this.nodes.map((n) =>
      n.id === nodeId ? { ...n, ...updates } : n,
    );
  }

  addEdge(source: string, target: string, label?: string) {
    const newEdge: CanvasEdge = {
      id: `edge-${crypto.randomUUID()}`,
      source,
      target,
      label,
      type: "line",
    };
    this.edges = [...this.edges, newEdge];
    return newEdge.id;
  }

  removeEdge(edgeId: string) {
    this.edges = this.edges.filter((e) => e.id !== edgeId);
  }

  export(): Canvas {
    return {
      nodes: $state.snapshot(this.nodes),
      edges: $state.snapshot(this.edges),
    };
  }
}
