import { describe, it, expect, vi, beforeEach } from "vitest";
import { tick } from "svelte";
import {
  GraphViewController,
  resolveFocusDepth,
  FOCUS_ZOOM_STEP_FACTOR,
  type LoadPhase,
} from "./graph-view-controller.svelte";
import { syncGraphElements, applyLargeGraphRenderHints } from "graph-engine";

// Mock graph-engine
vi.mock("graph-engine", () => {
  const mockCy = {
    on: vi.fn(),
    off: vi.fn(),
    destroy: vi.fn(),
    batch: vi.fn((cb) => cb?.()),
    $: vi.fn().mockReturnValue({
      length: 0,
      nodes: vi.fn().mockReturnValue({
        neighborhood: vi.fn().mockReturnValue({
          nodes: vi.fn().mockReturnValue({
            not: vi
              .fn()
              .mockReturnValue({ length: 0, add: vi.fn(), edgesWith: vi.fn() }),
          }),
        }),
      }),
      removeClass: vi.fn().mockReturnThis(),
      addClass: vi.fn().mockReturnThis(),
      unselect: vi.fn(),
    }),
    $id: vi.fn().mockReturnValue({
      length: 1,
      closedNeighborhood: vi.fn().mockReturnValue({
        nodes: vi.fn().mockReturnValue({
          neighborhood: vi.fn().mockReturnValue({
            nodes: vi.fn().mockReturnValue({
              not: vi.fn().mockReturnValue({
                length: 1,
                edgesWith: vi.fn().mockReturnValue({ length: 0 }),
                add: vi.fn().mockReturnValue({
                  length: 1,
                  removeClass: vi.fn(),
                  addClass: vi.fn(),
                }),
              }),
            }),
          }),
        }),
        removeClass: vi.fn(),
        addClass: vi.fn(),
      }),
      renderedPosition: vi.fn().mockReturnValue({ x: 0, y: 0 }),
      unselect: vi.fn(),
    }),
    width: vi.fn().mockReturnValue(100),
    height: vi.fn().mockReturnValue(100),
    resize: vi.fn(),
    animate: vi.fn().mockResolvedValue(undefined),
    center: vi.fn(),
    style: vi.fn(),
    destroyed: vi.fn().mockReturnValue(false),
    nodes: vi.fn().mockReturnValue({ length: 0, map: vi.fn(() => []) }),
  };

  function MockLayoutManager() {
    return {
      apply: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn(),
    };
  }

  function MockGraphImageManager() {
    return {
      sync: vi.fn(),
      destroy: vi.fn(),
    };
  }

  return {
    initGraph: vi.fn().mockResolvedValue(mockCy),
    LayoutManager: vi.fn().mockImplementation(MockLayoutManager),
    GraphImageManager: vi.fn().mockImplementation(MockGraphImageManager),
    setupGraphEvents: vi.fn().mockReturnValue(vi.fn()),
    syncGraphElements: vi.fn(),
    applyLargeGraphRenderHints: vi.fn(),
    isLayoutCollinear: vi.fn().mockReturnValue(false),
  };
});

