import { describe, expect, it } from "vitest";
import cytoscape from "cytoscape";
import {
  attachCommunityHulls,
  computeCommunityGroups,
  MIN_HULL_SIZE,
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

  it("skips communities too small to be worth shading (negative)", () => {
    const tiny = ring("c", MIN_HULL_SIZE - 1, 0);
    const labels = new Map(tiny.map((n) => [n.id, "C"] as const));
    expect(computeCommunityGroups(tiny, labels)).toEqual([]);
  });
});

describe("attachCommunityHulls", () => {
  const recordingCanvas = (calls: string[], name: string) => {
    const ctx = new Proxy(
      {},
      {
        get: (_t, key) =>
          typeof key === "string" &&
          ["fill", "drawImage", "clearRect"].includes(key)
            ? () => calls.push(`${name}.${key}`)
            : () => {},
        set: () => true,
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
});
