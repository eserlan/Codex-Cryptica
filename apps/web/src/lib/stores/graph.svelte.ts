import { vault } from "./vault.svelte";
import { GraphTransformer, getTimelineLayout, type GraphNode } from "graph-engine";
import type { Core } from "cytoscape";
import type { Era } from "schema";
import { getDB } from "../utils/idb";

class GraphStore {
  // Svelte 5 derived state
  activeLabels = $state(new Set<string>());

  elements = $derived.by(() => {
    const entities = vault.allEntities;
    return GraphTransformer.entitiesToElements(entities);
  });

  fitRequest = $state(0);
  
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

  applyTimelineLayout(cy: Core) {
    const nodes = this.elements.filter((e) => e.group === "nodes") as unknown as GraphNode[];
    const positions = getTimelineLayout(nodes, {
      axis: this.timelineAxis,
      scale: this.timelineScale,
      jitter: 150, // Standard separation for concurrent events
    });

    cy.layout({
      name: "preset",
      positions: positions,
      animate: true,
      animationDuration: 500,
      padding: 100,
    }).run();
  }
}

export const graph = new GraphStore();
