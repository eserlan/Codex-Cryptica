import type { LayoutOptions, LayoutRequest } from "graph-engine";
import type { Entity } from "schema";
import type { LocalEntity } from "#lib/stores/vault/types.js";
import { MIN_FOCUS_DEPTH, MAX_FOCUS_DEPTH } from "#lib/stores/graph.svelte.js";
import { browserPerformanceRecorder } from "#lib/services/performance/browser-performance-capture.js";
import { applyLayoutSnapshot } from "./graph-layout-snapshot";
import { selectLayoutPositionUpdates } from "./position-persistence";
import {
  FocusZoomRatchet,
  FOCUS_ZOOM_STEP_FACTOR,
} from "./graph-focus-zoom-ratchet";
import type { GraphViewMeasurements } from "./graph-view-measurements";
import type { GraphViewLoadState } from "./graph-view-load-state";
import type { GraphRenderActivity } from "./graph-visibility";
import type { GraphViewDependencies, GraphViewHost } from "./graph-view-types";

/**
 * Pure viewport-policy resolver — no class state, fully unit-testable.
 * Returns "preserve" when the camera should stay put; "fit" when it should
 * re-frame. T11 will inline this into LayoutRequest.viewport at each call site.
 */
export function resolveViewport(
  isInitial: boolean,
  reason: string,
  reseed: boolean,
  hasNewNodes: boolean,
  hasRemovedNodes: boolean,
  stableLayout: boolean,
): "preserve" | "fit" {
  if (isInitial || !stableLayout) return "fit";
  if (reason === "Window Resize" && !reseed) return "preserve";
  if (reason === "Elements Update" && !hasNewNodes && !hasRemovedNodes)
    return "preserve";
  return "fit";
}

/** Coordinates layout requests and camera-driven focus depth changes. */
export class GraphViewLayout {
  private focusZoomRatchet = new FocusZoomRatchet();
  private resizeTimer: number | null = null;
  private lastOrientation: "landscape" | "portrait" | null = null;

  constructor(
    private host: GraphViewHost,
    private deps: GraphViewDependencies,
    private activity: GraphRenderActivity,
    private measurements: GraphViewMeasurements,
    private loadState: GraphViewLoadState,
  ) {}

  applyCurrentLayout = async (req: LayoutRequest) => {
    if (this.activity.deferWhileSuspended()) return;
    if (!this.host.layoutManager) return;
    const layoutGeneration = this.activity.generation;
    const span = browserPerformanceRecorder.start("graph_sync_layout");

    const viewport = this.viewportForRequest(req);

    // A fit moves the camera programmatically — mute the focus-zoom ratchet for
    // its duration and re-anchor the mark to where the fit lands (in
    // onLayoutStop), so the fit isn't misread as a user-driven reveal.
    const isFit = viewport === "fit";
    if (isFit) this.focusZoomRatchet.suppress();

    try {
      await this.host.layoutManager.apply(
        { ...req, viewport },
        this.layoutOptions(req, viewport, layoutGeneration),
      );
      if (!this.activity.isCurrent(layoutGeneration)) {
        this.activity.needsReconcile = true;
        span.cancel();
        return;
      }
      span.complete(() => this.measurements.graphMeasurementDimensions());
    } catch (error) {
      span.fail("unexpected", () =>
        this.measurements.graphMeasurementDimensions(),
      );
      throw error;
    }
  };

  private viewportForRequest(req: LayoutRequest) {
    // Focus reveals can pin the camera; other requests use the standard policy.
    return (
      req.viewport ??
      resolveViewport(
        req.isInitial ?? false,
        req.reason,
        req.reseed ?? false,
        req.hasNewNodes ?? false,
        req.hasRemovedNodes ?? false,
        this.deps.graph.stableLayout,
      )
    );
  }

