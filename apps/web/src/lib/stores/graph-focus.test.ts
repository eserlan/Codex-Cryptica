import { describe, expect, it, vi } from "vitest";
import {
  FOCUS_BASE_COUNT,
  FOCUS_DETAIL_STEP,
  FOCUS_EDGE_CAP,
  MAX_FOCUS_DEPTH,
  MIN_FOCUS_DEPTH,
  buildGraphElements,
  collectVisibleEntities,
  computeFocusRenderIds,
  getFocusTargetCount,
  resolveFocalId,
  type FocusContext,
  type InboundConnections,
  type VisibleEntities,
} from "./graph-focus";

const entity = (id: string, targets: string[] = []) =>
  ({
    id,
    title: id,
    type: "character",
    labels: [],
    connections: targets.map((target) => ({
      target,
      type: "friend",
      strength: 1,
    })),
  }) as any;

const visibleOf = (entities: any[]): VisibleEntities =>
  collectVisibleEntities(entities, () => true);

const focusOf = (overrides: Partial<FocusContext> = {}): FocusContext => ({
  rootId: null,
  depth: MIN_FOCUS_DEPTH,
  selectedId: () => null,
  inbound: () => ({}),
  ...overrides,
});

describe("collectVisibleEntities", () => {
  it("keeps only visible entities and indexes them", () => {
    const all = [entity("a"), entity("b"), entity("c")];
    const visible = collectVisibleEntities(all, (e) => e.id !== "b");

    expect(visible.entities.map((e) => e.id)).toEqual(["a", "c"]);
    expect([...visible.ids]).toEqual(["a", "c"]);
    expect(visible.byId.get("b")).toBeUndefined();
  });

  it("returns empty collections when nothing is visible", () => {
    const visible = collectVisibleEntities([entity("a")], () => false);
    expect(visible.entities).toEqual([]);
    expect(visible.ids.size).toBe(0);
  });
});

describe("getFocusTargetCount", () => {
  it("grows by a fixed step per detail level", () => {
    expect(getFocusTargetCount(MIN_FOCUS_DEPTH, 10_000)).toBe(FOCUS_BASE_COUNT);
    expect(getFocusTargetCount(MIN_FOCUS_DEPTH + 1, 10_000)).toBe(
      FOCUS_BASE_COUNT + FOCUS_DETAIL_STEP,
    );
  });

  it("clamps out-of-range and non-finite depths, and the visible count", () => {
    const max = FOCUS_BASE_COUNT + FOCUS_DETAIL_STEP * (MAX_FOCUS_DEPTH - 1);
    expect(getFocusTargetCount(MAX_FOCUS_DEPTH + 10, 10_000)).toBe(max);
    expect(getFocusTargetCount(-5, 10_000)).toBe(FOCUS_BASE_COUNT);
    expect(getFocusTargetCount(Number.NaN, 10_000)).toBe(FOCUS_BASE_COUNT);
    expect(getFocusTargetCount(MAX_FOCUS_DEPTH, 40)).toBe(40);
  });
});

describe("resolveFocalId", () => {
  const visible = visibleOf([entity("a"), entity("b", ["c"]), entity("c")]);

  it("keeps a valid root without reading selection or connections", () => {
    const selectedId = vi.fn(() => "a");
    const inbound = vi.fn(() => ({}));
    const id = resolveFocalId(
      visible,
      focusOf({ rootId: "c", selectedId, inbound }),
    );

    expect(id).toBe("c");
    expect(selectedId).not.toHaveBeenCalled();
    expect(inbound).not.toHaveBeenCalled();
  });

  it("uses the selection when the root is missing or no longer visible", () => {
    const focus = focusOf({ rootId: "gone", selectedId: () => "a" });
    expect(resolveFocalId(visible, focus)).toBe("a");
  });

  it("ignores a selection that is not visible and picks the best-connected node", () => {
    const inbound: InboundConnections = { c: [{ sourceId: "b" }] };
    const id = resolveFocalId(
      visible,
      focusOf({ selectedId: () => "hidden", inbound: () => inbound }),
    );
    // b links out to c; c has an inbound link from b: both have degree 1, first wins.
    expect(id).toBe("b");
  });

  it("returns null when there is nothing to focus on", () => {
    expect(resolveFocalId(visibleOf([]), focusOf())).toBeNull();
  });
});

describe("computeFocusRenderIds", () => {
  it("walks outward along links in both directions up to the target", () => {
    const chain = Array.from({ length: 700 }, (_, i) =>
      entity(`n${i}`, i < 699 ? [`n${i + 1}`] : []),
    );
    const ids = computeFocusRenderIds(
      "n0",
      MIN_FOCUS_DEPTH,
      visibleOf(chain),
      {},
    );

    expect(ids.size).toBe(FOCUS_BASE_COUNT);
    expect(ids.has("n0")).toBe(true);
    expect(ids.has(`n${FOCUS_BASE_COUNT - 1}`)).toBe(true);
    expect(ids.has(`n${FOCUS_BASE_COUNT}`)).toBe(false);

    const reverse = computeFocusRenderIds(
      "n699",
      MIN_FOCUS_DEPTH,
      visibleOf(chain),
      Object.fromEntries(
        chain.slice(1).map((e, i) => [e.id, [{ sourceId: `n${i}` }]]),
      ),
    );
    expect(reverse.has("n200")).toBe(true);
  });

  it("pads a sparse neighbourhood with the best-connected visible nodes", () => {
    const entities = [
      entity("loner"),
      entity("hub", ["x0", "x1", "x2"]),
      ...Array.from({ length: 700 }, (_, i) => entity(`x${i}`)),
    ];
    const ids = computeFocusRenderIds(
      "loner",
      MIN_FOCUS_DEPTH,
      visibleOf(entities),
      {},
    );

    expect(ids.size).toBe(FOCUS_BASE_COUNT);
    expect(ids.has("loner")).toBe(true);
    expect(ids.has("hub")).toBe(true);
  });
});

describe("buildGraphElements", () => {
  const small = [entity("a", ["b"]), entity("b"), entity("c")];

  it("renders everything without a focus context", () => {
    const { elements, renderedNodeCount } = buildGraphElements(
      visibleOf(small),
      null,
    );
    expect(renderedNodeCount).toBe(3);
    expect(elements.filter((e: any) => e.group === "nodes")).toHaveLength(3);
  });

  it("renders everything when the focus set already covers the graph", () => {
    const { renderedNodeCount } = buildGraphElements(
      visibleOf(small),
      focusOf(),
    );
    expect(renderedNodeCount).toBe(3);
  });

  it("culls a large graph around the focal node", () => {
    const big = Array.from({ length: 800 }, (_, i) => entity(`n${i}`));
    const { elements, renderedNodeCount } = buildGraphElements(
      visibleOf(big),
      focusOf({ rootId: "n10" }),
    );
    expect(renderedNodeCount).toBe(FOCUS_BASE_COUNT);
    expect(elements.length).toBeLessThanOrEqual(
      FOCUS_BASE_COUNT + FOCUS_EDGE_CAP,
    );
  });

  it("returns no elements for an empty graph", () => {
    const { elements, renderedNodeCount } = buildGraphElements(
      visibleOf([]),
      focusOf(),
    );
    expect(renderedNodeCount).toBe(0);
    expect(elements).toEqual([]);
  });
});
