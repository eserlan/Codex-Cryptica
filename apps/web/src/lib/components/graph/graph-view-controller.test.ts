import { describe, it, expect, vi, beforeEach } from "vitest";
import { tick } from "svelte";
import {
  GraphViewController,
  resolveFocusDepth,
  FOCUS_ZOOM_STEP_FACTOR,
  type LoadPhase,
} from "./graph-view-controller.svelte";
import {
  clearSilhouetteCache,
  deriveEntityTypeTone,
  PIRATE_DARK,
} from "schema";
import { categories } from "$lib/stores/categories.svelte";
import {
  syncGraphElements,
  applyLargeGraphRenderHints,
  isLayoutCollinear,
  setupGraphEvents,
} from "graph-engine";

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
    stop: vi.fn(),
    center: vi.fn(),
    style: vi.fn(),
    destroyed: vi.fn().mockReturnValue(false),
    nodes: vi.fn().mockReturnValue({ length: 0, map: vi.fn(() => []) }),
    edges: vi.fn().mockReturnValue({ length: 0 }),
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

// A dark theme is what makes the per-type glyph colours diverge: on a light
// theme every type clears contrast against the theme primary already.
vi.mock("$lib/stores/theme.svelte", async () => {
  const { PIRATE_DARK: theme } = await import("schema");
  return { themeStore: { activeTheme: theme } };
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
        focusDepth: 1,
        focusRootId: null,
        focusViewActive: false,
      },
      vault: {
        isGuest: false,
        status: "idle",
        allEntities: [],
        releaseImageUrl: vi.fn(),
        resolveImageUrl: vi.fn(),
        batchUpdate: vi.fn(),
        graphStructureVersion: 0,
      },
      debugStore: {
        log: vi.fn(),
        error: vi.fn(),
      },
      layoutUIStore: {
        isMobile: false,
        setLastSelectedNodePosition: vi.fn(),
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

  it("suspends rendering work and resumes the latest graph state", async () => {
    const container = document.createElement("div");
    await controller.init(container, {});
    deps.graph.elements = [{ group: "nodes", data: { id: "node-1" } }];
    controller.syncElements();
    const staleOptions = vi.mocked(syncGraphElements).mock.calls.at(-1)?.[1];

    controller.setVisibilityInputs({
      documentVisible: true,
      surfaceCovered: true,
      containerIntersecting: true,
    });

    expect(controller.isSuspended).toBe(true);
    expect(controller.cy!.stop).toHaveBeenCalled();
    expect(controller.layoutManager!.stop).toHaveBeenCalled();
    vi.mocked(syncGraphElements).mockClear();
    const layoutSpy = vi.spyOn(controller, "applyCurrentLayout");
    staleOptions?.onLayoutUpdate?.({
      reason: "Elements Update",
      isForced: false,
    });
    expect(layoutSpy).not.toHaveBeenCalled();
    controller.syncElements();
    expect(syncGraphElements).not.toHaveBeenCalled();

    controller.setVisibilityInputs({
      documentVisible: true,
      surfaceCovered: false,
      containerIntersecting: true,
    });
    controller.syncElements();

    expect(controller.isSuspended).toBe(false);
    expect(controller.cy!.resize).toHaveBeenCalled();
    expect(layoutSpy).toHaveBeenCalledWith({
      reason: "Visibility Resume",
      viewport: "preserve",
    });
    expect(syncGraphElements).toHaveBeenCalled();
  });

  it("requests reinitialization when the preserved Cytoscape instance is invalid", async () => {
    const container = document.createElement("div");
    await controller.init(container, {});
    vi.mocked(controller.cy!.destroyed).mockReturnValueOnce(true);

    controller.setVisibilityInputs({
      documentVisible: false,
      surfaceCovered: false,
      containerIntersecting: true,
    });
    controller.setVisibilityInputs({
      documentVisible: true,
      surfaceCovered: false,
      containerIntersecting: true,
    });

    expect(controller.requiresReinitialization).toBe(true);
    expect(controller.consumeReinitializationRequest()).toBe(true);
  });

  it("should apply focus when selectedId changes", async () => {
    const container = document.createElement("div");
    await controller.init(container, {});

    const batchSpy = controller.cy!.batch;
    controller.applyFocus("node-1");

    expect(batchSpy).toHaveBeenCalled();
  });

  it("opens read-only edge details for guests", async () => {
    deps.vault.isGuest = true;
    const container = document.createElement("div");
    await controller.init(container, {});

    const handlers = vi.mocked(setupGraphEvents).mock.calls.at(-1)?.[1];
    handlers?.onEdgeTap?.({
      source: "node-a",
      target: "node-b",
      label: "Rivals in the old court",
      connectionType: "rivals_of",
    });

    expect(controller.editingEdge).toEqual({
      source: "node-a",
      target: "node-b",
      label: "Rivals in the old court",
      type: "rivals_of",
    });
  });

  it("suppresses mobile tap Zen Mode navigation after a context gesture", async () => {
    deps.layoutUIStore.isMobile = true;
    const container = document.createElement("div");
    await controller.init(container, {});

    const mockCy = controller.cy!;
    const scratchStore: Record<string, any> = {};
    mockCy.scratch = vi.fn((key: string, val?: any) => {
      if (val !== undefined) scratchStore[key] = val;
      return scratchStore[key];
    }) as any;
    mockCy.scratch("_lastCxtTap", Date.now());

    const mockNode = {
      id: () => "node-1",
      renderedPosition: () => ({ x: 10, y: 10 }),
      cy: () => mockCy,
      addClass: vi.fn(),
      removeClass: vi.fn(),
    } as any;

    const handlers = vi.mocked(setupGraphEvents).mock.calls.at(-1)?.[1];
    await handlers?.onNodeTap?.("node-1", mockNode);

    expect(deps.modalUIStore.openZenMode).not.toHaveBeenCalled();
  });

  it("opens Zen Mode on mobile node tap when cxttap did not recently occur", async () => {
    deps.layoutUIStore.isMobile = true;
    const container = document.createElement("div");
    await controller.init(container, {});

    const mockCy = controller.cy!;
    const scratchStore: Record<string, any> = {};
    mockCy.scratch = vi.fn((key: string, val?: any) => {
      if (val !== undefined) scratchStore[key] = val;
      return scratchStore[key];
    }) as any;
    mockCy.scratch("_lastCxtTap", 0);

    const mockNode = {
      id: () => "node-1",
      renderedPosition: () => ({ x: 10, y: 10 }),
      cy: () => mockCy,
      addClass: vi.fn(),
      removeClass: vi.fn(),
    } as any;

    const handlers = vi.mocked(setupGraphEvents).mock.calls.at(-1)?.[1];
    await handlers?.onNodeTap?.("node-1", mockNode);

    expect(deps.modalUIStore.openZenMode).toHaveBeenCalledWith("node-1");
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

    it("uses delta-only reconciliation for a stable-data focus transition", () => {
      deps.graph.focusViewActive = true;
      controller.loadPhase = "ready";
      controller.syncElements();
      vi.mocked(syncGraphElements).mockClear();

      deps.graph.focusDepth = 2;
      controller.syncElements();

      expect(syncGraphElements).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ focusMembershipOnly: true }),
      );
    });

    it("keeps full reconciliation when graph data changes with focus membership", () => {
      deps.graph.focusViewActive = true;
      controller.loadPhase = "ready";
      controller.syncElements();
      vi.mocked(syncGraphElements).mockClear();

      deps.graph.focusDepth = 2;
      deps.vault.graphStructureVersion = 1;
      controller.syncElements();

      expect(syncGraphElements).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ focusMembershipOnly: false }),
      );
    });

    it("ignores a stale sync layout callback after a newer focus transition", () => {
      controller.loadPhase = "ready";
      controller.syncElements();
      const staleOptions = vi.mocked(syncGraphElements).mock.calls[0][1];
      const layoutSpy = vi.spyOn(controller, "applyCurrentLayout");

      controller.syncElements();
      staleOptions.onLayoutUpdate?.({
        reason: "Elements Update",
        isForced: false,
        hasNewNodes: true,
        hasRemovedNodes: false,
      });

      expect(layoutSpy).not.toHaveBeenCalled();
    });

    it("preserves active focusDepthSpan when scheduling render-ready measurement and completes it on frame two", () => {
      deps.graph.focusViewActive = true;
      controller.loadPhase = "ready";

      const rafCallbacks: FrameRequestCallback[] = [];
      vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
        rafCallbacks.push(cb);
        return rafCallbacks.length;
      });

      // Trigger focus depth transition measurement
      deps.graph.focusDepth = 2;
      controller.syncElements();

      const focusSpan = (controller as any).focusDepthSpan;
      const renderReadySpan = (controller as any).renderReadySpan;

      expect(focusSpan).not.toBeNull();
      expect(renderReadySpan).not.toBeNull();

      const focusCancelSpy = vi.spyOn(focusSpan, "cancel");
      const focusCompleteSpy = vi.spyOn(focusSpan, "complete");
      const renderReadyCompleteSpy = vi.spyOn(renderReadySpan, "complete");

      // Verify clearRenderReadyMeasurement(false) called by scheduleRenderReadyMeasurement
      // does not cancel the active focusDepthSpan
      expect(focusCancelSpy).not.toHaveBeenCalled();

      // Advance through the two requestAnimationFrame cycles
      expect(rafCallbacks.length).toBe(1);
      rafCallbacks[0](16);
      expect(rafCallbacks.length).toBe(2);
      rafCallbacks[1](32);

      expect(renderReadyCompleteSpy).toHaveBeenCalled();
      expect(focusCompleteSpy).toHaveBeenCalled();
      expect((controller as any).focusDepthSpan).toBeNull();
      expect((controller as any).renderReadySpan).toBeNull();
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

    it("does not run slash recovery for a collinear rendered subset when full saved coords are healthy", async () => {
      vi.useFakeTimers();
      const container = document.createElement("div");
      await controller.init(container, {});
      const applySpy = vi.spyOn(controller, "applyCurrentLayout");
      const renderedNodes = {
        length: 20,
        map: vi.fn(() => [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
          { x: 2, y: 2 },
        ]),
      };
      (controller.cy as any).nodes = vi.fn().mockReturnValue(renderedNodes);
      vi.mocked(isLayoutCollinear).mockReturnValue(false);

      deps.vault.status = "idle";
      deps.vault.allEntities = [
        { id: "a", metadata: { coordinates: { x: 0, y: 0 } } },
        { id: "b", metadata: { coordinates: { x: 10, y: 40 } } },
        { id: "c", metadata: { coordinates: { x: 80, y: 20 } } },
      ];
      controller.loadPhase = "elements";

      controller.reconcileLoadState();
      applySpy.mockClear();
      await vi.advanceTimersByTimeAsync(2000);

      expect(applySpy).not.toHaveBeenCalledWith(
        expect.objectContaining({ reason: "Slash Recovery" }),
      );
      expect(renderedNodes.map).not.toHaveBeenCalled();
      vi.useRealTimers();
    });

    it("runs slash recovery when the full vault saved coords are degenerate", async () => {
      vi.useFakeTimers();
      const container = document.createElement("div");
      await controller.init(container, {});
      const applySpy = vi.spyOn(controller, "applyCurrentLayout");
      (controller.cy as any).nodes = vi
        .fn()
        .mockReturnValue({ length: 20, map: vi.fn(() => []) });
      vi.mocked(isLayoutCollinear).mockReturnValue(true);

      deps.vault.status = "idle";
      deps.vault.allEntities = [
        { id: "a", metadata: { coordinates: { x: 0, y: 0 } } },
        { id: "b", metadata: { coordinates: { x: 1, y: 1 } } },
        { id: "c", metadata: { coordinates: { x: 2, y: 2 } } },
      ];
      controller.loadPhase = "elements";

      controller.reconcileLoadState();
      applySpy.mockClear();
      await vi.advanceTimersByTimeAsync(2000);

      expect(applySpy).toHaveBeenCalledWith({
        reason: "Slash Recovery",
        isInitial: true,
        isForced: true,
        reseed: true,
      });
      vi.useRealTimers();
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

  describe("silhouette tinting (issue #2680)", () => {
    const ARTWORK =
      '<svg width="512" height="512" viewBox="0 0 512 512"><path fill="currentColor" d="M0 0h1v1H0z"/></svg>';

    beforeEach(() => {
      clearSilhouetteCache();
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => new Response(ARTWORK, { status: 200 })),
      );
    });

    it("paints no glyph when the artwork cannot be fetched", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => {
          throw new TypeError("Failed to fetch");
        }),
      );
      const options = await syncOptions();

      // Null, not a broken data URI: the ImageManager leaves the node
      // unstamped so a later sync retries once the network is back.
      await expect(
        options?.resolveSilhouetteUrl?.(node("location")),
      ).resolves.toBeNull();
    });

    const syncOptions = async () => {
      const container = document.createElement("div");
      await controller.init(container, {});
      deps.graph.elements = [
        { group: "nodes", data: { id: "node-1", type: "location" } },
      ];
      controller.syncImages();
      return vi.mocked(controller.imageManager!.sync).mock.calls.at(-1)?.[0];
    };

    const node = (type: string) => ({
      id: () => "node-1",
      data: () => ({ id: "node-1", type, label: "The Ashen Reach" }),
    });

    const glyphFor = (type: string) =>
      deriveEntityTypeTone(categories.getColor(type), PIRATE_DARK.tokens).glyph;

    it("fills a silhouette with its own type's glyph colour", async () => {
      const options = await syncOptions();

      // Artwork comes from R2, so resolving one is a fetch.
      const location = await options?.resolveSilhouetteUrl?.(node("location"));
      const character = await options?.resolveSilhouetteUrl?.(
        node("character"),
      );

      expect(location).toContain(encodeURIComponent(glyphFor("location")));
      expect(character).toContain(encodeURIComponent(glyphFor("character")));
      // A moss node needs a lighter glyph than the theme primary to clear 3:1;
      // the blue character tone does not, so it keeps the theme's own colour.
      expect(glyphFor("location")).not.toBe(PIRATE_DARK.tokens.primary);
      expect(glyphFor("character")).toBe(PIRATE_DARK.tokens.primary);
      expect(location).not.toBe(character);
    });

    it("keys the silhouette on the theme so a theme switch re-tints it", async () => {
      const options = await syncOptions();

      expect(options?.silhouetteVariant).toContain(PIRATE_DARK.id);
      expect(options?.silhouetteVariant).toContain(
        categories.getColor("location"),
      );
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
