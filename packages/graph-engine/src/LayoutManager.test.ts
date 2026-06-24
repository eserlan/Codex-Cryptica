import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const originalWorker = globalThis.Worker;
import {
  getLayoutCollisionSize,
  isLayoutCollinear,
  LayoutManager,
  removeOverlaps,
  type LayoutRequest,
} from "./LayoutManager";
import type { Core } from "cytoscape";

// ─── Fake Worker ────────────────────────────────────────────────────────────────
let capturedPostMessage: any = null;

class FakeWorker {
  private messageListeners: Array<(e: any) => void> = [];

  postMessage(data: any) {
    capturedPostMessage = data;
    // Simulate async response with empty positions
    Promise.resolve().then(() => {
      const event = { data: { jobId: data.jobId, positions: {} } };
      this.messageListeners.forEach((cb) => cb(event));
    });
  }

  addEventListener(type: string, cb: (e: any) => void) {
    if (type === "message") this.messageListeners.push(cb);
  }

  removeEventListener(_type: string, cb: (e: any) => void) {
    this.messageListeners = this.messageListeners.filter((l) => l !== cb);
  }

  terminate() {}
}

class ErrorWorker {
  private errorListeners: Array<(e: any) => void> = [];

  postMessage(data: any) {
    capturedPostMessage = data;
    Promise.resolve().then(() => {
      this.errorListeners.forEach((cb) => cb(new Error("worker failed")));
    });
  }

  addEventListener(type: string, cb: (e: any) => void) {
    if (type === "error") this.errorListeners.push(cb);
  }

  removeEventListener(_type: string, cb: (e: any) => void) {
    this.errorListeners = this.errorListeners.filter((l) => l !== cb);
  }

  terminate() {}
}

class SilentWorker {
  postMessage(data: any) {
    capturedPostMessage = data;
  }

  addEventListener() {}

  removeEventListener() {}

  terminate() {}
}

// ─── Node factory ───────────────────────────────────────────────────────────────
function makeNodes(positions: Array<{ x: number; y: number }> = []) {
  return positions.map((pos, i) => ({
    position: vi.fn().mockReturnValue(pos),
    data: vi.fn().mockReturnValue({}),
    id: vi.fn().mockReturnValue(String(i + 1)),
    addClass: vi.fn(),
    removeClass: vi.fn(),
    width: vi.fn().mockReturnValue(60),
    height: vi.fn().mockReturnValue(60),
    length: 1,
  }));
}

