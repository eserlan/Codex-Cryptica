import { vault as defaultVault } from "./vault.svelte";
import { isLargeGraphSize } from "graph-engine";
import { isEntityVisible, type Era, type Entity } from "schema";
import {
  buildGraphElements,
  collectVisibleEntities,
  MAX_FOCUS_DEPTH,
  MIN_FOCUS_DEPTH,
  resolveFocalId,
  type FocusContext,
  type InboundConnections,
  type VisibleEntities,
} from "./graph-focus";
import {
  loadPersistedGraphState,
  nextCommunityMode,
  persistGraphSetting,
  saveEras,
  type CommunityMode,
  type PersistedGraphState,
} from "./graph-persistence";
import {
  captureViewState,
  pushRecentLabel,
  resolvePresetView,
} from "./graph-view-state";
import {
  viewPresetsStore as defaultViewPresetsStore,
  type ViewPresetsStore,
} from "./view-presets.svelte";
import type {
  ViewLayoutSnapshot,
  ViewPreset,
  ViewPresetState,
} from "./view-presets";
import {
  resolveLayoutOverride,
  withLayoutOverride,
  type LayoutPositions,
} from "#lib/components/graph/graph-layout-snapshot.js";
import { explorerUIStore } from "#lib/stores/ui/explorer-ui.svelte.js";
import { sessionModeStore } from "#lib/stores/ui/session-mode.svelte.js";
import { connectionModeStore } from "#lib/stores/ui/connection-mode.svelte.js";
import {
  type IdGenerator,
  systemIdGenerator,
} from "#lib/utils/runtime-deps.js";
import {
  browserPerformanceCapture,
  browserPerformanceRecorder,
} from "#lib/services/performance/browser-performance-capture.js";

export {
  FOCUS_BASE_COUNT,
  FOCUS_DETAIL_STEP,
  FOCUS_EDGE_CAP,
  MAX_FOCUS_DEPTH,
  MIN_FOCUS_DEPTH,
} from "./graph-focus";

export class GraphStore {
  // Dependencies
  private _vault?: typeof defaultVault;
  private explorerUIStore: typeof explorerUIStore;
  private sessionModeStore: typeof sessionModeStore;
  private connectionModeStore: typeof connectionModeStore;
  private presetsStore: ViewPresetsStore;
  private idGenerator: IdGenerator;
  private _initPromise: Promise<void> | null = null;
  private _vaultSwitchHandler: (() => void) | null = null;

  private get vault() {
    return this._vault ?? defaultVault;
  }

  constructor(
    vault?: typeof defaultVault,
    explorerStore: typeof explorerUIStore = explorerUIStore,
    sessionStore: typeof sessionModeStore = sessionModeStore,
    connectionStore: typeof connectionModeStore = connectionModeStore,
    idGenerator: IdGenerator = systemIdGenerator,
    presetsStore: ViewPresetsStore = defaultViewPresetsStore,
  ) {
    this._vault = vault;
    this.explorerUIStore = explorerStore;
    this.sessionModeStore = sessionStore;
    this.connectionModeStore = connectionStore;
    this.idGenerator = idGenerator;
    this.presetsStore = presetsStore;
    browserPerformanceCapture.start();
  }

  // Svelte 5 derived state
  get activeLabels() {
    return this.explorerUIStore.labelFilters;
  }
  set activeLabels(value: Set<string>) {
    this.explorerUIStore.labelFilters = value;
  }
  activeCategories = $state(new Set<string>());

  // ── Large-vault focus view ──────────────────────────────────────────────
  // For large vaults we cull the graph to a target-sized focus set by default
  // (huge render win). The user can opt out per session with "Show full graph",
  // which renders everything with the cheap perf styling.
  showFullGraph = $state(false);
  // How much detail the focus view renders. Driven by zoom (zoom in -> more
  // detail) by the controller; starts with a bounded overview. See
  // MIN/MAX_FOCUS_DEPTH.
  focusDepth = $state(MIN_FOCUS_DEPTH);
  /** Stable membership root for a large-vault focus view, independent of selection. */
  focusRootId = $state<string | null>(null);

