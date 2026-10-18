import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  handleGraphDeleteShortcut,
  handleGraphActionShortcut,
} from "./graph-keyboard";

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
      confirm: confirm as any,
      deleteEntity: deleteEntity as any,
      clearSelectedId: clearSelectedId as any,
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
      confirm: confirm as any,
      deleteEntity: deleteEntity as any,
      clearSelectedId: clearSelectedId as any,
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
      confirm: confirm as any,
      deleteEntity: deleteEntity as any,
      clearSelectedId: clearSelectedId as any,
    });

    expect(handled).toBe(false);
    expect(confirm).not.toHaveBeenCalled();
    expect(deleteEntity).not.toHaveBeenCalled();
  });

  it("ignores delete shortcuts when a select is focused", async () => {
    const select = document.createElement("select");
    document.body.appendChild(select);
    select.focus();

    const event = new KeyboardEvent("keydown", { key: "Delete" });
    const handled = await handleGraphDeleteShortcut(event, {
      cy,
      selectedId: "node-3",
      isGuest: false,
      confirm: confirm as any,
      deleteEntity: deleteEntity as any,
      clearSelectedId: clearSelectedId as any,
    });

    expect(handled).toBe(false);
    expect(confirm).not.toHaveBeenCalled();
    expect(deleteEntity).not.toHaveBeenCalled();

    select.remove();
  });

  it("safely handles event with undefined key without throwing", async () => {
    const event = new KeyboardEvent("keydown");
    Object.defineProperty(event, "key", { value: undefined });

    const handled = await handleGraphDeleteShortcut(event, {
      cy,
      selectedId: "node-3",
      isGuest: false,
      confirm: confirm as any,
      deleteEntity: deleteEntity as any,
      clearSelectedId: clearSelectedId as any,
    });

    expect(handled).toBe(false);
    expect(confirm).not.toHaveBeenCalled();
    expect(deleteEntity).not.toHaveBeenCalled();
  });
});

describe("handleGraphActionShortcut", () => {
  const createDeps = (overrides = {}) => ({
    isGuest: false,
    selectedCount: 0,
    isConnecting: false,
    toggleTimeline: vi.fn(),
    applyTimelineLayout: vi.fn(),
    toggleConnectMode: vi.fn(),
    toggleSelectionConnector: vi.fn(),
    toggleLabels: vi.fn(),
    toggleImages: vi.fn(),
    ...overrides,
  });

  it("safely handles event with undefined key without throwing", () => {
    const event = new KeyboardEvent("keydown");
    Object.defineProperty(event, "key", { value: undefined });

    const deps = createDeps();
    expect(() => handleGraphActionShortcut(event, deps)).not.toThrow();
    expect(handleGraphActionShortcut(event, deps)).toBe(false);
    expect(deps.toggleTimeline).not.toHaveBeenCalled();
  });

  it("handles timeline toggle on 't' key", () => {
    const event = new KeyboardEvent("keydown", { key: "t" });
    const deps = createDeps();

    const handled = handleGraphActionShortcut(event, deps);

    expect(handled).toBe(true);
    expect(deps.toggleTimeline).toHaveBeenCalledTimes(1);
    expect(deps.applyTimelineLayout).toHaveBeenCalledTimes(1);
  });

  it("handles connect mode toggle on 'c' key", () => {
    const event = new KeyboardEvent("keydown", { key: "c" });
    const deps = createDeps({ selectedCount: 1 });

    const handled = handleGraphActionShortcut(event, deps);

    expect(handled).toBe(true);
    expect(deps.toggleConnectMode).toHaveBeenCalledTimes(1);
    expect(deps.toggleSelectionConnector).not.toHaveBeenCalled();
  });

  it("handles selection connector on 'c' key when two nodes selected", () => {
    const event = new KeyboardEvent("keydown", { key: "c" });
    const deps = createDeps({ selectedCount: 2 });

    const handled = handleGraphActionShortcut(event, deps);

    expect(handled).toBe(true);
    expect(deps.toggleSelectionConnector).toHaveBeenCalledTimes(1);
    expect(deps.toggleConnectMode).not.toHaveBeenCalled();
  });

  it("does not toggle connect mode on 'c' in guest mode", () => {
    const event = new KeyboardEvent("keydown", { key: "c" });
    const deps = createDeps({ isGuest: true });

    const handled = handleGraphActionShortcut(event, deps);

    expect(handled).toBe(true);
    expect(deps.toggleConnectMode).not.toHaveBeenCalled();
    expect(deps.toggleSelectionConnector).not.toHaveBeenCalled();
  });

  it("handles label toggle on 'l' key", () => {
    const event = new KeyboardEvent("keydown", { key: "l" });
    const deps = createDeps();

    const handled = handleGraphActionShortcut(event, deps);

    expect(handled).toBe(true);
    expect(deps.toggleLabels).toHaveBeenCalledTimes(1);
  });

  it("handles image toggle on 'i' key", () => {
    const event = new KeyboardEvent("keydown", { key: "i" });
    const deps = createDeps();

    const handled = handleGraphActionShortcut(event, deps);

    expect(handled).toBe(true);
    expect(deps.toggleImages).toHaveBeenCalledTimes(1);
  });

  it("handles Escape to cancel connect mode when isConnecting is true", () => {
    const event = new KeyboardEvent("keydown", { key: "Escape" });
    const deps = createDeps({ isConnecting: true });

    const handled = handleGraphActionShortcut(event, deps);

    expect(handled).toBe(true);
    expect(deps.toggleConnectMode).toHaveBeenCalledTimes(1);
  });

  it("ignores Escape when isConnecting is false", () => {
    const event = new KeyboardEvent("keydown", { key: "Escape" });
    const deps = createDeps({ isConnecting: false });

    const handled = handleGraphActionShortcut(event, deps);

    expect(handled).toBe(false);
    expect(deps.toggleConnectMode).not.toHaveBeenCalled();
  });

  it("ignores shortcuts when typing inside an input element", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    const event = new KeyboardEvent("keydown", { key: "t" });
    const deps = createDeps();

    const handled = handleGraphActionShortcut(event, deps);

    expect(handled).toBe(false);
    expect(deps.toggleTimeline).not.toHaveBeenCalled();

    input.remove();
  });

  it("ignores shortcuts when active element is inside a dialog or tabpanel", () => {
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    const button = document.createElement("button");
    dialog.appendChild(button);
    document.body.appendChild(dialog);
    button.focus();

    const event = new KeyboardEvent("keydown", { key: "t" });
    const deps = createDeps();

    const handled = handleGraphActionShortcut(event, deps);

    expect(handled).toBe(false);
    expect(deps.toggleTimeline).not.toHaveBeenCalled();

    dialog.remove();
  });

  it("ignores shortcuts with modifier keys (ctrl, meta, alt)", () => {
    const event = new KeyboardEvent("keydown", { key: "t", ctrlKey: true });
    const deps = createDeps();

    const handled = handleGraphActionShortcut(event, deps);

    expect(handled).toBe(false);
    expect(deps.toggleTimeline).not.toHaveBeenCalled();
  });
});
