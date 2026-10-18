import { describe, expect, it } from "vitest";
import {
  applyLayoutSnapshot,
  captureLayoutSnapshot,
  countLayoutNodes,
  layoutUnavailableReason,
  resolveLayoutOverride,
  restoreEverydayPositions,
  withLayoutOverride,
} from "./graph-layout-snapshot";

/** A tiny stand-in for the parts of Cytoscape these helpers touch. */
function fakeCy(
  nodes: Array<{
    id: string;
    x: number;
    y: number;
    visible?: boolean;
    pending?: boolean;
  }>,
) {
  const state = nodes.map((n) => ({ ...n }));
  const wrap = (n: (typeof state)[number]) => ({
    id: () => n.id,
    visible: () => n.visible !== false,
    data: (key: string) => (key === "isPendingLayout" ? n.pending : undefined),
    position: (p?: { x: number; y: number }) => {
      if (p) {
        n.x = p.x;
        n.y = p.y;
        return undefined;
      }
      return { x: n.x, y: n.y };
    },
  });
  return {
    state,
    cy: {
      nodes: () => ({
        forEach: (cb: (n: any) => void) => state.map(wrap).forEach(cb),
      }),
      batch: (fn: () => void) => fn(),
    } as any,
  };
}

describe("captureLayoutSnapshot", () => {
  it("records where every shown, placed entity sits", () => {
    const { cy } = fakeCy([
      { id: "a", x: 10.4, y: 20.6 },
      { id: "b", x: -5, y: 0 },
    ]);

    expect(captureLayoutSnapshot(cy)).toEqual({
      positions: { a: { x: 10, y: 21 }, b: { x: -5, y: 0 } },
    });
  });

  it("leaves out entities that are hidden by the filters", () => {
    const { cy } = fakeCy([
      { id: "shown", x: 1, y: 1 },
      { id: "hidden", x: 2, y: 2, visible: false },
    ]);

    expect(Object.keys(captureLayoutSnapshot(cy)!.positions)).toEqual([
      "shown",
    ]);
  });

  it("leaves out entities that have not been placed yet", () => {
    const { cy } = fakeCy([
      { id: "placed", x: 1, y: 1 },
      { id: "waiting", x: 9, y: 9, pending: true },
    ]);

    expect(Object.keys(captureLayoutSnapshot(cy)!.positions)).toEqual([
      "placed",
    ]);
  });

  it("returns nothing when there is nothing to keep (negative)", () => {
    expect(captureLayoutSnapshot(fakeCy([]).cy)).toBeUndefined();
    expect(
      captureLayoutSnapshot(
        fakeCy([{ id: "a", x: 0, y: 0, visible: false }]).cy,
      ),
    ).toBeUndefined();
  });

  it("skips positions that are not finite numbers (negative)", () => {
    const { cy } = fakeCy([
      { id: "bad", x: Number.NaN, y: 0 },
      { id: "good", x: 3, y: 4 },
    ]);

    expect(Object.keys(captureLayoutSnapshot(cy)!.positions)).toEqual(["good"]);
  });

  it("returns nothing without a graph (negative)", () => {
    expect(captureLayoutSnapshot(undefined)).toBeUndefined();
  });
});

describe("applyLayoutSnapshot", () => {
  it("moves each saved entity that is on the graph and reports how many", () => {
    const { cy, state } = fakeCy([
      { id: "a", x: 0, y: 0 },
      { id: "b", x: 0, y: 0 },
    ]);

    const applied = applyLayoutSnapshot(cy, {
      a: { x: 5, y: 6 },
      b: { x: 7, y: 8 },
    });

    expect(applied).toBe(2);
    expect(state.map((n) => [n.x, n.y])).toEqual([
      [5, 6],
      [7, 8],
    ]);
  });

  it("ignores saved entities that are gone and leaves unsaved ones where they are", () => {
    const { cy, state } = fakeCy([
      { id: "kept", x: 1, y: 1 },
      { id: "new", x: 9, y: 9 },
    ]);

    const applied = applyLayoutSnapshot(cy, {
      kept: { x: 50, y: 50 },
      deleted: { x: 1, y: 1 },
    });

    expect(applied).toBe(1);
    expect(state.find((n) => n.id === "new")).toMatchObject({ x: 9, y: 9 });
  });

  it("does not throw for an empty or missing snapshot or graph (negative)", () => {
    const { cy } = fakeCy([{ id: "a", x: 1, y: 1 }]);
    expect(applyLayoutSnapshot(cy, {})).toBe(0);
    expect(applyLayoutSnapshot(undefined, { a: { x: 0, y: 0 } })).toBe(0);
  });

  it("refuses positions that are not finite numbers (negative)", () => {
    const { cy, state } = fakeCy([{ id: "a", x: 1, y: 1 }]);

    const applied = applyLayoutSnapshot(cy, { a: { x: Number.NaN, y: 2 } });

    expect(applied).toBe(0);
    expect(state[0]).toMatchObject({ x: 1, y: 1 });
  });
});