describe("LayoutManager", () => {
  let mockCy: any;
  let layoutManager: LayoutManager;

  beforeEach(() => {
    capturedPostMessage = null;
    (globalThis as any).Worker = FakeWorker as any;

    const emptyCollection: any = {
      nonempty: vi.fn().mockReturnValue(false),
      forEach: vi.fn(),
      removeClass: vi.fn(),
      filter: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      length: 0,
    };

    const twoNodes = makeNodes([
      { x: 10, y: 10 },
      { x: 30, y: 30 },
    ]);
    // Cytoscape collections returned by cy.nodes() need these in the fit-only path
    (twoNodes as any).removeData = vi.fn();
    (twoNodes as any).removeClass = vi.fn();
    (twoNodes as any).nonempty = vi.fn().mockReturnValue(true);
    (twoNodes as any).not = vi.fn().mockReturnValue(emptyCollection);

    mockCy = {
      destroyed: vi.fn().mockReturnValue(false),
      resize: vi.fn(),
      batch: vi.fn((cb) => cb()),
      nodes: vi
        .fn()
        .mockImplementation((selector?: string) =>
          selector === ".pending-layout" ? emptyCollection : twoNodes,
        ),
      edges: vi.fn().mockReturnValue([]),
      $id: vi.fn().mockReturnValue({ length: 0 }),
      width: vi.fn().mockReturnValue(1000),
      height: vi.fn().mockReturnValue(800),
      fit: vi.fn(),
      stop: vi.fn(),
      animate: vi.fn((animationOptions?: { complete?: () => void }) => {
        animationOptions?.complete?.();
      }),
      elements: vi.fn().mockReturnValue([]),
    };
    layoutManager = new LayoutManager(mockCy as unknown as Core);
  });

  afterEach(() => {
    vi.useRealTimers();
    (globalThis as any).Worker = originalWorker;
  });

  it("should initialize with a cy instance", () => {
    expect(layoutManager).toBeDefined();
  });

  it("should seed fresh positions when exiting a mode", async () => {
    const persistedPositions = [
      { x: -4000, y: 100 },
      { x: 4000, y: -100 },
    ];
    mockCy.nodes.mockReturnValue(makeNodes(persistedPositions));

    await layoutManager.apply(
      {
        reason: "Mode Change Effect",
        isInitial: false,
        isForced: false,
      },
      {
        timelineMode: false,
        timelineAxis: "x",
        timelineScale: 1,
        orbitMode: false,
        centralNodeId: null,
        stableLayout: true,
        isGuest: false,
      },
    );

    expect(capturedPostMessage?.options.randomize).toBe(true);
    expect(capturedPostMessage?.nodes[0].position).not.toEqual(
      persistedPositions[0],
    );
  });

  it("heals a degenerate slash on a non-initial pass by forcing randomize", async () => {
    // 15 nodes collapsed onto y = x (a persisted diagonal). A non-initial
    // Elements Update would normally solve incrementally (randomize=false) and
    // preserve the slash; the collinearity heal must force a randomized solve.
    const diagonal = Array.from({ length: 15 }, (_, i) => ({
      x: i * 50,
      y: i * 50,
    }));
    mockCy.nodes.mockReturnValue(makeNodes(diagonal));

    await layoutManager.apply(
      {
        reason: "Elements Update",
        isInitial: false,
        isForced: true,
        hasNewNodes: true,
      },
      {
        timelineMode: false,
        timelineAxis: "x",
        timelineScale: 1,
        orbitMode: false,
        centralNodeId: null,
        stableLayout: false,
        isGuest: false,
      },
    );

    expect(capturedPostMessage?.options.randomize).toBe(true);
  });

  it("persists a non-initial heal with the healed flag set", async () => {
    const onPositionsUpdated = vi.fn();
    const diagonal = Array.from({ length: 15 }, (_, i) => ({
      x: i * 50,
      y: i * 50,
    }));
    mockCy.nodes.mockReturnValue(makeNodes(diagonal));

    await layoutManager.apply(
      {
        reason: "Elements Update",
        isInitial: false,
        isForced: true,
        hasNewNodes: true,
      },
      {
        timelineMode: false,
        timelineAxis: "x",
        timelineScale: 1,
        orbitMode: false,
        centralNodeId: null,
        stableLayout: false,
        isGuest: false,
        onPositionsUpdated,
      },
    );

    expect(onPositionsUpdated).toHaveBeenCalledWith(expect.any(Object), {
      healed: true,
    });
  });

  it("should use fit-only when stableLayout is true, even with new nodes", async () => {
    const currentPositions = [
      { x: 100, y: 100 },
      { x: 200, y: 200 },
    ];
    const emptyPending: any = {
      nonempty: vi.fn().mockReturnValue(false),
      forEach: vi.fn(),
      removeClass: vi.fn(),
      filter: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      length: 0,
    };
    const nodes = makeNodes(currentPositions);
    (nodes as any).removeData = vi.fn();
    (nodes as any).removeClass = vi.fn();
    (nodes as any).nonempty = vi.fn().mockReturnValue(true);
    (nodes as any).not = vi.fn().mockReturnValue(emptyPending);
    mockCy.nodes.mockImplementation((selector?: string) =>
      selector === ".pending-layout" ? emptyPending : nodes,
    );

    await layoutManager.apply(
      {
        reason: "Elements Update",
        isInitial: false,
        isForced: false,
        reseed: false,
        hasNewNodes: true,
      },
      {
        timelineMode: false,
        timelineAxis: "x",
        timelineScale: 1,
        orbitMode: false,
        centralNodeId: null,
        stableLayout: true,
        isGuest: false,
      },
    );

    // stableLayout=true → fit-only; worker must NOT be called
    expect(capturedPostMessage).toBeNull();
    expect(mockCy.animate).toHaveBeenCalled();
  });

  it("should keep the camera still for preserve-policy stable updates", async () => {
    const onLayoutStop = vi.fn();

    await layoutManager.apply(
      {
        reason: "Elements Update",
        isInitial: false,
        isForced: true,
      },
      {
        timelineMode: false,
        timelineAxis: "x",
        timelineScale: 1,
        orbitMode: false,
        centralNodeId: null,
        stableLayout: true,
        isGuest: false,
        viewportPolicy: "preserve",
        onLayoutStop,
      },
    );

    // fit-only path with preserve policy: no worker, no fit animation, and
    // any in-flight viewport animation is halted
    expect(capturedPostMessage).toBeNull();
    expect(mockCy.animate).not.toHaveBeenCalled();
    expect(mockCy.fit).not.toHaveBeenCalled();
    expect(mockCy.stop).toHaveBeenCalled();
    expect(onLayoutStop).toHaveBeenCalledTimes(1);
  });

  it("should still fit when viewportPolicy is fit on the stable path", async () => {
    await layoutManager.apply(
      {
        reason: "Elements Update",
        isInitial: false,
        isForced: false,
      },
      {
        timelineMode: false,
        timelineAxis: "x",
        timelineScale: 1,
        orbitMode: false,
        centralNodeId: null,
        stableLayout: true,
        isGuest: false,
        viewportPolicy: "fit",
      },
    );

    expect(mockCy.animate).toHaveBeenCalled();
  });

  it("should use lower gravity in landscape view", async () => {
    mockCy.width.mockReturnValue(1200);
    mockCy.height.mockReturnValue(800); // AR = 1.5 (Landscape)

    await layoutManager.apply(
      { reason: "unknown" },
      {
        timelineMode: false,
        timelineAxis: "x",
        timelineScale: 1,
        orbitMode: false,
        centralNodeId: null,
        stableLayout: false,
        isGuest: false,
      },
    );

    expect(capturedPostMessage?.options.gravity).toBeLessThanOrEqual(0.12);
  });

  it("should use higher gravity in portrait view", async () => {
    mockCy.width.mockReturnValue(800);
    mockCy.height.mockReturnValue(1200); // AR = 0.66 (Portrait)

    await layoutManager.apply(
      { reason: "unknown" },
      {
        timelineMode: false,
        timelineAxis: "x",
        timelineScale: 1,
        orbitMode: false,
        centralNodeId: null,
        stableLayout: false,
        isGuest: false,
      },
    );

    expect(capturedPostMessage?.options.gravity).toBeGreaterThan(0.005);
  });

  it("should give force layouts room to spread out", async () => {
    await layoutManager.apply(
      { reason: "unknown" },
      {
        timelineMode: false,
        timelineAxis: "x",
        timelineScale: 1,
        orbitMode: false,
        centralNodeId: null,
        stableLayout: false,
        isGuest: false,
      },
    );

    expect(capturedPostMessage?.options.boundingBox).toEqual({
      x1: -2400,
      y1: -2400,
      x2: 2400,
      y2: 2400,
    });
  });

  it("should use fit-only for forced updates when stableLayout is true", async () => {
    await layoutManager.apply(
      {
        reason: "External Update",
        isInitial: false,
        isForced: true,
        reseed: true,
      },
      {
        timelineMode: false,
        timelineAxis: "x",
        timelineScale: 1,
        orbitMode: false,
        centralNodeId: null,
        stableLayout: true,
        isGuest: false,
      },
    );
    // stableLayout=true + non-redraw forced update → fit-only; worker must NOT be called
    expect(capturedPostMessage).toBeNull();
    expect(mockCy.animate).toHaveBeenCalled();
  });

  it("should randomize when the UI redraw button requests a fresh solve", async () => {
    await layoutManager.apply(
      {
        reason: "UI Redraw Button",
        isInitial: false,
        isForced: true,
        reseed: true,
      },
      {
        timelineMode: false,
        timelineAxis: "x",
        timelineScale: 1,
        orbitMode: false,
        centralNodeId: null,
        stableLayout: true,
        isGuest: false,
      },
    );
    expect(capturedPostMessage?.options.randomize).toBe(true);
    expect(capturedPostMessage?.nodes[0].position).not.toEqual({
      x: 10,
      y: 10,
    });
  });

  it("should randomize when stableLayout is off and randomizeForced is true", async () => {
    await layoutManager.apply(
      {
        reason: "UI Redraw Button",
        isInitial: false,
        isForced: true,
        reseed: true,
      },
      {
        timelineMode: false,
        timelineAxis: "x",
        timelineScale: 1,
        orbitMode: false,
        centralNodeId: null,
        stableLayout: false,
        isGuest: false,
      },
    );
    expect(capturedPostMessage?.options.randomize).toBe(true);
    expect(capturedPostMessage?.nodes[0].position).not.toEqual({
      x: 10,
      y: 10,
    });
  });

  it("should seed randomized worker layouts away from persisted positions", async () => {
    const persistedPositions = [
      { x: -4000, y: 100 },
      { x: 4000, y: -100 },
    ];
    mockCy.nodes.mockReturnValue(makeNodes(persistedPositions));

    await layoutManager.apply(
      {
        reason: "UI Redraw Button",
        isInitial: false,
        isForced: true,
        reseed: true,
      },
      {
        timelineMode: false,
        timelineAxis: "x",
        timelineScale: 1,
        orbitMode: false,
        centralNodeId: null,
        stableLayout: true,
        isGuest: false,
      },
    );

    expect(capturedPostMessage?.nodes[0].position).not.toEqual(
      persistedPositions[0],
    );
    expect(capturedPostMessage?.nodes[1].position).not.toEqual(
      persistedPositions[1],
    );
  });

  it("should give connected hubs a larger layout collision box", async () => {
    const nodes = makeNodes([
      { x: 10, y: 10 },
      { x: 30, y: 30 },
      { x: 50, y: 50 },
    ]);
    mockCy.nodes.mockReturnValue(nodes);
    mockCy.edges.mockReturnValue([
      {
        data: vi.fn().mockReturnValue({}),
        id: vi.fn().mockReturnValue("e1"),
        source: vi.fn().mockReturnValue({ id: vi.fn().mockReturnValue("1") }),
        target: vi.fn().mockReturnValue({ id: vi.fn().mockReturnValue("2") }),
      },
      {
        data: vi.fn().mockReturnValue({}),
        id: vi.fn().mockReturnValue("e2"),
        source: vi.fn().mockReturnValue({ id: vi.fn().mockReturnValue("1") }),
        target: vi.fn().mockReturnValue({ id: vi.fn().mockReturnValue("3") }),
      },
    ]);

    await layoutManager.apply(
      { reason: "unknown" },
      {
        timelineMode: false,
        timelineAxis: "x",
        timelineScale: 1,
        orbitMode: false,
        centralNodeId: null,
        stableLayout: false,
        isGuest: false,
      },
    );

    expect(capturedPostMessage?.nodes[0].data._w).toBeGreaterThan(
      capturedPostMessage?.nodes[1].data._w,
    );
    expect(capturedPostMessage?.nodes[0].data._degree).toBe(2);
    expect(capturedPostMessage?.options.gravity).toBeLessThan(0.05);
    expect(capturedPostMessage?.nodes[0].actualW).toBe(60);
  });

  it("should call resize on apply", async () => {
    await layoutManager.apply(
      { reason: "unknown" },
      {
        timelineMode: false,
        timelineAxis: "x",
        timelineScale: 1,
        orbitMode: false,
        centralNodeId: null,
        stableLayout: false,
        isGuest: true,
      },
    );
    expect(mockCy.resize).toHaveBeenCalled();
  });

  it("should stop redraw when the fit animation completes", async () => {
    const onLayoutStop = vi.fn();

    await layoutManager.apply(
      { reason: "unknown" },
      {
        timelineMode: false,
        timelineAxis: "x",
        timelineScale: 1,
        orbitMode: false,
        centralNodeId: null,
        stableLayout: false,
        isGuest: false,
        onLayoutStop,
      },
    );

    expect(mockCy.animate).toHaveBeenCalled();
    expect(onLayoutStop).toHaveBeenCalledTimes(1);
  });

  it("should stop redraw even when the fit animation completion is missed", async () => {
    const originalSetTimeout = globalThis.setTimeout;
    try {
      (globalThis as any).setTimeout = (cb: () => void, ms: number) => {
        if (ms === 1200) {
          return originalSetTimeout(cb, 5);
        }
        return originalSetTimeout(cb, ms);
      };

      mockCy.animate.mockImplementation(() => {});
      const onLayoutStop = vi.fn();

      await layoutManager.apply(
        { reason: "unknown" },
        {
          timelineMode: false,
          timelineAxis: "x",
          timelineScale: 1,
          orbitMode: false,
          centralNodeId: null,
          stableLayout: false,
          isGuest: false,
          onLayoutStop,
        },
      );

      expect(onLayoutStop).not.toHaveBeenCalled();
      await new Promise((resolve) => originalSetTimeout(resolve, 10));
      expect(onLayoutStop).toHaveBeenCalledTimes(1);
    } finally {
      globalThis.setTimeout = originalSetTimeout;
    }
  });

  it("should stop redraw if the worker errors", async () => {
    (globalThis as any).Worker = ErrorWorker as any;
    layoutManager = new LayoutManager(mockCy as unknown as Core);
    const onLayoutStop = vi.fn();

    await layoutManager.apply(
      { reason: "unknown" },
      {
        timelineMode: false,
        timelineAxis: "x",
        timelineScale: 1,
        orbitMode: false,
        centralNodeId: null,
        stableLayout: false,
        isGuest: false,
        onLayoutStop,
      },
    );

    expect(mockCy.animate).not.toHaveBeenCalled();
    expect(onLayoutStop).toHaveBeenCalledTimes(1);
  });

  it("should stop redraw if the worker never replies", async () => {
    const originalSetTimeout = globalThis.setTimeout;
    try {
      (globalThis as any).setTimeout = (cb: () => void, ms: number) => {
        if (ms === 15000) {
          return originalSetTimeout(cb, 5);
        }
        return originalSetTimeout(cb, ms);
      };

      (globalThis as any).Worker = SilentWorker as any;
      layoutManager = new LayoutManager(mockCy as unknown as Core);
      const onLayoutStop = vi.fn();

      const applyPromise = layoutManager.apply(
        { reason: "unknown" },
        {
          timelineMode: false,
          timelineAxis: "x",
          timelineScale: 1,
          orbitMode: false,
          centralNodeId: null,
          stableLayout: false,
          isGuest: false,
          onLayoutStop,
        },
      );

      await new Promise((resolve) => originalSetTimeout(resolve, 10));
      await applyPromise;

      expect(mockCy.animate).not.toHaveBeenCalled();
      expect(onLayoutStop).toHaveBeenCalledTimes(1);
    } finally {
      globalThis.setTimeout = originalSetTimeout;
    }
  });

  it("should stop redraw when an in-flight worker is stopped", async () => {
    (globalThis as any).Worker = SilentWorker as any;
    layoutManager = new LayoutManager(mockCy as unknown as Core);
    const onLayoutStop = vi.fn();

    const applyPromise = layoutManager.apply(
      { reason: "unknown" },
      {
        timelineMode: false,
        timelineAxis: "x",
        timelineScale: 1,
        orbitMode: false,
        centralNodeId: null,
        stableLayout: false,
        isGuest: false,
        onLayoutStop,
      },
    );

    layoutManager.stop();
    await applyPromise;

    expect(mockCy.animate).not.toHaveBeenCalled();
    expect(onLayoutStop).toHaveBeenCalledTimes(1);
  });

  it("should fit nodes if isGuest and isInitial", async () => {
    await layoutManager.apply(
      {
        reason: "unknown",
        isInitial: true,
      },
      {
        timelineMode: false,
        timelineAxis: "x",
        timelineScale: 1,
        orbitMode: false,
        centralNodeId: null,
        stableLayout: false,
        isGuest: true,
      },
    );
    expect(mockCy.fit).toHaveBeenCalled();
  });

  it("enforces minimum zoom on mobile when fit result zoom is too small", async () => {
    mockCy.zoom = vi.fn().mockReturnValue(0.3);
    mockCy.center = vi.fn();

    await layoutManager.apply(
      {
        reason: "unknown",
        isInitial: true,
      },
      {
        timelineMode: false,
        timelineAxis: "x",
        timelineScale: 1,
        orbitMode: false,
        centralNodeId: null,
        stableLayout: false,
        isGuest: true,
        isMobile: true,
      },
    );

    expect(mockCy.fit).toHaveBeenCalled();
    expect(mockCy.zoom).toHaveBeenCalledWith({
      level: 0.6,
      renderedPosition: {
        x: mockCy.width() / 2,
        y: mockCy.height() / 2,
      },
    });
    expect(mockCy.center).toHaveBeenCalled();
  });

  it("should emit positions in the schema-compliant nested format", async () => {
    const onPositionsUpdated = vi.fn();
    const mockWorkerResult = {
      "1": { metadata: { coordinates: { x: 50, y: 50 } } },
    };

    const node1 = {
      position: vi.fn().mockReturnValue({ x: 10, y: 10 }),
      id: vi.fn().mockReturnValue("1"),
      width: vi.fn().mockReturnValue(60),
      height: vi.fn().mockReturnValue(60),
      data: vi.fn().mockReturnValue({ id: "1" }),
      length: 1,
      removeData: vi.fn(),
      removeClass: vi.fn(),
    };
    const node2 = {
      position: vi.fn().mockReturnValue({ x: 30, y: 30 }),
      id: vi.fn().mockReturnValue("2"),
      width: vi.fn().mockReturnValue(60),
      height: vi.fn().mockReturnValue(60),
      data: vi.fn().mockReturnValue({ id: "2" }),
      length: 1,
      removeData: vi.fn(),
      removeClass: vi.fn(),
    };
    mockCy.nodes.mockReturnValue([node1, node2]);
    mockCy.$id.mockImplementation((id: string) => {
      if (id === "1") return node1;
      if (id === "2") return node2;
      return { length: 0 };
    });

    // Override FakeWorker to return our specific format
    class FormatWorker extends FakeWorker {
      postMessage(data: any) {
        Promise.resolve().then(() => {
          const event = {
            data: { jobId: data.jobId, positions: mockWorkerResult },
          };
          (this as any).messageListeners.forEach((cb: any) => cb(event));
        });
      }
    }
    (globalThis as any).Worker = FormatWorker as any;
    layoutManager = new LayoutManager(mockCy as unknown as Core);

    await layoutManager.apply(
      { reason: "unknown" },
      {
        timelineMode: false,
        timelineAxis: "x",
        timelineScale: 1,
        orbitMode: false,
        centralNodeId: null,
        stableLayout: false,
        isGuest: false,
        onPositionsUpdated,
      },
    );

    expect(onPositionsUpdated).toHaveBeenCalledWith(
      expect.objectContaining({
        "1": expect.objectContaining({
          metadata: expect.objectContaining({
            coordinates: expect.any(Object),
          }),
        }),
      }),
      { healed: false },
    );
    expect(node1.position).toHaveBeenCalledWith({ x: 50, y: 50 });
  });

  // ─── needsSolve / unplaced-node checks ─────────────────────────────────────

  it("runs a real force layout on initial load when every node is unplaced", async () => {
    // All nodes have .pending-layout (pendingCount === total) — fresh vault
    const pendingNodes = makeNodes([
      { x: 10, y: 20 },
      { x: 30, y: 40 },
    ]);
    (pendingNodes as any).length = 2;
    (pendingNodes as any).removeData = vi.fn();
    (pendingNodes as any).removeClass = vi.fn();
    (pendingNodes as any).nonempty = vi.fn().mockReturnValue(true);
    (pendingNodes as any).not = vi.fn().mockReturnValue({
      nonempty: vi.fn().mockReturnValue(false),
      forEach: vi.fn(),
      length: 0,
    });

    mockCy.nodes.mockImplementation((selector?: string) =>
      selector === ".pending-layout" ? pendingNodes : pendingNodes,
    );

    await layoutManager.apply(
      {
        reason: "unknown",
        isInitial: true,
      },
      {
        timelineMode: false,
        timelineAxis: "x",
        timelineScale: 1,
        orbitMode: false,
        centralNodeId: null,
        stableLayout: true,
        isGuest: false,
      },
    );

    // Force layout path must be taken — worker receives a postMessage
    expect(capturedPostMessage).not.toBeNull();
  });

  it("keeps fit-only on initial load when nodes already have saved positions", async () => {
    // No .pending-layout nodes; positions are spread (not at origin)
    const placedNodes = makeNodes([
      { x: 100, y: 200 },
      { x: 300, y: 400 },
    ]);
    (placedNodes as any).length = 2;
    (placedNodes as any).removeData = vi.fn();
    (placedNodes as any).removeClass = vi.fn();
    (placedNodes as any).nonempty = vi.fn().mockReturnValue(true);
    const emptyPending: any = {
      nonempty: vi.fn().mockReturnValue(false),
      forEach: vi.fn(),
      removeClass: vi.fn(),
      filter: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      length: 0,
    };
    (placedNodes as any).not = vi.fn().mockReturnValue(emptyPending);

    mockCy.nodes.mockImplementation((selector?: string) =>
      selector === ".pending-layout" ? emptyPending : placedNodes,
    );

    capturedPostMessage = null;
    await layoutManager.apply(
      {
        reason: "unknown",
        isInitial: true,
      },
      {
        timelineMode: false,
        timelineAxis: "x",
        timelineScale: 1,
        orbitMode: false,
        centralNodeId: null,
        stableLayout: true,
        isGuest: false,
      },
    );

    // Fit-only path: no worker call
    expect(capturedPostMessage).toBeNull();
    expect(mockCy.animate).toHaveBeenCalled();
  });

  it("runs a real force layout when all nodes are at origin with valid coords (no pending-layout class)", async () => {
    // Legacy vault: all nodes saved at (0,0) — hasValidCoords path in transformer
    // means they get placed at origin WITHOUT .pending-layout, so pendingCount===0
    // but nodesAtOrigin===total. The origin check must catch this.
    const originNodes = makeNodes([
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ]);
    (originNodes as any).length = 2;
    (originNodes as any).removeData = vi.fn();
    (originNodes as any).removeClass = vi.fn();
    (originNodes as any).nonempty = vi.fn().mockReturnValue(true);
    const emptyPending: any = {
      nonempty: vi.fn().mockReturnValue(false),
      forEach: vi.fn(),
      removeClass: vi.fn(),
      filter: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      length: 0, // pendingCount === 0
    };
    (originNodes as any).not = vi.fn().mockReturnValue(emptyPending);

    mockCy.nodes.mockImplementation((selector?: string) =>
      selector === ".pending-layout" ? emptyPending : originNodes,
    );

    capturedPostMessage = null;
    await layoutManager.apply(
      {
        reason: "unknown",
        isInitial: true,
      },
      {
        timelineMode: false,
        timelineAxis: "x",
        timelineScale: 1,
        orbitMode: false,
        centralNodeId: null,
        stableLayout: true,
        isGuest: false,
      },
    );

    // Origin check must trigger force layout even though pendingCount === 0
    expect(capturedPostMessage).not.toBeNull();
    expect(capturedPostMessage.options.randomize).toBe(true);
  });

  describe("LayoutRequest call shape (T9 dual-run)", () => {
    const baseOptions = {
      timelineMode: false,
      timelineAxis: "x" as const,
      timelineScale: 1,
      orbitMode: false,
      centralNodeId: null,
      stableLayout: true,
      isGuest: false,
    };

    it("accepts LayoutRequest and dispatches to force layout when reason triggers randomize", async () => {
      // "Mode Change Effect" sets randomize=true → bypasses fit-only → hits worker
      const req: LayoutRequest = {
        reason: "Mode Change Effect",
        isForced: true,
      };
      await layoutManager.apply(req, {
        ...baseOptions,
        timelineMode: false,
        orbitMode: false,
      });
      expect(capturedPostMessage).not.toBeNull();
    });

    it("accepts LayoutRequest and dispatches to fit-only path for stable incremental updates", async () => {
      const onStop = vi.fn();
      const req: LayoutRequest = { reason: "Elements Update" };
      await layoutManager.apply(req, { ...baseOptions, onLayoutStop: onStop });
      // fit-only: no worker message, animate fires (cy.animate mock calls complete)
      expect(capturedPostMessage).toBeNull();
    });

    it("reseed=true forces randomize regardless of stable layout", async () => {
      const req: LayoutRequest = {
        reason: "UI Redraw Button",
        reseed: true,
        isForced: true,
      };
      await layoutManager.apply(req, baseOptions);
      expect(capturedPostMessage?.options.randomize).toBe(true);
    });

    it("viewport override is applied to options", async () => {
      const onStop = vi.fn();
      const req: LayoutRequest = {
        reason: "Elements Update",
        viewport: "preserve",
      };
      await layoutManager.apply(req, { ...baseOptions, onLayoutStop: onStop });
      // preserve path: no worker message fired (fit-only), onStop called via cy.stop()
      expect(capturedPostMessage).toBeNull();
      expect(mockCy.stop).toHaveBeenCalled();
    });
  });
});

