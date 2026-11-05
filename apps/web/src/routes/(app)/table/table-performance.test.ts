import { afterEach, describe, expect, it, vi } from "vitest";
import type { PerformanceOperationHandle } from "@codex/performance-observability";
import { TablePerformance } from "./table-performance.js";

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("TablePerformance", () => {
  it("records opening once and captures counts after the next rendered frame", async () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frames.push(callback);
      return 1;
    });
    const complete = vi.fn();
    const recorder = {
      start: vi.fn(
        () => ({ complete }) as unknown as PerformanceOperationHandle,
      ),
    };
    let resultCount = 3;
    const performance = new TablePerformance(
      () => ({ entityCount: 5, resultCount }),
      recorder,
    );
    performance.recordOpen();
    performance.recordOpen();
    await vi.waitFor(() => expect(frames).toHaveLength(1));
    expect(complete).not.toHaveBeenCalled();
    document.body.innerHTML = '<div data-testid="entity-table-row"></div>';
    resultCount = 1;
    frames.shift()!(0);
    await vi.waitFor(() => expect(complete).toHaveBeenCalledOnce());
    expect(complete.mock.calls[0][0]()).toEqual({
      entityCount: 5,
      resultCount: 1,
      domNodeCount: 1,
    });
    expect(recorder.start).toHaveBeenCalledExactlyOnceWith("table_open");
  });

  it("applies a measured update immediately and supports empty results", async () => {
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    const complete = vi.fn();
    const recorder = {
      start: vi.fn(
        () => ({ complete }) as unknown as PerformanceOperationHandle,
      ),
    };
    const performance = new TablePerformance(
      () => ({ entityCount: 0, resultCount: 0 }),
      recorder,
    );
    const update = vi.fn();
    performance.measure("table_filter", update);
    expect(update).toHaveBeenCalledOnce();
    await vi.waitFor(() => expect(complete).toHaveBeenCalledOnce());
    expect(complete.mock.calls[0][0]()).toEqual({
      entityCount: 0,
      resultCount: 0,
      domNodeCount: 0,
    });
    expect(recorder.start).toHaveBeenLastCalledWith("table_filter");
  });
});
