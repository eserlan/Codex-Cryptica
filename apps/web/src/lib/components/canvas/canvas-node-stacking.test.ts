import { describe, expect, it } from "vitest";
import {
  bringNodeToFront,
  sendNodeToBack,
  stackableNodeZIndexBounds,
} from "./canvas-node-stacking";
import type { Node } from "@xyflow/svelte";

const node = (id: string, zIndex: number, type = "entity"): Node => ({
  id,
  type,
  position: { x: 0, y: 0 },
  data: { zIndex },
});

describe("canvas node stacking", () => {
  it("calculates bounds while ignoring delve sector frames", () => {
    expect(
      stackableNodeZIndexBounds([
        node("back", -3),
        node("front", 8),
        node("frame", 100, "delveSectorGroup"),
      ]),
    ).toEqual({ min: -3, max: 8 });
  });

  it("moves a node above the highest stackable node without changing others", () => {
    const nodes = [node("target", 1), node("other", 4)];
    const updated = bringNodeToFront(nodes, "target");

    expect(updated.map(({ data }) => data.zIndex)).toEqual([5, 4]);
    expect(nodes[0].data.zIndex).toBe(1);
  });

  it("moves a node below the lowest stackable node", () => {
    const updated = sendNodeToBack(
      [node("target", 0), node("other", -2)],
      "target",
    );

    expect(updated.map(({ data }) => data.zIndex)).toEqual([-3, -2]);
  });
});
