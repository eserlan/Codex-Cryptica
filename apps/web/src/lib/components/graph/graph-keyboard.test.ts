import { describe, expect, it, vi, beforeEach } from "vitest";
import { handleGraphDeleteShortcut } from "./graph-keyboard";

describe("handleGraphDeleteShortcut", () => {
  let confirm: ReturnType<typeof vi.fn>;
  let deleteEntity: ReturnType<typeof vi.fn>;
  let clearSelectedId: ReturnType<typeof vi.fn>;
  let cy: any;

  beforeEach(() => {
    confirm = vi.fn().mockResolvedValue(true);
    deleteEntity = vi.fn().mockResolvedValue(undefined);
    clearSelectedId = vi.fn();
    cy = {
      $: vi.fn(),
      elements: vi.fn().mockReturnValue({
        unselect: vi.fn(),
      }),
    };
  });

  it("deletes all selected nodes on Delete", async () => {
    const unselect = vi.fn();
    cy.$.mockReturnValue([{ id: () => "node-1" }, { id: () => "node-2" }]);
    cy.elements.mockReturnValue({ unselect });

    const event = new KeyboardEvent("keydown", { key: "Delete" });
    const handled = await handleGraphDeleteShortcut(event, {
      cy,
      selectedId: null,
      isGuest: false,
      confirm,
      deleteEntity,
      clearSelectedId,
    });

    expect(handled).toBe(true);
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Confirm Delete",
        confirmLabel: "Delete",
        isDangerous: true,
      }),
    );
    expect(deleteEntity).toHaveBeenNthCalledWith(1, "node-1");
    expect(deleteEntity).toHaveBeenNthCalledWith(2, "node-2");
    expect(clearSelectedId).toHaveBeenCalled();
    expect(unselect).toHaveBeenCalled();
  });

  it("falls back to the selectedId when no Cytoscape selection exists", async () => {
    cy.$.mockReturnValue([]);

    const event = new KeyboardEvent("keydown", { key: "Backspace" });
    const handled = await handleGraphDeleteShortcut(event, {
      cy,
      selectedId: "node-3",
      isGuest: false,
      confirm,
      deleteEntity,
      clearSelectedId,
    });

    expect(handled).toBe(true);
    expect(deleteEntity).toHaveBeenCalledWith("node-3");
  });

  it("ignores delete shortcuts in guest mode", async () => {
    const event = new KeyboardEvent("keydown", { key: "Delete" });
    const handled = await handleGraphDeleteShortcut(event, {
      cy,
      selectedId: "node-3",
      isGuest: true,
      confirm,
      deleteEntity,
      clearSelectedId,
    });

    expect(handled).toBe(false);
    expect(confirm).not.toHaveBeenCalled();
    expect(deleteEntity).not.toHaveBeenCalled();
  });
});