describe("getLayoutCollisionSize", () => {
  it("keeps isolated nodes at their visual size", () => {
    expect(getLayoutCollisionSize(60, 80, 0)).toEqual({
      width: 60,
      height: 80,
    });
  });

  it("adds bounded breathing room for high-degree nodes", () => {
    const medium = getLayoutCollisionSize(60, 60, 4);
    const large = getLayoutCollisionSize(60, 60, 100);

    expect(medium.width).toBeGreaterThan(60);
    expect(large.width).toBe(112);
  });
});

describe("removeOverlaps", () => {
  function makeNode(x: number, y: number, size: number) {
    let pos = { x, y };
    return {
      position: vi.fn((newPos?: { x: number; y: number }) => {
        if (newPos) pos = newPos;
        return pos;
      }),
      width: vi.fn().mockReturnValue(size),
    };
  }

  function makeCy(nodes: any[]) {
    return {
      nodes: vi
        .fn()
        .mockReturnValue(Object.assign(nodes, { length: nodes.length })),
      batch: vi.fn((cb: () => void) => cb()),
    } as any;
  }

  it("should not move non-overlapping nodes", () => {
    const n1 = makeNode(0, 0, 40);
    const n2 = makeNode(100, 0, 40);
    const cy = makeCy([n1, n2]);
    removeOverlaps(cy);
    expect(n1.position()).toEqual({ x: 0, y: 0 });
    expect(n2.position()).toEqual({ x: 100, y: 0 });
  });

  it("should push apart two overlapping nodes", () => {
    // Two 40px-diameter nodes 10px apart (need 40+10=50 apart)
    const n1 = makeNode(0, 0, 40);
    const n2 = makeNode(10, 0, 40);
    const cy = makeCy([n1, n2]);
    removeOverlaps(cy, 10);
    const p1 = n1.position();
    const p2 = n2.position();
    const dist = Math.abs(p2.x - p1.x);
    expect(dist).toBeGreaterThanOrEqual(50);
  });

  it("should handle nodes at identical positions without NaN", () => {
    const n1 = makeNode(0, 0, 40);
    const n2 = makeNode(0, 0, 40);
    const cy = makeCy([n1, n2]);
    removeOverlaps(cy, 10);
    const p1 = n1.position();
    const p2 = n2.position();
    expect(isNaN(p1.x)).toBe(false);
    expect(isNaN(p2.x)).toBe(false);
  });

  it("should converge (no overlaps remain) after running", () => {
    // Three nodes all at the same spot
    const padding = 8;
    const epsilon = 0.01;
    const nodes = [makeNode(5, 5, 30), makeNode(5, 5, 30), makeNode(5, 5, 30)];
    const cy = makeCy(nodes);
    removeOverlaps(cy, padding, 100);
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const p1 = nodes[i].position();
        const p2 = nodes[j].position();
        const minDist = nodes[i].width() / 2 + nodes[j].width() / 2 + padding;
        const dist = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
        expect(dist).toBeGreaterThanOrEqual(minDist - epsilon);
      }
    }
  });
});

