import { describe, expect, it } from "vitest";
import cytoscape from "cytoscape";
import {
  attachCommunityHulls,
  computeCommunityGroups,
  MIN_HULL_SIZE,
  paintOrder,
} from "./community-hulls";

const ring = (prefix: string, count: number, cx: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: `${prefix}${i}`,
    x: cx + Math.cos(i) * 50,
    y: Math.sin(i) * 50,
    r: 10,
  }));

describe("computeCommunityGroups", () => {
  it("returns the largest communities first", () => {
    const big = ring("a", 12, 0);
    const small = ring("b", MIN_HULL_SIZE, 1000);
    const labels = new Map([
      ...big.map((n) => [n.id, "A"] as const),
      ...small.map((n) => [n.id, "B"] as const),
    ]);
    const groups = computeCommunityGroups([...big, ...small], labels);
    expect(groups.map((g) => [g.community, g.size])).toEqual([
      ["A", 12],
      ["B", MIN_HULL_SIZE],
    ]);
  });

  it("leaves a stray member out of its community's background", () => {
    const group = ring("d", 12, 0);
    const stray = { id: "far", x: 5000, y: 0, r: 10 };
    const labels = new Map([...group, stray].map((n) => [n.id, "D"] as const));
    const [result] = computeCommunityGroups([...group, stray], labels);
    expect(result.size).toBe(13);
    expect(result.members.map((m) => m.id)).not.toContain("far");
  });

  it("keeps the links between members so the background is one shape", () => {
    const group = ring("e", 10, 0);
    const labels = new Map(group.map((n) => [n.id, "E"] as const));
    const [result] = computeCommunityGroups(group, labels, {
      edges: [
        ["e0", "e1"],
        ["e1", "e2"],
        ["e0", "outside"],
      ],
    });
    expect(result.links.map(([a, b]) => `${a.id}-${b.id}`)).toEqual([
      "e0-e1",
      "e1-e2",
    ]);
  });

  it("includes a small community when asked, e.g. the selected node's", () => {
    const tiny = ring("s", 3, 0);
    const labels = new Map(tiny.map((n) => [n.id, "S"] as const));
    expect(computeCommunityGroups(tiny, labels)).toEqual([]);
    const [group] = computeCommunityGroups(tiny, labels, {
      include: new Set(["S"]),
    });
    expect(group.community).toBe("S");
  });

  it("skips communities too small to be worth shading (negative)", () => {
    const tiny = ring("c", MIN_HULL_SIZE - 1, 0);
    const labels = new Map(tiny.map((n) => [n.id, "C"] as const));
    expect(computeCommunityGroups(tiny, labels)).toEqual([]);
  });
});

describe("paintOrder", () => {
  const group = (community: string) => ({
    community,
    size: 8,
    members: [],
    links: [],
  });

  it("paints every group alike when nothing is selected", () => {
    const order = paintOrder([group("A"), group("B")], new Set());
    expect(order.map((o) => o.group.community)).toEqual(["A", "B"]);
    expect(new Set(order.map((o) => o.alpha)).size).toBe(1);
  });

  it("puts the selected group last and strongest, keeping its colour rank", () => {
    const order = paintOrder(
      [group("A"), group("B"), group("C")],
      new Set(["A"]),
    );
    expect(order.map((o) => o.group.community)).toEqual(["B", "C", "A"]);
    expect(order[2].rank).toBe(0);
    expect(order[2].alpha).toBeGreaterThan(order[0].alpha);
  });

  it("fades everything when the selection's group has no background (negative)", () => {
    const order = paintOrder([group("A")], new Set(["Z"]));
    expect(order).toHaveLength(1);
    expect(order[0].alpha).toBeLessThan(
      paintOrder([group("A")], new Set())[0].alpha,
    );
  });
});

