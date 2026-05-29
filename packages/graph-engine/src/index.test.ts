import { describe, it, expect } from "vitest";
import { initGraph } from "./index";

describe("initGraph adaptive zoom", () => {
  it("should calculate higher minZoom for small graphs", async () => {
    const cy = await initGraph({
      headless: true,
      elements: [
        { group: "nodes", data: { id: "1" } },
        { group: "nodes", data: { id: "2" } },
      ],
    });

    // nodeCount = 2
    // minZoom = max(0.05, 0.3 - 2 * 0.0005) = 0.299
    expect(cy.minZoom()).toBeCloseTo(0.299, 3);
  });

  it("should calculate lower minZoom for large graphs", async () => {
    const manyNodes = Array.from({ length: 1000 }, (_, i) => ({
      group: "nodes",
      data: { id: i.toString() },
    }));

    const cy = await initGraph({
      headless: true,
      elements: manyNodes as any,
    });

    // nodeCount = 1000
    // minZoom = max(0.01, 0.3 - 1000 * 0.0005) = max(0.01, -0.2) = 0.01
    expect(cy.minZoom()).toBe(0.01);
  });

  it("should use a constant maxZoom of 9.0", async () => {
    const manyNodes = Array.from({ length: 1000 }, (_, i) => ({
      group: "nodes",
      data: { id: i.toString() },
    }));

    const cy = await initGraph({
      headless: true,
      elements: manyNodes as any,
    });

    // maxZoom is now constant 9.0
    expect(cy.maxZoom()).toBe(9.0);
  });

  it("should configure wheelSensitivity to 1.0 for smoother scrolling", async () => {
    const cy = await initGraph({
      headless: true,
      elements: [],
    });

    expect((cy as any)._private?.options?.wheelSensitivity).toBe(1.0);
  });
});
