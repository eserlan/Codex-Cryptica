import { describe, it, expect } from "vitest";
import {
  BRIDGE_EDGE_LENGTH,
  communityEdgeShape,
  COMMUNITY_EDGE_LENGTH,
  degreeRepulsion,
  getDynamicLayoutOptions,
  LEAF_EDGE_LENGTH,
} from "./defaults";

describe("getDynamicLayoutOptions", () => {
  it("solves at full quality for anything shown in full", () => {
    expect(getDynamicLayoutOptions(50).quality).toBe("default");
    expect(getDynamicLayoutOptions(3000).quality).toBe("default");
  });

  it("falls back to draft quality past the large-graph limit (negative)", () => {
    expect(getDynamicLayoutOptions(3001).quality).toBe("draft");
  });
});

describe("communityEdgeShape", () => {
  it("keeps edges inside a community short and stiff, and leaves closest", () => {
    expect(communityEdgeShape(true, 3)).toEqual({
      idealLength: COMMUNITY_EDGE_LENGTH,
      elasticity: 0.6,
    });
    expect(communityEdgeShape(true, 1).idealLength).toBe(LEAF_EDGE_LENGTH);
  });

  it("makes edges between communities long and loose", () => {
    const bridge = communityEdgeShape(false, 1);
    expect(bridge.idealLength).toBe(BRIDGE_EDGE_LENGTH);
    expect(bridge.elasticity).toBeLessThan(0.6);
  });
});

describe("degreeRepulsion", () => {
  it("pushes hubs harder, up to a cap", () => {
    expect(degreeRepulsion(16)).toBeGreaterThan(degreeRepulsion(1));
    expect(degreeRepulsion(10000)).toBe(degreeRepulsion(100000));
  });
});
