/** @vitest-environment jsdom */

import { render, fireEvent, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { Entity } from "schema";
import EntityTable from "../EntityTable.svelte";
import type { ConnectionSummary, SortKey, SortState } from "../entityTableSort";

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
});
