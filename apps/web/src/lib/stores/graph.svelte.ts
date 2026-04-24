import { vault as defaultVault } from "./vault.svelte";
import { ui as defaultUi } from "./ui.svelte";
import { GraphTransformer } from "graph-engine";
import { isEntityVisible, type Era, type Entity } from "schema";
import { getDB } from "../utils/idb";

export class GraphStore {
  // Dependencies
  private _vault?: typeof defaultVault;
  private _ui?: typeof defaultUi;

  private get vault() {
    return this._vault ?? defaultVault;
  }

  private get ui() {
    return this._ui ?? defaultUi;
  }

  constructor(vault?: typeof defaultVault, ui?: typeof defaultUi) {
    this._vault = vault;
    this._ui = ui;
  }

  // Svelte 5 derived state
  get activeLabels() {
    return this.ui.labelFilters;
  }
  set activeLabels(value: Set<string>) {
    this.ui.labelFilters = value;
  }
  activeCategories = $state(new Set<string>());

  elements = $derived.by(() => {
    const allEntities = this.vault.allEntities;
    const settings = {
      sharedMode: this.ui.sharedMode,
      defaultVisibility: this.vault.defaultVisibility,
    };

    // DEBUG VISIBILITY
    if (this.vault.isGuest) {
      console.log("[GraphStore] Visibility Check:", {
        settings,
        totalEntities: allEntities.length,
        sampleEntity: allEntities[0]
          ? {
              id: allEntities[0].id,
              tags: allEntities[0].tags,
              visible: isEntityVisible(allEntities[0], settings),
            }
          : "none",
      });
    }

    // OPTIMIZATION: Build visible list and valid ID set in a single pass
    // to avoid multiple iterations and array allocations.
    // Also passes validIds to GraphTransformer to skip set reconstruction.
    const visibleEntities: Entity[] = [];
    const validIds = new Set<string>();

    const count = allEntities.length;
    for (let i = 0; i < count; i++) {
      const entity = allEntities[i];
      if (isEntityVisible(entity, settings)) {
        visibleEntities.push(entity);
        validIds.add(entity.id);
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

  requestFit() {
    this.fitRequest++;
  }

  async init() {
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

    if (typeof window !== "undefined") {
      window.addEventListener("vault-switched", () => {
        this.clearLabelFilters();
        this.clearCategoryFilters();
        this.orbitMode = false;
        this.centralNodeId = null;
        // Keep timelineMode as it's a global preference usually
      });
    }
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
    this.ui.toggleLabelFilter(label, this.ui.isModifierPressed);
  }

  clearLabelFilters() {
    this.ui.clearLabelFilters();
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
