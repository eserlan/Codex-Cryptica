import { vault } from "./vault.svelte";
import { ui } from "./ui.svelte";
import { GraphTransformer } from "graph-engine";
import { isEntityVisible, type Era } from "schema";
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

    const visibleEntities = allEntities.filter((entity) =>
      isEntityVisible(entity, settings),
    );

    return GraphTransformer.entitiesToElements(visibleEntities);
  });

  fitRequest = $state(0);

  // Labels state
  showLabels = $state(true);

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

  stats = $derived({
    nodeCount: this.elements.filter((e) => e.group === "nodes").length,
    edgeCount: this.elements.filter((e) => e.group === "edges").length,
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

  toggleLabels() {
    this.showLabels = !this.showLabels;
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
