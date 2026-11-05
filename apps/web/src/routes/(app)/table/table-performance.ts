import { tick } from "svelte";
import { browserPerformanceRecorder } from "#lib/services/performance/browser-performance-capture.js";
import type {
  PerformanceOperation,
  PerformanceOperationHandle,
} from "@codex/performance-observability";

/** Records table operations after Svelte and the browser have rendered. */
export class TablePerformance {
  private openRecorded = false;
  private readonly openSpan: PerformanceOperationHandle;
  constructor(
    private readonly getCounts: () => {
      entityCount: number;
      resultCount: number;
    },
    private readonly recorder: Pick<
      typeof browserPerformanceRecorder,
      "start"
    > = browserPerformanceRecorder,
  ) {
    this.openSpan = recorder.start("table_open");
  }

  private async completeAfterRender(span: PerformanceOperationHandle) {
    await tick();
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
    span.complete(() => ({
      ...this.getCounts(),
      domNodeCount: document.querySelectorAll("[data-testid=entity-table-row]")
        .length,
    }));
  }

  measure = (operation: PerformanceOperation, update: () => void) => {
    const span = this.recorder.start(operation);
    update();
    void this.completeAfterRender(span);
  };

  recordOpen() {
    if (this.openRecorded) return;
    this.openRecorded = true;
    void this.completeAfterRender(this.openSpan);
  }
}
