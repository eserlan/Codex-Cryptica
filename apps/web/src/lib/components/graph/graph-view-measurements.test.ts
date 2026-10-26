import { afterEach, describe, expect, it, vi } from "vitest";
import type { Core } from "cytoscape";
import { browserPerformanceRecorder } from "#lib/services/performance/browser-performance-capture.js";
import { GraphViewMeasurements } from "./graph-view-measurements";

describe("GraphViewMeasurements", () => {
  afterEach(() => vi.restoreAllMocks());

  function setup() {
    let nodes = 5;
    let edges = 3;
    const cy = {
      nodes: () => ({ length: nodes }),
      edges: () => ({ length: edges }),
    } as unknown as Core;
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) =>
      frames.push(cb),
    );
    const cancelFrame = vi.spyOn(window, "cancelAnimationFrame");
    const spans: {
      complete: ReturnType<typeof vi.fn>;
      cancel: ReturnType<typeof vi.fn>;
    }[] = [];
    vi.spyOn(browserPerformanceRecorder, "start").mockImplementation(() => {
      const span = {
        complete: vi.fn((dimensions) => dimensions()),
        cancel: vi.fn(),
        fail: vi.fn(),
        stale: vi.fn(),
      };
      spans.push(span);
      return span;
    });
    const measurements = new GraphViewMeasurements(
      { cy },
      { stats: { nodeCount: 20 } },
    );
    return {
      measurements,
      frames,
      spans,
      cancelFrame,
      counts: (n: number, e: number) => {
        nodes = n;
        edges = e;
      },
    };
  }

  it("completes render and depth measurements on frame two with membership changes", () => {
    const { measurements, frames, spans, counts } = setup();
    measurements.startFocusDepthMeasurement();
    counts(7, 1);
    measurements.scheduleRenderReadyMeasurement();
    frames[0](16);
    expect(spans[0].complete).not.toHaveBeenCalled();
    frames[1](32);
    const dimensions = spans[0].complete.mock.results[0].value;
    expect(dimensions).toEqual({
      entityCount: 20,
      renderedNodeCount: 7,
      renderedEdgeCount: 1,
      addedNodeCount: 2,
      removedNodeCount: 0,
      addedEdgeCount: 0,
      removedEdgeCount: 2,
    });
    expect(spans[1].complete).toHaveBeenCalled();
  });

  it("cancels pending frames and both measurements when rendering is interrupted", () => {
    const { measurements, frames, spans, cancelFrame } = setup();
    measurements.startFocusDepthMeasurement();
    measurements.scheduleRenderReadyMeasurement();
    frames[0](16);
    measurements.clearRenderReadyMeasurement();
    expect(cancelFrame).toHaveBeenCalledWith(2);
    expect(spans.every((span) => span.cancel.mock.calls.length === 1)).toBe(
      true,
    );
    expect(spans.every((span) => span.complete.mock.calls.length === 0)).toBe(
      true,
    );
  });

  it("replaces a depth measurement and handles an absent renderer", () => {
    const { measurements, spans } = setup();
    measurements.startFocusDepthMeasurement();
    measurements.restartFocusDepthMeasurement();
    expect(spans[0].cancel).toHaveBeenCalledOnce();
    expect(spans).toHaveLength(2);
    const empty = new GraphViewMeasurements(
      { cy: undefined },
      { stats: { nodeCount: 0 } },
    );
    expect(empty.focusDepthMeasurementDimensions()).toMatchObject({
      addedNodeCount: 0,
      removedEdgeCount: 0,
    });
  });
});
