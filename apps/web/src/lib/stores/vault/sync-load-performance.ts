import type { PerformanceOperationHandle } from "@codex/performance-observability";
import { browserPerformanceRecorder } from "#lib/services/performance/browser-performance-capture.js";

/** Records exactly one outcome for a vault open, after its cache has been read. */
export class VaultLoadMeasurement {
  private span: PerformanceOperationHandle | null = null;
  private recorded = false;
  private cacheState: "warm" | "cold" | null = null;

  constructor(
    private entityCount: () => number,
    private recorder: Pick<
      typeof browserPerformanceRecorder,
      "start"
    > = browserPerformanceRecorder,
  ) {}

  start(warm: boolean) {
    this.cacheState = warm ? "warm" : "cold";
    this.span = this.recorder.start(
      warm ? "vault_open_warm" : "vault_open_cold",
    );
  }

  private finish(outcome: "complete" | "stale" | "fail") {
    if (!this.span || this.recorded) return;
    this.recorded = true;
    const metadata = () =>
      ({ cacheState: this.cacheState ?? "not_applicable" }) as const;
    if (outcome === "complete") {
      this.span.complete(() => ({
        ...metadata(),
        entityCount: this.entityCount(),
      }));
    } else if (outcome === "stale") {
      this.span.stale(metadata);
    } else {
      this.span.fail("unexpected", metadata);
    }
  }

  complete() {
    this.finish("complete");
  }
  stale() {
    this.finish("stale");
  }
  fail() {
    this.finish("fail");
  }

  settle(isStale: () => boolean) {
    if (!this.recorded && this.span)
      this.finish(isStale() ? "stale" : "complete");
  }
}
