import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getLayoutCollisionSize,
  LayoutManager,
  removeOverlaps,
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
    vi.stubGlobal("Worker", FakeWorker);

    const twoNodes = makeNodes([
      { x: 10, y: 10 },
      { x: 30, y: 30 },
    ]);

    mockCy = {
      destroyed: vi.fn().mockReturnValue(false),
      resize: vi.fn(),
      batch: vi.fn((cb) => cb()),
      nodes: vi.fn().mockReturnValue(twoNodes),
      edges: vi.fn().mockReturnValue([]),
      $id: vi.fn().mockReturnValue({ length: 0 }),
      width: vi.fn().mockReturnValue(1000),
      height: vi.fn().mockReturnValue(800),
      fit: vi.fn(),
      animate: vi.fn((animationOptions?: { complete?: () => void }) => {
        animationOptions?.complete?.();
      }),
      elements: vi.fn().mockReturnValue([]),
    };
    layoutManager = new LayoutManager(mockCy as unknown as Core);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
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
        timelineMode: false,
        timelineAxis: "x",
        timelineScale: 1,
        orbitMode: false,
        centralNodeId: null,
        stableLayout: true,
        isGuest: false,
      },
      false,
      false,
      "Mode Change Effect",
    );

    expect(capturedPostMessage?.options.randomize).toBe(true);
    expect(capturedPostMessage?.nodes[0].position).not.toEqual(
      persistedPositions[0],
    );
  });

  it("should use lower gravity in landscape view", async () => {
    mockCy.width.mockReturnValue(1200);
    mockCy.height.mockReturnValue(800); // AR = 1.5 (Landscape)

    await layoutManager.apply({
      timelineMode: false,
      timelineAxis: "x",
      timelineScale: 1,
      orbitMode: false,
      centralNodeId: null,
      stableLayout: false,
      isGuest: false,
    });

    expect(capturedPostMessage?.options.gravity).toBeLessThanOrEqual(0.12);
  });

  it("should use higher gravity in portrait view", async () => {
    mockCy.width.mockReturnValue(800);
    mockCy.height.mockReturnValue(1200); // AR = 0.66 (Portrait)

    await layoutManager.apply({
      timelineMode: false,
      timelineAxis: "x",
      timelineScale: 1,
      orbitMode: false,
      centralNodeId: null,
      stableLayout: false,
      isGuest: false,
    });

    expect(capturedPostMessage?.options.gravity).toBeGreaterThan(0.005);
  });

  it("should give force layouts room to spread out", async () => {
    await layoutManager.apply({
      timelineMode: false,
      timelineAxis: "x",
      timelineScale: 1,
      orbitMode: false,
      centralNodeId: null,
      stableLayout: false,
      isGuest: false,
    });

    expect(capturedPostMessage?.options.boundingBox).toEqual({
      x1: -2400,
      y1: -2400,
      x2: 2400,
      y2: 2400,
    });
  });

  it("should not randomize stable layouts for non-redraw forced updates", async () => {
    await layoutManager.apply(
      {
        timelineMode: false,
        timelineAxis: "x",
        timelineScale: 1,
        orbitMode: false,
        centralNodeId: null,
        stableLayout: true,
        isGuest: false,
      },
      false,
      true,
      "External Update",
      true,
    );
    expect(capturedPostMessage?.options.randomize).toBe(false);
  });

  it("should randomize when the UI redraw button requests a fresh solve", async () => {
    await layoutManager.apply(
      {
        timelineMode: false,
        timelineAxis: "x",
        timelineScale: 1,
        orbitMode: false,
        centralNodeId: null,
        stableLayout: true,
        isGuest: false,
      },
      false,
      true,
      "UI Redraw Button",
      true,
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
        timelineMode: false,
        timelineAxis: "x",
        timelineScale: 1,
        orbitMode: false,
        centralNodeId: null,
        stableLayout: false,
        isGuest: false,
      },
      false,
      true,
      "UI Redraw Button",
      true,
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
        timelineMode: false,
        timelineAxis: "x",
        timelineScale: 1,
        orbitMode: false,
        centralNodeId: null,
        stableLayout: true,
        isGuest: false,
      },
      false,
      true,
      "UI Redraw Button",
      true,
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

    await layoutManager.apply({
      timelineMode: false,
      timelineAxis: "x",
      timelineScale: 1,
      orbitMode: false,
      centralNodeId: null,
      stableLayout: false,
      isGuest: false,
    });

    expect(capturedPostMessage?.nodes[0].data._w).toBeGreaterThan(
      capturedPostMessage?.nodes[1].data._w,
    );
    expect(capturedPostMessage?.nodes[0].data._degree).toBe(2);
    expect(capturedPostMessage?.options.gravity).toBeLessThan(0.05);
    expect(capturedPostMessage?.nodes[0].actualW).toBe(60);
  });

  it("should call resize on apply", async () => {
    await layoutManager.apply({
      timelineMode: false,
      timelineAxis: "x",
      timelineScale: 1,
      orbitMode: false,
      centralNodeId: null,
      stableLayout: false,
      isGuest: true,
    });
    expect(mockCy.resize).toHaveBeenCalled();
  });

  it("should stop redraw when the fit animation completes", async () => {
    const onLayoutStop = vi.fn();

    await layoutManager.apply({
      timelineMode: false,
      timelineAxis: "x",
      timelineScale: 1,
      orbitMode: false,
      centralNodeId: null,
      stableLayout: false,
      isGuest: false,
      onLayoutStop,
    });

    expect(mockCy.animate).toHaveBeenCalled();
    expect(onLayoutStop).toHaveBeenCalledTimes(1);
  });

  it("should stop redraw even when the fit animation completion is missed", async () => {
    vi.useFakeTimers();
    mockCy.animate.mockImplementation(() => {});
    const onLayoutStop = vi.fn();

    await layoutManager.apply({
      timelineMode: false,
      timelineAxis: "x",
      timelineScale: 1,
      orbitMode: false,
      centralNodeId: null,
      stableLayout: false,
      isGuest: false,
      onLayoutStop,
    });

    expect(onLayoutStop).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1200);
    expect(onLayoutStop).toHaveBeenCalledTimes(1);
  });

  it("should stop redraw if the worker errors", async () => {
    vi.stubGlobal("Worker", ErrorWorker);
    layoutManager = new LayoutManager(mockCy as unknown as Core);
    const onLayoutStop = vi.fn();

    await layoutManager.apply({
      timelineMode: false,
      timelineAxis: "x",
      timelineScale: 1,
      orbitMode: false,
      centralNodeId: null,
      stableLayout: false,
      isGuest: false,
      onLayoutStop,
    });

    expect(mockCy.animate).not.toHaveBeenCalled();
    expect(onLayoutStop).toHaveBeenCalledTimes(1);
  });

  it("should stop redraw if the worker never replies", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("Worker", SilentWorker);
    layoutManager = new LayoutManager(mockCy as unknown as Core);
    const onLayoutStop = vi.fn();

    const applyPromise = layoutManager.apply({
      timelineMode: false,
      timelineAxis: "x",
      timelineScale: 1,
      orbitMode: false,
      centralNodeId: null,
      stableLayout: false,
      isGuest: false,
      onLayoutStop,
    });

    await vi.advanceTimersByTimeAsync(15000);
    await applyPromise;

    expect(mockCy.animate).not.toHaveBeenCalled();
    expect(onLayoutStop).toHaveBeenCalledTimes(1);
  });

  it("should stop redraw when an in-flight worker is stopped", async () => {
    vi.stubGlobal("Worker", SilentWorker);
    layoutManager = new LayoutManager(mockCy as unknown as Core);
    const onLayoutStop = vi.fn();

    const applyPromise = layoutManager.apply({
      timelineMode: false,
      timelineAxis: "x",
      timelineScale: 1,
      orbitMode: false,
      centralNodeId: null,
      stableLayout: false,
      isGuest: false,
      onLayoutStop,
    });

    layoutManager.stop();
    await applyPromise;

    expect(mockCy.animate).not.toHaveBeenCalled();
    expect(onLayoutStop).toHaveBeenCalledTimes(1);
  });

  it("should fit nodes if isGuest and isInitial", async () => {
    await layoutManager.apply(
      {
        timelineMode: false,
        timelineAxis: "x",
        timelineScale: 1,
        orbitMode: false,
        centralNodeId: null,
        stableLayout: false,
        isGuest: true,
      },
      true,
    );
    expect(mockCy.fit).toHaveBeenCalled();
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