describe("GraphViewController", () => {
  let deps: any;
  let controller: GraphViewController;

  beforeEach(() => {
    deps = {
      graph: {
        elements: [],
        timelineMode: false,
        timelineAxis: "x",
        timelineScale: 1,
        orbitMode: false,
        centralNodeId: null,
        stableLayout: true,
        stats: { nodeCount: 0 },
        showImages: true,
        isLargeGraph: false,
        perfStylingActive: false,
        activeLabels: new Set(),
        activeCategories: new Set(),
        labelFilterMode: "OR",
      },
      vault: {
        isGuest: false,
        status: "idle",
        allEntities: [],
        releaseImageUrl: vi.fn(),
        resolveImageUrl: vi.fn(),
        batchUpdate: vi.fn(),
      },
      debugStore: {
        log: vi.fn(),
        error: vi.fn(),
      },
      layoutUIStore: {
        isMobile: false,
      },
      connectionModeStore: {
        isConnecting: false,
        toggleConnectMode: vi.fn(),
      },
      modalUIStore: {
        openZenMode: vi.fn(),
      },
    };

    controller = new GraphViewController({ selectedId: null }, deps);
  });

  it("should initialize with provided selectedId", () => {
    const customController = new GraphViewController(
      { selectedId: "node-1" },
      deps,
    );
    expect(customController.selectedId).toBe("node-1");
  });

  it("should set graphVisible to true after successful init", async () => {
    const container = document.createElement("div");
    await controller.init(container, {});
    await tick();
    expect(controller.graphVisible).toBe(true);
    expect(controller.cy).toBeDefined();
  });

  it("should cleanup on destroy", async () => {
    const container = document.createElement("div");
    await controller.init(container, {});
    const destroySpy = vi.spyOn(controller.cy!, "destroy");

    controller.destroy();

    expect(destroySpy).toHaveBeenCalled();
    expect(controller.cy).toBeUndefined();
  });

  it("should apply focus when selectedId changes", async () => {
    const container = document.createElement("div");
    await controller.init(container, {});

    const batchSpy = controller.cy!.batch;
    controller.applyFocus("node-1");

    expect(batchSpy).toHaveBeenCalled();
  });

  it("should reset to idle when vault starts loading", () => {
    deps.vault.status = "loading";
    deps.vault.allEntities = [];
    controller.loadPhase = "finalized";

    controller.reconcileLoadState();
    expect(controller.loadPhase).toBe<LoadPhase>("idle");
  });

  it("should finalize load when vault becomes idle and initial elements are loaded", async () => {
    const container = document.createElement("div");
    await controller.init(container, {});

    deps.vault.status = "idle";
    controller.loadPhase = "elements";

    const applySpy = vi.spyOn(controller, "applyCurrentLayout");

    controller.reconcileLoadState();

    expect(controller.loadPhase).toBe<LoadPhase>("finalized");
    expect(applySpy).toHaveBeenCalledWith({
      reason: "Load Finalized",
      isInitial: true,
      isForced: true,
    });
  });

  describe("element sync", () => {
    beforeEach(async () => {
      const container = document.createElement("div");
      await controller.init(container, {});
      vi.mocked(syncGraphElements).mockClear();
    });

    it("skips rendered weight sync for unfiltered perf-styled graphs", () => {
      deps.graph.perfStylingActive = true;
      deps.graph.elements = [{ group: "nodes", data: { id: "node-1" } }];

      controller.syncElements();

      expect(syncGraphElements).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ skipRenderedWeightSync: true }),
      );
    });

    it("keeps rendered weight sync when filters are active", () => {
      deps.graph.perfStylingActive = true;
      deps.graph.activeLabels = new Set(["important"]);
      deps.graph.elements = [{ group: "nodes", data: { id: "node-1" } }];

      controller.syncElements();

      expect(syncGraphElements).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ skipRenderedWeightSync: false }),
      );
    });
  });

  describe("render hints", () => {
    beforeEach(async () => {
      const container = document.createElement("div");
      await controller.init(container, {});
      vi.mocked(applyLargeGraphRenderHints).mockClear();
    });

    it("re-applies large-graph render hints to the live cy instance", () => {
      deps.graph.isLargeGraph = true;

      controller.syncRenderHints();

      expect(applyLargeGraphRenderHints).toHaveBeenCalledWith(
        controller.cy,
        true,
      );
    });

    it("clears render hints when the graph is no longer large", () => {
      deps.graph.isLargeGraph = false;

      controller.syncRenderHints();

      expect(applyLargeGraphRenderHints).toHaveBeenCalledWith(
        controller.cy,
        false,
      );
    });
  });

  describe("focus handoff", () => {
    beforeEach(async () => {
      const container = document.createElement("div");
      await controller.init(container, {});
    });

    it("clearGraphSelection nulls selectedId and calls applyFocus(null)", () => {
      controller.selectedId = "node-1";
      const batchSpy = vi.spyOn(controller, "applyFocus");

      controller.clearGraphSelection();

      expect(controller.selectedId).toBeNull();
      expect(batchSpy).toHaveBeenCalledWith(null);
    });

    it("clearGraphSelection unselects all nodes in cytoscape", () => {
      controller.selectedId = "node-1";
      const unselectSpy = vi.fn();
      (controller.cy as any).$ = vi
        .fn()
        .mockReturnValue({ unselect: unselectSpy });

      controller.clearGraphSelection();

      expect(unselectSpy).toHaveBeenCalled();
    });

    it("clearGraphSelection cancels any pending node select timer", () => {
      const clearSpy = vi.spyOn(global, "clearTimeout");
      // Force a timer into place by inspecting private state via any cast
      (controller as any).nodeSelectTimer = 999;

      controller.clearGraphSelection();

      expect(clearSpy).toHaveBeenCalledWith(999);
      expect((controller as any).nodeSelectTimer).toBeNull();
    });
  });

  describe("LoadPhase state machine", () => {
    it("starts in idle phase", () => {
      expect(controller.loadPhase).toBe<LoadPhase>("idle");
    });

    it("transitions to finalized when vault becomes idle and loadPhase is elements", async () => {
      const container = document.createElement("div");
      await controller.init(container, {});
      deps.vault.status = "idle";
      controller.loadPhase = "elements";
      controller.reconcileLoadState();
      expect(controller.loadPhase).toBe<LoadPhase>("finalized");
    });

    it("does not finalize if already past elements phase", async () => {
      const container = document.createElement("div");
      await controller.init(container, {});
      deps.vault.status = "idle";
      controller.loadPhase = "ready";
      controller.reconcileLoadState();
      expect(controller.loadPhase).toBe<LoadPhase>("ready");
    });

    it("resets to idle when vault starts loading fresh", () => {
      controller.loadPhase = "finalized";
      deps.vault.status = "loading";
      deps.vault.allEntities = [];
      controller.reconcileLoadState();
      expect(controller.loadPhase).toBe<LoadPhase>("idle");
    });

    it("restarts the load machine on a vault switch (active id changes)", async () => {
      const container = document.createElement("div");
      await controller.init(container, {});

      // Simulate the first vault settling into the ready phase.
      deps.vault.activeVaultId = "vault-a";
      controller.reconcileLoadState();
      controller.loadPhase = "ready";

      // Switching to another vault keeps status idle and a non-empty index, but
      // the active id changes — loadPhase must reset so finalize can run again.
      deps.vault.status = "idle";
      deps.vault.allEntities = [{ id: "x" }];
      deps.vault.activeVaultId = "vault-b";
      controller.reconcileLoadState();

      expect(controller.loadPhase).toBe<LoadPhase>("idle");
    });

    it("does not reset when the active vault id is unchanged", async () => {
      const container = document.createElement("div");
      await controller.init(container, {});

      deps.vault.activeVaultId = "vault-a";
      controller.reconcileLoadState();
      controller.loadPhase = "ready";

      // Same vault, still idle — must not bounce back to idle.
      deps.vault.status = "idle";
      controller.reconcileLoadState();

      expect(controller.loadPhase).toBe<LoadPhase>("ready");
    });
  });

  describe("viewport policy", () => {
    // apply is now called as apply(request, options) — viewport lives on request
    const lastPolicy = () => {
      const apply = (controller.layoutManager as any).apply;
      const calls = apply.mock.calls;
      return calls[calls.length - 1][0].viewport;
    };

    beforeEach(async () => {
      const container = document.createElement("div");
      await controller.init(container, {});
    });

    it("preserves the camera for edge-only element updates with stable layout", async () => {
      await controller.applyCurrentLayout({
        reason: "Elements Update",
        isForced: true,
      });
      expect(lastPolicy()).toBe("preserve");
    });

    it("fits when new nodes are added", async () => {
      await controller.applyCurrentLayout({
        reason: "Elements Update",
        hasNewNodes: true,
      });
      expect(lastPolicy()).toBe("fit");
    });

    it("fits when nodes are removed", async () => {
      await controller.applyCurrentLayout({
        reason: "Elements Update",
        isForced: true,
        hasRemovedNodes: true,
      });
      expect(lastPolicy()).toBe("fit");
    });

    it("preserves the camera for plain window resizes", async () => {
      await controller.applyCurrentLayout({ reason: "Window Resize" });
      expect(lastPolicy()).toBe("preserve");
    });

    it("fits on orientation-change resizes", async () => {
      await controller.applyCurrentLayout({
        reason: "Window Resize",
        isForced: true,
        reseed: true,
      });
      expect(lastPolicy()).toBe("fit");
    });

    it("fits when stable layout is off", async () => {
      deps.graph.stableLayout = false;
      await controller.applyCurrentLayout({
        reason: "Elements Update",
        isForced: true,
      });
      expect(lastPolicy()).toBe("fit");
    });

    it("fits on initial layout", async () => {
      await controller.applyCurrentLayout({
        reason: "Load Finalized",
        isInitial: true,
        isForced: true,
      });
      expect(lastPolicy()).toBe("fit");
    });

    it("fits on mode changes and manual redraw", async () => {
      await controller.applyCurrentLayout({
        reason: "Mode Change Effect",
        isForced: true,
      });
      expect(lastPolicy()).toBe("fit");
      await controller.applyCurrentLayout({
        reason: "UI Redraw Button",
        isForced: true,
        reseed: true,
      });
      expect(lastPolicy()).toBe("fit");
    });
  });
});

