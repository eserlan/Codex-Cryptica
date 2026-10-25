import { untrack } from "svelte";
import { GraphViewInteractions } from "./graph-view-interactions";
import type { GraphViewDependencies, LoadPhase } from "./graph-view-types";
import { GraphViewMeasurements } from "./graph-view-measurements";
import {
  applyLayoutSnapshot,
  restoreEverydayPositions,
  type LayoutPositions,
} from "./graph-layout-snapshot";
import type { Core } from "cytoscape";
import {
  initGraph,
  LayoutManager,
  GraphImageManager,
  attachCommunityHulls,
  type CommunityHullOverlay,
  syncGraphElements,
  applyLargeGraphRenderHints,
  type LayoutRequest,
} from "graph-engine";
import { isTemporalMetadataEqual } from "$lib/utils/comparison";
import { MIN_FOCUS_DEPTH } from "$lib/stores/graph.svelte";
import { themeStore } from "$lib/stores/theme.svelte";
import { categories } from "$lib/stores/categories.svelte";
import {
  browserPerformanceCapture,
  browserPerformanceRecorder,
} from "$lib/services/performance/browser-performance-capture";
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
import { GraphViewLayout } from "./graph-view-layout";
import { syncGraphImages, releaseGraphImages } from "./graph-image-sync";

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

  // Zoom-driven focus depth ratchet (debounces zoom into settled samples and
  // maps them to depth changes; see FocusZoomRatchet). lastSyncedFocusDepth
  // lets syncElements detect depth-driven element churn and preserve the
  // viewport for it.
  private lastSyncedFocusDepth = MIN_FOCUS_DEPTH;
  private lastSyncedFocusRootId: string | null = null;
  private lastSyncedGraphStructureVersion = 0;
  private lastSyncedFilterSignature = "";

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

      if (
        import.meta.env.DEV ||
        (globalThis as { __CODEX_PERFORMANCE_CAPTURE__?: boolean })
          .__CODEX_PERFORMANCE_CAPTURE__ === true
      ) {
        (window as any).cy = instance;
        (window as any).graphViewController = this;
      }

      const hullCanvas = container.querySelector<HTMLCanvasElement>(
        "canvas[data-community-hulls]",
      );
      this.communityHulls?.destroy();
      this.communityHulls = hullCanvas
        ? attachCommunityHulls(instance, hullCanvas, {
            enabled: untrack(() => this.communityHullsWanted()),
            strong: untrack(() => this.deps.graph.communityMode === "strong"),
          })
        : undefined;

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
    this.communityHulls?.destroy();
    this.communityHulls = undefined;
    this.interactions.clearNodeSelectTimer();
    this.measurements.clearRenderReadyMeasurement();
    if (this.layoutManager) {
      this.layoutManager.stop();
      this.layoutManager = undefined;
    }
    if (this.imageManager) {
      releaseGraphImages(this.imageManager, this.deps.vault);
      this.imageManager = undefined;
    }
    if (this.cy) {
      if (
        import.meta.env.DEV ||
        (globalThis as { __CODEX_PERFORMANCE_CAPTURE__?: boolean })
          .__CODEX_PERFORMANCE_CAPTURE__ === true
      ) {
        delete (window as any).cy;
        delete (window as any).graphViewController;
      }
      this.cy.destroy();
      this.cy = undefined;
    }
  };

  applyCurrentLayout = (req: LayoutRequest) =>
    this.layout.applyCurrentLayout(req);

  /**
   * The graph only places an entity when it is first added, so when a view's
   * saved layout opens or closes, entities already on screen are moved here:
   * to their saved positions, or back to the vault's everyday ones. Entities
   * added later are placed from the layout by the elements themselves.
   * Timeline and orbit arrange entities on their own, so they are left alone.
   */
  private lastLayoutOverride: LayoutPositions | null = null;
  private syncLayoutOverride() {
    const override = this.deps.graph.layoutOverride ?? null;
    if (override === this.lastLayoutOverride) return;
    const previous = this.lastLayoutOverride;
    this.lastLayoutOverride = override;
    if (override) {
      if (this.deps.graph.timelineMode || this.deps.graph.orbitMode) return;
      applyLayoutSnapshot(this.cy, override);
    } else if (previous) {
      restoreEverydayPositions(
        this.cy,
        (id) => this.deps.vault.entities[id]?.metadata?.coordinates,
      );
    }
  }

  // Sync Logic
  syncElements = () => {
    if (this.activity.deferWhileSuspended()) return;
    if (this.cy && this.deps.graph.elements) {
      const syncGeneration = ++this.activity.elementSyncGeneration;
      const syncCy = this.cy;
      const visibilityGeneration = this.activity.generation;
      this.activity.needsReconcile = false;
      // When the element set changed because zoom changed the focus detail level
      // (not a real entity edit), keep the user's camera — the depth change was
      // driven by their zoom, so refitting would fight it.
      const focusDepthChanged =
        this.deps.graph.focusDepth !== this.lastSyncedFocusDepth;
      const focusRootId = this.deps.graph.focusRootId;
      const focusRootChanged = focusRootId !== this.lastSyncedFocusRootId;
      const graphStructureVersion = this.deps.vault.graphStructureVersion ?? 0;
      const filterSignature = [
        this.deps.graph.labelFilterMode,
        ...Array.from(this.deps.graph.activeLabels).sort(),
        "|",
        ...Array.from(this.deps.graph.activeCategories).sort(),
      ].join("\u0000");
      const focusMembershipOnly =
        this.loadPhase !== "idle" &&
        this.deps.graph.focusViewActive &&
        (focusDepthChanged || focusRootChanged) &&
        graphStructureVersion === this.lastSyncedGraphStructureVersion &&
        filterSignature === this.lastSyncedFilterSignature;
      // Explicit detail controls can change focus depth without a Cytoscape
      // zoom event. Start the same lifecycle span here so every membership
      // transition is measured through render readiness.
      if (focusDepthChanged) this.measurements.startFocusDepthMeasurement();
      this.lastSyncedFocusDepth = this.deps.graph.focusDepth;
      this.lastSyncedFocusRootId = focusRootId;
      this.lastSyncedGraphStructureVersion = graphStructureVersion;
      this.lastSyncedFilterSignature = filterSignature;

      this.syncLayoutOverride();
      syncGraphElements(this.cy, {
        elements: this.deps.graph.elements,
        vaultStatus: this.deps.vault.status,
        initialLoaded: this.loadPhase !== "idle",
        isTemporalMetadataEqual,
        activeLabels: this.deps.graph.activeLabels,
        labelFilterMode: this.deps.graph.labelFilterMode,
        activeCategories: this.deps.graph.activeCategories,
        focusMembershipOnly,
        skipRenderedWeightSync:
          this.deps.graph.perfStylingActive &&
          !this.deps.graph.timelineMode &&
          this.deps.graph.activeLabels.size === 0 &&
          this.deps.graph.activeCategories.size === 0,
        performanceRecorder: browserPerformanceRecorder,
        onFirstElements: () => {
          this.loadPhase = "elements";
        },
        onLayoutUpdate: (req) => {
          // A future/asynchronous sync callback must never lay out a newer
          // focus depth or a switched vault with stale membership data.
          if (
            syncGeneration !== this.activity.elementSyncGeneration ||
            this.cy !== syncCy ||
            visibilityGeneration !== this.activity.generation ||
            this.isSuspended
          )
            return;
          if (focusDepthChanged) req.viewport = "preserve";
          this.applyCurrentLayout(req);
        },
      });
      this.measurements.scheduleRenderReadyMeasurement();
    }
  };

  /**
   * Re-applies the renderer-level large-graph hints (hideEdgesOnViewport,
   * motionBlur) whenever the graph crosses the perf-mode threshold. cy is
   * constructed while the vault is still empty, so these can't be set correctly
   * at init time — they have to be patched onto the live renderer once entities
   * have streamed in and `isLargeGraph` settles.
   */
  syncRenderHints = () => {
    if (this.activity.deferWhileSuspended()) return;
    if (this.cy) {
      applyLargeGraphRenderHints(this.cy, this.deps.graph.isLargeGraph);
    }
  };

  /** Timeline and orbit arrange nodes by date or distance, not by community. */
  private communityHullsWanted() {
    const g = this.deps.graph;
    return g.communityMode !== "off" && !g.timelineMode && !g.orbitMode;
  }

  syncCommunityHulls = () => {
    this.communityHulls?.setEnabled(this.communityHullsWanted());
    this.communityHulls?.setStrong(this.deps.graph.communityMode === "strong");
  };

  syncImages = () => {
    if (this.activity.deferWhileSuspended()) return;
    if (this.cy && this.deps.graph.elements && this.imageManager) {
      untrack(() => {
        syncGraphImages({
          imageManager: this.imageManager!,
          graph: this.deps.graph,
          vault: this.deps.vault,
          debugStore: this.deps.debugStore,
          activeTheme: themeStore.activeTheme,
          categoryList: categories.list,
        });
      });
    }
  };

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