  // Vault scale, measured from the raw entity/connection counts — deliberately
  // independent of `elements` so focus-view culling can't feed back into the
  // "is this a large vault?" decision and create a reactive cycle.
  fullGraphSize = $derived.by(() => {
    const entities = this.graphSourceEntities;
    let edgeCount = 0;
    const count = entities.length;
    for (let i = 0; i < count; i++) {
      edgeCount += entities[i].connections?.length ?? 0;
    }
    return { nodeCount: count, edgeCount };
  });

  get isLargeGraph() {
    return isLargeGraphSize(
      this.fullGraphSize.nodeCount,
      this.fullGraphSize.edgeCount,
    );
  }

  /** True when the graph is being culled to a target-sized focus set. */
  get focusViewActive() {
    return this.isLargeGraph && !this.showFullGraph;
  }

  /**
   * Saved positions of the view that is open, laid over the vault's everyday
   * arrangement while it is (#3456). `null` when the open view has no layout or
   * none is open. Held as a plain value: it can be large, is only ever replaced
   * whole, and must never be written back to the vault.
   */
  layoutOverride = $state.raw<LayoutPositions | null>(null);

  elements = $derived.by(() => {
    const focusComputeSpan = browserPerformanceRecorder.start(
      "graph_focus_compute",
    );
    void this.graphStructureVersion;
    const allEntities = this.graphSourceEntities;
    const visible = this.collectVisible(allEntities);

    try {
      const { elements, renderedNodeCount } = buildGraphElements(
        visible,
        this.focusViewActive ? this.focusContext() : null,
      );
      focusComputeSpan.complete(() => ({
        entityCount: allEntities.length,
        renderedNodeCount,
        renderedEdgeCount: elements.length - renderedNodeCount,
      }));
      return withLayoutOverride(elements, this.layoutOverride);
    } catch (error) {
      focusComputeSpan.fail("unexpected");
      throw error;
    }
  });

  fitRequest = $state(0);
  /**
   * Bumped to request a full, reseeded layout re-solve from outside GraphView
   * (e.g. after Quick Start bulk-creates entities and connections — the
   * incremental sync only re-layouts on new *nodes*, not on edges added to
   * already-synced nodes, so a batch of connections added after the fact
   * needs an explicit redraw or the new entities stay piled up). See
   * `requestFit` for the equivalent existing pattern.
   */
  layoutRequest = $state(0);

  // Labels state
  showLabels = $state(true);
  showImages = $state(true);
  /** Backgrounds behind large communities of linked entities: off, soft or strong. */
  communityMode = $state<CommunityMode>("soft");
  get showCommunities() {
    return this.communityMode !== "off";
  }
  stableLayout = $state(true);
  recentLabels = $state<string[]>([]);
  labelFilterMode = $state<"AND" | "OR">("OR");

  // Timeline State
  timelineMode = $state(false);
  timelineAxis = $state<"x" | "y">("x");
  timelineRange = $state<{ start: number | null; end: number | null }>({
    start: null,
    end: null,
  });
  timelineScale = $state(100);

  // Orbit State
  orbitMode = $state(false);
  centralNodeId = $state<string | null>(null);

  eras = $state<Era[]>([]);

  // Saved view presets for the active vault (delegated to viewPresetsStore)
  get viewPresets(): ViewPreset[] {
    return this.presetsStore.presets;
  }
  set viewPresets(val: ViewPreset[]) {
    this.presetsStore.presets = val;
  }

  stats = $derived.by(() => {
    // OPTIMIZATION: Use imperative loop instead of multiple .filter() calls
    // to avoid intermediate array allocations and reduce GC pressure.
    let nodeCount = 0;
    let edgeCount = 0;
    const elements = this.elements;
    const count = elements.length;
    for (let i = 0; i < count; i++) {
      if (elements[i].group === "nodes") {
        nodeCount++;
      } else if (elements[i].group === "edges") {
        edgeCount++;
      }
    }
    return { nodeCount, edgeCount };
  });

