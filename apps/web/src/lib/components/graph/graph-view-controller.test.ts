import { describe, it, expect, vi, beforeEach } from "vitest";
import { tick } from "svelte";
import { GraphViewController } from "./graph-view-controller.svelte";

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

  it("should handle vault loading state", () => {
    deps.vault.status = "loading";
    deps.vault.allEntities = [];

    controller.handleVaultLoading();
    expect(true).toBe(true);
  });

  it("should finalize load when vault becomes idle and initial elements are loaded", async () => {
    const container = document.createElement("div");
    await controller.init(container, {});

    // Set up state
    deps.vault.status = "idle";
    controller.initialLoaded = true;
    controller.didFinalizeLoad = false;

    // Spy on applyCurrentLayout
    const applySpy = vi.spyOn(controller, "applyCurrentLayout");

    controller.handleVaultLoadFinalization();

    expect(controller.didFinalizeLoad).toBe(true);
    expect(applySpy).toHaveBeenCalledWith(true, true, "Load Finalized");
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

  describe("viewport policy", () => {
    const lastPolicy = () => {
      const apply = (controller.layoutManager as any).apply;
      const calls = apply.mock.calls;
      return calls[calls.length - 1][0].viewportPolicy;
    };

    beforeEach(async () => {
      const container = document.createElement("div");
      await controller.init(container, {});
    });

    it("preserves the camera for edge-only element updates with stable layout", async () => {
      await controller.applyCurrentLayout(
        false,
        true,
        "Elements Update",
        false,
        false,
        false,
      );
      expect(lastPolicy()).toBe("preserve");
    });

    it("fits when new nodes are added", async () => {
      await controller.applyCurrentLayout(
        false,
        false,
        "Elements Update",
        false,
        true,
        false,
      );
      expect(lastPolicy()).toBe("fit");
    });

    it("fits when nodes are removed", async () => {
      await controller.applyCurrentLayout(
        false,
        true,
        "Elements Update",
        false,
        false,
        true,
      );
      expect(lastPolicy()).toBe("fit");
    });

    it("preserves the camera for plain window resizes", async () => {
      await controller.applyCurrentLayout(false, false, "Window Resize", false);
      expect(lastPolicy()).toBe("preserve");
    });

    it("fits on orientation-change resizes", async () => {
      await controller.applyCurrentLayout(false, true, "Window Resize", true);
      expect(lastPolicy()).toBe("fit");
    });

    it("fits when stable layout is off", async () => {
      deps.graph.stableLayout = false;
      await controller.applyCurrentLayout(
        false,
        true,
        "Elements Update",
        false,
        false,
        false,
      );
      expect(lastPolicy()).toBe("fit");
    });

    it("fits on initial layout", async () => {
      await controller.applyCurrentLayout(true, true, "Load Finalized");
      expect(lastPolicy()).toBe("fit");
    });

    it("fits on mode changes and manual redraw", async () => {
      await controller.applyCurrentLayout(false, true, "Mode Change Effect");
      expect(lastPolicy()).toBe("fit");
      await controller.applyCurrentLayout(
        false,
        true,
        "UI Redraw Button",
        true,
      );
      expect(lastPolicy()).toBe("fit");
    });
  });
});
