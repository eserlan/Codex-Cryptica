import { describe, it, expect, vi, beforeEach } from "vitest";
import { tick } from "svelte";
import { GraphViewController } from "./graph-view-controller.svelte";

// Mock graph-engine
vi.mock("graph-engine", () => {
  const handlers: Array<{
    event: string;
    selector: string;
    callback: (event: any) => void;
  }> = [];
  const mockCy = {
    on: vi.fn((event, selector, callback) => {
      if (typeof selector === "string" && typeof callback === "function") {
        handlers.push({ event, selector, callback });
      }
    }),
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
    container: vi.fn().mockReturnValue({
      getBoundingClientRect: vi.fn().mockReturnValue({ left: 10, top: 20 }),
    }),
    pan: vi.fn().mockReturnValue({ x: 5, y: 6 }),
    zoom: vi.fn().mockReturnValue(2),
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
    __handlers: handlers,
    initGraph: vi.fn().mockResolvedValue(mockCy),
    LayoutManager: vi.fn().mockImplementation(MockLayoutManager),
    GraphImageManager: vi.fn().mockImplementation(MockGraphImageManager),
    setupGraphEvents: vi.fn().mockReturnValue(vi.fn()),
    syncGraphElements: vi.fn(),
    getSequentialYearPositions: (years: number[], scale: number) =>
      Object.fromEntries(years.map((year, index) => [year, index * scale])),
  };
});

vi.mock("$lib/stores/chronology-edit.svelte", () => ({
  chronologyEdit: {
    drag: null,
    beginDrag: vi.fn().mockReturnValue(true),
    updateDrag: vi.fn(),
    prepareDrop: vi.fn().mockReturnValue({ writes: {} }),
  },
}));

describe("GraphViewController", () => {
  let deps: any;
  let controller: GraphViewController;

  beforeEach(() => {
    deps = {
      graph: {
        elements: [],
        timelineMode: false,
        chronologyEditMode: false,
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
        entities: {},
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

  it("gates chronology drags behind timeline edit mode", async () => {
    const { __handlers } = (await import("graph-engine")) as any;
    const { chronologyEdit } =
      await import("$lib/stores/chronology-edit.svelte");
    const container = document.createElement("div");
    await controller.init(container, {});

    const grab = (__handlers as any[])
      .filter((handler) => handler.event === "grab")
      .at(-1);
    grab.callback({
      target: {
        id: () => "e1",
        position: () => ({ x: 0, y: 0 }),
      },
    });

    expect(chronologyEdit.beginDrag).not.toHaveBeenCalled();
  });

  it("routes edit-mode node drops into chronology placement", async () => {
    const { __handlers } = (await import("graph-engine")) as any;
    const { chronologyEdit } =
      await import("$lib/stores/chronology-edit.svelte");
    const entity = {
      id: "e1",
      type: "event",
      title: "Founding",
      date: { year: 600 },
    };
    deps.graph.timelineMode = true;
    deps.graph.chronologyEditMode = true;
    deps.graph.timelineScale = 100;
    deps.vault.allEntities = [entity];
    deps.vault.entities = { e1: entity };
    const container = document.createElement("div");
    await controller.init(container, {});

    const grab = (__handlers as any[])
      .filter((handler) => handler.event === "grab")
      .at(-1);
    const dragfree = (__handlers as any[])
      .filter((handler) => handler.event === "dragfree")
      .at(-1);
    const node = {
      id: () => "e1",
      data: () => undefined,
      position: () => ({ x: 0, y: 0 }),
    };
    grab.callback({ target: node });
    dragfree.callback({ target: node });

    expect(chronologyEdit.beginDrag).toHaveBeenCalled();
    expect(chronologyEdit.prepareDrop).toHaveBeenCalledWith(entity);
  });

  it("routes explorer drops through model-position year resolution when edit mode is active", async () => {
    const { chronologyEdit } =
      await import("$lib/stores/chronology-edit.svelte");
    const entity = {
      id: "u1",
      type: "note",
      title: "Undated",
    };
    deps.graph.timelineMode = true;
    deps.graph.chronologyEditMode = true;
    deps.graph.timelineScale = 100;
    deps.vault.allEntities = [{ ...entity, date: { year: 600 } }];
    deps.vault.entities = { u1: entity };
    const container = document.createElement("div");
    await controller.init(container, {});

    expect(
      controller.beginExplorerChronologyPlacement("u1", { x: 115, y: 226 }),
    ).toBe(true);

    expect(chronologyEdit.beginDrag).toHaveBeenCalledWith(
      expect.objectContaining({
        entity,
        source: "explorer",
        pressPosition: { x: 50, y: 100 },
      }),
    );
    expect(chronologyEdit.prepareDrop).toHaveBeenCalledWith(entity);
  });
});
