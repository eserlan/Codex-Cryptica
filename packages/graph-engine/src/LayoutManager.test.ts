import { describe, it, expect, vi, beforeEach } from "vitest";
import { LayoutManager, removeOverlaps } from "./LayoutManager";
import type { Core } from "cytoscape";

describe("LayoutManager", () => {
  let mockCy: any;
  let layoutManager: LayoutManager;

  beforeEach(() => {
    mockCy = {
      destroyed: vi.fn().mockReturnValue(false),
      resize: vi.fn(),
      batch: vi.fn((cb) => cb()),
      nodes: vi.fn().mockReturnValue({
        length: 0,
        forEach: vi.fn(),
        filter: vi.fn().mockReturnThis(),
        layout: vi.fn().mockReturnThis(),
        run: vi.fn(),
        map: vi.fn().mockReturnValue([]),
        elements: vi.fn().mockReturnThis(),
      }),
      width: vi.fn().mockReturnValue(1000),
      height: vi.fn().mockReturnValue(800),
      layout: vi.fn().mockReturnValue({
        run: vi.fn(),
        one: vi.fn(),
        stop: vi.fn(),
      }),
      fit: vi.fn(),
      animate: vi.fn(),
      elements: vi.fn().mockReturnValue({
        animate: vi.fn(),
      }),
    };
    layoutManager = new LayoutManager(mockCy as unknown as Core);
  });

  it("should initialize with a cy instance", () => {
    expect(layoutManager).toBeDefined();
  });

  it("should trigger randomization when exiting a mode", async () => {
    // Setup mock nodes with positions so it doesn't trigger hasNewNodes logic
    mockCy.nodes.mockReturnValue({
      length: 2,
      forEach: (cb: any) => {
        cb({
          position: () => ({ x: 10, y: 10 }),
          data: () => ({}),
          id: () => "1",
          addClass: vi.fn(),
          removeClass: vi.fn(),
        });
        cb({
          position: () => ({ x: 20, y: 20 }),
          data: () => ({}),
          id: () => "2",
          addClass: vi.fn(),
          removeClass: vi.fn(),
        });
      },
      filter: vi.fn().mockReturnThis(),
      layout: vi.fn().mockReturnThis(),
      run: vi.fn(),
      map: vi.fn().mockReturnValue([]),
      elements: vi.fn().mockReturnThis(),
    });

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

    // Verify layout was called with randomize: true
    const layoutCall = mockCy.layout.mock.calls[0][0];
    expect(layoutCall.randomize).toBe(true);
  });

  it("should use lower gravity in landscape view", async () => {
    // Re-mock nodes to return something valid for the loop
    mockCy.nodes.mockReturnValue({
      length: 2,
      forEach: (cb: any) => {
        cb({
          position: () => ({ x: 10, y: 10 }),
          data: () => ({}),
          id: () => "1",
          addClass: vi.fn(),
          removeClass: vi.fn(),
        });
      },
      filter: vi.fn().mockReturnThis(),
      layout: vi.fn().mockReturnThis(),
      run: vi.fn(),
      map: vi.fn().mockReturnValue([]),
      elements: vi.fn().mockReturnThis(),
    });

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

    const layoutCall = mockCy.layout.mock.calls[0][0];
    expect(layoutCall.gravity).toBeLessThanOrEqual(0.25);
  });

  it("should use higher gravity in portrait view", async () => {
    // Re-mock nodes to return something valid for the loop
    mockCy.nodes.mockReturnValue({
      length: 2,
      forEach: (cb: any) => {
        cb({
          position: () => ({ x: 10, y: 10 }),
          data: () => ({}),
          id: () => "1",
          addClass: vi.fn(),
          removeClass: vi.fn(),
        });
      },
      filter: vi.fn().mockReturnThis(),
      layout: vi.fn().mockReturnThis(),
      run: vi.fn(),
      map: vi.fn().mockReturnValue([]),
      elements: vi.fn().mockReturnThis(),
    });

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

    const layoutCall = mockCy.layout.mock.calls[0][0];
    expect(layoutCall.gravity).toBeGreaterThan(0.1);
  });

  it("should not randomize when stableLayout is on, even with randomizeForced", async () => {
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
    const layoutCall = mockCy.layout.mock.calls[0][0];
    expect(layoutCall.randomize).toBe(false);
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
    const layoutCall = mockCy.layout.mock.calls[0][0];
    expect(layoutCall.randomize).toBe(true);
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
