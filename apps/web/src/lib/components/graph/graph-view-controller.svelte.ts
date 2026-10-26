import { untrack } from "svelte";
import { GraphViewInteractions } from "./graph-view-interactions";
import type { GraphViewDependencies, LoadPhase } from "./graph-view-types";
import { GraphViewMeasurements } from "./graph-view-measurements";
import type { Core } from "cytoscape";
import {
  initGraph,
  LayoutManager,
  GraphImageManager,
  type CommunityHullOverlay,
  type LayoutRequest,
} from "graph-engine";
import {
  browserPerformanceCapture,
  browserPerformanceRecorder,
} from "#lib/services/performance/browser-performance-capture.js";
import type { PerformanceOperationHandle } from "@codex/performance-observability";
import {
  resolveGraphVisibility,
  sameGraphVisibility,
  GraphRenderActivity,
  type GraphVisibilityInputs,
  type GraphVisibilityReason,
  type GraphVisibilitySnapshot,
} from "./graph-visibility";
import {
  FOCUS_ZOOM_STEP_FACTOR,
  resolveFocusDepth,
} from "./graph-focus-zoom-ratchet";
import { GraphViewLoadState } from "./graph-view-load-state";
import { GraphViewSync } from "./graph-view-sync";
import { GraphViewAppearance } from "./graph-view-appearance";
import { GraphViewLayout } from "./graph-view-layout";
import { releaseGraphImages } from "./graph-image-sync";

export type { LoadPhase, GraphViewDependencies } from "./graph-view-types";

export { FOCUS_ZOOM_STEP_FACTOR, resolveFocusDepth };

export { resolveViewport } from "./graph-view-layout";

export class GraphViewController {
  container = $state<HTMLElement | null>(null);
  cy = $state<Core | undefined>();
  layoutManager = $state<LayoutManager | undefined>();
  imageManager = $state<GraphImageManager | undefined>();
  communityHulls = $state<CommunityHullOverlay | undefined>();

  isLayoutRunning = $state(false);
  graphVisible = $derived(this.cy !== undefined);
  selectedCount = $state(0);
  visibility = $state<GraphVisibilitySnapshot>(
    resolveGraphVisibility({
      documentVisible: true,
      surfaceCovered: false,
      containerIntersecting: true,
    }),
  );
  isSuspended = $derived(this.visibility.suspended);
  requiresReinitialization = $state(false);

  hoveredEntityId = $state<string | null>(null);
  hoverPosition = $state<{ x: number; y: number } | null>(null);

  selectedId = $state<string | null>(null);

  editingEdge = $state<{
    source: string;
    target: string;
    label: string;
    type: string;
  } | null>(null);

  loadPhase = $state<LoadPhase>("idle");

  private measurements: GraphViewMeasurements;
  private interactions: GraphViewInteractions;

  private elementSync: GraphViewSync;
  private appearance: GraphViewAppearance;

  private activity: GraphRenderActivity;
  private loadState: GraphViewLoadState;
  private layout: GraphViewLayout;

  private isDestroyed = false;
  private suspendSpan: PerformanceOperationHandle | null = null;

  pendingSearchFocus: {
    entityId: string;
    zoom: number;
    timestamp: number;
  } | null = $state(null);

  private cleanupEvents?: () => void;

  private deps: GraphViewDependencies;

  constructor(
    options: { selectedId: string | null },
    deps: GraphViewDependencies,
  ) {
    this.activity = new GraphRenderActivity(this);
    this.loadState = new GraphViewLoadState(this, deps, this.activity);
    this.measurements = new GraphViewMeasurements(this, deps.graph);
    this.layout = new GraphViewLayout(
      this,
      deps,
      this.activity,
      this.measurements,
      this.loadState,
    );
    this.elementSync = new GraphViewSync(
      this,
      deps,
      this.activity,
      this.measurements,
    );
    this.appearance = new GraphViewAppearance(this, deps, this.activity);
    this.selectedId = options.selectedId;
    this.deps = deps;
    this.interactions = new GraphViewInteractions(this, deps);
  }

  setVisibilityInputs = (inputs: GraphVisibilityInputs) => {
    const next = resolveGraphVisibility(inputs);
    if (sameGraphVisibility(next, this.visibility)) return;

    const wasSuspended = this.visibility.suspended;
    this.visibility = next;
    if (!wasSuspended && next.suspended) {
      this.suspend(next.reason ?? "offscreen");
    } else if (wasSuspended && !next.suspended) {
      this.resume();
    }
  };

