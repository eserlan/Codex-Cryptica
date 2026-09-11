import { describe, expect, it, vi } from "vitest";
import {
  assertValidPerformanceSample,
  PerformanceContractError,
  PerformanceRecorder,
  type PerformanceSampleV1,
} from "./index";

const completedSample = (): PerformanceSampleV1 => ({
  schemaVersion: 1,
  operation: "graph_select",
  outcome: "completed",
  durationMs: 12,
  renderedNodeCount: 500,
});

describe("PerformanceRecorder", () => {
  it("records a completed operation with injected clock and sink", () => {
    const samples: PerformanceSampleV1[] = [];
    const now = vi.fn().mockReturnValueOnce(10).mockReturnValueOnce(42);
    const recorder = new PerformanceRecorder({
      clock: { now },
      isEnabled: () => true,
      sink: { record: (sample) => samples.push(sample) },
    });

    recorder.start("graph_select").complete(() => ({
      renderedNodeCount: 500,
    }));

    expect(samples).toEqual([
      {
        schemaVersion: 1,
        operation: "graph_select",
        outcome: "completed",
        durationMs: 32,
        renderedNodeCount: 500,
      },
    ]);
  });

  it("does not evaluate dimensions or emit a side effect while disabled", () => {
    const dimensions = vi.fn(() => ({ entityCount: 1600 }));
    const sink = { record: vi.fn() };
    const clock = { now: vi.fn(() => 1) };
    const recorder = new PerformanceRecorder({ clock, sink });

    const handle = recorder.start("vault_open_cold");
    handle.complete(dimensions);
    handle.cancel(dimensions);

    expect(dimensions).not.toHaveBeenCalled();
    expect(sink.record).not.toHaveBeenCalled();
    expect(clock.now).not.toHaveBeenCalled();
  });

  it("records cancellation once and ignores a late completion", () => {
    const samples: PerformanceSampleV1[] = [];
    const recorder = new PerformanceRecorder({
      clock: { now: vi.fn().mockReturnValueOnce(1).mockReturnValueOnce(7) },
      isEnabled: () => true,
      sink: { record: (sample) => samples.push(sample) },
    });

    const handle = recorder.start("vault_open_cold");
    handle.cancel();
    handle.complete();

    expect(samples).toEqual([
      expect.objectContaining({
        outcome: "cancelled",
        errorKind: "aborted",
        durationMs: 6,
      }),
    ]);
  });

  it("records stale and failed terminal outcomes without error text", () => {
    const samples: PerformanceSampleV1[] = [];
    let time = 0;
    const recorder = new PerformanceRecorder({
      clock: { now: () => ++time },
      isEnabled: () => true,
      sink: { record: (sample) => samples.push(sample) },
    });

    recorder.start("search_index_batch").stale();
    recorder.start("search_index_persist").fail("timeout");

    expect(samples).toEqual([
      expect.objectContaining({ outcome: "stale", errorKind: "stale_run" }),
      expect.objectContaining({ outcome: "failed", errorKind: "timeout" }),
    ]);
    expect(JSON.stringify(samples)).not.toContain("Error");
  });
});

describe("assertValidPerformanceSample", () => {
  it("rejects unknown fields and privacy-unsafe strings", () => {
    expect(() =>
      assertValidPerformanceSample({
        ...completedSample(),
        title: "Private lore title",
      } as PerformanceSampleV1),
    ).toThrow(PerformanceContractError);

    expect(() =>
      assertValidPerformanceSample({
        ...completedSample(),
        cacheState: "vault-path" as "warm",
      }),
    ).toThrow(PerformanceContractError);
  });

  it("rejects invalid count dimensions and terminal contracts", () => {
    expect(() =>
      assertValidPerformanceSample({
        ...completedSample(),
        renderedNodeCount: -1,
      }),
    ).toThrow(PerformanceContractError);

    expect(() =>
      assertValidPerformanceSample({
        ...completedSample(),
        renderedNodeCount: 1.5,
      }),
    ).toThrow(PerformanceContractError);

    expect(() =>
      assertValidPerformanceSample({
        ...completedSample(),
        outcome: "cancelled",
      }),
    ).toThrow(PerformanceContractError);
  });
});
