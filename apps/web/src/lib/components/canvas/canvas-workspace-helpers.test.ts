import { describe, expect, it, vi } from "vitest";
import type { Canvas } from "@codex/canvas-engine";
import {
  buildCanvasSavePayload,
  accumulateRotationDegrees,
  canvasEdgeToFlowEdge,
  canvasNodeRotation,
  canvasNodeStyle,
  canvasNodeToFlowNode,
  canvasNodeZIndex,
  createFlowEdgeFromConnection,
  createFlowEntityNode,
  createFlowFileNode,
  autoArrangeCanvasNodes,
  flowEdgeToCanvasEdge,
  flowNodesToCanvasNodes,
  flowNodeToCanvasNode,
  fitDelveSectorFrames,
  hydrateCanvasGraph,
  isGenericCanvasName,
  pointerAngleDegrees,
  pruneCanvasGraph,
  reconnectFlowEdge,
  resolveBatchSpawnPosition,
  resolveSpawnPosition,
} from "./canvas-workspace-helpers";

describe("canvas-workspace-helpers", () => {
  it("accumulates unlimited rotation without snapping at angle wraparound", () => {
    expect(pointerAngleDegrees({ x: 0, y: 0 }, { x: 0, y: 10 })).toBe(90);
    expect(accumulateRotationDegrees(710, 179, -179)).toBe(712);
    expect(accumulateRotationDegrees(-710, -179, 179)).toBe(-712);
  });

  it("ignores invalid rotation data and composes rotation with node styles", () => {
    const rotated = {
      id: "node-1",
      position: { x: 0, y: 0 },
      style: "opacity:0.8",
      data: { rotation: 405 },
    } as any;
    expect(canvasNodeRotation(rotated)).toBe(405);
    expect(canvasNodeStyle(rotated)).toBe(
      "opacity:0.8;--canvas-node-rotate:405deg;",
    );
    expect(
      canvasNodeRotation({ ...rotated, data: { rotation: Number.NaN } }),
    ).toBe(0);
  });

  it("ignores invalid z-index data and defaults to 0", () => {
    expect(canvasNodeZIndex({ data: { zIndex: 4 } } as any)).toBe(4);
    expect(canvasNodeZIndex({ data: { zIndex: -2 } } as any)).toBe(-2);
    expect(canvasNodeZIndex({ data: {} } as any)).toBe(0);
    expect(canvasNodeZIndex({ data: { zIndex: Number.NaN } } as any)).toBe(0);
    expect(canvasNodeZIndex(undefined)).toBe(0);
  });

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
      expect.objectContaining({
        id: "node-1",
        type: "entity",
        position: { x: 10, y: 20 },
        data: {
          entityId: "entity-1",
          width: 120,
          height: 80,
        },
      }),
    ]);
    expect(graph.edges).toEqual([
      expect.objectContaining({
        id: "edge-1",
        source: "node-1",
        target: "node-2",
        sourceHandle: null,
        targetHandle: null,
        label: "Rel",
        type: "straight",
        style: undefined,
      }),
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

    const fileNode = createFlowFileNode(
      {
        path: "files/map.pdf",
        name: "map.pdf",
        mimeType: "application/pdf",
        size: 42,
      },
      { x: 30, y: 40 },
      "file-1",
    );
    expect(flowNodeToCanvasNode(fileNode)).toMatchObject({
      id: "file-1",
      type: "file",
      file: { path: "files/map.pdf", name: "map.pdf" },
    });
    expect(fileNode.data?.showFullImage).toBe(false);

    const imageFileNode = createFlowFileNode(
      {
        path: "files/portrait.png",
        name: "portrait.png",
        mimeType: "image/png",
        size: 42,
      },
      { x: 30, y: 40 },
      "file-2",
    );
    expect(imageFileNode.data?.showFullImage).toBe(true);

    expect(
      flowNodeToCanvasNode({
        id: "invalid-file",
        type: "file",
        position: { x: 0, y: 0 },
        data: { file: { name: "missing metadata" } },
      }),
    ).toBeUndefined();
    expect(flowNodesToCanvasNodes([fileNode])).toHaveLength(1);
    expect(
      flowNodesToCanvasNodes([
        fileNode,
        {
          id: "invalid-file",
          type: "file",
          position: { x: 0, y: 0 },
          data: { file: { name: "missing metadata" } },
        },
      ]),
    ).toHaveLength(1);

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

  it("creates domain-aware Adventure and Delve connections", () => {
    const connection = {
      source: "room-1",
      target: "room-2",
      sourceHandle: "source-right",
      targetHandle: "target-left",
    } as any;

    expect(
      createFlowEdgeFromConnection(
        connection,
        "passage-1",
        { id: "room-1", type: "delveRoom" } as any,
        { id: "room-2", type: "delveRoom" } as any,
      ),
    ).toMatchObject({
      id: "passage-1",
      type: "delveEdge",
      data: {
        id: "passage-1",
        sourceRoomId: "room-1",
        targetRoomId: "room-2",
        type: "standard",
        bidirectional: true,
      },
    });

    expect(
      createFlowEdgeFromConnection(
        { source: "situation", target: "clue" } as any,
        "adventure-edge-1",
        {
          id: "situation",
          type: "adventureNode",
          data: { type: "situation" },
        } as any,
        {
          id: "clue",
          type: "adventureNode",
          data: { type: "clue" },
        } as any,
      ),
    ).toMatchObject({
      type: "holds_clue",
      label: "holds clue",
      data: { relation: "holds clue" },
    });
  });

  it("keeps Delve passage metadata aligned when reconnecting", () => {
    const reconnected = reconnectFlowEdge(
      {
        id: "passage-1",
        source: "room-1",
        target: "room-2",
        type: "delveEdge",
        data: {
          id: "passage-1",
          sourceRoomId: "room-1",
          targetRoomId: "room-2",
          type: "hidden",
          bidirectional: true,
        },
      } as any,
      {
        source: "room-3",
        target: "room-4",
        sourceHandle: "source-bottom",
        targetHandle: "target-top",
      } as any,
    );

    expect(reconnected).toMatchObject({
      source: "room-3",
      target: "room-4",
      data: {
        sourceRoomId: "room-3",
        targetRoomId: "room-4",
        type: "hidden",
      },
    });
  });

  it("auto-arranges Delve rooms through the shared canvas layout entry point", () => {
    const nodes = [
      {
        id: "sector-1",
        type: "delveSectorGroup",
        position: { x: 0, y: 0 },
        data: {
          id: "sector-1",
          name: "Upper Halls",
          theme: "Stone",
          description: "",
          order: 1,
        },
      },
      ...["room-1", "room-2"].map((id, index) => ({
        id,
        type: "delveRoom",
        parentId: "sector-1",
        position: { x: 0, y: 0 },
        data: {
          id,
          sectorId: "sector-1",
          sectorName: "Upper Halls",
          name: id,
          role: index === 0 ? "entrance" : "encounter",
          summary: "",
          description: "",
          stocking: {},
        },
      })),
    ] as any;

    const arranged = autoArrangeCanvasNodes({
      canvasId: "delve-1",
      title: "Test Delve",
      nodes,
      edges: [
        {
          id: "passage-1",
          source: "room-1",
          target: "room-2",
          type: "delveEdge",
          data: {
            id: "passage-1",
            sourceRoomId: "room-1",
            targetRoomId: "room-2",
            type: "standard",
            bidirectional: true,
          },
        },
      ] as any,
    });

    expect(arranged).not.toBeNull();
    expect(arranged?.find((node) => node.id === "sector-1")).toMatchObject({
      width: expect.any(Number),
      height: expect.any(Number),
    });
    expect(
      arranged?.find((node) => node.id === "room-2")?.position.y,
    ).toBeGreaterThan(
      arranged?.find((node) => node.id === "room-1")?.position.y ?? 0,
    );
  });

  it("does not auto-arrange an ordinary entity canvas", () => {
    expect(
      autoArrangeCanvasNodes({
        canvasId: "canvas-1",
        title: "Entity Canvas",
        nodes: [
          {
            id: "entity-node",
            type: "entity",
            position: { x: 40, y: 80 },
            data: { entityId: "entity-1" },
          },
        ] as any,
        edges: [],
      }),
    ).toBeNull();
  });

  it("hydrates sector frames with a dedicated drag handle", () => {
    expect(
      canvasNodeToFlowNode({
        id: "sector-1",
        type: "delveSectorGroup",
        position: { x: 0, y: 0 },
        width: 600,
        height: 500,
        data: {
          id: "sector-1",
          name: "The Hollowed Choir",
          theme: "Resonant glass",
          description: "",
          order: 2,
        },
      }),
    ).toMatchObject({
      type: "delveSectorGroup",
      draggable: true,
      selectable: false,
      dragHandle: ".sector-drag-handle",
      zIndex: 0,
    });
  });

  it("fits sector frames around moved Areas without moving them on the canvas", () => {
    const nodes = [
      {
        id: "sector-1",
        type: "delveSectorGroup",
        position: { x: 100, y: 200 },
        width: 900,
        height: 800,
        data: {},
      },
      {
        id: "room-1",
        type: "delveRoom",
        parentId: "sector-1",
        position: { x: -60, y: 100 },
        width: 220,
        height: 120,
        data: {},
      },
      {
        id: "room-2",
        type: "delveRoom",
        parentId: "sector-1",
        position: { x: 400, y: 360 },
        width: 220,
        height: 120,
        data: {},
      },
    ] as any;

    const fitted = fitDelveSectorFrames(nodes);
    const sector = fitted.find((node) => node.id === "sector-1")!;
    const firstRoom = fitted.find((node) => node.id === "room-1")!;
    const secondRoom = fitted.find((node) => node.id === "room-2")!;

    expect(sector).toMatchObject({
      position: { x: 0, y: 240 },
      width: 760,
      height: 480,
    });
    expect(firstRoom.position).toEqual({ x: 40, y: 60 });
    expect(secondRoom.position).toEqual({ x: 500, y: 320 });
    expect({
      x: sector.position.x + firstRoom.position.x,
      y: sector.position.y + firstRoom.position.y,
    }).toEqual({ x: 40, y: 300 });
    expect({
      x: sector.position.x + secondRoom.position.x,
      y: sector.position.y + secondRoom.position.y,
    }).toEqual({ x: 500, y: 560 });
  });

  it("leaves empty sectors and unrelated canvas nodes unchanged", () => {
    const nodes = [
      {
        id: "sector-empty",
        type: "delveSectorGroup",
        position: { x: 25, y: 50 },
        width: 400,
        height: 300,
        data: {},
      },
      {
        id: "entity-1",
        type: "entity",
        position: { x: 700, y: 800 },
        data: { entityId: "entity-1" },
      },
    ] as any;

    expect(fitDelveSectorFrames(nodes)).toEqual(nodes);
  });

  it("preserves Delve Area and Passage data when serializing the flow", () => {
    const roomData = {
      id: "room-1",
      sectorId: "sector-1",
      sectorName: "The Forge",
      name: "Ash Hall",
      role: "hazard",
      summary: "A soot-blackened hall.",
      description: "Hot ash drifts through the chamber.",
      stocking: { hazards: ["Falling cinders"] },
    };
    const node = flowNodeToCanvasNode({
      id: "room-1",
      type: "delveRoom",
      position: { x: 20, y: 30 },
      parentId: "sector-1",
      data: roomData,
    } as any);
    const hydratedRoom = canvasNodeToFlowNode({
      id: "room-1",
      type: "delveRoom",
      position: { x: 20, y: 30 },
      parentId: "sector-1",
      extent: "parent",
      data: roomData,
    });
    const edge = flowEdgeToCanvasEdge({
      id: "passage-1",
      source: "room-1",
      target: "room-2",
      type: "delveEdge",
      data: {
        type: "hidden",
        bidirectional: true,
      },
    } as any);

    expect(node).toMatchObject({
      type: "delveRoom",
      parentId: "sector-1",
      data: roomData,
    });
    expect(hydratedRoom.extent).toBeNull();
    expect(edge).toMatchObject({
      type: "delveEdge",
      data: {
        type: "hidden",
        bidirectional: true,
      },
    });
  });

  it("normalizes missing flow edge IDs and types during serialization", () => {
    const createFallbackId = vi.fn(() => "edge-generated");

    const edge = flowEdgeToCanvasEdge(
      {
        id: "",
        source: "room-1",
        target: "room-2",
      } as any,
      createFallbackId,
    );

    expect(edge.id).toBe("edge-generated");
    expect(edge.type).toBe("smoothstep");
    expect(createFallbackId).toHaveBeenCalledOnce();
  });

  it("treats generic canvas labels as placeholders", () => {
    expect(isGenericCanvasName("Untitled Workspace", "canvas-1")).toBe(true);
    expect(isGenericCanvasName("canvas-1", "canvas-1")).toBe(true);
    expect(isGenericCanvasName("Council Map", "canvas-1")).toBe(false);
  });
});
