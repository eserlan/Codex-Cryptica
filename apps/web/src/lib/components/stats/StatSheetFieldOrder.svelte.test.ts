/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import type { StatSheetField } from "schema";
import { StatSheetFieldOrder } from "./StatSheetFieldOrder.svelte.js";

function setup() {
  let fields: StatSheetField[] = ["a", "b", "c"].map((id) => ({
    id,
    label: id,
    type: "text",
  }));
  const persist = vi.fn((next: StatSheetField[]) => {
    fields = next;
  });
  const focus = vi.fn();
  const order = new StatSheetFieldOrder(() => fields, persist, focus);
  return { order, persist, focus, ids: () => fields.map((f) => f.id) };
}

const dropEvent = () => ({ preventDefault: vi.fn() }) as unknown as DragEvent;

describe("StatSheetFieldOrder", () => {
  it("moves a dragged field, retaining selection and clearing drag indicators", () => {
    const { order, ids } = setup();
    const dataTransfer = {
      setData: vi.fn(),
      effectAllowed: "",
      dropEffect: "",
    };
    order.handleDragStart({ dataTransfer } as unknown as DragEvent, 0);
    order.handleDragOver(
      { ...dropEvent(), dataTransfer } as unknown as DragEvent,
      2,
    );
    expect(dataTransfer.setData).toHaveBeenCalledWith("text/plain", "0");
    expect(order.dragOverIndex).toBe(2);
    order.handleDrop(dropEvent(), 2);
    expect(ids()).toEqual(["b", "c", "a"]);
    expect(order.selectedFieldId).toBe("a");
    expect(order.dragOverIndex).toBeNull();
    expect(order.draggedIndex).toBeNull();
  });

  it("ignores drops without a source or onto the source and resets cancelled drags", () => {
    const { order, persist } = setup();
    order.handleDrop(dropEvent(), 0);
    order.handleDragStart(dropEvent(), 0);
    order.handleDrop(dropEvent(), 0);
    order.handleDragStart(dropEvent(), 1);
    order.handleDragEnd();
    expect(order.draggedIndex).toBeNull();
    expect(order.dragOverIndex).toBeNull();
    expect(persist).not.toHaveBeenCalled();
  });

  it("moves selected fields by container shortcut and focuses their handles", () => {
    const { order, ids, focus } = setup();
    order.selectedFieldId = "b";
    order.handleContainerKeyDown(
      new KeyboardEvent("keydown", { key: "ArrowUp", ctrlKey: true }),
    );
    expect(ids()).toEqual(["b", "a", "c"]);
    expect(focus).toHaveBeenCalledWith("b");
    order.handleFieldKeyDown(
      new KeyboardEvent("keydown", { key: "ArrowDown", altKey: true }),
      0,
    );
    expect(ids()).toEqual(["a", "b", "c"]);
  });

  it("ignores unmodified keys, stale selections and out-of-range moves", () => {
    const { order, persist, focus } = setup();
    order.handleContainerKeyDown(
      new KeyboardEvent("keydown", { key: "ArrowUp", altKey: true }),
    );
    order.selectedFieldId = "missing";
    order.handleContainerKeyDown(
      new KeyboardEvent("keydown", { key: "ArrowDown", ctrlKey: true }),
    );
    order.handleFieldKeyDown(
      new KeyboardEvent("keydown", { key: "ArrowDown" }),
      0,
    );
    order.moveField(0, -1);
    order.moveField(2, 1);
    expect(persist).not.toHaveBeenCalled();
    expect(focus).not.toHaveBeenCalled();
  });
});
