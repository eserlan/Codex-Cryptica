/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { StatSheetTemplate } from "schema";
vi.mock("#lib/stores/stat-sheet-templates.svelte.js", () => ({
  statSheetTemplates: {},
}));
import StatSheetTemplatePreview from "./StatSheetTemplatePreview.svelte";
import { StatSheetTemplateFieldOrder } from "./stat-sheet-template-field-order.svelte.js";

const template: StatSheetTemplate = {
  id: "sheet",
  name: "Sheet",
  isBuiltIn: false,
  fields: [
    { id: "hp", label: "Health", type: "counter", min: 0, max: 20 },
    { id: "roll", label: "Attack", type: "dice", formula: "1d20" },
    { id: "section", label: "Details", type: "heading" },
  ],
};
function setup(sheet = template) {
  const updateTemplateFields = vi.fn().mockResolvedValue(true);
  const order = new StatSheetTemplateFieldOrder(
    { allTemplates: [sheet], updateTemplateFields },
    vi.fn(),
  );
  render(StatSheetTemplatePreview, { template: sheet, order });
  return { order, updateTemplateFields };
}
describe("StatSheetTemplatePreview", () => {
  it("renders field metadata and moves a field from its button", async () => {
    const { updateTemplateFields } = setup();
    expect(screen.getByText(/Counter/).textContent).toContain("0–20");
    expect(screen.getByText(/Dice/).textContent).toContain("1d20");
    const up = screen.getByLabelText("Move Health up") as HTMLButtonElement;
    expect(up.disabled).toBe(true);
    await fireEvent.click(screen.getByLabelText("Move Health down"));
    expect(updateTemplateFields).toHaveBeenCalledWith("sheet", [
      template.fields[1],
      template.fields[0],
      template.fields[2],
    ]);
  });
  it("renders built-in fields without drag or move controls", () => {
    setup({ ...template, isBuiltIn: true });
    expect(screen.queryByTestId("stat-sheet-template-drag-handle")).toBeNull();
    expect(screen.queryByLabelText("Move Health down")).toBeNull();
    expect(
      screen.getAllByTestId("stat-sheet-template-field-item")[0].draggable,
    ).toBe(false);
  });
  it("keeps selection available to the container keyboard shortcut", async () => {
    const { updateTemplateFields } = setup();
    await fireEvent.click(
      screen.getAllByTestId("stat-sheet-template-field-item")[1],
    );
    await fireEvent.keyDown(screen.getByTestId("stat-sheet-template-preview"), {
      key: "ArrowUp",
      ctrlKey: true,
    });
    expect(updateTemplateFields).toHaveBeenCalledOnce();
  });
  it("shows an empty preview without controls when there are no fields", () => {
    setup({ ...template, fields: [] });
    expect(screen.getByText("No fields.")).toBeTruthy();
    expect(screen.queryByTestId("stat-sheet-template-field-item")).toBeNull();
  });
  it("clears drag state on the DOM drag-end event without changing selection", async () => {
    const { order, updateTemplateFields } = setup();
    const row = screen.getAllByTestId("stat-sheet-template-field-item")[0];
    await fireEvent.dragStart(row);
    await fireEvent.dragOver(row);
    expect(order.draggedFieldKey).toBe("sheet-0");
    await fireEvent.dragEnd(row);
    expect(order.draggedFieldKey).toBeNull();
    expect(order.dragOverFieldKey).toBeNull();
    expect(order.isSelected("sheet", "hp")).toBe(true);
    expect(updateTemplateFields).not.toHaveBeenCalled();
  });
  it("renders a Dice Pool badge with configured default pool size and die", () => {
    setup({
      ...template,
      fields: [
        {
          id: "pool",
          label: "Action Pool",
          type: "dice-pool",
          startValue: 4,
          formula: "d10",
        },
      ],
    });
    expect(screen.getByText(/Dice Pool/).textContent).toContain("4d10");
  });
});
