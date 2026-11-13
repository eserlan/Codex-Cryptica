import { vault as defaultVault } from "./vault.svelte";
import { isLargeGraphSize } from "graph-engine";
import type { Era } from "schema";
import { MAX_FOCUS_DEPTH } from "./graph-focus";
import { GraphFocusState } from "./graph-focus-state.svelte";
import {
  loadPersistedGraphState,
  nextCommunityMode,
  persistGraphSetting,
  saveEras,
  type CommunityMode,
  type PersistedGraphState,
} from "./graph-persistence";
import {
  GraphPresetController,
  type AppliedPreset,
} from "./graph-preset-controller";
import { captureViewState, pushRecentLabel } from "./graph-view-state";
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
import { browserPerformanceCapture } from "#lib/services/performance/browser-performance-capture.js";

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
  private idGenerator: IdGenerator;
  private focus: GraphFocusState;
  private presets: GraphPresetController;
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
    this.focus = new GraphFocusState(() => this.vault, sessionStore);
    this.presets = new GraphPresetController(
      this,
      () => this.vault,
      presetsStore,
    );
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

  // ── Large-vault focus view (see GraphFocusState) ────────────────────────
  get showFullGraph() {
    return this.focus.showFullGraph;
  }
  set showFullGraph(value: boolean) {
    this.focus.showFullGraph = value;
  }
  get focusDepth() {
    return this.focus.depth;
  }
  set focusDepth(value: number) {
    this.focus.depth = value;
  }
  get focusRootId() {
    return this.focus.rootId;
  }
  set focusRootId(value: string | null) {
    this.focus.rootId = value;
  }
  get fullGraphSize() {
    return this.focus.fullGraphSize;
  }
  get isLargeGraph() {
    return this.focus.isLargeGraph;
  }
  /** True when the graph is being culled to a target-sized focus set. */
  get focusViewActive() {
    return this.focus.active;
  }

  /**
   * Saved positions of the view that is open, laid over the vault's everyday
   * arrangement while it is (#3456). `null` when the open view has no layout or
   * none is open. Held as a plain value: it can be large, is only ever replaced
   * whole, and must never be written back to the vault.
   */
  layoutOverride = $state.raw<LayoutPositions | null>(null);

  elements = $derived.by(() =>
    withLayoutOverride(this.focus.computeElements(), this.layoutOverride),
  );

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
    return this.presets.list;
  }
  set viewPresets(val: ViewPreset[]) {
    this.presets.list = val;
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

  ensureFocusRoot(): void {
    this.focus.ensureRoot();
  }

  navigateFocusTo(entityId: string): void {
    this.focus.navigateTo(entityId);
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

  toggleFullGraph() {
    this.focus.toggleFullGraph();
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
        this.focus.reset();
        // Keep timelineMode as it's a global preference usually
        void this.loadViewPresets();
      };
      window.addEventListener("vault-switched", this._vaultSwitchHandler);
    }
  }

  // ── View presets (see GraphPresetController) ────────────────────────────
  loadViewPresets() {
    return this.presets.load();
  }

  captureViewState(
    viewport?: ViewPresetState["viewport"],
    layout?: ViewLayoutSnapshot,
  ): ViewPresetState {
    return captureViewState(this, viewport, layout);
  }

  /** The id of the saved view that is open, if any. */
  get activeViewPresetId(): string | null {
    return this.presets.activeId;
  }

  saveViewPreset(
    name: string,
    viewport?: ViewPresetState["viewport"],
    layout?: ViewLayoutSnapshot,
  ): Promise<ViewPreset | null> {
    return this.presets.save(name, viewport, layout);
  }

  updateViewPresetLayout(
    id: string,
    viewport: ViewPresetState["viewport"],
    layout: ViewLayoutSnapshot | null,
  ): Promise<ViewPreset | null> {
    return this.presets.updateLayout(id, viewport, layout);
  }

  applyViewPreset(id: string): AppliedPreset | null {
    return this.presets.apply(id);
  }

  renameViewPreset(id: string, name: string) {
    return this.presets.rename(id, name);
  }

  deleteViewPreset(id: string) {
    return this.presets.remove(id);
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
    this.focus.reset();
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
