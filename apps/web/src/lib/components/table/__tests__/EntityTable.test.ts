/** @vitest-environment jsdom */

import { render, fireEvent, screen } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Entity } from "schema";
import EntityTable from "../EntityTable.svelte";
import type { ConnectionSummary, SortKey, SortState } from "../entityTableSort";
import { goto } from "$app/navigation";
import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
import { vault } from "$lib/stores/vault.svelte";

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

const connectionCounts: Record<string, ConnectionSummary> = {
  e1: { inbound: 2, outbound: 1, total: 3 },
  e2: { inbound: 0, outbound: 0, total: 0 },
};

describe("EntityTable", () => {
  it("renders a row per entity with a link to the entity page", () => {
    render(EntityTable, {
      props: {
        entities: rows,
        vaultId: "v1",
        sort,
        connectionCounts,
        onSort: vi.fn(),
      },
    });

    const renderedRows = screen.getAllByTestId("entity-table-row");
    expect(renderedRows).toHaveLength(2);

    const link = screen.getByText("Aldric").closest("a");
    expect(link?.getAttribute("href")).toBe("/vault/v1/entity/e1");
  });

  it("renders combined inbound and outbound connection counts, including zero", () => {
    render(EntityTable, {
      props: {
        entities: rows,
        vaultId: "v1",
        sort,
        connectionCounts,
        onSort: vi.fn(),
      },
    });

    expect(
      screen.getByTestId("entity-table-connections-e1").textContent,
    ).toContain("3 2 in · 1 out");
    expect(
      screen.getByTestId("entity-table-connections-e2").textContent?.trim(),
    ).toBe("0");
  });

  it("shows an em dash for missing summary, tags, and dates", () => {
    render(EntityTable, {
      props: { entities: rows, vaultId: "v1", sort, onSort: vi.fn() },
    });

    // Brindlewood has no content, labels, tags, created or updated → multiple em dashes.
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  describe("filter chips", () => {
    it("calls onFilterLabel and onFilterType when chips are clicked, without navigating", async () => {
      const onFilterLabel = vi.fn<(label: string) => void>();
      const onFilterType = vi.fn<(type: string) => void>();
      render(EntityTable, {
        props: {
          entities: rows,
          vaultId: "v1",
          sort,
          onSort: vi.fn(),
          onFilterLabel,
          onFilterType,
        },
      });

      await fireEvent.click(screen.getByText("hero"));
      expect(onFilterLabel).toHaveBeenCalledWith("hero");

      await fireEvent.click(
        screen.getAllByTestId("entity-table-row-type-filter")[0],
      );
      expect(onFilterType).toHaveBeenCalledWith("character");

      expect(goto).not.toHaveBeenCalled();
    });

    it("renders labels as plain text when no filter callback is provided", () => {
      render(EntityTable, {
        props: { entities: rows, vaultId: "v1", sort, onSort: vi.fn() },
      });

      expect(screen.getByText("hero").closest("button")).toBeNull();
    });
  });

  describe("guest mode", () => {
    afterEach(() => {
      sessionModeStore.isGuestMode = false;
      vi.restoreAllMocks();
    });

    it("links titles to the guest deep-link URL instead of the vault entity route", () => {
      sessionModeStore.isGuestMode = true;
      render(EntityTable, {
        props: { entities: rows, vaultId: "pub1", sort, onSort: vi.fn() },
      });

      const link = screen.getByText("Aldric").closest("a");
      expect(link?.getAttribute("href")).toBe("/guest/pub1?entity=e1");
    });

    it("opens zen mode in place instead of navigating on row and title clicks", async () => {
      sessionModeStore.isGuestMode = true;
      const openZenMode = vi
        .spyOn(modalUIStore, "openZenMode")
        .mockImplementation(() => {});
      render(EntityTable, {
        props: { entities: rows, vaultId: "pub1", sort, onSort: vi.fn() },
      });

      // Double-click row background opens Zen Mode
      await fireEvent.dblClick(screen.getAllByTestId("entity-table-row")[0]);
      expect(openZenMode).toHaveBeenCalledWith("e1");

      // Clicking title link opens Zen Mode
      await fireEvent.click(screen.getByText("Brindlewood"));
      expect(openZenMode).toHaveBeenCalledWith("e2");
      expect(vault.selectedEntityId).toBe("e2");
      expect(goto).not.toHaveBeenCalled();
    });
  });

  it("calls onSort with the column key when a sortable header is clicked", async () => {
    const onSort = vi.fn<(key: SortKey) => void>();
    render(EntityTable, {
      props: { entities: rows, vaultId: "v1", sort, connectionCounts, onSort },
    });

    await fireEvent.click(screen.getByTestId("entity-table-sort-modified"));
    expect(onSort).toHaveBeenCalledWith("modified");

    await fireEvent.click(screen.getByTestId("entity-table-sort-created"));
    expect(onSort).toHaveBeenCalledWith("created");

    await fireEvent.click(screen.getByTestId("entity-table-sort-connections"));
    expect(onSort).toHaveBeenCalledWith("connections");
  });

  it("marks the active sort column with aria-sort", () => {
    render(EntityTable, {
      props: {
        entities: rows,
        vaultId: "v1",
        sort: { key: "title", direction: "asc" },
        connectionCounts,
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

  it("triggers onToggleRow when row background is clicked, forwarding modifiers", async () => {
    const onToggleRow = vi.fn();
    render(EntityTable, {
      props: {
        entities: rows,
        vaultId: "v1",
        sort,
        onSort: vi.fn(),
        onToggleRow,
      },
    });

    const renderedRows = screen.getAllByTestId("entity-table-row");

    // Normal click
    await fireEvent.click(renderedRows[0]);
    expect(onToggleRow).toHaveBeenCalledWith("e1", {
      shift: false,
      ctrl: false,
    });

    // Shift click
    await fireEvent.click(renderedRows[1], { shiftKey: true });
    expect(onToggleRow).toHaveBeenCalledWith("e2", {
      shift: true,
      ctrl: false,
    });

    // Ctrl click
    await fireEvent.click(renderedRows[0], { ctrlKey: true });
    expect(onToggleRow).toHaveBeenCalledWith("e1", {
      shift: false,
      ctrl: true,
    });
  });
});
