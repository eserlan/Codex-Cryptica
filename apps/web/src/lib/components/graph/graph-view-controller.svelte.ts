import { untrack } from "svelte";
import { GraphViewInteractions } from "./graph-view-interactions";
import type { GraphViewDependencies, LoadPhase } from "./graph-view-types";
import { GraphViewMeasurements } from "./graph-view-measurements";
import { unsavedPositionUpdates } from "./position-persistence";
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
import { MIN_FOCUS_DEPTH, MAX_FOCUS_DEPTH } from "$lib/stores/graph.svelte";
import { themeStore } from "$lib/stores/theme.svelte";
import { categories } from "$lib/stores/categories.svelte";
import type { LocalEntity } from "$lib/stores/vault/types";
import {
  browserPerformanceCapture,
  browserPerformanceRecorder,
} from "$lib/services/performance/browser-performance-capture";
import type { PerformanceOperationHandle } from "@codex/performance-observability";
import {
  resolveGraphVisibility,
  type GraphVisibilityInputs,
  type GraphVisibilityReason,
  type GraphVisibilitySnapshot,
} from "./graph-visibility";
import {
  FocusZoomRatchet,
  FOCUS_ZOOM_STEP_FACTOR,
  resolveFocusDepth,
} from "./graph-focus-zoom-ratchet";
import { hasDegenerateSavedCoordinates } from "./saved-coordinate-health";
import { syncGraphImages } from "./graph-image-sync";

export type { LoadPhase, GraphViewDependencies } from "./graph-view-types";

