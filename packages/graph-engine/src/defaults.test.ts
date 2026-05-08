import { describe, it, expect } from "vitest";
import { getDynamicLayoutOptions } from "./defaults";

describe("getDynamicLayoutOptions", () => {
  it("returns higher gravity for smaller graphs", () => {
    const small = getDynamicLayoutOptions(50);
    const large = getDynamicLayoutOptions(300);
    expect(small.gravity).toBeGreaterThan(large.gravity);
  });

  it("gravity never falls below minimum floor", () => {
    expect(getDynamicLayoutOptions(1000).gravity).toBeGreaterThanOrEqual(0.005);
  });

  it("gravity never exceeds base cap", () => {
    expect(getDynamicLayoutOptions(1).gravity).toBeLessThanOrEqual(0.05);
  });

  it("repulsion scales with node count", () => {
    const small = getDynamicLayoutOptions(50);
    const large = getDynamicLayoutOptions(300);
    expect(large.nodeRepulsion).toBeGreaterThan(small.nodeRepulsion);
  });

  it("repulsion is capped at 1600000", () => {
    expect(getDynamicLayoutOptions(10000).nodeRepulsion).toBe(1600000);
  });

  it("uses draft quality for graphs over 500 nodes", () => {
    expect(getDynamicLayoutOptions(501).quality).toBe("draft");
    expect(getDynamicLayoutOptions(499).quality).toBe("default");
  });

  it("separation and edgeLength scale with node count", () => {
    const small = getDynamicLayoutOptions(50);
    const large = getDynamicLayoutOptions(300);
    expect(large.nodeSeparation).toBeGreaterThan(small.nodeSeparation);
    expect(large.idealEdgeLength).toBeGreaterThan(small.idealEdgeLength);
  });
});
