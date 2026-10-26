import type { Core } from "cytoscape";
import { syncGraphElements, type LayoutRequest } from "graph-engine";
import { MIN_FOCUS_DEPTH } from "#lib/stores/graph.svelte.js";
import { isTemporalMetadataEqual } from "#lib/utils/comparison.js";
import { browserPerformanceRecorder } from "#lib/services/performance/browser-performance-capture.js";
import {
  applyLayoutSnapshot,
  restoreEverydayPositions,
  type LayoutPositions,
} from "./graph-layout-snapshot";
import type { GraphViewMeasurements } from "./graph-view-measurements";
import type { GraphRenderActivity } from "./graph-visibility";
import type { GraphViewDependencies, GraphViewHost } from "./graph-view-types";

/** Reconciles store membership and saved-view positions with Cytoscape elements. */
export class GraphViewSync {
  private lastSyncedFocusDepth = MIN_FOCUS_DEPTH;
  private lastSyncedFocusRootId: string | null = null;
  private lastSyncedGraphStructureVersion = 0;
  private lastSyncedFilterSignature = "";

  constructor(
    private host: GraphViewHost,
    private deps: GraphViewDependencies,
    private activity: GraphRenderActivity,
    private measurements: GraphViewMeasurements,
  ) {}

  syncElements = () => {
    if (this.activity.deferWhileSuspended()) return;
    const cy = this.host.cy;
    if (!cy || !this.deps.graph.elements) return;
    const generation = ++this.activity.elementSyncGeneration;
    const visibilityGeneration = this.activity.generation;
    this.activity.needsReconcile = false;
    const { focusDepthChanged, focusMembershipOnly } =
      this.reconcileMembership();
    this.syncLayoutOverride();
    syncGraphElements(cy, {
      elements: this.deps.graph.elements,
      vaultStatus: this.deps.vault.status,
      initialLoaded: this.host.loadPhase !== "idle",
      isTemporalMetadataEqual,
      activeLabels: this.deps.graph.activeLabels,
      labelFilterMode: this.deps.graph.labelFilterMode,
      activeCategories: this.deps.graph.activeCategories,
      focusMembershipOnly,
      skipRenderedWeightSync: this.skipRenderedWeightSync(),
      performanceRecorder: browserPerformanceRecorder,
      onFirstElements: () => {
        this.host.loadPhase = "elements";
      },
      onLayoutUpdate: this.layoutUpdateHandler(
        cy,
        generation,
        visibilityGeneration,
        focusDepthChanged,
      ),
    });
    this.measurements.scheduleRenderReadyMeasurement();
  };

  private layoutUpdateHandler(
    cy: Core,
    generation: number,
    visibilityGeneration: number,
    focusDepthChanged: boolean,
  ) {
    return (req: LayoutRequest) => {
      // Never apply an asynchronous sync to a newer depth, vault or visible surface.
      if (
        generation !== this.activity.elementSyncGeneration ||
        this.host.cy !== cy ||
        !this.activity.isCurrent(visibilityGeneration)
      )
        return;
      if (focusDepthChanged) req.viewport = "preserve";
      this.host.applyCurrentLayout(req);
    };
  }

  private skipRenderedWeightSync() {
    const graph = this.deps.graph;
    return (
      graph.perfStylingActive &&
      !graph.timelineMode &&
      graph.activeLabels.size === 0 &&
      graph.activeCategories.size === 0
    );
  }

  private reconcileMembership() {
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
      this.host.loadPhase !== "idle" &&
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

    return { focusDepthChanged, focusMembershipOnly };
  }

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
      applyLayoutSnapshot(this.host.cy, override);
    } else if (previous) {
      restoreEverydayPositions(
        this.host.cy,
        (id) => this.deps.vault.entities[id]?.metadata?.coordinates,
      );
    }
  }
}
