import { vault } from "./vault.svelte";
import { GraphTransformer } from "graph-engine";

class GraphStore {
  // Svelte 5 derived state
  elements = $derived(GraphTransformer.entitiesToElements(vault.allEntities));

  fitRequest = $state(0);

  stats = $derived({
    nodeCount: this.elements.filter((e) => e.group === "nodes").length,
    edgeCount: this.elements.filter((e) => e.group === "edges").length,
  });

  requestFit() {
    this.fitRequest++;
  }
}

export const graph = new GraphStore();
