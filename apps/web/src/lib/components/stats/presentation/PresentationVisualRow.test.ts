/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { StatSheetTemplate } from "schema";
import type { useVisualLayout } from "./use-visual-layout.svelte";
import type { VisualCard } from "./visual-card-parser";
import PresentationVisualRow from "./PresentationVisualRow.svelte";

const schema: StatSheetTemplate = {
  id: "s",
  name: "Sheet",
  isBuiltIn: false,
  fields: [
    { id: "hp", label: "Health", type: "counter" },
    { id: "mp", label: "Mana", type: "number" },
  ],
};

function setup(card: VisualCard) {
  const layout = {
    visualCards: [card],
    addFieldToCardRow: vi.fn(),
    addValueToTableRow: vi.fn(),
    removeFieldFromCardRow: vi.fn(),
    handleFieldDropRow: vi.fn(),
  };
  const fieldOptions = {
    overrides: { hp: { hideLabel: true, displayMode: "progress" } },
    onContextMenu: vi.fn(),
    onKeyDown: vi.fn(),
  };
  render(PresentationVisualRow, {
    schema,
    card,
    rowFields: card.rows[0],
    rIdx: 0,
    visualLayout: layout as unknown as ReturnType<typeof useVisualLayout>,
    fieldOptions,
  });
  return { layout, fieldOptions };
}

describe("PresentationVisualRow", () => {
  it("renders overrides and delegates field menus, removals, and row additions", async () => {
    const { layout, fieldOptions } = setup({
      id: "c",
      title: "",
      columns: 2,
      rows: [[{ kind: "field", fieldId: "hp" }]],
    });
    expect(screen.getByText("no-lbl")).toBeTruthy();
    expect(screen.getByText("progress")).toBeTruthy();
    await fireEvent.contextMenu(screen.getByLabelText("Health field options"));
    expect(fieldOptions.onContextMenu).toHaveBeenCalledWith(
      expect.any(MouseEvent),
      "c",
      0,
      "hp",
    );
    await fireEvent.click(screen.getByTitle("Remove field"));
    expect(layout.removeFieldFromCardRow).toHaveBeenCalledWith("c", 0, "hp");
    await fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "mp" },
    });
    expect(layout.addFieldToCardRow).toHaveBeenCalledWith("c", 0, "mp");
    expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe("");
  });

  it("shows missing fields and prevents additions to a full table row", () => {
    setup({
      id: "c",
      title: "",
      mode: "table",
      columns: 1,
      rows: [[{ kind: "field", fieldId: "gone" }]],
    });
    expect(screen.getByText("gone (missing)")).toBeTruthy();
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(
      screen.queryByTestId("presentation-editor-add-table-value"),
    ).toBeNull();
  });
});
