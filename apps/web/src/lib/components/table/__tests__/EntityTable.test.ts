/** @vitest-environment jsdom */

import { render, fireEvent, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { Entity } from "schema";
import EntityTable from "../EntityTable.svelte";
import type { SortKey, SortState } from "../entityTableSort";
import { goto } from "$app/navigation";

vi.mock("$app/paths", () => ({ base: "" }));
vi.mock("$app/navigation", () => ({ goto: vi.fn() }));

function entity(
  partial: Partial<Entity> & { id: string; title: string },
): Entity {
  return {
    type: "character",
    tags: [],
    labels: [],
    aliases: [],
    connections: [],
    content: "",
    status: "active",
    ...partial,
  } as Entity;
}

const sort: SortState = { key: "title", direction: "asc" };

const rows: Entity[] = [
  entity({
    id: "e1",
    title: "Aldric",
    type: "character",
    content: "A weary knight.",
    labels: ["hero"],
    createdAt: 1_600_000_000_000,
    modifiedAt: 1_700_000_000_000,
  }),
  entity({ id: "e2", title: "Brindlewood", type: "location" }),
];

describe("EntityTable", () => {
  it("renders a row per entity with a link to the entity page", () => {
    render(EntityTable, {
      props: { entities: rows, vaultId: "v1", sort, onSort: vi.fn() },
    });

    const renderedRows = screen.getAllByTestId("entity-table-row");
    expect(renderedRows).toHaveLength(2);

    const link = screen.getByText("Aldric").closest("a");
    expect(link?.getAttribute("href")).toBe("/vault/v1/entity/e1");
  });

  it("shows an em dash for missing summary, tags, and dates", () => {
    render(EntityTable, {
      props: { entities: rows, vaultId: "v1", sort, onSort: vi.fn() },
    });

    // Brindlewood has no content, labels, tags, created or updated → multiple em dashes.
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("calls onSort with the column key when a sortable header is clicked", async () => {
    const onSort = vi.fn<(key: SortKey) => void>();
    render(EntityTable, {
      props: { entities: rows, vaultId: "v1", sort, onSort },
    });

    await fireEvent.click(screen.getByTestId("entity-table-sort-modified"));
    expect(onSort).toHaveBeenCalledWith("modified");

    await fireEvent.click(screen.getByTestId("entity-table-sort-created"));
    expect(onSort).toHaveBeenCalledWith("created");
  });

  it("marks the active sort column with aria-sort", () => {
    render(EntityTable, {
      props: {
        entities: rows,
        vaultId: "v1",
        sort: { key: "title", direction: "asc" },
        onSort: vi.fn(),
      },
    });

    const nameHeader = screen.getByText("Name").closest("th");
    expect(nameHeader?.getAttribute("aria-sort")).toBe("ascending");
  });

  it("renders a select checkbox per row plus a select-all header checkbox", () => {
    render(EntityTable, {
      props: { entities: rows, vaultId: "v1", sort, onSort: vi.fn() },
    });

    expect(screen.getByTestId("entity-table-select-all")).toBeTruthy();
    expect(screen.getAllByTestId("entity-table-row-select")).toHaveLength(2);
  });

  it("reflects the selected set and toggles a row without navigating", async () => {
    const onToggleRow = vi.fn<(id: string) => void>();
    render(EntityTable, {
      props: {
        entities: rows,
        vaultId: "v1",
        sort,
        onSort: vi.fn(),
        selectedIds: new Set(["e1"]),
        onToggleRow,
      },
    });

    const boxes = screen.getAllByTestId(
      "entity-table-row-select",
    ) as HTMLInputElement[];
    expect(boxes[0].checked).toBe(true);
    expect(boxes[1].checked).toBe(false);

    await fireEvent.click(boxes[1]);
    expect(onToggleRow).toHaveBeenCalledWith("e2");
    expect(goto).not.toHaveBeenCalled();
  });

  it("checks select-all when every row is selected and calls onToggleAll", async () => {
    const onToggleAll = vi.fn();
    render(EntityTable, {
      props: {
        entities: rows,
        vaultId: "v1",
        sort,
        onSort: vi.fn(),
        selectedIds: new Set(["e1", "e2"]),
        allSelected: true,
        onToggleAll,
      },
    });

    const selectAll = screen.getByTestId(
      "entity-table-select-all",
    ) as HTMLInputElement;
    expect(selectAll.checked).toBe(true);

    await fireEvent.click(selectAll);
    expect(onToggleAll).toHaveBeenCalledTimes(1);
  });

  it("shows the select-all checkbox as indeterminate on a partial selection", () => {
    render(EntityTable, {
      props: {
        entities: rows,
        vaultId: "v1",
        sort,
        onSort: vi.fn(),
        selectedIds: new Set(["e1"]),
        someSelected: true,
      },
    });

    const selectAll = screen.getByTestId(
      "entity-table-select-all",
    ) as HTMLInputElement;
    expect(selectAll.indeterminate).toBe(true);
  });
});
