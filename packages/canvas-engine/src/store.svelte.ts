import { type CanvasNode, type CanvasEdge, type Canvas } from "./types";

export class CanvasStore {
  nodes = $state<CanvasNode[]>([]);
  edges = $state<CanvasEdge[]>([]);

  constructor(initialData?: Canvas) {
    if (initialData) {
      this.loadData(initialData);
    }
  }

  loadData(data: Canvas) {
    this.nodes = data.nodes;
    this.edges = data.edges;
  }

  async load(json: string) {
    try {
      const data = JSON.parse(json);
      this.loadData(data);
    } catch (err) {
      console.error("Failed to load canvas data", err);
    }
  }

  addNode(entityId: string, position: { x: number; y: number }) {
    const newNode: CanvasNode = {
      id: `node-${crypto.randomUUID()}`,
      type: "entity",
      entityId,
      position,
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
    updates: Partial<Pick<CanvasNode, "position" | "width" | "height">>,
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

  /** Alias for addEdge to satisfy contract */
  addLink(sourceId: string, targetId: string, label?: string) {
    return this.addEdge(sourceId, targetId, label);
  }

  removeEdge(edgeId: string) {
    this.edges = this.edges.filter((e) => e.id !== edgeId);
  }

  undo() {
    console.warn("Undo not implemented");
  }

  redo() {
    console.warn("Redo not implemented");
  }

  export(): Canvas {
    return {
      nodes: $state.snapshot(this.nodes),
      edges: $state.snapshot(this.edges),
    };
  }
}
