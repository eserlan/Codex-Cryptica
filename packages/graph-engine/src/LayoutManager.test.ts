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
        forEach: vi.fn(),
        filter: vi.fn().mockReturnThis(),
        layout: vi.fn().mockReturnThis(),
        run: vi.fn(),
        map: vi.fn().mockReturnValue([]),
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
      elements: vi.fn(),
    };
    layoutManager = new LayoutManager(mockCy as unknown as Core);
  });

  it("should initialize with a cy instance", () => {
    expect(layoutManager).toBeDefined();
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
