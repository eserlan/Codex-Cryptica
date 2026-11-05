import { render, screen, fireEvent } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import TableSelectionToolbar from "./TableSelectionToolbar.svelte";

function props(selectedCount: number, isGuest = false) {
  return {
    selectedCount,
    resultCount: 4,
    isGuest,
    onLabels: vi.fn(),
    onReport: vi.fn(),
    onClear: vi.fn(),
  };
}

describe("TableSelectionToolbar", () => {
  it("dispatches bulk actions and clears the selection", async () => {
    const callbacks = props(2);
    render(TableSelectionToolbar, callbacks);
    expect(
      screen.getByTestId("entity-table-selection-count").textContent,
    ).toContain("2 selected");
    await fireEvent.click(screen.getByTestId("entity-table-bulk-label"));
    await fireEvent.click(
      screen.getByTestId("entity-table-bulk-generate-report"),
    );
    await fireEvent.click(screen.getByTestId("entity-table-selection-clear"));
    expect(callbacks.onLabels).toHaveBeenCalledOnce();
    expect(callbacks.onReport).toHaveBeenCalledOnce();
    expect(callbacks.onClear).toHaveBeenCalledOnce();
  });

  it.each([
    [1, false],
    [2, true],
  ])(
    "withholds report generation for selection %s and guest %s",
    (selectedCount, isGuest) => {
      render(TableSelectionToolbar, props(selectedCount, isGuest));
      expect(
        screen.queryByTestId("entity-table-bulk-generate-report"),
      ).toBeNull();
      expect(screen.getByTestId("entity-table-bulk-label")).toBeTruthy();
    },
  );

  it("shows the result count when no rows are selected", () => {
    render(TableSelectionToolbar, { ...props(0), resultCount: 1 });
    expect(
      screen
        .getByTestId("entity-table-count")
        .textContent?.replace(/\s+/g, " ")
        .trim(),
    ).toBe("1 entity");
    expect(screen.queryByTestId("entity-table-selection-toolbar")).toBeNull();
  });
});
