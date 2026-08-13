/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCanvasLogic } from "./use-canvas-logic.svelte";
import type { IdGenerator } from "$lib/utils/runtime-deps";
import type { CanvasStore } from "@codex/canvas-engine";
import { vault } from "$lib/stores/vault.svelte";
import { canvasRegistry } from "$lib/stores/canvas-registry.svelte";

vi.mock("@xyflow/svelte", () => ({
  useSvelteFlow: () => ({
    screenToFlowPosition: (pos: { x: number; y: number }) => pos,
  }),
  addEdge: (edge: any, edges: any[]) => [...edges, edge],
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    isInitialized: true,
    activeVaultId: "vault-1",
    canvases: {},
    allEntities: [],
    saveCanvas: vi.fn(),
  },
}));

vi.mock("$lib/stores/canvas-registry.svelte", () => ({
  canvasRegistry: {
    isLoaded: true,
    canvases: {},
    allCanvases: [],
    touch: vi.fn(),
  },
}));

vi.mock("$lib/stores/debug.svelte", () => ({
  debugStore: {
    warn: vi.fn(),
  },
}));

describe("createCanvasLogic idGenerator dependency injection", () => {
  let mockEngine: Partial<CanvasStore>;

  beforeEach(() => {
    vi.clearAllMocks();
    (vault as any).canvases = {};
    (canvasRegistry as any).allCanvases = [];
    mockEngine = {
      nodes: [],
      edges: [],
      export: vi.fn(() => ({ nodes: [], edges: [] })),
    };
  });

  it("uses the injected idGenerator to construct deterministic edge IDs onConnect", () => {
    let callCount = 0;
    const fakeIdGenerator: IdGenerator = {
      uuid: () => `fake-uuid-${++callCount}`,
    };

    const logic = createCanvasLogic(
      () => mockEngine as CanvasStore,
      fakeIdGenerator,
    );

    const connection = {
      source: "node-1",
      target: "node-2",
      sourceHandle: "h1",
      targetHandle: "h2",
    };

    logic.onConnect(connection);

    expect(logic.edges).toHaveLength(1);
    expect(logic.edges[0].id).toBe("edge-fake-uuid-1");
  });

  it("loads and persists drawings without changing node or edge state", async () => {
    const canvas = {
      id: "canvas-drawing",
      name: "Drawing Canvas",
      slug: "drawing-canvas",
      nodes: [],
      edges: [],
      drawings: [
        {
          id: "drawing-existing",
          color: "#ff00aa",
          width: 4,
          points: [{ x: 10, y: 20 }],
        },
      ],
    };
    (vault as any).canvases = { "canvas-drawing": canvas };
    (canvasRegistry as any).allCanvases = [canvas];

    const logic = createCanvasLogic(() => mockEngine as CanvasStore);
    logic.initializeCanvas("drawing-canvas");

    expect(logic.drawings).toHaveLength(1);
    logic.addDrawing({
      id: "drawing-new",
      color: "#00ffaa",
      width: 4,
      points: [{ x: 30, y: 40 }],
    });

    await vi.waitFor(() =>
      expect(vault.saveCanvas).toHaveBeenCalledWith("canvas-drawing", {
        explicitVaultId: "vault-1",
      }),
    );
    expect((vault as any).canvases["canvas-drawing"].drawings).toHaveLength(2);
    expect(mockEngine.drawings).toHaveLength(2);
    expect(logic.nodes).toEqual([]);
    expect(logic.edges).toEqual([]);
  });

  it("removes a clicked drawing and leaves an unknown drawing unchanged", async () => {
    const canvas = {
      id: "canvas-drawing",
      slug: "drawing-canvas",
      nodes: [],
      edges: [],
      drawings: [
        {
          id: "drawing-1",
          color: "#ff00aa",
          width: 4,
          points: [{ x: 10, y: 20 }],
        },
      ],
    };
    (vault as any).canvases = { "canvas-drawing": canvas };
    (canvasRegistry as any).allCanvases = [canvas];
    const logic = createCanvasLogic(() => mockEngine as CanvasStore);
    logic.initializeCanvas("drawing-canvas");

    expect(logic.removeDrawing("missing")).toBe(false);
    expect(logic.drawings).toHaveLength(1);
    expect(logic.removeDrawing("drawing-1")).toBe(true);
    expect(logic.drawings).toEqual([]);
    expect(mockEngine.drawings).toEqual([]);
    await vi.waitFor(() =>
      expect(vault.saveCanvas).toHaveBeenCalledWith("canvas-drawing", {
        explicitVaultId: "vault-1",
      }),
    );
  });

  it("updates arbitrary node rotation but rejects missing nodes and invalid values", () => {
    const logic = createCanvasLogic(() => mockEngine as CanvasStore);
    logic.nodes = [
      { id: "node-1", position: { x: 0, y: 0 }, data: { title: "Card" } },
    ] as any;

    expect(logic.updateNodeRotation("missing", 45)).toBe(false);
    expect(logic.updateNodeRotation("node-1", Number.NaN)).toBe(false);
    expect(logic.updateNodeRotation("node-1", 765)).toBe(true);
    expect(logic.nodes[0].data).toMatchObject({ title: "Card", rotation: 765 });
  });

  it("creates and reconnects Delve passages with synchronized metadata", () => {
    const logic = createCanvasLogic(() => mockEngine as CanvasStore, {
      uuid: () => "passage-uuid",
    });
    logic.nodes = [
      { id: "room-1", type: "delveRoom", position: { x: 0, y: 0 }, data: {} },
      { id: "room-2", type: "delveRoom", position: { x: 0, y: 0 }, data: {} },
      { id: "room-3", type: "delveRoom", position: { x: 0, y: 0 }, data: {} },
    ] as any;

    logic.onConnect({
      source: "room-1",
      target: "room-2",
      sourceHandle: "source-right",
      targetHandle: "target-left",
    });
    expect(logic.edges[0]).toMatchObject({
      type: "delveEdge",
      data: {
        sourceRoomId: "room-1",
        targetRoomId: "room-2",
        type: "standard",
        bidirectional: true,
      },
    });

    logic.onReconnect(logic.edges[0], {
      source: "room-1",
      target: "room-3",
      sourceHandle: "source-bottom",
      targetHandle: "target-top",
    });
    expect(logic.edges[0]).toMatchObject({
      source: "room-1",
      target: "room-3",
      data: {
        sourceRoomId: "room-1",
        targetRoomId: "room-3",
      },
    });
  });

  it("uses the injected idGenerator for edge-id fallbacks when running syncEngine", () => {
    let callCount = 0;
    const fakeIdGenerator: IdGenerator = {
      uuid: () => `sync-uuid-${++callCount}`,
    };

    const logic = createCanvasLogic(
      () => mockEngine as CanvasStore,
      fakeIdGenerator,
    );

    logic.initializeCanvas("canvas-1");
    // Manually set an edge with an empty ID after initialization
    logic.edges = [
      {
        id: "",
        source: "node-a",
        target: "node-b",
      } as any,
    ];

    logic.syncEngine();

    expect(mockEngine.edges).toHaveLength(1);
    expect(mockEngine.edges?.[0].id).toBe("edge-sync-uuid-1");
  });

  it("sets draftAdventureNode on handleAddAdventureNode and materializes node on handleSaveAdventureNode", () => {
    const fakeIdGenerator: IdGenerator = {
      uuid: () => "adv-node-1",
    };

    const logic = createCanvasLogic(
      () => mockEngine as CanvasStore,
      fakeIdGenerator,
    );

    logic.handleAddAdventureNode("location", { x: 100, y: 200 });

    expect(logic.draftAdventureNode).not.toBeNull();
    expect(logic.draftAdventureNode?.id).toBe("node-location-adv-node-1");

    const createdNode = {
      ...logic.draftAdventureNode!,
      data: {
        ...logic.draftAdventureNode!.data,
        title: "Test Location",
        description: "Test Description",
      },
    };

    logic.handleSaveAdventureNode(createdNode);

    expect(logic.draftAdventureNode).toBeNull();
    expect(logic.nodes).toHaveLength(1);
    expect(logic.nodes[0].id).toBe("node-location-adv-node-1");
    expect(logic.nodes[0].data.title).toBe("Test Location");
    expect(logic.nodes[0].data.type).toBe("location");
    expect(logic.nodes[0].data.description).toBe("Test Description");
  });

  it("saves the outgoing canvas snapshot when switching canvases", async () => {
    const outgoingCanvas = {
      id: "canvas-a",
      name: "Adventure A",
      slug: "adventure-a",
      nodes: [
        {
          id: "node-a",
          type: "adventureNode",
          position: { x: 10, y: 20 },
          data: { type: "situation", title: "Adventure A" },
        },
      ],
      edges: [],
      metadata: {},
    };
    const incomingCanvas = {
      id: "canvas-b",
      name: "Adventure B",
      slug: "adventure-b",
      nodes: [
        {
          id: "node-b",
          type: "adventureNode",
          position: { x: 30, y: 40 },
          data: { type: "situation", title: "Adventure B" },
        },
      ],
      edges: [],
      metadata: {},
    };
    (vault as any).canvases = {
      "canvas-a": outgoingCanvas,
      "canvas-b": incomingCanvas,
    };
    (canvasRegistry as any).allCanvases = [outgoingCanvas, incomingCanvas];

    const logic = createCanvasLogic(() => mockEngine as CanvasStore);
    logic.initializeCanvas("adventure-a");
    logic.nodes = [
      {
        ...logic.nodes[0],
        data: { ...logic.nodes[0].data, title: "Edited Adventure A" },
      },
    ];
    logic.syncEngine();
    logic.syncEngine();
    logic.syncEngine();

    logic.initializeCanvas("adventure-b");

    await vi.waitFor(() => {
      expect(vault.saveCanvas).toHaveBeenCalledWith("canvas-a", {
        explicitVaultId: "vault-1",
      });
    });
    expect((vault as any).canvases["canvas-a"].nodes[0]).toMatchObject({
      id: "node-a",
      data: { title: "Edited Adventure A" },
    });
    expect(logic.nodes[0]).toMatchObject({
      id: "node-b",
      data: { title: "Adventure B" },
    });
    expect((vault as any).canvases["canvas-b"].nodes[0]).toMatchObject({
      id: "node-b",
      data: { title: "Adventure B" },
    });
  });

  it("does not redirect an in-flight save to the newly selected canvas", async () => {
    const canvasA = {
      id: "canvas-a",
      name: "Adventure A",
      slug: "adventure-a",
      nodes: [
        {
          id: "node-a",
          type: "adventureNode",
          position: { x: 10, y: 20 },
          data: { type: "situation", title: "Adventure A" },
        },
      ],
      edges: [],
      metadata: {},
    };
    const canvasB = {
      id: "canvas-b",
      name: "Adventure B",
      slug: "adventure-b",
      nodes: [
        {
          id: "node-b",
          type: "adventureNode",
          position: { x: 30, y: 40 },
          data: { type: "situation", title: "Adventure B" },
        },
      ],
      edges: [],
      metadata: {},
    };
    (vault as any).canvases = { "canvas-a": canvasA, "canvas-b": canvasB };
    (canvasRegistry as any).allCanvases = [canvasA, canvasB];

    const logic = createCanvasLogic(() => mockEngine as CanvasStore);
    logic.initializeCanvas("adventure-a");
    logic.handleSaveAdventureNode({
      ...logic.nodes[0],
      data: { ...logic.nodes[0].data, title: "Saved Adventure A" },
    });

    logic.initializeCanvas("adventure-b");

    await vi.waitFor(() => {
      expect(vault.saveCanvas).toHaveBeenCalledWith("canvas-a", {
        explicitVaultId: "vault-1",
      });
    });
    expect(vault.saveCanvas).not.toHaveBeenCalledWith(
      "canvas-b",
      expect.anything(),
    );
    expect((vault as any).canvases["canvas-b"].nodes[0].id).toBe("node-b");
  });
});