  // Visual perf degradation (drop labels/images, haystack edges, skip weight
  // recompute) keys off the *rendered* element count, not the vault size — so a
  // focus view of ~40 nodes keeps full detail while "Show full graph" on a big
  // vault still gets the cheap styling.
  get perfStylingActive() {
    return isLargeGraphSize(this.stats.nodeCount, this.stats.edgeCount);
  }

  private collectVisible(allEntities: Entity[]): VisibleEntities {
    const settings = {
      sharedMode: this.sessionModeStore.sharedMode,
      defaultVisibility: this.vault.defaultVisibility,
    };
    return collectVisibleEntities(
      allEntities,
      (entity) =>
        this.sessionModeStore.isGuestMode || isEntityVisible(entity, settings),
    );
  }

  /** Reads the focus state lazily, so selection never rebuilds a settled view. */
  private focusContext(): FocusContext {
    return {
      rootId: this.focusRootId,
      depth: this.focusDepth,
      selectedId: () => this.vault.selectedEntityId ?? null,
      inbound: () =>
        (this.vault.inboundConnections ?? {}) as InboundConnections,
    };
  }

  /** Establishes the initial focus root once the graph view is ready. */
  ensureFocusRoot(): void {
    if (!this.focusViewActive) return;
    const visible = this.collectVisible(this.graphSourceEntities);
    if (this.focusRootId && visible.ids.has(this.focusRootId)) return;

    // A deleted or no-longer-visible root must not fall back to the transient
    // selection: establish a new stable root for the current graph scope.
    this.focusRootId = resolveFocalId(visible, this.focusContext());
  }

  /** Explicitly navigate a large focus view to an entity outside its set. */
  navigateFocusTo(entityId: string): void {
    if (
      !this.focusViewActive ||
      !this.vault.entities[entityId] ||
      this.focusRootId === entityId
    )
      return;
    this.focusRootId = entityId;
  }

  private get graphSourceEntities(): Entity[] {
    return ((this.vault as any).graphEntities ??
      this.vault.allEntities) as Entity[];
  }

  private get graphStructureVersion(): number {
    return (this.vault as any).graphStructureVersion ?? 0;
  }

  get canIncreaseFocusDetail() {
    return (
      this.focusViewActive &&
      this.focusDepth < MAX_FOCUS_DEPTH &&
      this.stats.nodeCount < this.fullGraphSize.nodeCount
    );
  }

  /** Explicit detail reveal for users who want more than the zoom overview. */
  increaseFocusDetail() {
    if (this.canIncreaseFocusDetail) this.focusDepth++;
  }

  /**
   * Toggles between the culled focus view and the full graph for large vaults.
   * Session-only (reset on vault switch); no-op on small vaults where the full
   * graph already renders.
   */
  toggleFullGraph() {
    this.showFullGraph = !this.showFullGraph;
  }

  requestFit() {
    this.fitRequest++;
  }

  requestLayout() {
    this.layoutRequest++;
  }

  async init() {
    if (this._initPromise) {
      return this._initPromise;
    }

    this._initPromise = this.loadPersistedState();
    return this._initPromise;
  }

  private async loadPersistedState() {
    // Only settings that were saved come back, under the field's own name.
    // The annotation makes the compiler check that every key is a store field.
    const saved: Partial<Pick<GraphStore, keyof PersistedGraphState>> =
      await loadPersistedGraphState();
    Object.assign(this, saved);

    await this.loadViewPresets();

    if (typeof window !== "undefined") {
      if (this._vaultSwitchHandler) {
        window.removeEventListener("vault-switched", this._vaultSwitchHandler);
      }
      this._vaultSwitchHandler = () => {
        this.clearLabelFilters();
        this.clearCategoryFilters();
        this.orbitMode = false;
        this.centralNodeId = null;
        this.showFullGraph = false;
        this.focusDepth = MIN_FOCUS_DEPTH;
        this.focusRootId = null;
        // Keep timelineMode as it's a global preference usually
        void this.loadViewPresets();
      };
      window.addEventListener("vault-switched", this._vaultSwitchHandler);
    }
  }

