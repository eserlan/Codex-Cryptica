type GraphStore = typeof import("../graph.svelte").graph;

export function createLazyOracleGraph(
  loadGraph: () => Promise<GraphStore> = async () =>
    (await import("../graph.svelte")).graph,
): GraphStore {
  return {
    requestFit: async () => (await loadGraph()).requestFit(),
  } as unknown as GraphStore;
}
