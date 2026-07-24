import { describe, it, expect, vi } from "vitest";
import { createCanvasLogic } from "./use-canvas-logic.svelte";
import type { CanvasStore } from "@codex/canvas-engine";

vi.mock("svelte", () => ({
  untrack: vi.fn((cb) => cb()),
  tick: vi.fn(),
}));

vi.mock("@xyflow/svelte", () => ({
  addEdge: vi.fn((edge, edges) => [...edges, edge]),
  useSvelteFlow: vi.fn(() => ({
    screenToFlowPosition: vi.fn((pos) => pos),
  })),
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    isInitialized: true,
    activeVaultId: "vault-1",
    canvases: {},
    allEntities: [],
    saveCanvas: vi.fn(),
    loadEntityContent: vi.fn(),
  },
}));

vi.mock("$lib/stores/canvas-registry.svelte", () => ({
  canvasRegistry: {
    isLoaded: true,
    allCanvases: [],
    touch: vi.fn(),
  },
}));

vi.mock("$lib/stores/debug.svelte", () => ({
  debugStore: {
    warn: vi.fn(),
  },
}));

describe("createCanvasLogic", () => {
  it("uses the injected IdGenerator in onConnect", () => {
    const mockIdGenerator = {
      uuid: vi.fn().mockReturnValue("mocked-uuid-123"),
    };
    const mockEngine = {
      export: vi.fn(),
      addNode: vi.fn(),
    } as unknown as CanvasStore;

    const logic = createCanvasLogic(() => mockEngine, mockIdGenerator);

    // Explicitly initialize canvas to resolve vault expectations
    logic.initializeCanvas("canvas-1");

    logic.onConnect({
      source: "node-1",
      target: "node-2",
      sourceHandle: null,
      targetHandle: null,
    });

    expect(mockIdGenerator.uuid).toHaveBeenCalled();
    expect(logic.edges[0].id).toBe("edge-mocked-uuid-123");
  });

  it("uses the injected IdGenerator for fallback edge IDs in syncEngine", () => {
    const mockIdGenerator = {
      uuid: vi.fn().mockReturnValue("mocked-uuid-456"),
    };
    const mockEngine = {
      edges: [],
      nodes: [],
      export: vi.fn(),
      addNode: vi.fn(),
    } as unknown as CanvasStore;

    const logic = createCanvasLogic(() => mockEngine, mockIdGenerator);

    logic.initializeCanvas("canvas-1");

    // Add an edge manually that lacks an explicit ID fallback
    logic.edges = [
      {
        id: "", // Missing ID
        source: "node-1",
        target: "node-2",
      }
    ];

    logic.syncEngine();

    expect(mockIdGenerator.uuid).toHaveBeenCalled();
    expect(mockEngine.edges[0].id).toBe("edge-mocked-uuid-456");
  });
});
