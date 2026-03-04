import { vault } from "./vault.svelte";
import { ui } from "./ui.svelte";
import { GraphTransformer } from "graph-engine";
import { isEntityVisible, type Era, type Entity } from "schema";
import { getDB } from "../utils/idb";

class GraphStore {
  // Svelte 5 derived state
  activeLabels = $state(new Set<string>());

  elements = $derived.by(() => {
    const allEntities = vault.allEntities;
    const settings = {
      sharedMode: ui.sharedMode,
      defaultVisibility: vault.defaultVisibility,
    };

    // DEBUG VISIBILITY
    if (vault.isGuest) {
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
  stableLayout = $state(true);

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

    const savedStableLayout = await db.get("settings", "graphStableLayout");
    if (savedStableLayout !== undefined) {
      this.stableLayout = savedStableLayout;
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
    if (this.activeLabels.has(label)) {
      this.activeLabels.delete(label);
    } else {
      this.activeLabels.add(label);
    }
    // Svelte Set reactivity trigger
    this.activeLabels = new Set(this.activeLabels);
  }

  clearLabelFilters() {
    this.activeLabels = new Set();
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

export const graph = new GraphStore();
