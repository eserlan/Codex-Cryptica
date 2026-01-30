import { describe, it, expect, beforeEach } from "vitest";
import { MemoryAdapter } from "./memory-adapter";
import type { SerializedGraph } from "./types";

describe("MemoryAdapter", () => {
  let adapter: MemoryAdapter;
  const mockGraph: SerializedGraph = {
    version: 1,
    entities: {
      "e1": { id: "e1", title: "Test Entity", type: "note", content: "Content" } as any
    }
  };

  beforeEach(() => {
    adapter = new MemoryAdapter();
  });

  it("should initialize empty", async () => {
    await adapter.init();
    const graph = await adapter.loadGraph();
    expect(graph).toBeNull();
  });

  it("should hydrate and return graph", async () => {
    adapter.hydrate(mockGraph);
    const graph = await adapter.loadGraph();
    expect(graph).toEqual(mockGraph);
  });

  it("should save graph to memory", async () => {
    await adapter.saveGraph(mockGraph);
    const graph = await adapter.loadGraph();
    expect(graph).toEqual(mockGraph);
  });

  it("should report read-only status correctly", () => {
    expect(adapter.isReadOnly()).toBe(true);
  });
});
