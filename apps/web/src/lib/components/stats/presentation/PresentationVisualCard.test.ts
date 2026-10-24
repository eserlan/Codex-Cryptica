/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { useVisualLayout } from "./use-visual-layout.svelte";
import type { VisualCard } from "./visual-card-parser";
import PresentationVisualCard from "./PresentationVisualCard.svelte";

function setup(mode: "grid" | "table") {
  const card: VisualCard = {
    id: "c",
    title: "Equipment",
    mode,
    columns: 2,
    tableHeaders: ["Item", "Notes"],
    rows: [[]],
  };
  const layout = {
    visualCards: [card],
    updateCardColumns: vi.fn(),
    updateTableHeader: vi.fn(),
    moveCard: vi.fn(),
    addRowToCard: vi.fn(),
    removeVisualCard: vi.fn(),
  };
  const onTitleChange = vi.fn();
  render(PresentationVisualCard, {
    schema: { id: "s", name: "Sheet", isBuiltIn: false, fields: [] },
    card,
    idx: 0,
    visualLayout: layout as unknown as ReturnType<typeof useVisualLayout>,
    fieldOptions: { overrides: {}, onContextMenu: vi.fn(), onKeyDown: vi.fn() },
    onTitleChange,
  });
  return { card, layout, onTitleChange };
}

describe("PresentationVisualCard", () => {
  it("delegates title, columns, headers, and row edits", async () => {
    const { card, layout, onTitleChange } = setup("table");
    await fireEvent.input(screen.getByLabelText("Table Title"), {
      target: { value: "" },
    });
    expect(onTitleChange).toHaveBeenCalledWith(card, "");
    await fireEvent.input(screen.getByLabelText("Columns for Equipment"), {
      target: { value: "3" },
    });
    expect(layout.updateCardColumns).toHaveBeenCalledWith("c", 3);
    await fireEvent.input(screen.getByLabelText("Header 2 for Equipment"), {
      target: { value: "Material" },
    });
    expect(layout.updateTableHeader).toHaveBeenCalledWith("c", 1, "Material");
    await fireEvent.click(screen.getByText("+ Add Row to Table"));
    expect(layout.addRowToCard).toHaveBeenCalledWith("c");
  });

  it("omits table headers for grid cards and disables moves beyond either edge", () => {
    setup("grid");
    expect(screen.queryByLabelText("Header 1 for Equipment")).toBeNull();
    expect((screen.getByTitle("Move Up") as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect((screen.getByTitle("Move Down") as HTMLButtonElement).disabled).toBe(
      true,
    );
  });
});
