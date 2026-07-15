import { vault as defaultVault } from "./vault.svelte";
import { GraphTransformer, isLargeGraphSize } from "graph-engine";
import { isEntityVisible, type Era, type Entity } from "schema";
import { getDB } from "../utils/idb";
import {
  parsePresets,
  presetsSettingsKey,
  type GraphViewPreset,
  type GraphViewPresetState,
} from "./graph-presets";
import { explorerUIStore } from "$lib/stores/ui/explorer-ui.svelte";
import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
import { connectionModeStore } from "$lib/stores/ui/connection-mode.svelte";

// Focus-view detail level. `focusDepth` is a 1..MAX zoom-driven level (not a
// literal hop count); each level targets FOCUS_BASE_COUNT * 2^(level-1) rendered
// nodes, so the default (level 1) lands around 500 — enough for a real overview,
// not just the focal + its handful of direct links — and zooming in doubles it.
export const MIN_FOCUS_DEPTH = 1;
export const MAX_FOCUS_DEPTH = 6;
export const FOCUS_BASE_COUNT = 500;

export class GraphStore {
  // Dependencies
  private _vault?: typeof defaultVault;
  private explorerUIStore: typeof explorerUIStore;
  private sessionModeStore: typeof sessionModeStore;
  private connectionModeStore: typeof connectionModeStore;
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
  ) {
    this._vault = vault;
    this.explorerUIStore = explorerStore;
    this.sessionModeStore = sessionStore;
    this.connectionModeStore = connectionStore;
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

  elements = $derived.by(() => {
    const graphVersion = this.graphStructureVersion;
    void graphVersion;
    const allEntities = this.graphSourceEntities;
    const settings = {
      sharedMode: this.sessionModeStore.sharedMode,
      defaultVisibility: this.vault.defaultVisibility,
    };

    // OPTIMIZATION: Build visible list and valid ID set in a single pass
    // to avoid multiple iterations and array allocations.
    // Also passes validIds to GraphTransformer to skip set reconstruction.
    const visibleEntities: Entity[] = [];
    const validIds = new Set<string>();

    const count = allEntities.length;
    for (let i = 0; i < count; i++) {
      const entity = allEntities[i];
      if (
        this.sessionModeStore.isGuestMode ||
        isEntityVisible(entity, settings)
      ) {
        visibleEntities.push(entity);
        validIds.add(entity.id);
      }
    }

    // Focus-view culling: render a target-sized set around the focal node.
    // Built from `renderIds` via the entities record (O(rendered)) rather than
    // an O(N) Map build + O(N) filter, so a content edit in a large vault
    // doesn't re-walk all 1600 entities to produce the same small set.
    if (this.focusViewActive && visibleEntities.length > 0) {
      const focal = this.resolveFocalId(visibleEntities, validIds);
      if (focal) {
        const renderIds = this.computeFocusRenderIds(
          focal,
          this.focusDepth,
          validIds,
          visibleEntities,
        );
        if (renderIds.size !== validIds.size) {
          const byId = this.vault.entities;
          const renderEntities: Entity[] = [];
          for (const id of renderIds) {
            const entity = byId[id];
            if (entity) renderEntities.push(entity);
          }
          return GraphTransformer.entitiesToElements(renderEntities, renderIds);
        }
      }
    }

    return GraphTransformer.entitiesToElements(visibleEntities, validIds);
  });

  fitRequest = $state(0);

  // Labels state
  showLabels = $state(true);
  showImages = $state(true);
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

  // Saved view presets for the active vault
  viewPresets = $state<GraphViewPreset[]>([]);

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

  /**
   * Picks the focus node for culling: the selected entity when it's visible,
   * otherwise the highest-degree hub among visible entities so there's always a
   * sensible default view before the user selects anything.
   */
  private resolveFocalId(
    visibleEntities: Entity[],
    validIds: Set<string>,
  ): string | null {
    const selected = this.vault.selectedEntityId;
    if (selected && validIds.has(selected)) return selected;

    const inbound = this.vault.inboundConnections ?? {};
    let bestId: string | null = null;
    let bestDegree = -1;
    for (let i = 0; i < visibleEntities.length; i++) {
      const entity = visibleEntities[i];
      let degree = inbound[entity.id]?.length ?? 0;
      const connections = entity.connections;
      if (connections) {
        for (let j = 0; j < connections.length; j++) {
          if (validIds.has(connections[j].target)) degree++;
        }
      }
      if (degree > bestDegree) {
        bestDegree = degree;
        bestId = entity.id;
      }
    }
    return bestId;
  }

  private get graphSourceEntities(): Entity[] {
    return ((this.vault as any).graphEntities ??
      this.vault.allEntities) as Entity[];
  }

  private get graphStructureVersion(): number {
    return (this.vault as any).graphStructureVersion ?? 0;
  }

  private getFocusTargetCount(depth: number, visibleCount: number): number {
    const finiteDepth = Number.isFinite(depth) ? depth : MIN_FOCUS_DEPTH;
    const level = Math.min(
      MAX_FOCUS_DEPTH,
      Math.max(MIN_FOCUS_DEPTH, Math.trunc(finiteDepth)),
    );
    return Math.min(
      visibleCount,
      FOCUS_BASE_COUNT * 2 ** (level - MIN_FOCUS_DEPTH),
    );
  }

  /**
   * Breadth-first collection around `focalId`, capped by the detail level's
   * target count. If the connected focus neighborhood is too sparse, fill the
   * remaining slots with visible high-degree nodes so large vaults do not open
   * on a nearly empty canvas.
   */
  private computeFocusRenderIds(
    focalId: string,
    depth: number,
    validIds: Set<string>,
    visibleEntities: Entity[],
  ): Set<string> {
    const targetCount = this.getFocusTargetCount(depth, validIds.size);
    const result = new Set<string>([focalId]);
    let frontier: string[] = [focalId];
    const inbound = this.vault.inboundConnections ?? {};
    const entities = this.vault.entities;

    // BFS outward until either the target render count is reached or the
    // reachable neighborhood is exhausted. `depth` is a detail *level*
    // (see getFocusTargetCount), not a hop count, so it must not cap the
    // traversal here — doing so stopped sparse neighborhoods short and
    // jumped straight to high-degree filler nodes instead of continuing
    // outward to the closest reachable ones.
    while (frontier.length > 0) {
      const next: string[] = [];
      for (const id of frontier) {
        const connections = entities[id]?.connections;
        if (connections) {
          for (let j = 0; j < connections.length; j++) {
            const target = connections[j].target;
            if (validIds.has(target) && !result.has(target)) {
              result.add(target);
              if (result.size >= targetCount) return result;
              next.push(target);
            }
          }
        }
        const ins = inbound[id];
        if (ins) {
          for (let j = 0; j < ins.length; j++) {
            const source = ins[j].sourceId;
            if (validIds.has(source) && !result.has(source)) {
              result.add(source);
              if (result.size >= targetCount) return result;
              next.push(source);
            }
          }
        }
      }
      frontier = next;
    }
    this.fillFocusRenderIds(result, visibleEntities, validIds, targetCount);
    return result;
  }

  private fillFocusRenderIds(
    result: Set<string>,
    visibleEntities: Entity[],
    validIds: Set<string>,
    targetCount: number,
  ) {
    if (result.size >= targetCount) return;

    const inbound = this.vault.inboundConnections ?? {};
    const candidates: { id: string; degree: number; index: number }[] = [];
    for (let i = 0; i < visibleEntities.length; i++) {
      const entity = visibleEntities[i];
      if (result.has(entity.id)) continue;
      let degree = inbound[entity.id]?.length ?? 0;
      const connections = entity.connections;
      if (connections) {
        for (let j = 0; j < connections.length; j++) {
          if (validIds.has(connections[j].target)) degree++;
        }
      }
      candidates.push({ id: entity.id, degree, index: i });
    }

    candidates.sort((a, b) => b.degree - a.degree || a.index - b.index);
    for (let i = 0; i < candidates.length && result.size < targetCount; i++) {
      result.add(candidates[i].id);
    }
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

  async init() {
    if (this._initPromise) {
      return this._initPromise;
    }

    this._initPromise = this.loadPersistedState();
    return this._initPromise;
  }

  private async loadPersistedState() {
    const db = await getDB();
    const savedEras = await db.getAll("world_eras");
    if (savedEras) {
      this.eras = savedEras;
    }

    const savedShowLabels = await db.get("settings", "graphShowLabels");
    if (savedShowLabels !== undefined) {
      this.showLabels = savedShowLabels;
    }

    const savedShowImages = await db.get("settings", "graphShowImages");
    if (savedShowImages !== undefined) {
      this.showImages = savedShowImages;
    }

    const savedStableLayout = await db.get("settings", "graphStableLayout");
    if (savedStableLayout !== undefined) {
      this.stableLayout = savedStableLayout;
    }

    const savedRecentLabels = await db.get("settings", "graphRecentLabels");
    if (savedRecentLabels !== undefined) {
      this.recentLabels = savedRecentLabels;
    }

    const savedLabelFilterMode = await db.get(
      "settings",
      "graphLabelFilterMode",
    );
    if (savedLabelFilterMode !== undefined) {
      this.labelFilterMode = savedLabelFilterMode;
    }

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
        // Keep timelineMode as it's a global preference usually
        void this.loadViewPresets();
      };
      window.addEventListener("vault-switched", this._vaultSwitchHandler);
    }
  }

  // ── View presets ────────────────────────────────────────────────────────

  private get viewPresetsKey() {
    return presetsSettingsKey(this.vault.activeVaultId ?? "default");
  }

  async loadViewPresets() {
    try {
      const db = await getDB();
      const raw = await db.get("settings", this.viewPresetsKey);
      this.viewPresets = parsePresets(raw);
    } catch (error) {
      console.error("[GraphStore] Failed to load graph view presets:", error);
      this.viewPresets = [];
    }
  }

  private async persistViewPresets() {
    try {
      const db = await getDB();
      await db.put(
        "settings",
        $state.snapshot(this.viewPresets),
        this.viewPresetsKey,
      );
    } catch (error) {
      console.error(
        "[GraphStore] Failed to persist graph view presets:",
        error,
      );
    }
  }

  captureViewState(viewport?: {
    pan: { x: number; y: number };
    zoom: number;
  }): GraphViewPresetState {
    return {
      activeLabels: Array.from(this.activeLabels),
      labelFilterMode: this.labelFilterMode,
      activeCategories: Array.from(this.activeCategories),
      showLabels: this.showLabels,
      showImages: this.showImages,
      stableLayout: this.stableLayout,
      timelineMode: this.timelineMode,
      timelineAxis: this.timelineAxis,
      timelineRange: { ...this.timelineRange },
      timelineScale: this.timelineScale,
      orbitMode: this.orbitMode,
      centralNodeId: this.centralNodeId,
      viewport,
    };
  }

  async saveViewPreset(
    name: string,
    viewport?: { pan: { x: number; y: number }; zoom: number },
  ): Promise<GraphViewPreset | null> {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const now = Date.now();
    const preset: GraphViewPreset = {
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `preset-${now}-${Math.random().toString(36).slice(2, 8)}`,
      name: trimmed,
      createdAt: now,
      updatedAt: now,
      state: this.captureViewState(viewport),
    };
    this.viewPresets = [...this.viewPresets, preset];
    await this.persistViewPresets();
    return preset;
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
  applyViewPreset(
    id: string,
  ): { preset: GraphViewPreset; modeChanged: boolean } | null {
    const preset = this.viewPresets.find((p) => p.id === id);
    if (!preset) return null;
    const s = preset.state;

    const entities = this.vault.allEntities;
    let labels = s.activeLabels;
    let categories = s.activeCategories;
    let centralNodeId = s.centralNodeId;
    if (entities.length > 0) {
      const existingLabels = new Set<string>();
      const existingCategories = new Set<string>();
      const existingIds = new Set<string>();
      for (const e of entities) {
        existingIds.add(e.id);
        if (e.type) existingCategories.add(e.type);
        for (const l of e.labels ?? []) existingLabels.add(l.toLowerCase());
      }
      labels = labels.filter((l) => existingLabels.has(l.toLowerCase()));
      categories = categories.filter((c) => existingCategories.has(c));
      if (centralNodeId && !existingIds.has(centralNodeId)) {
        centralNodeId = null;
      }
    }

    const wasTimeline = this.timelineMode;
    const wasOrbit = this.orbitMode;

    this.activeLabels = new Set(labels);
    this.labelFilterMode = s.labelFilterMode;
    this.activeCategories = new Set(categories);
    this.showLabels = s.showLabels;
    this.showImages = s.showImages;
    this.stableLayout = s.stableLayout;
    this.timelineAxis = s.timelineAxis;
    this.timelineRange = { ...s.timelineRange };
    this.timelineScale = s.timelineScale;
    this.timelineMode = s.timelineMode;
    this.centralNodeId = centralNodeId;
    this.orbitMode = s.orbitMode && centralNodeId !== null;

    const modeChanged =
      wasTimeline !== this.timelineMode || wasOrbit !== this.orbitMode;
    return { preset, modeChanged };
  }

  async renameViewPreset(id: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    this.viewPresets = this.viewPresets.map((p) =>
      p.id === id ? { ...p, name: trimmed, updatedAt: Date.now() } : p,
    );
    await this.persistViewPresets();
  }

  async deleteViewPreset(id: string) {
    this.viewPresets = this.viewPresets.filter((p) => p.id !== id);
    await this.persistViewPresets();
  }

  resetView() {
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
  }

  async saveEras() {
    const db = await getDB();
    const tx = db.transaction("world_eras", "readwrite");
    await tx.store.clear();
    for (const era of $state.snapshot(this.eras)) {
      await tx.store.put(era);
    }
    await tx.done;
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
    const newValue = !this.showLabels;
    this.showLabels = newValue;
    try {
      const db = await getDB();
      await db.put("settings", newValue, "graphShowLabels");
    } catch (error) {
      console.error("[GraphStore] Failed to persist graphShowLabels:", error);
    }
  }

  async toggleImages() {
    const newValue = !this.showImages;
    this.showImages = newValue;
    try {
      const db = await getDB();
      await db.put("settings", newValue, "graphShowImages");
    } catch (error) {
      console.error("[GraphStore] Failed to persist graphShowImages:", error);
    }
  }

  async toggleStableLayout() {
    const newValue = !this.stableLayout;
    this.stableLayout = newValue;
    try {
      const db = await getDB();
      await db.put("settings", newValue, "graphStableLayout");
    } catch (error) {
      console.error("[GraphStore] Failed to persist graphStableLayout:", error);
    }
  }

  async toggleLabelFilterMode() {
    const newValue = this.labelFilterMode === "OR" ? "AND" : "OR";
    this.labelFilterMode = newValue;
    try {
      const db = await getDB();
      await db.put("settings", newValue, "graphLabelFilterMode");
    } catch (error) {
      console.error(
        "[GraphStore] Failed to persist graphLabelFilterMode:",
        error,
      );
    }
  }

  async addRecentLabel(label: string) {
    const normalized = label.trim().toLowerCase();
    if (!normalized) return;

    // Move to top, remove existing
    const updated = [
      normalized,
      ...this.recentLabels.filter((l) => l !== normalized),
    ].slice(0, 5);

    this.recentLabels = updated;
    try {
      const db = await getDB();
      await db.put("settings", updated, "graphRecentLabels");
    } catch (error) {
      console.error("[GraphStore] Failed to persist graphRecentLabels:", error);
    }
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
