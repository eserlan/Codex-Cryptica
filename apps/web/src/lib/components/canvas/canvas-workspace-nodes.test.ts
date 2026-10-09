import { describe, expect, it, vi } from "vitest";
import { presentCanvasNodes } from "./canvas-workspace-nodes";

function makeNode(
  id: string,
  type: string,
  data: Record<string, unknown> = {},
) {
  return {
    id,
    type,
    position: { x: 0, y: 0 },
    data,
  } as any;
}

describe("presentCanvasNodes", () => {
  it("filters by category except while exporting and keeps locked nodes non-draggable", () => {
    const entity = makeNode("entity-1", "entity", {
      type: "character",
      locked: true,
    });
    const file = makeNode("file-1", "file", { type: "location" });

    const visible = presentCanvasNodes({
      nodes: [entity, file],
      activeCategories: new Set(["location"]),
      isExporting: false,
      showImageLabels: false,
      updateNodeData: vi.fn(),
    });

    expect(visible.map((node) => node.id)).toEqual(["file-1"]);
    expect(
      presentCanvasNodes({
        nodes: [entity, file],
        activeCategories: new Set(["location"]),
        isExporting: true,
        showImageLabels: false,
        updateNodeData: vi.fn(),
      }).map((node) => node.id),
    ).toEqual(["entity-1", "file-1"]);
    expect(
      presentCanvasNodes({
        nodes: [entity],
        activeCategories: new Set(),
        isExporting: false,
        showImageLabels: false,
        updateNodeData: vi.fn(),
      })[0].draggable,
    ).toBe(false);
  });

  it("supplies type-specific updates and image label state", () => {
    const updateNodeData = vi.fn();
    const [file, text, entity] = presentCanvasNodes({
      nodes: [
        makeNode("f", "file"),
        makeNode("t", "text"),
        makeNode("e", "entity"),
      ],
      activeCategories: new Set(),
      isExporting: false,
      showImageLabels: true,
      updateNodeData,
    });
    const updates = { title: "Changed" };

    (file.data as any).onUpdateFile(updates);
    (text.data as any).onUpdateText(updates);
    (entity.data as any).onUpdateEntityNode(updates);

    expect(updateNodeData.mock.calls).toEqual([
      ["f", updates],
      ["t", updates],
      ["e", updates],
    ]);
    expect(entity.data.showImageLabels).toBe(true);
  });

  it("keeps delve sector frames at the back", () => {
    const [sector] = presentCanvasNodes({
      nodes: [makeNode("sector", "delveSectorGroup")],
      activeCategories: new Set(),
      isExporting: false,
      showImageLabels: false,
      updateNodeData: vi.fn(),
    });

    expect(sector.zIndex).toBe(0);
  });
});