  private layoutOptions(
    req: LayoutRequest,
    viewport: "fit" | "preserve",
    layoutGeneration: number,
  ): LayoutOptions {
    const isInitial = req.isInitial ?? false;
    const isFit = viewport === "fit";
    return {
      timelineMode: this.deps.graph.timelineMode,
      timelineAxis: this.deps.graph.timelineAxis,
      timelineScale: this.deps.graph.timelineScale,
      orbitMode: this.deps.graph.orbitMode,
      centralNodeId: this.deps.graph.centralNodeId,
      stableLayout: this.deps.graph.stableLayout,
      isGuest: this.deps.vault.isGuest,
      isMobile: this.deps.layoutUIStore.isMobile,
      onLayoutStart: () => {
        if (!this.activity.isCurrent(layoutGeneration)) return;
        this.host.isLayoutRunning = true;
      },
      onLayoutComputed: (ms) => {
        this.deps.debugStore.log(`Layout: ${ms}ms`, {
          nodes: this.deps.graph.stats.nodeCount,
          caller: req.reason,
        });
      },
      onLayoutStop: () => {
        if (!this.activity.isCurrent(layoutGeneration)) return;
        this.host.isLayoutRunning = false;
        if (isInitial) {
          this.host.loadPhase = "ready";
        }
        // Re-enable the ratchet and re-anchor it to the *settled* zoom.
        if (isFit) {
          this.focusZoomRatchet.scheduleRebaseline(() =>
            this.host.cy && !this.host.cy.destroyed()
              ? this.host.cy.zoom()
              : null,
          );
        }
      },
      onPositionsUpdated: (updates, meta) =>
        this.onPositionsUpdated(layoutGeneration, isInitial, updates, meta),
    };
  }
  private onPositionsUpdated(
    generation: number,
    isInitial: boolean,
    updates: Record<string, Partial<Entity>>,
    meta?: { healed?: boolean },
  ) {
    if (!this.activity.isCurrent(generation)) {
      this.activity.needsReconcile = true;
      return;
    }
    // A saved view owns its on-screen arrangement and never writes the vault layout.
    const openLayout = this.deps.graph.layoutOverride;
    if (openLayout) {
      applyLayoutSnapshot(this.host.cy, openLayout);
      return;
    }
    const selected = selectLayoutPositionUpdates(
      updates as Record<string, Partial<LocalEntity>>,
      (id) => this.deps.vault.entities[id],
      {
        status: this.deps.vault.status,
        loadPhase: this.host.loadPhase,
        isInitial,
        focusViewActive: this.deps.graph.focusViewActive,
        savedCoordsDegenerate: this.loadState.savedCoordsDegenerate,
        healed: meta?.healed,
      },
    );
    if (selected.healsSavedCoordinates)
      this.loadState.savedCoordsDegenerate = false;
    if (selected.updates) this.deps.vault.batchUpdate(selected.updates);
  }

  clearTimers() {
    this.focusZoomRatchet.clearTimers();
    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = null;
    }
  }

  suspend() {
    this.focusZoomRatchet.unsuppress();
  }
  handleResize = () => {
    if (this.host.isSuspended) return;
    if (this.resizeTimer) clearTimeout(this.resizeTimer);
    this.resizeTimer = window.setTimeout(() => {
      this.resizeTimer = null;
      if (this.host.isSuspended) return;
      if (this.host.cy) {
        this.host.cy.resize();
        const width = this.host.cy.width();
        const height = this.host.cy.height();
        const currentOrientation = width > height ? "landscape" : "portrait";

        if (
          this.lastOrientation &&
          currentOrientation !== this.lastOrientation
        ) {
          this.deps.debugStore.log(
            `[GraphView] Orientation changed to ${currentOrientation}, updating layout...`,
          );
          this.host.applyCurrentLayout({
            reason: "Window Resize",
            isForced: true,
            reseed: true,
          });
        } else {
          this.host.applyCurrentLayout({ reason: "Window Resize" });
        }

        this.lastOrientation = currentOrientation;
      }
    }, 250);
  };

  handleFocusZoom = () => this.scheduleFocusSettle();

  private scheduleFocusSettle = () => {
    if (this.host.isSuspended) return;
    this.focusZoomRatchet.scheduleSettle(this.settleFocusZoom);
  };

  private settleFocusZoom = () => {
    if (this.host.isSuspended) return;
    const cy = this.host.cy;
    if (!cy || cy.destroyed() || !this.deps.graph.focusViewActive) return;

    const result = this.focusZoomRatchet.resolveSettledZoom(
      cy.zoom(),
      this.deps.graph.focusDepth,
      {
        min: MIN_FOCUS_DEPTH,
        max: MAX_FOCUS_DEPTH,
        stepFactor: FOCUS_ZOOM_STEP_FACTOR,
      },
    );
    if (result) {
      this.measurements.restartFocusDepthMeasurement();
      this.deps.graph.focusDepth = result.depth;
    }
  };
}