describe("isLayoutCollinear", () => {
  const diagonal = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ x: i * 50, y: i * 50 + 1 }));

  it("flags a degenerate y≈x diagonal slash", () => {
    expect(isLayoutCollinear(diagonal(40))).toBe(true);
  });

  it("flags a near-collinear slash with slight jitter", () => {
    const pts = Array.from({ length: 40 }, (_, i) => ({
      x: i * 50,
      y: i * 50 + (i % 2 === 0 ? 3 : -3),
    }));
    expect(isLayoutCollinear(pts)).toBe(true);
  });

  it("flags a vertical line (not just y=x)", () => {
    const pts = Array.from({ length: 40 }, (_, i) => ({ x: 5, y: i * 50 }));
    expect(isLayoutCollinear(pts)).toBe(true);
  });

  it("does not flag a healthy 2D spread", () => {
    const pts = Array.from({ length: 40 }, (_, i) => ({
      x: Math.cos(i) * 500,
      y: Math.sin(i * 1.3) * 500,
    }));
    expect(isLayoutCollinear(pts)).toBe(false);
  });

  it("ignores small graphs that may legitimately be collinear", () => {
    expect(isLayoutCollinear(diagonal(5))).toBe(false);
  });

  it("returns false for an all-coincident cloud (handled by all-at-origin path)", () => {
    const pts = Array.from({ length: 40 }, () => ({ x: 0, y: 0 }));
    expect(isLayoutCollinear(pts)).toBe(false);
  });
});