describe("attachCommunityHulls", () => {
  const recordingCanvas = (
    calls: string[],
    name: string,
    alphas?: number[],
  ) => {
    let alpha = 1;
    const ctx = new Proxy(
      {},
      {
        get: (_t, key) =>
          typeof key === "string" &&
          ["fill", "stroke", "drawImage", "clearRect"].includes(key)
            ? () => {
                calls.push(`${name}.${key}`);
                if (key === "drawImage") alphas?.push(alpha);
              }
            : () => {},
        set: (_t, key, value) => {
          if (key === "globalAlpha") alpha = value;
          return true;
        },
      },
    );
    return {
      clientWidth: 400,
      clientHeight: 300,
      width: 0,
      height: 0,
      getContext: () => ctx,
    } as unknown as HTMLCanvasElement;
  };

  const graph = () => {
    const ids = Array.from({ length: 10 }, (_, i) => `n${i}`);
    const edges = [];
    for (let a = 0; a < ids.length; a++)
      for (let b = a + 1; b < ids.length; b++)
        edges.push({
          data: { id: `${a}-${b}`, source: ids[a], target: ids[b] },
        });
    return cytoscape({
      headless: true,
      styleEnabled: true,
      elements: [
        ...ids.map((id, i) => ({
          data: { id },
          position: { x: i * 30, y: 0 },
        })),
        ...edges,
      ],
      layout: { name: "preset" },
    });
  };

  it("shades a large community and stops drawing when disabled or destroyed", () => {
    const frames: FrameRequestCallback[] = [];
    const g = globalThis as any;
    const saved = [g.requestAnimationFrame, g.cancelAnimationFrame];
    g.requestAnimationFrame = (cb: FrameRequestCallback) => frames.push(cb);
    g.cancelAnimationFrame = () => {};
    // Cytoscape queues its own frames too; run whatever is pending.
    const flush = () => frames.splice(0).forEach((f) => f(0));

    const cy = graph();
    const calls: string[] = [];
    const overlay = attachCommunityHulls(cy, recordingCanvas(calls, "main"), {
      createLayer: () => recordingCanvas(calls, "layer"),
    });
    flush();
    expect(calls).toContain("layer.fill");
    expect(calls).toContain("layer.stroke");
    expect(calls.filter((c) => c === "main.drawImage")).toHaveLength(1);

    calls.length = 0;
    overlay.setEnabled(false);
    flush();
    expect(calls).not.toContain("main.drawImage");

    overlay.destroy();
    calls.length = 0;
    cy.add({ data: { id: "late" }, position: { x: 0, y: 0 } });
    flush();
    expect(calls).not.toContain("main.drawImage");
    cy.destroy();
    [g.requestAnimationFrame, g.cancelAnimationFrame] = saved;
  });

  it("shows the selected node's whole group strongly and fades the others", () => {
    const frames: FrameRequestCallback[] = [];
    const g = globalThis as any;
    const saved = [g.requestAnimationFrame, g.cancelAnimationFrame];
    g.requestAnimationFrame = (cb: FrameRequestCallback) => frames.push(cb);
    g.cancelAnimationFrame = () => {};
    const flush = () => frames.splice(0).forEach((f) => f(0));

    const clique = (prefix: string, x0: number) => {
      const ids = Array.from({ length: 8 }, (_, i) => `${prefix}${i}`);
      const els: any[] = ids.map((id, i) => ({
        data: { id },
        position: { x: x0 + i * 30, y: 0 },
      }));
      for (let a = 0; a < ids.length; a++)
        for (let b = a + 1; b < ids.length; b++)
          els.push({
            data: { id: `${prefix}${a}-${b}`, source: ids[a], target: ids[b] },
          });
      return els;
    };
    const cy = cytoscape({
      headless: true,
      styleEnabled: true,
      elements: [...clique("a", 0), ...clique("b", 2000)],
      layout: { name: "preset" },
    });
    const calls: string[] = [];
    const alphas: number[] = [];
    const overlay = attachCommunityHulls(
      cy,
      recordingCanvas(calls, "main", alphas),
      { createLayer: () => recordingCanvas(calls, "layer") },
    );
    flush();
    expect(alphas).toHaveLength(2);
    expect(new Set(alphas).size).toBe(1);

    alphas.length = 0;
    cy.$id("a0").select();
    flush();
    // The unselected group first and faint, the selected one last and strong.
    expect(alphas).toHaveLength(2);
    expect(alphas[1]).toBeGreaterThan(alphas[0] * 3);

    expect(overlay.communityMembers("a0").sort()).toEqual(
      Array.from({ length: 8 }, (_, i) => `a${i}`).sort(),
    );
    expect(overlay.communityMembers("missing")).toEqual([]);

    alphas.length = 0;
    cy.$id("a0").unselect();
    flush();
    expect(new Set(alphas).size).toBe(1);

    overlay.destroy();
    cy.destroy();
    [g.requestAnimationFrame, g.cancelAnimationFrame] = saved;
  });
});
