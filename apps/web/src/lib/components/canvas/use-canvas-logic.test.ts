/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCanvasLogic } from "./use-canvas-logic.svelte";
import type { IdGenerator } from "$lib/utils/runtime-deps";
import type { CanvasStore } from "@codex/canvas-engine";

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

    const logic = createCanvasLogic(() => mockEngine as CanvasStore, fakeIdGenerator);

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

  it("uses the injected idGenerator for edge-id fallbacks when running syncEngine", () => {
    let callCount = 0;
    const fakeIdGenerator: IdGenerator = {
      uuid: () => `sync-uuid-${++callCount}`,
    };

    const logic = createCanvasLogic(() => mockEngine as CanvasStore, fakeIdGenerator);

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
});