describe("resolveFocusDepth", () => {
  const bounds = { min: 1, max: 6, stepFactor: FOCUS_ZOOM_STEP_FACTOR };

  it("reveals more detail when zoomed in past the step factor", () => {
    const result = resolveFocusDepth(2, 1 * FOCUS_ZOOM_STEP_FACTOR, 1, bounds);
    expect(result.depth).toBe(3);
    expect(result.mark).toBe(FOCUS_ZOOM_STEP_FACTOR);
  });

  it("hides detail when zoomed out past the step factor", () => {
    const result = resolveFocusDepth(3, 1 / FOCUS_ZOOM_STEP_FACTOR, 1, bounds);
    expect(result.depth).toBe(2);
    expect(result.mark).toBe(1 / FOCUS_ZOOM_STEP_FACTOR);
  });

  it("holds depth and mark within the step factor", () => {
    const result = resolveFocusDepth(2, 1.2, 1, bounds);
    expect(result.depth).toBe(2);
    expect(result.mark).toBe(1);
  });

  it("clamps at the max depth", () => {
    const result = resolveFocusDepth(6, 100, 1, bounds);
    expect(result.depth).toBe(6);
    expect(result.mark).toBe(1);
  });

  it("clamps at the min depth", () => {
    const result = resolveFocusDepth(1, 0.001, 1, bounds);
    expect(result.depth).toBe(1);
    expect(result.mark).toBe(1);
  });
});
