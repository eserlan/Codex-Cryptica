import { describe, it, expect, vi } from "vitest";
import { initGraph } from "./index";
import cytoscape from "cytoscape";

vi.mock("cytoscape", () => {
  const mockCy = vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
  }));
  (mockCy as any).use = vi.fn();
  return {
    default: mockCy,
  };
});

describe("initGraph adaptive zoom", () => {
  it("should calculate higher minZoom for small graphs", async () => {
    await initGraph({
      container: document.createElement("div"),
      elements: [
        { group: "nodes", data: { id: "1" } },
        { group: "nodes", data: { id: "2" } },
      ],
    });

    const callArgs = (cytoscape as any).mock.calls[0][0];
    // nodeCount = 2
    // minZoom = max(0.05, 0.3 - 2 * 0.0005) = 0.299
    expect(callArgs.minZoom).toBeCloseTo(0.299, 3);
  });

  it("should calculate lower minZoom for large graphs", async () => {
    const manyNodes = Array.from({ length: 1000 }, (_, i) => ({
      group: "nodes",
      data: { id: i.toString() },
    }));

    await initGraph({
      container: document.createElement("div"),
      elements: manyNodes as any,
    });

    const callArgs = (cytoscape as any).mock.calls[1][0];
    // nodeCount = 1000
    // minZoom = max(0.05, 0.3 - 1000 * 0.0005) = max(0.05, -0.2) = 0.05
    expect(callArgs.minZoom).toBe(0.05);
  });

  it("should calculate higher maxZoom for large graphs", async () => {
    const manyNodes = Array.from({ length: 1000 }, (_, i) => ({
      group: "nodes",
      data: { id: i.toString() },
    }));

    await initGraph({
      container: document.createElement("div"),
      elements: manyNodes as any,
    });

    const callArgs = (cytoscape as any).mock.calls[2][0];
    // nodeCount = 1000
    // maxZoom = min(10.0, 1.2 + 1000 * 0.005) = min(10.0, 6.2) = 6.2
    expect(callArgs.maxZoom).toBe(6.2);
  });
});