  private suspend = (reason: Exclude<GraphVisibilityReason, null>) => {
    this.activity.generation++;
    this.activity.elementSyncGeneration++;
    this.activity.needsReconcile = true;
    this.suspendSpan = browserPerformanceRecorder.start(
      "graph_visibility_suspend",
    );
    this.deps.debugStore.log(`[GraphView] Suspended rendering: ${reason}`);
    this.isLayoutRunning = false;
    this.layout.suspend();
    this.layoutManager?.stop();
    this.cy?.stop();
    this.measurements.clearRenderReadyMeasurement();
    this.interactions.clearNodeSelectTimer();
    this.clearVisibilityTimers();
  };

  private resume = () => {
    this.activity.generation++;
    this.suspendSpan?.complete(() => ({
      entityCount: this.deps.graph.stats.nodeCount,
    }));
    this.suspendSpan = null;

    if (!this.cy || this.cy.destroyed()) {
      this.requiresReinitialization = true;
      this.cy = undefined;
      this.layoutManager = undefined;
      this.imageManager = undefined;
      this.loadPhase = "idle";
      return;
    }

    this.cy.resize();
    this.activity.needsReconcile = true;
    void this.applyCurrentLayout({
      reason: "Visibility Resume",
      viewport: "preserve",
    });
    this.deps.debugStore.log("[GraphView] Resuming rendering");
  };

  consumeReinitializationRequest = () => {
    if (!this.requiresReinitialization) return false;
    this.requiresReinitialization = false;
    return true;
  };

  private clearVisibilityTimers = () => {
    this.layout.clearTimers();
    this.loadState.clearTimer();
  };

  init = async (container: HTMLElement, graphStyle: any) => {
    this.container = container;
    this.isDestroyed = false;
    browserPerformanceCapture.start();

    try {
      const instance = (await initGraph({
        container,
        elements: untrack(() => this.deps.graph.elements),
        style: untrack(() => graphStyle),
      })) as any;

      if (this.isDestroyed || !this.container) {
        instance.destroy();
        return;
      }

      this.cy = instance;
      this.layoutManager = new LayoutManager(instance);
      this.imageManager = new GraphImageManager(instance);

      const updateSelectionCount = () => {
        this.selectedCount = instance.$("node:selected").length;
      };
      instance.on("select unselect", "node", updateSelectionCount);
      updateSelectionCount();

      if (this.exposeDebugInstance()) {
        (window as any).cy = instance;
        (window as any).graphViewController = this;
      }

      this.appearance.attachHulls(instance, container);

      this.cleanupEvents = this.interactions.attach(instance);

      instance.on("zoom", this.layout.handleFocusZoom);

      this.deps.debugStore.log(
        "[GraphViewController] Init successful, cy initialized",
      );
      window.addEventListener("resize", this.layout.handleResize);
      this.interactions.listenForSearchFocus();
    } catch (err) {
      this.deps.debugStore.error("Graph Init Failed", err);
    }
  };

  destroy = () => {
    this.isDestroyed = true;
    this.activity.generation++;
    this.suspendSpan?.cancel();
    this.suspendSpan = null;
    window.removeEventListener("resize", this.layout.handleResize);
    this.clearVisibilityTimers();
    this.interactions.destroy();
    if (this.cleanupEvents) {
      this.cleanupEvents();
      this.cleanupEvents = undefined;
    }
    this.appearance.destroyHulls();
    this.measurements.clearRenderReadyMeasurement();
    this.destroyGraphResources();
  };

  private exposeDebugInstance() {
    return (
      import.meta.env.DEV ||
      (globalThis as { __CODEX_PERFORMANCE_CAPTURE__?: boolean })
        .__CODEX_PERFORMANCE_CAPTURE__ === true
    );
  }

  private destroyGraphResources() {
    if (this.layoutManager) {
      this.layoutManager.stop();
      this.layoutManager = undefined;
    }
    if (this.imageManager) {
      releaseGraphImages(this.imageManager, this.deps.vault);
      this.imageManager = undefined;
    }
    if (this.cy) {
      if (this.exposeDebugInstance()) {
        delete (window as any).cy;
        delete (window as any).graphViewController;
      }
      this.cy.destroy();
      this.cy = undefined;
    }
  }

  applyCurrentLayout = (req: LayoutRequest) =>
    this.layout.applyCurrentLayout(req);

  syncElements = () => this.elementSync.syncElements();
  syncRenderHints = () => this.appearance.syncRenderHints();
  syncCommunityHulls = () => this.appearance.syncCommunityHulls();
  syncImages = () => this.appearance.syncImages();

  clearGraphSelection = () => this.interactions.clearGraphSelection();
  applyFocus = (id: string | null) => this.interactions.applyFocus(id);

  reconcileLoadState = () => this.loadState.reconcile();

  handleModeChange = () => {
    if (this.activity.deferWhileSuspended()) return;
    if (
      this.cy &&
      (this.loadPhase === "finalized" || this.loadPhase === "ready")
    ) {
      this.applyCurrentLayout({ reason: "Mode Change Effect", isForced: true });
    }
  };
}
