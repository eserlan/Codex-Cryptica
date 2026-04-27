import { describe, expect, it, vi } from "vitest";
import type { Canvas } from "@codex/canvas-engine";
import {
  buildCanvasSavePayload,
  canvasEdgeToFlowEdge,
  canvasNodeToFlowNode,
  createFlowEdgeFromConnection,
  createFlowEntityNode,
  hydrateCanvasGraph,
  isGenericCanvasName,
  pruneCanvasGraph,
  resolveBatchSpawnPosition,
  resolveSpawnPosition,
} from "./canvas-workspace-helpers";

describe("canvas-workspace-helpers", () => {
  it("hydrates canvas data into flow nodes and edges", () => {
    const graph = hydrateCanvasGraph({
      nodes: [
        {
          id: "node-1",
          type: "entity",
          entityId: "entity-1",
          position: { x: 10, y: 20 },
          width: 120,
          height: 80,
        },
      ],
      edges: [
        {
          id: "edge-1",
          source: "node-1",
          target: "node-2",
          label: "Rel",
          type: "line",
        },
      ],
    });

    expect(graph.nodes).toEqual([
      {
        id: "node-1",
        type: "entity",
        position: { x: 10, y: 20 },
        data: {
          entityId: "entity-1",
          width: 120,
          height: 80,
        },
      },
    ]);
    expect(graph.edges).toEqual([
      {
        id: "edge-1",
        source: "node-1",
        target: "node-2",
        sourceHandle: null,
        targetHandle: null,
        label: "Rel",
        type: "straight",
        style: undefined,
      },
    ]);
  });

  it("prunes deleted entity nodes and connected edges", () => {
    const nodes = [
      {
        id: "node-1",
        type: "entity",
        position: { x: 0, y: 0 },
        data: { entityId: "keep" },
      },
      {
        id: "node-2",
        type: "entity",
        position: { x: 10, y: 10 },
        data: { entityId: "drop" },
      },
      {
        id: "note-1",
        type: "note",
        position: { x: 5, y: 5 },
        data: {},
      },
    ] as any;
    const edges = [
      { id: "edge-1", source: "node-1", target: "node-2" },
      { id: "edge-2", source: "node-1", target: "note-1" },
    ] as any;

    const pruned = pruneCanvasGraph(nodes, edges, new Set(["keep"]));

    expect(pruned.nodes.map((node) => node.id)).toEqual(["node-1", "note-1"]);
    expect(pruned.edges.map((edge) => edge.id)).toEqual(["edge-2"]);
  });

  it("preserves meaningful canvas metadata when saving", () => {
    const payload = buildCanvasSavePayload({
      existing: {
        id: "canvas-1",
        name: "Existing Canvas",
        slug: "existing-canvas",
      } as Partial<Canvas>,
      currentCanvas: {
        name: "Untitled Workspace",
        slug: "untitled-workspace",
      },
      exported: { nodes: [], edges: [] },
      canvasId: "canvas-1",
      lastModified: 1234,
    });

    expect(payload).toMatchObject({
      id: "canvas-1",
      name: "Existing Canvas",
      slug: "existing-canvas",
      nodes: [],
      edges: [],
      lastModified: 1234,
    });
  });

  it("falls back to the current canvas metadata when the stored name is generic", () => {
    const payload = buildCanvasSavePayload({
      existing: {
        id: "canvas-1",
        name: "Untitled Workspace",
        slug: "canvas-1",
      } as Partial<Canvas>,
      currentCanvas: {
        name: "Council Map",
        slug: "council-map",
      },
      exported: { nodes: [], edges: [] },
      canvasId: "canvas-1",
      lastModified: 999,
    });

    expect(payload.name).toBe("Council Map");
    expect(payload.slug).toBe("council-map");
  });

  it("resolves spawn positions from screen, flow, or centered fallbacks", () => {
    const screenToFlowPosition = vi.fn((point: { x: number; y: number }) => ({
      x: point.x + 1,
      y: point.y + 2,
    }));

    expect(
      resolveSpawnPosition({
        screenToFlowPosition,
        windowSize: { width: 1000, height: 800 },
        screenPosition: { x: 10, y: 20 },
      }),
    ).toEqual({ x: 11, y: 22 });

    expect(
      resolveSpawnPosition({
        screenToFlowPosition,
        windowSize: { width: 1000, height: 800 },
        flowPosition: { x: 7, y: 9 },
      }),
    ).toEqual({ x: 7, y: 9 });

    expect(
      resolveSpawnPosition({
        screenToFlowPosition,
        windowSize: { width: 1000, height: 800 },
      }),
    ).toEqual({ x: 501, y: 402 });
  });

  it("staggered batch spawn positions respect the index offset", () => {
    const screenToFlowPosition = vi.fn((point: { x: number; y: number }) => ({
      x: point.x,
      y: point.y,
    }));

    expect(
      resolveBatchSpawnPosition({
        index: 2,
        screenToFlowPosition,
        windowSize: { width: 1000, height: 800 },
      }),
    ).toEqual({ x: 560, y: 460 });
  });

  it("keeps helper constructors aligned with flow defaults", () => {
    expect(
      canvasNodeToFlowNode({
        id: "node-1",
        type: "entity",
        entityId: "entity-1",
        position: { x: 1, y: 2 },
      }),
    ).toMatchObject({
      id: "node-1",
      type: "entity",
      position: { x: 1, y: 2 },
      data: { entityId: "entity-1" },
    });

    expect(
      canvasEdgeToFlowEdge({
        id: "edge-1",
        source: "node-1",
        target: "node-2",
        type: "line",
      }),
    ).toMatchObject({
      id: "edge-1",
      source: "node-1",
      target: "node-2",
      type: "straight",
    });

    expect(
      createFlowEntityNode("entity-1", { x: 10, y: 20 }, "node-1"),
    ).toMatchObject({
      id: "node-1",
      type: "entity",
      position: { x: 10, y: 20 },
      data: { entityId: "entity-1" },
    });

    expect(
      createFlowEdgeFromConnection(
        {
          source: "node-1",
          target: "node-2",
        } as any,
        "edge-1",
      ),
    ).toMatchObject({
      id: "edge-1",
      source: "node-1",
      target: "node-2",
      type: "straight",
      animated: true,
    });
  });

  it("treats generic canvas labels as placeholders", () => {
    expect(isGenericCanvasName("Untitled Workspace", "canvas-1")).toBe(true);
    expect(isGenericCanvasName("canvas-1", "canvas-1")).toBe(true);
    expect(isGenericCanvasName("Council Map", "canvas-1")).toBe(false);
  });
});
