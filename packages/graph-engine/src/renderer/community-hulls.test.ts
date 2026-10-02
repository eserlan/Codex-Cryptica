import { describe, expect, it } from "vitest";
import cytoscape from "cytoscape";
import {
  attachCommunityHulls,
  computeCommunityGroups,
  budgetedScale,
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

  it("includes a small community when asked, e.g. the hovered node's", () => {
    const tiny = ring("s", 3, 0);
    const labels = new Map(tiny.map((n) => [n.id, "S"] as const));
    expect(computeCommunityGroups(tiny, labels)).toEqual([]);
    const [group] = computeCommunityGroups(tiny, labels, {
      include: new Set(["S"]),
    });
    expect(group.community).toBe("S");
  });

  it("draws only the biggest linked piece when a community comes apart", () => {
    const left = ring("l", 9, 0);
    const right = ring("r", 4, 0);
    const labels = new Map(
      [...left, ...right].map((n) => [n.id, "Split"] as const),
    );
    const chain = (ids: string[]) =>
      ids.slice(1).map((id, i) => [ids[i], id] as [string, string]);
    const [group] = computeCommunityGroups([...left, ...right], labels, {
      edges: [
        ...chain(left.map((n) => n.id)),
        ...chain(right.map((n) => n.id)),
      ],
    });
    expect(group.members.map((m) => m.id).sort()).toEqual(
      left.map((n) => n.id).sort(),
    );
    expect(
      group.links.every(
        ([a, b]) => a.id.startsWith("l") && b.id.startsWith("l"),
      ),
    ).toBe(true);
  });

  it("skips communities too small to be worth shading (negative)", () => {
    const tiny = ring("c", MIN_HULL_SIZE - 1, 0);
    const labels = new Map(tiny.map((n) => [n.id, "C"] as const));
    expect(computeCommunityGroups(tiny, labels)).toEqual([]);
  });
});

describe("budgetedScale", () => {
  it("keeps the view's scale while the bitmaps fit the budget", () => {
    expect(budgetedScale([{ x1: 0, y1: 0, w: 100, h: 100 }], 2, 1e6)).toBe(2);
  });

  it("lowers the scale so all bitmaps together stay within the budget", () => {
    const areas = Array.from({ length: 24 }, () => ({
      x1: 0,
      y1: 0,
      w: 4000,
      h: 4000,
    }));
    const scale = budgetedScale(areas, 1, 16_000_000);
    const pixels = areas.reduce((sum, b) => sum + b.w * scale * b.h * scale, 0);
    expect(scale).toBeLessThan(1);
    expect(pixels).toBeLessThanOrEqual(16_000_000 + 1);
  });
});

