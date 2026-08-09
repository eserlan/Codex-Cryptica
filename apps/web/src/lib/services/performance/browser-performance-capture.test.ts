import { describe, expect, it, vi } from "vitest";
import { BrowserPerformanceCapture } from "./browser-performance-capture";

class MockPerformanceObserver {
  static instances: MockPerformanceObserver[] = [];
  observe = vi.fn();
  disconnect = vi.fn();

  constructor(
    private readonly callback: (list: PerformanceObserverEntryList) => void,
  ) {
    MockPerformanceObserver.instances.push(this);
  }

  emit(entries: PerformanceEntry[]) {
    this.callback({
      getEntries: () => entries,
    } as PerformanceObserverEntryList);
  }
}

describe("BrowserPerformanceCapture", () => {
  it("does not create an observer or collect a sample while disabled", () => {
    const capture = new BrowserPerformanceCapture({
      isEnabled: () => false,
      performanceRef: { now: vi.fn(() => 10) } as unknown as Performance,
      PerformanceObserver:
        MockPerformanceObserver as unknown as typeof PerformanceObserver,
    });

    capture.start();
    capture.recorder.start("graph_select").complete(() => ({
      renderedNodeCount: 500,
    }));

    expect(MockPerformanceObserver.instances).toHaveLength(0);
    expect(capture.getSamples()).toEqual([]);
  });

  it("collects aggregate Long Animation Frame durations without raw entry data", () => {
    const now = vi.fn().mockReturnValueOnce(1).mockReturnValueOnce(11);
    const capture = new BrowserPerformanceCapture({
      isEnabled: () => true,
      performanceRef: { now } as unknown as Performance,
      PerformanceObserver:
        MockPerformanceObserver as unknown as typeof PerformanceObserver,
    });

    capture.start();
    MockPerformanceObserver.instances
      .at(-1)
      ?.emit([{ startTime: 2, duration: 61 } as PerformanceEntry]);
    capture.recorder.start("graph_select").complete(() => ({
      longestAnimationFrameMs: capture.longestAnimationFrameSince(1),
    }));

    expect(capture.getSamples()).toEqual([
      expect.objectContaining({
        operation: "graph_select",
        durationMs: 10,
        longestAnimationFrameMs: 61,
      }),
    ]);
    expect(JSON.stringify(capture.getSamples())).not.toContain("startTime");
  });

  it("degrades safely when Long Animation Frames are unsupported", () => {
    const capture = new BrowserPerformanceCapture({
      isEnabled: () => true,
      PerformanceObserver: undefined,
    });

    capture.start();
    expect(capture.longestAnimationFrameSince(0)).toBeUndefined();
  });
});
