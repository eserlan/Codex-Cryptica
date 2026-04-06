import { writable } from "svelte/store";
import type { GraphNode } from "schema";

// Migrating from Zustand to Svelte stores for simplicity in the Svelte app
export const nodes = writable<GraphNode[]>([]);

export const addNode = (node: GraphNode) => {
  nodes.update((n) => [...n, node]);
};
