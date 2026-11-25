import { describe, expect, it, vi } from "vitest";
import { createLazyOracleGraph } from "./lazy-graph-store.js";

describe("lazy Oracle graph", () => {
  it("loads graph state only when the Oracle requests a fit", async () => {
    const requestFit = vi.fn();
    const loadGraph = vi.fn().mockResolvedValue({ requestFit });
    const graph = createLazyOracleGraph(loadGraph);

    expect(loadGraph).not.toHaveBeenCalled();
    await graph.requestFit();
    expect(loadGraph).toHaveBeenCalledOnce();
    expect(requestFit).toHaveBeenCalledOnce();
  });

  it("propagates graph-load failures through the Oracle action", async () => {
    const graph = createLazyOracleGraph(
      vi.fn().mockRejectedValue(new Error("Graph chunk unavailable")),
    );

    await expect(graph.requestFit()).rejects.toThrow("Graph chunk unavailable");
  });
});