describe("paintOrder", () => {
  const group = (community: string) => ({
    community,
    size: 8,
    members: [],
    links: [],
  });

  it("paints every group alike when nothing is highlighted", () => {
    const order = paintOrder([group("A"), group("B")], new Set());
    expect(order.map((o) => o.group.community)).toEqual(["A", "B"]);
    expect(new Set(order.map((o) => o.alpha)).size).toBe(1);
  });

  it("puts the highlighted group last and strongest, keeping its colour rank", () => {
    const order = paintOrder(
      [group("A"), group("B"), group("C")],
      new Set(["A"]),
    );
    expect(order.map((o) => o.group.community)).toEqual(["B", "C", "A"]);
    expect(order[2].rank).toBe(0);
    expect(order[2].alpha).toBeGreaterThan(order[0].alpha);
  });

  it("fades everything when the highlighted group has no background (negative)", () => {
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

    // Panning only copies the cached shape; it is not redrawn.
    calls.length = 0;
    cy.panBy({ x: 40, y: 0 });
    flush();
    expect(calls).toContain("main.drawImage");
    expect(calls).not.toContain("layer.fill");

    // Moving a member redraws the shape.
    calls.length = 0;
    cy.$id("n0").position({ x: -200, y: 0 });
    flush();
    expect(calls).toContain("layer.fill");

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

  it("shows the hovered node's whole group strongly and fades the others", () => {
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
    cy.$id("a0").emit("mouseover");
    flush();
    // The other group first and faint, the hovered one last and strong.
    expect(alphas).toHaveLength(2);
    expect(alphas[1]).toBeGreaterThan(alphas[0] * 3);

    alphas.length = 0;
    cy.$id("a0").emit("mouseout");
    flush();
    expect(new Set(alphas).size).toBe(1);

    overlay.destroy();
    cy.destroy();
    [g.requestAnimationFrame, g.cancelAnimationFrame] = saved;
  });

  it("leaves nodes still waiting for a layout out of the backgrounds (negative)", () => {
    const frames: FrameRequestCallback[] = [];
    const g = globalThis as any;
    const saved = [g.requestAnimationFrame, g.cancelAnimationFrame];
    g.requestAnimationFrame = (cb: FrameRequestCallback) => frames.push(cb);
    g.cancelAnimationFrame = () => {};
    const flush = () => frames.splice(0).forEach((f) => f(0));

    const cy = graph();
    // Only 3 of the 10 members are laid out: too few for a background.
    cy.nodes().slice(3).data("isPendingLayout", true);
    const calls: string[] = [];
    const overlay = attachCommunityHulls(cy, recordingCanvas(calls, "main"), {
      createLayer: () => recordingCanvas(calls, "layer"),
    });
    flush();
    expect(calls).not.toContain("main.drawImage");

    cy.nodes().removeData("isPendingLayout");
    flush();
    expect(calls).toContain("main.drawImage");
    overlay.destroy();
    cy.destroy();
    [g.requestAnimationFrame, g.cancelAnimationFrame] = saved;
  });

  describe("caching and cleanup", () => {
    type Recorder = {
      calls: string[];
      canvases: Array<{ width: number; height: number }>;
    };
    const recorder = (): Recorder => ({ calls: [], canvases: [] });
    const canvasFor = (rec: Recorder, name: string) => {
      const ctx = new Proxy(
        {},
        {
          get: (_t, key) =>
            typeof key === "string" &&
            [
              "fill",
              "stroke",
              "drawImage",
              "clearRect",
              "setTransform",
            ].includes(key)
              ? () => rec.calls.push(`${name}.${key}`)
              : () => {},
          set: () => true,
        },
      );
      const canvas = {
        clientWidth: 400,
        clientHeight: 300,
        width: 0,
        height: 0,
        getContext: () => ctx,
      };
      rec.canvases.push(canvas);
      return canvas as unknown as HTMLCanvasElement;
    };
    const withFrames = async (
      run: (
        flush: () => void,
        settle: () => Promise<void>,
      ) => Promise<void> | void,
    ) => {
      const frames: FrameRequestCallback[] = [];
      const g = globalThis as any;
      const saved = [g.requestAnimationFrame, g.cancelAnimationFrame];
      g.requestAnimationFrame = (cb: FrameRequestCallback) => frames.push(cb);
      g.cancelAnimationFrame = () => {};
      const flush = () => frames.splice(0).forEach((f) => f(0));
      const settle = () => new Promise<void>((r) => setTimeout(r, 5));
      try {
        await run(flush, settle);
      } finally {
        [g.requestAnimationFrame, g.cancelAnimationFrame] = saved;
      }
    };
    /** A connected chain of `count` nodes, `gap` apart. */
    const chainGraph = (count: number, gap: number) =>
      cytoscape({
        headless: true,
        styleEnabled: true,
        layout: { name: "preset" },
        elements: [
          ...Array.from({ length: count }, (_, i) => ({
            data: { id: `c${i}` },
            position: { x: i * gap, y: 0 },
          })),
          ...Array.from({ length: count - 1 }, (_, i) => ({
            data: { id: `e${i}`, source: `c${i}`, target: `c${i + 1}` },
          })),
        ],
      });

    it("redraws a shape when a link is swapped for another between the same members", async () => {
      await withFrames((flush) => {
        const cy = chainGraph(9, 30);
        cy.add({ data: { id: "x", source: "c0", target: "c2" } });
        const rec = recorder();
        const overlay = attachCommunityHulls(cy, canvasFor(rec, "main"), {
          createLayer: () => canvasFor(rec, "layer"),
        });
        flush();
        rec.calls.length = 0;
        cy.batch(() => {
          cy.remove("#x");
          cy.add({ data: { id: "y", source: "c0", target: "c3" } });
        });
        flush();
        expect(rec.calls).toContain("layer.stroke");
        overlay.destroy();
        cy.destroy();
      });
    });

    it("never makes a bitmap larger than the side limit, however spread out the group", async () => {
      await withFrames((flush) => {
        const cy = chainGraph(9, 40_000);
        const rec = recorder();
        const overlay = attachCommunityHulls(cy, canvasFor(rec, "main"), {
          createLayer: () => canvasFor(rec, "layer"),
        });
        flush();
        const layers = rec.canvases.slice(1);
        expect(layers.length).toBeGreaterThan(0);
        for (const c of layers) {
          expect(c.width).toBeLessThanOrEqual(2048);
          expect(c.height).toBeLessThanOrEqual(2048);
        }
        overlay.destroy();
        cy.destroy();
      });
    });

    it("removes a small group's temporary background when the hover moves away", async () => {
      await withFrames((flush) => {
        const cy = chainGraph(3, 30);
        const rec = recorder();
        const overlay = attachCommunityHulls(cy, canvasFor(rec, "main"), {
          createLayer: () => canvasFor(rec, "layer"),
        });
        flush();
        expect(rec.calls).not.toContain("main.drawImage");
        cy.$id("c0").emit("mouseover");
        flush();
        expect(rec.calls).toContain("main.drawImage");
        rec.calls.length = 0;
        cy.$id("c0").emit("mouseout");
        flush();
        expect(rec.calls).not.toContain("main.drawImage");
        overlay.destroy();
        cy.destroy();
      });
    });

    it("clears the canvas in pixels when destroyed after a pan", async () => {
      await withFrames((flush) => {
        const cy = chainGraph(9, 30);
        const rec = recorder();
        const overlay = attachCommunityHulls(cy, canvasFor(rec, "main"), {
          createLayer: () => canvasFor(rec, "layer"),
        });
        cy.panBy({ x: 50, y: 20 });
        flush();
        rec.calls.length = 0;
        overlay.destroy();
        expect(rec.calls.filter((c) => c.startsWith("main."))).toEqual([
          "main.setTransform",
          "main.clearRect",
        ]);
        cy.destroy();
      });
    });

    it("re-renders once at the new scale after a zoom settles, and not again", async () => {
      await withFrames(async (flush, settle) => {
        const cy = chainGraph(9, 30);
        const rec = recorder();
        const overlay = attachCommunityHulls(cy, canvasFor(rec, "main"), {
          createLayer: () => canvasFor(rec, "layer"),
          sharpenDelayMs: 0,
        });
        flush();
        rec.calls.length = 0;
        cy.zoom(4);
        flush();
        expect(rec.calls).not.toContain("layer.fill");
        await settle();
        flush();
        expect(rec.calls.filter((c) => c === "layer.fill")).toHaveLength(1);
        rec.calls.length = 0;
        await settle();
        flush();
        expect(rec.calls).not.toContain("layer.fill");
        overlay.destroy();
        cy.destroy();
      });
    });

    it("does not keep re-rendering a bitmap capped by the size limit (negative)", async () => {
      await withFrames(async (flush, settle) => {
        const cy = chainGraph(9, 40_000);
        const rec = recorder();
        const overlay = attachCommunityHulls(cy, canvasFor(rec, "main"), {
          createLayer: () => canvasFor(rec, "layer"),
          sharpenDelayMs: 0,
        });
        cy.zoom(2);
        flush();
        await settle();
        flush();
        rec.calls.length = 0;
        cy.zoom(3);
        flush();
        await settle();
        flush();
        expect(rec.calls).not.toContain("layer.fill");
        overlay.destroy();
        cy.destroy();
      });
    });
  });
});