describe("restoreEverydayPositions", () => {
  it("puts entities back where the vault keeps them", () => {
    const { cy, state } = fakeCy([
      { id: "a", x: 500, y: 500 },
      { id: "b", x: 500, y: 500 },
    ]);
    const everyday: Record<string, { x: number; y: number }> = {
      a: { x: 1, y: 2 },
    };

    const restored = restoreEverydayPositions(cy, (id) => everyday[id]);

    expect(restored).toBe(1);
    expect(state[0]).toMatchObject({ x: 1, y: 2 });
    // No everyday position: left where it is.
    expect(state[1]).toMatchObject({ x: 500, y: 500 });
  });

  it("ignores everyday positions that are not usable (negative)", () => {
    const { cy, state } = fakeCy([{ id: "a", x: 7, y: 7 }]);

    expect(
      restoreEverydayPositions(cy, () => ({ x: Number.NaN, y: 1 }) as any),
    ).toBe(0);
    expect(state[0]).toMatchObject({ x: 7, y: 7 });
  });
});

describe("withLayoutOverride", () => {
  const nodes = [
    { group: "nodes", data: { id: "a" }, position: { x: 1, y: 1 } },
    { group: "nodes", data: { id: "b", isPendingLayout: true } },
    { group: "nodes", data: { id: "c" }, position: { x: 3, y: 3 } },
    { group: "edges", data: { id: "a-b", source: "a", target: "b" } },
  ] as any[];

  it("gives saved entities their saved position and marks them placed", () => {
    const result = withLayoutOverride(nodes, {
      a: { x: 100, y: 200 },
      b: { x: 300, y: 400 },
    });

    expect(result[0].position).toEqual({ x: 100, y: 200 });
    expect(result[1].position).toEqual({ x: 300, y: 400 });
    expect(result[1].data.isPendingLayout).toBeUndefined();
  });

  it("leaves entities that were not saved, and edges, exactly as they were", () => {
    const result = withLayoutOverride(nodes, { a: { x: 100, y: 200 } });

    expect(result[2]).toBe(nodes[2]);
    expect(result[3]).toBe(nodes[3]);
  });

  it("does not change the elements it was given (negative)", () => {
    const before = JSON.stringify(nodes);

    withLayoutOverride(nodes, { a: { x: 9, y: 9 }, b: { x: 8, y: 8 } });

    expect(JSON.stringify(nodes)).toBe(before);
  });

  it("returns the same elements when there is nothing to apply (negative)", () => {
    expect(withLayoutOverride(nodes, null)).toBe(nodes);
    expect(withLayoutOverride(nodes, {})).toBe(nodes);
  });

  it("ignores saved entries that are not on the graph or not usable (negative)", () => {
    const result = withLayoutOverride(nodes, {
      gone: { x: 1, y: 1 },
      a: { x: Number.NaN, y: 1 },
    });

    expect(result[0]).toBe(nodes[0]);
  });
});

describe("layoutUnavailableReason", () => {
  const off = { timelineMode: false, orbitMode: false };

  it("is available when entities are shown outside timeline and orbit", () => {
    expect(layoutUnavailableReason(off, 3)).toBeUndefined();
  });

  it("explains itself in timeline and orbit (negative)", () => {
    expect(layoutUnavailableReason({ ...off, timelineMode: true }, 3)).toMatch(
      /timeline and orbit/i,
    );
    expect(layoutUnavailableReason({ ...off, orbitMode: true }, 3)).toMatch(
      /timeline and orbit/i,
    );
  });

  it("explains itself when nothing is shown (negative)", () => {
    expect(layoutUnavailableReason(off, 0)).toMatch(/nothing is shown/i);
  });
});

describe("countLayoutNodes", () => {
  it("counts what a layout saved now would cover", () => {
    const { cy } = fakeCy([
      { id: "a", x: 1, y: 1 },
      { id: "b", x: 2, y: 2, visible: false },
    ]);
    expect(countLayoutNodes(cy)).toBe(1);
    expect(countLayoutNodes(undefined)).toBe(0);
  });
});

describe("resolveLayoutOverride", () => {
  const layout = { positions: { a: { x: 1, y: 2 } } };

  it("uses a view's saved layout", () => {
    expect(resolveLayoutOverride(layout, false)).toBe(layout.positions);
  });

  it("shows the everyday arrangement for a view with no layout (negative)", () => {
    expect(resolveLayoutOverride(undefined, false)).toBeNull();
  });

  it("ignores the layout in timeline or orbit (negative)", () => {
    expect(resolveLayoutOverride(layout, true)).toBeNull();
  });
});
