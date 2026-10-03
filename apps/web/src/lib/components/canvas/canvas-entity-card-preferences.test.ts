import { describe, expect, it } from "vitest";
import type { Node } from "@xyflow/svelte";
import {
  areAllCanvasEntityNodesImageOnly,
  getCanvasEntityNodes,
  toggleCanvasEntityCardView,
  toggleCanvasImageLabels,
} from "./canvas-entity-card-preferences";

function node(
  id: string,
  type: string | undefined,
  data: Record<string, unknown>,
): Node {
  return { id, type, position: { x: 0, y: 0 }, data } as Node;
}

describe("canvas entity card preferences", () => {
  it("recognizes entity nodes and legacy nodes with an entity id", () => {
    const entity = node("entity", "entity", {});
    const legacyEntity = node("legacy", undefined, { entityId: "e-1" });
    const file = node("file", "file", {});

    expect(getCanvasEntityNodes([entity, legacyEntity, file])).toEqual([
      entity,
      legacyEntity,
    ]);
    expect(areAllCanvasEntityNodesImageOnly([file])).toBe(false);
  });

  it("sets all entity cards to image-only, then back to automatic view", () => {
    const entity = node("entity", "entity", { title: "Keep me" });
    const legacyEntity = node("legacy", undefined, { entityId: "e-1" });
    const file = node("file", "file", { title: "Unchanged" });

    const imageOnly = toggleCanvasEntityCardView(
      [entity, legacyEntity, file],
      false,
    );
    expect(imageOnly.nextView).toBe("image_only");
    expect(imageOnly.nodes.map((item) => item.data.cardView)).toEqual([
      "image_only",
      "image_only",
      undefined,
    ]);
    expect(imageOnly.nodes[0].data.title).toBe("Keep me");
    expect(imageOnly.nodes[2]).toBe(file);
    expect(areAllCanvasEntityNodesImageOnly(imageOnly.nodes)).toBe(true);

    const automatic = toggleCanvasEntityCardView(imageOnly.nodes, true);
    expect(automatic.nextView).toBe("auto");
    expect(areAllCanvasEntityNodesImageOnly(automatic.nodes)).toBe(false);
  });

  it("toggles image labels while preserving other canvas metadata", () => {
    expect(
      toggleCanvasImageLabels({ showImageLabels: false, theme: "noir" }),
    ).toEqual({
      showImageLabels: true,
      metadata: { showImageLabels: true, theme: "noir" },
    });
    expect(toggleCanvasImageLabels(undefined)).toEqual({
      showImageLabels: true,
      metadata: { showImageLabels: true },
    });
  });
});