  // ── View presets ────────────────────────────────────────────────────────
  async loadViewPresets() {
    const vaultId = this.vault.activeVaultId ?? "default";
    // Another vault's layout must never carry over.
    if (this.presetsStore.loadedVaultId !== vaultId) this.layoutOverride = null;
    return await this.presetsStore.loadPresets(vaultId);
  }

  captureViewState(
    viewport?: ViewPresetState["viewport"],
    layout?: ViewLayoutSnapshot,
  ): ViewPresetState {
    return captureViewState(this, viewport, layout);
  }

  /** The id of the saved view that is open, if any. */
  get activeViewPresetId(): string | null {
    return this.presetsStore.activePresetId;
  }

  async saveViewPreset(
    name: string,
    viewport?: { pan: { x: number; y: number }; zoom: number },
    layout?: ViewLayoutSnapshot,
  ): Promise<ViewPreset | null> {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const vaultId = this.vault.activeVaultId ?? "default";
    const state = this.captureViewState(viewport, layout);
    const saved = await this.presetsStore.savePreset(vaultId, trimmed, state);
    // The view just saved is now the open one, so its layout is what is shown.
    if (saved) this.layoutOverride = layout?.positions ?? null;
    return saved;
  }

  /**
   * Sets, replaces or removes a view's saved layout ("Update layout snapshot").
   * If that view is the open one, the screen follows it at once. Returns `null`
   * and changes nothing when the view is missing or the change cannot be stored.
   */
  async updateViewPresetLayout(
    id: string,
    viewport: { pan: { x: number; y: number }; zoom: number } | undefined,
    layout: ViewLayoutSnapshot | null,
  ): Promise<ViewPreset | null> {
    const vaultId = this.vault.activeVaultId ?? "default";
    const updated = await this.presetsStore.setPresetLayout(
      vaultId,
      id,
      layout,
      viewport,
    );
    if (updated && this.presetsStore.activePresetId === id) {
      this.layoutOverride = updated.state.layout?.positions ?? null;
    }
    return updated;
  }

  /**
   * Restores a preset's visual state. Filters that reference labels,
   * categories, or orbit centers that no longer exist in the vault are
   * skipped instead of failing (preset drift).
   *
   * Returns the preset and whether a mode (timeline/orbit) flipped — callers
   * use that to decide if restoring the stored viewport is safe or whether
   * the mode layout's own fit should win.
   */
  applyViewPreset(id: string): {
    preset: ViewPreset;
    modeChanged: boolean;
    layoutApplied: boolean;
  } | null {
    const preset = this.presetsStore.applyPreset(id);
    if (!preset) return null;
    const s = preset.state;
    const view = resolvePresetView(s, this.vault.allEntities);

    const wasTimeline = this.timelineMode;
    const wasOrbit = this.orbitMode;

    this.activeLabels = view.activeLabels;
    this.labelFilterMode = view.labelFilterMode;
    this.activeCategories = view.activeCategories;
    this.showLabels = view.showLabels;
    this.showImages = view.showImages;
    this.stableLayout = view.stableLayout;
    this.timelineAxis = view.timelineAxis;
    this.timelineRange = view.timelineRange;
    this.timelineScale = view.timelineScale;
    this.timelineMode = view.timelineMode;
    this.centralNodeId = view.centralNodeId;
    this.orbitMode = view.orbitMode;

    const modeChanged =
      wasTimeline !== this.timelineMode || wasOrbit !== this.orbitMode;

    // Timeline and orbit arrange entities themselves, so a saved layout has
    // nothing to say there. Applying any view replaces the previous layout, so
    // a view without one shows the everyday arrangement again.
    this.layoutOverride = resolveLayoutOverride(
      s.layout,
      this.timelineMode || this.orbitMode,
    );
    return { preset, modeChanged, layoutApplied: this.layoutOverride !== null };
  }