export { FOCUS_ZOOM_STEP_FACTOR, resolveFocusDepth };

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
  private focusZoomRatchet = new FocusZoomRatchet();
  private lastSyncedFocusDepth = MIN_FOCUS_DEPTH;
  private lastSyncedFocusRootId: string | null = null;
  private lastSyncedGraphStructureVersion = 0;
  private lastSyncedFilterSignature = "";
  private elementSyncGeneration = 0;

  private resizeTimer: number | null = null;
  private lastOrientation: "landscape" | "portrait" | null = null;

  // Tracks the vault the live cy instance is currently showing, so a switch
  // that reuses the controller can restart the load state machine. (A switch
  // that recreates the controller gets a fresh "idle" phase for free.)
  private lastVaultId: string | null | undefined = undefined;

  // Post-load "diagonal slash" safety net. A vault whose saved coordinates
  // collapsed onto a line can have those coords applied to cy by a late element
  // re-sync *after* the initial layout already ran, so no layout pass ever sees
  // the slash. After the vault settles we re-check the actual rendered positions
  // and re-solve once. Re-armed on every fresh load / vault change.
  private slashRecoveryDone = false;
  private slashGuardTimer: number | null = null;
  private readonly SLASH_GUARD_DELAY_MS = 1500;

  // True when the vault being finalized had degenerate (collinear) saved
  // coordinates that the transformer discarded — so the initial solve should be
  // persisted to permanently clean the data instead of re-solving every load.
  private savedCoordsDegenerate = false;

  private isDestroyed = false;
  private visibilityGeneration = 0;
  private needsVisibilityReconcile = false;
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
    this.measurements = new GraphViewMeasurements(this, deps.graph);
    this.selectedId = options.selectedId;
    this.deps = deps;
    this.interactions = new GraphViewInteractions(this, deps);
  }

  setVisibilityInputs = (inputs: GraphVisibilityInputs) => {
    const next = resolveGraphVisibility(inputs);
    if (
      next.suspended === this.visibility.suspended &&
      next.reason === this.visibility.reason &&
      next.documentVisible === this.visibility.documentVisible &&
      next.surfaceCovered === this.visibility.surfaceCovered &&
      next.containerIntersecting === this.visibility.containerIntersecting
    ) {
      return;
    }

    const wasSuspended = this.visibility.suspended;
    this.visibility = next;
    if (!wasSuspended && next.suspended) {
      this.suspend(next.reason ?? "offscreen");
    } else if (wasSuspended && !next.suspended) {
      this.resume();
    }
  };

  private suspend = (reason: Exclude<GraphVisibilityReason, null>) => {
    this.visibilityGeneration++;
    this.elementSyncGeneration++;
    this.needsVisibilityReconcile = true;
    this.suspendSpan = browserPerformanceRecorder.start(
      "graph_visibility_suspend",
    );
    this.deps.debugStore.log(`[GraphView] Suspended rendering: ${reason}`);
    this.isLayoutRunning = false;
    this.focusZoomRatchet.unsuppress();
    this.layoutManager?.stop();
    this.cy?.stop();
    this.measurements.clearRenderReadyMeasurement();
    this.interactions.clearNodeSelectTimer();
    this.clearVisibilityTimers();
  };

  private resume = () => {
    this.visibilityGeneration++;
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
    this.needsVisibilityReconcile = true;
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
    this.focusZoomRatchet.clearTimers();
    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = null;
    }
    if (this.slashGuardTimer) {
      clearTimeout(this.slashGuardTimer);
      this.slashGuardTimer = null;
    }
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

      instance.on("zoom", this.handleFocusZoom);

      this.deps.debugStore.log(
        "[GraphViewController] Init successful, cy initialized",
      );
      window.addEventListener("resize", this.handleResize);
      this.interactions.listenForSearchFocus();
    } catch (err) {
      this.deps.debugStore.error("Graph Init Failed", err);
    }
  };

  destroy = () => {
    this.isDestroyed = true;
    this.visibilityGeneration++;
    this.suspendSpan?.cancel();
    this.suspendSpan = null;
    window.removeEventListener("resize", this.handleResize);
    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = null;
    }
    this.focusZoomRatchet.clearTimers();
    if (this.slashGuardTimer) {
      clearTimeout(this.slashGuardTimer);
      this.slashGuardTimer = null;
    }
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
      this.imageManager.destroy({
        releaseImageUrl: (path: string) =>
          this.deps.vault.releaseThumbnailUrl(path),
      } as any);
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

  /**
   * Decides whether a layout pass may move the camera. With stable layout on,
   * safe updates (edge churn from content edits, plain window resizes) keep
   * the user's pan/zoom; structural changes (new/removed nodes), mode
   * changes, explicit Fit/Redraw, and orientation changes still fit.
   */
  applyCurrentLayout = async (req: LayoutRequest) => {
    if (this.isSuspended) {
      this.needsVisibilityReconcile = true;
      return;
    }
    if (!this.layoutManager) return;
    const layoutGeneration = this.visibilityGeneration;
    const span = browserPerformanceRecorder.start("graph_sync_layout");

    const isInitial = req.isInitial ?? false;
    // A caller may pin the camera policy (focus-view reveals pass "preserve" so
    // a zoom-driven node change doesn't refit and undo the zoom that caused it);
    // otherwise fall back to the standard policy resolver.
    const viewport =
      req.viewport ??
      resolveViewport(
        isInitial,
        req.reason,
        req.reseed ?? false,
        req.hasNewNodes ?? false,
        req.hasRemovedNodes ?? false,
        this.deps.graph.stableLayout,
      );

    // A fit moves the camera programmatically — mute the focus-zoom ratchet for
    // its duration and re-anchor the mark to where the fit lands (in
    // onLayoutStop), so the fit isn't misread as a user-driven reveal.
    const isFit = viewport === "fit";
    if (isFit) this.focusZoomRatchet.suppress();

    try {
      await this.layoutManager.apply(
        { ...req, viewport },
        {
          timelineMode: this.deps.graph.timelineMode,
          timelineAxis: this.deps.graph.timelineAxis,
          timelineScale: this.deps.graph.timelineScale,
          orbitMode: this.deps.graph.orbitMode,
          centralNodeId: this.deps.graph.centralNodeId,
          stableLayout: this.deps.graph.stableLayout,
          isGuest: this.deps.vault.isGuest,
          isMobile: this.deps.layoutUIStore.isMobile,
          onLayoutStart: () => {
            if (
              layoutGeneration !== this.visibilityGeneration ||
              this.isSuspended
            )
              return;
            this.isLayoutRunning = true;
          },
          onLayoutComputed: (ms) => {
            this.deps.debugStore.log(`Layout: ${ms}ms`, {
              nodes: this.deps.graph.stats.nodeCount,
              caller: req.reason,
            });
          },
          onLayoutStop: () => {
            if (
              layoutGeneration !== this.visibilityGeneration ||
              this.isSuspended
            )
              return;
            this.isLayoutRunning = false;
            if (isInitial) {
              this.loadPhase = "ready";
            }
            // Re-enable the ratchet and re-anchor it to the *settled* zoom.
            if (isFit) {
              this.focusZoomRatchet.scheduleRebaseline(() =>
                this.cy && !this.cy.destroyed() ? this.cy.zoom() : null,
              );
            }
          },
          onPositionsUpdated: (updates, meta) => {
            if (
              layoutGeneration !== this.visibilityGeneration ||
              this.isSuspended
            ) {
              this.needsVisibilityReconcile = true;
              return;
            }
            // A view's own layout is open (#3456): keep it on screen after any
            // layout pass, and never write it, or positions worked out around
            // it, into the vault's everyday arrangement.
            const openLayout = this.deps.graph.layoutOverride;
            if (openLayout) {
              applyLayoutSnapshot(this.cy, openLayout);
              return;
            }
            const notLoading = this.deps.vault.status !== "loading";
            // Always keep positions for entities that have none yet, in any
            // view and on the first solve. Otherwise a vault shown in focus
            // view never kept its layout and re-solved it on every load. Only
            // missing positions are filled in, so a partial or randomised
            // solve never overwrites a saved layout, and coordinate-only saves
            // no longer load entity content (the #1576 cascade that kept
            // focus-view solves from saving at all).
            const unsaved = unsavedPositionUpdates(
              updates as Record<string, Partial<LocalEntity>>,
              (id) => this.deps.vault.entities[id],
            );
            // Focus view shows a partial set: never rewrite saved positions
            // from it. Full-graph mode ("Show full graph") persists and heals
            // as before.
            if (this.deps.graph.focusViewActive) {
              if (notLoading && Object.keys(unsaved).length > 0) {
                this.deps.vault.batchUpdate(unsaved);
              }
              return;
            }
            const isReady = this.loadPhase === "ready" && notLoading;
            // Persist the initial layout when it heals a degenerate vault — either
            // a runtime re-solve (meta.healed) or the first solve of a vault whose
            // saved coords were a discarded slash. This lands the fix in the vault
            // so it stops reshuffling every load and a Save cleans the on-disk
            // diagonal, instead of being skipped just because it's the initial pass.
            const isHealPersist = meta?.healed || this.savedCoordsDegenerate;
            const shouldPersist = isHealPersist
              ? notLoading
              : !isInitial && isReady;
            if (shouldPersist) {
              this.savedCoordsDegenerate = false;
              this.deps.vault.batchUpdate(
                updates as Record<string, Partial<LocalEntity>>,
              );
            } else if (notLoading && Object.keys(unsaved).length > 0) {
              this.deps.vault.batchUpdate(unsaved);
            }
          },
        },
      );
      if (layoutGeneration !== this.visibilityGeneration || this.isSuspended) {
        this.needsVisibilityReconcile = true;
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

  private handleResize = () => {
    if (this.isSuspended) return;
    if (this.resizeTimer) clearTimeout(this.resizeTimer);
    this.resizeTimer = window.setTimeout(() => {
      this.resizeTimer = null;
      if (this.isSuspended) return;
      if (this.cy) {
        this.cy.resize();
        const width = this.cy.width();
        const height = this.cy.height();
        const currentOrientation = width > height ? "landscape" : "portrait";

        if (
          this.lastOrientation &&
          currentOrientation !== this.lastOrientation
        ) {
          this.deps.debugStore.log(
            `[GraphView] Orientation changed to ${currentOrientation}, updating layout...`,
          );
          this.applyCurrentLayout({
            reason: "Window Resize",
            isForced: true,
            reseed: true,
          });
        } else {
          this.applyCurrentLayout({ reason: "Window Resize" });
        }

        this.lastOrientation = currentOrientation;
      }
    }, 250);
  };

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
    if (this.isSuspended) {
      this.needsVisibilityReconcile = true;
      return;
    }
    if (this.cy && this.deps.graph.elements) {
      const syncGeneration = ++this.elementSyncGeneration;
      const syncCy = this.cy;
      const visibilityGeneration = this.visibilityGeneration;
      this.needsVisibilityReconcile = false;
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
            syncGeneration !== this.elementSyncGeneration ||
            this.cy !== syncCy ||
            visibilityGeneration !== this.visibilityGeneration ||
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
   * Debounced zoom handler driving the focus-view depth. Cytoscape fires "zoom"
   * continuously (and for programmatic fits), so we wait for the zoom to settle
   * before deciding, and skip while the graph isn't in focus view.
   */
  private handleFocusZoom = () => this.scheduleFocusSettle();

  private scheduleFocusSettle = () => {
    if (this.isSuspended) return;
    this.focusZoomRatchet.scheduleSettle(this.settleFocusZoom);
  };

  private settleFocusZoom = () => {
    if (this.isSuspended) return;
    const cy = this.cy;
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

  /**
   * Re-applies the renderer-level large-graph hints (hideEdgesOnViewport,
   * motionBlur) whenever the graph crosses the perf-mode threshold. cy is
   * constructed while the vault is still empty, so these can't be set correctly
   * at init time — they have to be patched onto the live renderer once entities
   * have streamed in and `isLargeGraph` settles.
   */
  syncRenderHints = () => {
    if (this.isSuspended) {
      this.needsVisibilityReconcile = true;
      return;
    }
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
    if (this.isSuspended) {
      this.needsVisibilityReconcile = true;
      return;
    }
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

  reconcileLoadState = () => {
    if (this.isSuspended) {
      this.needsVisibilityReconcile = true;
      return;
    }
    const { status, allEntities, activeVaultId } = this.deps.vault;

    // A vault switch under a reused controller never reactively empties the
    // entity index (it swaps old→new), so restart the load machine when the
    // active id changes. (When the controller is recreated on switch this is a
    // no-op — it already starts fresh.)
    const vaultChanged = this.cy != null && activeVaultId !== this.lastVaultId;
    this.lastVaultId = activeVaultId;

    if (vaultChanged || (status === "loading" && allEntities.length === 0)) {
      this.loadPhase = "idle";
      this.slashRecoveryDone = false;
      if (this.slashGuardTimer) {
        clearTimeout(this.slashGuardTimer);
        this.slashGuardTimer = null;
      }
      if (this.imageManager)
        this.imageManager.destroy({
          releaseImageUrl: (path: string) =>
            this.deps.vault.releaseThumbnailUrl(path),
        } as any);
      return;
    }

    if (status === "idle" && this.loadPhase === "elements") {
      this.loadPhase = "finalized";
      this.savedCoordsDegenerate = this.areSavedCoordsDegenerate();
      this.deps.debugStore.log(
        "[GraphView] Vault load finalized, unlocking all updates.",
      );
      this.applyCurrentLayout({
        reason: "Load Finalized",
        isInitial: true,
        isForced: true,
      });
    }

    // Once the vault is idle with content, (re)arm the slash guard only when
    // the full vault's saved coordinates are actually degenerate. Checking the
    // rendered focus subset can produce false positives in large culled views.
    if (
      status === "idle" &&
      !this.slashRecoveryDone &&
      this.savedCoordsDegenerate &&
      this.cy &&
      this.cy.nodes().length > 0
    ) {
      this.scheduleSlashGuard();
    }
  };

  private areSavedCoordsDegenerate = (): boolean => {
    return hasDegenerateSavedCoordinates(this.deps.vault.allEntities);
  };

  private scheduleSlashGuard = () => {
    if (this.isSuspended) return;
    if (this.slashGuardTimer) clearTimeout(this.slashGuardTimer);
    this.slashGuardTimer = window.setTimeout(() => {
      this.slashGuardTimer = null;
      this.recoverFromSlashIfNeeded();
    }, this.SLASH_GUARD_DELAY_MS);
  };

  private recoverFromSlashIfNeeded = () => {
    if (this.isSuspended) return;
    if (this.slashRecoveryDone || !this.cy || this.cy.destroyed()) return;
    if (this.deps.vault.status === "loading") return;
    if (!this.savedCoordsDegenerate) return;

    this.slashRecoveryDone = true;
    this.deps.debugStore.log(
      "[GraphView] Degenerate saved-coordinate slash detected after load — re-solving.",
    );
    this.applyCurrentLayout({
      reason: "Slash Recovery",
      isInitial: true,
      isForced: true,
      reseed: true,
    });
  };

  handleModeChange = () => {
    if (this.isSuspended) {
      this.needsVisibilityReconcile = true;
      return;
    }
    if (
      this.cy &&
      (this.loadPhase === "finalized" || this.loadPhase === "ready")
    ) {
      this.applyCurrentLayout({ reason: "Mode Change Effect", isForced: true });
    }
  };
}
