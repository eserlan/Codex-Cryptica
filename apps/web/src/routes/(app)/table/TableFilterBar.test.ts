import { render, screen, fireEvent } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import TableFilterBar from "./TableFilterBar.svelte";
import { TableFilters } from "./table-filters.svelte.js";

describe("TableFilterBar", () => {
  it("removes individual filters without clearing the other columns", async () => {
    const filters = new TableFilters();
    filters.labelFilters = new Set(["hero"]);
    filters.columnFilters = {
      imageMode: "missing_image",
      summaryMode: "missing_summary",
    };
    render(TableFilterBar, {
      filters,
      typeCounts: new Map([
        ["location", 2],
        ["character", 1],
      ]),
      incompleteCount: 1,
      hasFilterPanel: true,
    });
    const types = screen.getAllByTestId("entity-table-type-filter");
    expect(types[0].textContent).toContain("Character");
    await fireEvent.click(types[0]);
    expect(filters.typeFilters.has("character")).toBe(true);
    await fireEvent.click(
      screen.getByRole("button", { name: "Remove hero filter" }),
    );
    expect(filters.labelFilters.size).toBe(0);
    await fireEvent.click(
      screen.getByRole("button", { name: "Remove image filter" }),
    );
    expect(filters.columnFilters).toEqual({ summaryMode: "missing_summary" });
    expect(screen.queryByTestId("entity-table-image-filter")).toBeNull();
    await fireEvent.click(screen.getByTestId("entity-table-clear-filters"));
    expect(filters.hasActiveFilters).toBe(false);
  });

  it("renders nothing when there is no filter panel", () => {
    const { container } = render(TableFilterBar, {
      filters: new TableFilters(),
      typeCounts: new Map(),
      incompleteCount: 0,
      hasFilterPanel: false,
    });
    expect(container.textContent).toBe("");
    expect(screen.queryByTestId("entity-table-clear-filters")).toBeNull();
  });
});
