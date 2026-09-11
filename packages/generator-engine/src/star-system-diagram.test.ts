import { describe, it, expect } from "vitest";
import {
  buildStarSystemDiagram,
  colorForBodyType,
} from "./star-system-diagram";
import type { StarSystemBody } from "./public-star-system";

describe("buildStarSystemDiagram", () => {
  it("places the star at the left edge and every body to its right", () => {
    const bodies: StarSystemBody[] = [
      { name: "Icarus Reach", type: "Scorched Rockball" },
      { name: "Sovereign-4", type: "Temperate World" },
      { name: "The Bastion", type: "Derelict Station" },
    ];
    const layout = buildStarSystemDiagram(bodies);

    expect(layout.nodes).toHaveLength(bodies.length);
    for (const node of layout.nodes) {
      expect(node.x).toBeGreaterThan(layout.star.x + layout.star.radius);
    }
    // Primaries stay in list order left-to-right.
    const xs = layout.nodes.map((n) => n.x);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
  });

  it("positions a moon near its named parent instead of at the end of the line", () => {
    const bodies: StarSystemBody[] = [
      { name: "Halyard's Reach", type: "Gas Giant" },
      {
        name: "Halyard's Moon",
        type: "Barren Moon",
        parentName: "Halyard's Reach",
      },
      { name: "Corvane", type: "Temperate World" },
    ];
    const layout = buildStarSystemDiagram(bodies);
    const parent = layout.nodes.find((n) => n.name === "Halyard's Reach")!;
    const moon = layout.nodes.find((n) => n.name === "Halyard's Moon")!;
    const other = layout.nodes.find((n) => n.name === "Corvane")!;

    expect(moon.isMoon).toBe(true);
    expect(Math.abs(moon.x - parent.x)).toBeLessThan(
      Math.abs(other.x - parent.x),
    );
    expect(moon.y).not.toBe(parent.y);
  });

  it("stacks multiple moons directly below their parent in a straight vertical line", () => {
    const bodies: StarSystemBody[] = [
      { name: "Halyard's Reach", type: "Gas Giant" },
      {
        name: "Halyard's Moon I",
        type: "Barren Moon",
        parentName: "Halyard's Reach",
      },
      {
        name: "Halyard's Moon II",
        type: "Frozen Moon",
        parentName: "Halyard's Reach",
      },
    ];
    const layout = buildStarSystemDiagram(bodies);
    const parent = layout.nodes.find((n) => n.name === "Halyard's Reach")!;
    const moon1 = layout.nodes.find((n) => n.name === "Halyard's Moon I")!;
    const moon2 = layout.nodes.find((n) => n.name === "Halyard's Moon II")!;

    expect(moon1.x).toBe(parent.x);
    expect(moon2.x).toBe(parent.x);
    expect(moon1.y).toBeGreaterThan(parent.y);
    expect(moon2.y).toBeGreaterThan(moon1.y);
  });

  it("drops a stellar body accidentally included in the list and doesn't let it eat its own children as moons", () => {
    // Reproduces a real AI draft: the star ("Aureon Prime") was listed as a
    // body, and its planets pointed parentName at the star instead of
    // leaving it empty — without the fix, every planet becomes a phantom
    // "moon" of the star-as-planet, and their real satellites orphan.
    const bodies: StarSystemBody[] = [
      { name: "Aureon Prime", type: "G-type Yellow Dwarf" },
      {
        name: "Verdant-4",
        type: "Temperate World",
        parentName: "Aureon Prime",
      },
      {
        name: "Calyx Station",
        type: "Orbital Habitat",
        parentName: "Verdant-4",
      },
      { name: "Nereus", type: "Ice Giant", parentName: "Aureon Prime" },
      { name: "Tritonis", type: "Frozen Moon", parentName: "Nereus" },
    ];
    const layout = buildStarSystemDiagram(bodies);

    expect(layout.nodes.map((n) => n.name)).not.toContain("Aureon Prime");
    expect(layout.nodes).toHaveLength(4);

    const verdant = layout.nodes.find((n) => n.name === "Verdant-4")!;
    const calyx = layout.nodes.find((n) => n.name === "Calyx Station")!;
    const nereus = layout.nodes.find((n) => n.name === "Nereus")!;
    const tritonis = layout.nodes.find((n) => n.name === "Tritonis")!;

    // Verdant-4 and Nereus lost their (dropped) star parent, so they're
    // primaries on the main line, not stacked under each other.
    expect(verdant.isMoon).toBe(false);
    expect(nereus.isMoon).toBe(false);
    expect(verdant.y).toBe(nereus.y);

    // Their real satellites still nest correctly under them.
    expect(calyx.isMoon).toBe(true);
    expect(calyx.x).toBe(verdant.x);
    expect(tritonis.isMoon).toBe(true);
    expect(tritonis.x).toBe(nereus.x);
  });

  it("ignores a parentName that doesn't match any body in the list", () => {
    const bodies: StarSystemBody[] = [
      { name: "Corvane", type: "Temperate World", parentName: "Nonexistent" },
    ];
    const layout = buildStarSystemDiagram(bodies);
    expect(layout.nodes).toHaveLength(1);
    expect(layout.nodes[0].isMoon).toBe(false);
  });

  it("is deterministic for the same input", () => {
    const bodies: StarSystemBody[] = [
      { name: "A", type: "Ocean World" },
      { name: "B", type: "Ice Giant" },
    ];
    expect(buildStarSystemDiagram(bodies)).toEqual(
      buildStarSystemDiagram(bodies),
    );
  });

  it("widens to fit more bodies", () => {
    const small = buildStarSystemDiagram([{ name: "A", type: "Ocean World" }]);
    const large = buildStarSystemDiagram([
      { name: "A", type: "Ocean World" },
      { name: "B", type: "Ice Giant" },
      { name: "C", type: "Gas Giant" },
    ]);
    expect(large.width).toBeGreaterThan(small.width);
  });

  it("returns an empty node list for no bodies", () => {
    const layout = buildStarSystemDiagram([]);
    expect(layout.nodes).toHaveLength(0);
    expect(layout.star.radius).toBeGreaterThan(0);
    expect(layout.auGridlines).toHaveLength(0);
  });

  it("positions primaries proportionally to their real distanceAU, not just list order", () => {
    const bodies: StarSystemBody[] = [
      { name: "Ember's Reach", type: "Scorched Rockball", distanceAU: 0.4 },
      { name: "Verdant-4", type: "Temperate World", distanceAU: 1.2 },
      { name: "Outer Drift", type: "Ice Giant", distanceAU: 18 },
    ];
    const layout = buildStarSystemDiagram(bodies);
    const inner = layout.nodes.find((n) => n.name === "Ember's Reach")!;
    const mid = layout.nodes.find((n) => n.name === "Verdant-4")!;
    const outer = layout.nodes.find((n) => n.name === "Outer Drift")!;

    expect(inner.distanceAU).toBe(0.4);
    expect(mid.distanceAU).toBe(1.2);
    expect(outer.distanceAU).toBe(18);
    // The mid->outer gap (16.8 AU) is much larger than the inner->mid gap
    // (0.8 AU, dominated by minimum-spacing padding at this scale), so it
    // must still show up as a clearly larger pixel gap.
    expect(outer.x - mid.x).toBeGreaterThan((mid.x - inner.x) * 2);
  });

  it("re-orders bodies whose distanceAU disagrees with their list order", () => {
    const bodies: StarSystemBody[] = [
      { name: "Farflung", type: "Ice Giant", distanceAU: 20 },
      { name: "Nearhome", type: "Temperate World", distanceAU: 1 },
    ];
    const layout = buildStarSystemDiagram(bodies);
    const near = layout.nodes.find((n) => n.name === "Nearhome")!;
    const far = layout.nodes.find((n) => n.name === "Farflung")!;
    expect(near.x).toBeLessThan(far.x);
  });

  it("nudges apart two primaries whose distanceAU values are too close to fit", () => {
    const bodies: StarSystemBody[] = [
      { name: "Rockball I", type: "Gas Giant", distanceAU: 5 },
      { name: "Rockball II", type: "Gas Giant", distanceAU: 5.05 },
    ];
    const layout = buildStarSystemDiagram(bodies);
    const a = layout.nodes.find((n) => n.name === "Rockball I")!;
    const b = layout.nodes.find((n) => n.name === "Rockball II")!;
    expect(b.x - a.x).toBeGreaterThanOrEqual(a.radius + b.radius);
  });

  it("nudges apart two primaries whose long names would otherwise overlap, even with small radii and well-separated AUs", () => {
    // Reproduces a real diagram: two small-radius primaries close enough in
    // AU that radius-only spacing left their long name labels overlapping.
    const bodies: StarSystemBody[] = [
      { name: "Fort Halden", type: "Scorched Rockball", distanceAU: 16.9 },
      { name: "Vantage Deep V", type: "Asteroid Belt", distanceAU: 17.4 },
    ];
    const layout = buildStarSystemDiagram(bodies);
    const a = layout.nodes.find((n) => n.name === "Fort Halden")!;
    const b = layout.nodes.find((n) => n.name === "Vantage Deep V")!;

    // Rough label half-widths at the diagram's ~5.6px/char, 10px-font estimate.
    const aHalfWidth = (a.name.length * 5.6) / 2;
    const bHalfWidth = (b.name.length * 5.6) / 2;
    expect(b.x - a.x).toBeGreaterThan(aHalfWidth + bHalfWidth);
  });

  it("falls back to synthetic increasing AU (list order) when distanceAU is absent", () => {
    const bodies: StarSystemBody[] = [
      { name: "A", type: "Temperate World" },
      { name: "B", type: "Ice Giant" },
    ];
    const layout = buildStarSystemDiagram(bodies);
    const a = layout.nodes.find((n) => n.name === "A")!;
    const b = layout.nodes.find((n) => n.name === "B")!;
    expect(a.distanceAU).toBe(1);
    expect(b.distanceAU).toBe(2);
    expect(a.x).toBeLessThan(b.x);
  });

  it("builds AU gridlines scaled consistently with body positions, up to the outermost body", () => {
    const bodies: StarSystemBody[] = [
      { name: "Inner", type: "Temperate World", distanceAU: 1 },
      { name: "Outer", type: "Ice Giant", distanceAU: 18 },
    ];
    const layout = buildStarSystemDiagram(bodies);
    expect(layout.auGridlines.length).toBeGreaterThan(1);
    // Gridlines strictly increase in both AU and pixel position.
    for (let i = 1; i < layout.auGridlines.length; i++) {
      expect(layout.auGridlines[i].au).toBeGreaterThan(
        layout.auGridlines[i - 1].au,
      );
      expect(layout.auGridlines[i].x).toBeGreaterThan(
        layout.auGridlines[i - 1].x,
      );
    }
    const lastGridline = layout.auGridlines[layout.auGridlines.length - 1];
    expect(lastGridline.au).toBeGreaterThanOrEqual(18);
    expect(layout.width).toBeGreaterThanOrEqual(lastGridline.x);
  });
});

describe("colorForBodyType", () => {
  it("gives distinct colors to different recognized body types", () => {
    const gasGiant = colorForBodyType("Gas Giant");
    const oceanWorld = colorForBodyType("Ocean World");
    const iceGiant = colorForBodyType("Ice Giant");
    expect(gasGiant).toBeTruthy();
    expect(oceanWorld).toBeTruthy();
    expect(iceGiant).toBeTruthy();
    expect(new Set([gasGiant, oceanWorld, iceGiant]).size).toBe(3);
  });

  it("returns undefined for a type with no known match", () => {
    expect(colorForBodyType("Some Invented AI Type")).toBeUndefined();
  });

  it("is deterministic for the same type", () => {
    expect(colorForBodyType("Temperate World")).toBe(
      colorForBodyType("Temperate World"),
    );
  });
});