  async renameViewPreset(id: string, name: string) {
    const vaultId = this.vault.activeVaultId ?? "default";
    await this.presetsStore.renamePreset(vaultId, id, name);
  }

  async deleteViewPreset(id: string) {
    const vaultId = this.vault.activeVaultId ?? "default";
    const wasOpen = this.presetsStore.activePresetId === id;
    await this.presetsStore.deletePreset(vaultId, id);
    if (wasOpen) this.layoutOverride = null;
  }

  resetView() {
    this.layoutOverride = null;
    this.activeLabels = new Set();
    this.activeCategories = new Set();
    this.labelFilterMode = "OR";
    this.showLabels = true;
    this.showImages = true;
    this.stableLayout = true;
    this.timelineMode = false;
    this.orbitMode = false;
    this.centralNodeId = null;
    this.showFullGraph = false;
    this.focusDepth = MIN_FOCUS_DEPTH;
    this.focusRootId = null;
  }

  async saveEras() {
    await saveEras($state.snapshot(this.eras));
  }

  async addEra(era: Era) {
    this.eras.push(era);
    await this.saveEras();
  }

  async removeEra(id: string) {
    this.eras = this.eras.filter((e) => e.id !== id);
    await this.saveEras();
  }

  toggleLabelFilter(label: string) {
    this.explorerUIStore.toggleLabelFilter(
      label,
      this.connectionModeStore.isModifierPressed,
    );
  }

  clearLabelFilters() {
    this.explorerUIStore.clearLabelFilters();
  }

  toggleCategoryFilter(categoryId: string) {
    if (this.activeCategories.has(categoryId)) {
      this.activeCategories.delete(categoryId);
    } else {
      this.activeCategories.add(categoryId);
    }
    // Svelte Set reactivity trigger
    this.activeCategories = new Set(this.activeCategories);
  }

  clearCategoryFilters() {
    this.activeCategories = new Set();
  }

  async toggleLabels() {
    this.showLabels = !this.showLabels;
    await persistGraphSetting("graphShowLabels", this.showLabels);
  }

  async toggleImages() {
    this.showImages = !this.showImages;
    await persistGraphSetting("graphShowImages", this.showImages);
  }

  /** Cycles the group backgrounds: off, soft, strong, and back to off. */
  async toggleCommunities() {
    this.communityMode = nextCommunityMode(this.communityMode);
    await persistGraphSetting("graphCommunityMode", this.communityMode);
  }

  async toggleStableLayout() {
    this.stableLayout = !this.stableLayout;
    await persistGraphSetting("graphStableLayout", this.stableLayout);
  }

  async toggleLabelFilterMode() {
    this.labelFilterMode = this.labelFilterMode === "OR" ? "AND" : "OR";
    await persistGraphSetting("graphLabelFilterMode", this.labelFilterMode);
  }

  async addRecentLabel(label: string) {
    const normalized = label.trim().toLowerCase();
    if (!normalized) return;

    const updated = pushRecentLabel(this.recentLabels, normalized);
    this.recentLabels = updated;
    await persistGraphSetting("graphRecentLabels", updated);
  }

  toggleTimeline() {
    this.timelineMode = !this.timelineMode;
  }

  setTimelineAxis(axis: "x" | "y") {
    this.timelineAxis = axis;
  }

  toggleOrbit() {
    this.orbitMode = !this.orbitMode;
    if (!this.orbitMode) {
      this.centralNodeId = null;
    }
  }

  setCentralNode(nodeId: string) {
    this.centralNodeId = nodeId;
    this.orbitMode = true;
    this.timelineMode = false; // Disable timeline mode if active
  }
}

const GRAPH_KEY = "__codex_graph_instance__";
export const graph: GraphStore =
  (globalThis as any)[GRAPH_KEY] ??
  ((globalThis as any)[GRAPH_KEY] = new GraphStore());

if (typeof window !== "undefined") {
  (window as any).graph = graph;
}
