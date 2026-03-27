import { describe, it, expect, vi, beforeEach } from "vitest";
import { LayoutManager } from "./LayoutManager";
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
    expect(layoutCall.gravity).toBeLessThanOrEqual(0.1);
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
