import { describe, expect, it, vi } from "vitest";
import type { StatSheetTemplate } from "schema";
vi.mock("#lib/stores/stat-sheet-templates.svelte.js", () => ({
  statSheetTemplates: {},
}));
import { StatSheetTemplateFieldOrder } from "./stat-sheet-template-field-order.svelte.js";

const template: StatSheetTemplate = {
  id: "vault-template",
  name: "Sheet",
  isBuiltIn: false,
  fields: [
    { id: "first", label: "First", type: "text" },
    { id: "second", label: "Second", type: "number" },
  ],
};
function setup() {
  const updateTemplateFields = vi.fn().mockResolvedValue(true);
  const focus = vi.fn();
  const order = new StatSheetTemplateFieldOrder(
    { allTemplates: [template], updateTemplateFields },
    focus,
  );
  return { order, updateTemplateFields, focus };
}
function dragEvent() {
  return {
    preventDefault: vi.fn(),
    dataTransfer: { setData: vi.fn() },
  } as unknown as DragEvent;
}

describe("StatSheetTemplateFieldOrder", () => {
  it("reorders a dragged field, selects it, and clears drag feedback", async () => {
    const { order, updateTemplateFields, focus } = setup();
    const event = dragEvent();
    order.handleFieldDragStart(event, template.id, 0);
    expect(event.dataTransfer?.setData).toHaveBeenCalledWith(
      "text/plain",
      "vault-template:0",
    );
    expect(order.rowClass(template, 0)).toContain("opacity-40");
    order.handleFieldDragOver(event, template.id, 1);
    expect(order.rowClass(template, 1)).toContain("bg-theme-primary/10");
    await order.handleFieldDrop(event, template, 1);
    expect(updateTemplateFields).toHaveBeenCalledWith(
      template.id,
      [...template.fields].reverse(),
    );
    expect(order.isSelected(template.id, "first")).toBe(true);
    expect(order.draggedFieldKey).toBeNull();
    expect(order.dragOverFieldKey).toBeNull();
    expect(focus).not.toHaveBeenCalled();
  });

  it("rejects cross-template and same-position drops and clears drag state", async () => {
    const { order, updateTemplateFields } = setup();
    for (const id of ["other-template", template.id]) {
      order.handleFieldDragStart(dragEvent(), id, 0);
      order.handleFieldDragOver(dragEvent(), template.id, 0);
      await order.handleFieldDrop(dragEvent(), template, 0);
      expect(order.draggedFieldKey).toBeNull();
      expect(order.dragOverFieldKey).toBeNull();
    }
    expect(updateTemplateFields).not.toHaveBeenCalled();
  });

  it("moves by keyboard once, keeps selection, and restores focus", async () => {
    const { order, updateTemplateFields, focus } = setup();
    const event = {
      altKey: true,
      key: "ArrowDown",
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as KeyboardEvent;
    order.handleTemplateFieldKeyDown(event, template, 0);
    await Promise.resolve();
    expect(event.stopPropagation).toHaveBeenCalledOnce();
    expect(updateTemplateFields).toHaveBeenCalledOnce();
    expect(focus).toHaveBeenCalledWith("vault-template-first");
    expect(order.rowClass(template, 0)).toContain("ring-2");
    order.handleTemplateContainerKeyDown(
      { ...event, key: "ArrowUp" },
      template,
    );
    expect(updateTemplateFields).toHaveBeenCalledOnce();
  });

  it("moves the selected field from the container and ignores missing selection", async () => {
    const { order, updateTemplateFields } = setup();
    const event = {
      ctrlKey: true,
      key: "ArrowUp",
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as KeyboardEvent;
    order.handleTemplateContainerKeyDown(event, template);
    order.selectedTemplateFieldKey = "other-first";
    order.handleTemplateContainerKeyDown(event, template);
    order.selectedTemplateFieldKey = `${template.id}-missing`;
    order.handleTemplateContainerKeyDown(event, template);
    expect(updateTemplateFields).not.toHaveBeenCalled();
    order.selectedTemplateFieldKey = `${template.id}-second`;
    order.handleTemplateContainerKeyDown(event, template);
    expect(updateTemplateFields).toHaveBeenCalledWith(
      template.id,
      [...template.fields].reverse(),
    );
    await order.moveTemplateField(template, 1, 1);
    expect(updateTemplateFields).toHaveBeenCalledOnce();
  });

  it("clears cancelled drags without clearing selection and ignores plain arrow keys", () => {
    const { order, updateTemplateFields } = setup();
    order.handleFieldDragStart(dragEvent(), template.id, 0);
    order.handleFieldDragEnd();
    expect(order.draggedFieldKey).toBeNull();
    expect(order.isSelected(template.id, "first")).toBe(true);
    order.handleTemplateFieldKeyDown(
      { key: "ArrowDown" } as KeyboardEvent,
      template,
      0,
    );
    expect(updateTemplateFields).not.toHaveBeenCalled();
  });
});
