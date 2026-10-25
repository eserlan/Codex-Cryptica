import type { Core } from "cytoscape";
import type { PerformanceOperationHandle } from "@codex/performance-observability";
import { browserPerformanceRecorder } from "$lib/services/performance/browser-performance-capture";

function countChanges(current: number, previous: number) {
  return {
    added: Math.max(0, current - previous),
    removed: Math.max(0, previous - current),
  };
}

/** Owns measurements that finish once two render frames have elapsed. */
export class GraphViewMeasurements {
  private renderReadyFrameOne: number | null = null;
  private renderReadyFrameTwo: number | null = null;
  private renderReadySpan: PerformanceOperationHandle | null = null;
  private focusDepthSpan: PerformanceOperationHandle | null = null;
  private focusDepthStartCounts: { nodes: number; edges: number } | null = null;

  constructor(
    private source: { readonly cy: Core | undefined },
    private graph: { stats: { nodeCount: number } },
  ) {}

  restartFocusDepthMeasurement() {
    this.clearFocusDepthMeasurement();
    this.startFocusDepthMeasurement();
  }

  private clearFocusDepthMeasurement() {
    this.focusDepthSpan?.cancel();
    this.focusDepthSpan = null;
    this.focusDepthStartCounts = null;
  }
  graphMeasurementDimensions = () => ({
    entityCount: this.graph.stats.nodeCount,
    renderedNodeCount: this.source.cy?.nodes().length,
  });

  clearRenderReadyMeasurement = (clearFocusDepth = true) => {
    if (this.renderReadyFrameOne !== null) {
      cancelAnimationFrame(this.renderReadyFrameOne);
      this.renderReadyFrameOne = null;
    }
    if (this.renderReadyFrameTwo !== null) {
      cancelAnimationFrame(this.renderReadyFrameTwo);
      this.renderReadyFrameTwo = null;
    }
    this.renderReadySpan?.cancel();
    this.renderReadySpan = null;
    if (clearFocusDepth) {
      this.clearFocusDepthMeasurement();
    }
  };

  startFocusDepthMeasurement = () => {
    if (this.focusDepthSpan) return;
    this.focusDepthStartCounts = {
      nodes: this.source.cy?.nodes().length ?? 0,
      edges: this.source.cy?.edges().length ?? 0,
    };
    this.focusDepthSpan = browserPerformanceRecorder.start(
      "graph_focus_depth_change",
    );
  };

  focusDepthMeasurementDimensions = () => {
    const nodes = this.source.cy?.nodes().length ?? 0;
    const edges = this.source.cy?.edges().length ?? 0;
    const start = this.focusDepthStartCounts ?? { nodes, edges };
    const nodeChanges = countChanges(nodes, start.nodes);
    const edgeChanges = countChanges(edges, start.edges);
    return {
      ...this.graphMeasurementDimensions(),
      renderedEdgeCount: edges,
      addedNodeCount: nodeChanges.added,
      removedNodeCount: nodeChanges.removed,
      addedEdgeCount: edgeChanges.added,
      removedEdgeCount: edgeChanges.removed,
    };
  };

  scheduleRenderReadyMeasurement = () => {
    this.clearRenderReadyMeasurement(false);
    this.renderReadySpan = browserPerformanceRecorder.start(
      "graph_sync_render_ready",
    );
    this.renderReadyFrameOne = requestAnimationFrame(() => {
      this.renderReadyFrameOne = null;
      this.renderReadyFrameTwo = requestAnimationFrame(() => {
        this.renderReadyFrameTwo = null;
        const dimensions = () => this.graphMeasurementDimensions();
        this.renderReadySpan?.complete(dimensions);
        this.renderReadySpan = null;
        this.focusDepthSpan?.complete(this.focusDepthMeasurementDimensions);
        this.focusDepthSpan = null;
        this.focusDepthStartCounts = null;
      });
    });
  };
}
