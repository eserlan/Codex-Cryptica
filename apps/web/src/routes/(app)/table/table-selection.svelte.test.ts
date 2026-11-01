import { describe, expect, it, vi } from "vitest";
import type { Entity } from "schema";
import { TableSelection } from "./table-selection.svelte.js";

function setup() {
  let rows = ["a", "b", "c", "d"].map((id) => ({ id }) as Entity);
  const actions = {
    handleManageLabels: vi.fn(),
    handleChangeType: vi.fn(),
    handleDeleteSelected: vi.fn(),
    openBulkReport: vi.fn(),
    openBulkLabels: vi.fn(),
  };
  const selection = new TableSelection(() => rows, actions);
  return {
    selection,
    actions,
    setRows: (next: Entity[]) => {
      rows = next;
    },
  };
}

describe("TableSelection", () => {
  it("selects ranges in both directions and toggles individual rows", () => {
    const { selection } = setup();
    selection.toggleRow("c");
    selection.toggleRow("a", { shift: true });
    expect(selection.selectedIds).toEqual(new Set(["a", "b", "c"]));
    expect(selection.someSelected).toBe(true);
    selection.toggleRow("c");
    selection.toggleRow("d", { shift: true });
    expect(selection.selectedIds).toEqual(new Set(["a", "b", "d"]));
    selection.toggleAll();
    expect(selection.allSelected).toBe(true);
    expect(selection.someSelected).toBe(false);
    selection.toggleAll();
    expect(selection.selectedVisible).toEqual([]);
  });

  it("leaves selection unchanged when a range endpoint is missing", () => {
    const { selection, setRows } = setup();
    selection.toggleRow("a");
    selection.toggleRow("missing", { shift: true });
    expect(selection.selectedIds).toEqual(new Set(["a"]));
    setRows([{ id: "c" } as Entity]);
    selection.toggleRow("c", { shift: true });
    expect(selection.selectedIds).toEqual(new Set(["a"]));
    expect(selection.selectedVisible).toEqual([]);
  });

  it("deselects a range when its retained anchor is not selected", () => {
    const { selection } = setup();
    selection.toggleAll();
    // Partial bulk deletion removes the anchor without replacing it.
    selection.selectedIds = new Set(["b", "c", "d"]);
    selection.toggleRow("c", { shift: true });
    expect(selection.selectedIds).toEqual(new Set(["d"]));
  });

  it("retains multi-selection for its context menu and dismisses it before selection", () => {
    const { selection } = setup();
    selection.toggleRow("a");
    selection.toggleRow("b");
    selection.handleRowContextMenu("a", 12, 34);
    expect(selection.contextMenu).toEqual({
      x: 12,
      y: 34,
      targetIds: ["a", "b"],
    });
    selection.handleKeyDown(new KeyboardEvent("keydown", { key: "Enter" }));
    expect(selection.contextMenu).not.toBeNull();
    selection.handleKeyDown(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(selection.contextMenu).toBeNull();
    expect(selection.selectedIds.size).toBe(2);
    selection.handleKeyDown(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(selection.selectedIds.size).toBe(0);
    selection.handleRowContextMenu("c", 0, 0);
    expect(selection.selectedIds).toEqual(new Set(["c"]));
    selection.reset();
    expect(selection.contextMenu).toBeNull();
    expect(selection.selectedIds.size).toBe(0);
  });

  it("targets context actions and removes only successfully deleted ids", () => {
    const { selection, actions } = setup();
    selection.handleManageLabels();
    selection.handleChangeType("location");
    selection.handleDeleteSelected();
    expect(actions.handleDeleteSelected).not.toHaveBeenCalled();
    expect(actions.handleChangeType).not.toHaveBeenCalled();
    expect(actions.handleManageLabels).not.toHaveBeenCalled();
    selection.toggleAll();
    selection.handleRowContextMenu("a", 0, 0);
    selection.handleManageLabels();
    expect(actions.handleManageLabels).toHaveBeenCalledWith([
      "a",
      "b",
      "c",
      "d",
    ]);
    selection.handleChangeType("location");
    const setCommitting = actions.handleChangeType.mock.calls[0][3];
    setCommitting(true);
    selection.handleDeleteSelected();
    const [, committing, , removeSucceeded, clear] =
      actions.handleDeleteSelected.mock.calls[0];
    expect(committing).toBe(true);
    removeSucceeded(new Set(["a", "b"]));
    expect(selection.selectedIds).toEqual(new Set(["c", "d"]));
    clear();
    expect(selection.selectedIds.size).toBe(0);
  });

  it("uses the visible selection for reports and labels and handles empty rows", () => {
    const { selection, actions, setRows } = setup();
    selection.toggleAll();
    setRows([{ id: "b" } as Entity]);
    selection.openBulkReport();
    selection.openBulkLabels();
    expect(actions.openBulkReport).toHaveBeenCalledWith([{ id: "b" }]);
    expect(actions.openBulkLabels).toHaveBeenCalledWith([{ id: "b" }]);
    setRows([]);
    selection.toggleAll();
    expect(selection.allSelected).toBe(false);
    expect(selection.selectedIds.size).toBe(0);
  });
});
