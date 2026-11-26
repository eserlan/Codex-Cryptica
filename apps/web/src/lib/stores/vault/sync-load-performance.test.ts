import { describe, expect, it, vi } from "vitest";
import { browserPerformanceRecorder } from "#lib/services/performance/browser-performance-capture.js";
import { VaultLoadMeasurement } from "./sync-load-performance";

function fixture() {
  const span = { complete: vi.fn(), stale: vi.fn(), fail: vi.fn() };
  const start = vi.fn().mockReturnValue(span);
  const count = vi.fn().mockReturnValue(3);
  const measurement = new VaultLoadMeasurement(count, { start } as Pick<
    typeof browserPerformanceRecorder,
    "start"
  >);
  return { measurement, start, span, count };
}

describe("VaultLoadMeasurement", () => {
  it("records one warm completion with lazily read entity counts", () => {
    const { measurement, start, span, count } = fixture();
    measurement.start(true);
    measurement.complete();
    measurement.fail();
    measurement.stale();
    expect(start).toHaveBeenCalledWith("vault_open_warm");
    expect(span.complete).toHaveBeenCalledOnce();
    count.mockReturnValue(9);
    expect(span.complete.mock.calls[0][0]()).toEqual({
      cacheState: "warm",
      entityCount: 9,
    });
    expect(span.fail).not.toHaveBeenCalled();
    expect(span.stale).not.toHaveBeenCalled();
  });

  it.each(["fail", "stale"] as const)(
    "records cold %s and never records an unstarted operation",
    (outcome) => {
      const { measurement, start, span } = fixture();
      measurement[outcome]();
      expect(span[outcome]).not.toHaveBeenCalled();
      measurement.start(false);
      measurement[outcome]();
      expect(start).toHaveBeenCalledWith("vault_open_cold");
      expect(span[outcome]).toHaveBeenCalledOnce();
      const args = span[outcome].mock.calls[0];
      const metadata = outcome === "fail" ? args[1] : args[0];
      expect(metadata()).toEqual({ cacheState: "cold" });
      measurement.complete();
      expect(span.complete).not.toHaveBeenCalled();
    },
  );
});
