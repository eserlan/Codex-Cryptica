/** @vitest-environment jsdom */

import { render, screen, fireEvent } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { StatSheetField } from "schema";
import type { PresentationRenderContext } from "../types";

const { vaultState } = vi.hoisted(() => ({
  vaultState: {
    selectedEntityId: null as string | null,
    entities: {
      lantern: {
        id: "lantern",
        type: "item",
        title: "Hooded Lantern",
      },
    } as Record<string, any>,
  },
}));

vi.mock("#lib/utils/stat-sheet-field-actions.js", () => ({
  rollStatSheetDiceField: vi.fn(),
}));
vi.mock("#lib/stores/vault.svelte.js", () => ({
  vault: {
    get entities() {
      return vaultState.entities;
    },
    get allEntities() {
      return Object.values(vaultState.entities);
    },
    get selectedEntityId() {
      return vaultState.selectedEntityId;
    },
    set selectedEntityId(id: string | null) {
      vaultState.selectedEntityId = id;
    },
  },
}));

import ItemTableNode from "./ItemTableNode.svelte";

function makeContext(readOnly = false): PresentationRenderContext {
  return {
    fields: [],
    readOnly,
    mode: "view",
    sectionKeys: new Map(),
    isSectionCollapsed: () => false,
    onToggleSection: vi.fn(),
    onUpdateFieldValue: vi.fn(),
    onUpdateField: vi.fn(),
    onAdjustCounter: vi.fn(),
  } as PresentationRenderContext;
}

const stock: StatSheetField = {
  id: "stock",
  label: "Stock",
  type: "item-table",
  stockLedger: true,
  columns: [{ id: "name", label: "Item", type: "text" }],
  rows: [
    {
      rowId: "rope",
      name: "Rope",
      stock: {
        kind: "item",
        quantity: 12,
        price: { units: 1, currency: "gp", precision: 0 },
        note: "Cheap because it frays",
      },
    },
    {
      rowId: "ring",
      name: "Signet ring",
      stock: { kind: "item", quantity: 1, availability: "hidden" },
    },
    {
      rowId: "lamp",
      name: "Hooded lantern",
      entityId: "lantern",
      stock: { kind: "item", quantity: 3, availability: "sold-out" },
    },
  ],
};

describe("ItemTableNode catalogue view (#3962)", () => {
  it("shows prices and availability but hides hidden lines entirely", () => {
    render(ItemTableNode, {
      props: { field: stock, context: makeContext(true), catalogue: true },
    });
    expect(screen.getAllByTestId("stock-row")).toHaveLength(2);
    expect(screen.getByText("Rope")).toBeTruthy();
    expect(screen.getByText("1 gp")).toBeTruthy();
    expect(screen.getByText("sold-out")).toBeTruthy();
    // The hidden line is gone from the name column too, not just the stock row.
    expect(screen.queryByText("Signet ring")).toBeNull();
  });

  it("never shows a GM-only note to the customer", () => {
    render(ItemTableNode, {
      props: { field: stock, context: makeContext(true), catalogue: true },
    });
    expect(screen.queryByText("Cheap because it frays")).toBeNull();
  });

  it("has no editing controls and never writes", async () => {
    const ctx = makeContext(true);
    render(ItemTableNode, {
      props: { field: stock, context: ctx, catalogue: true },
    });
    expect(screen.queryByTestId("item-table-add-row")).toBeNull();
    expect(screen.queryAllByRole("spinbutton")).toHaveLength(0);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(ctx.onUpdateField).not.toHaveBeenCalled();
  });

  it("says so when nothing is for sale", () => {
    render(ItemTableNode, {
      props: {
        field: { ...stock, rows: [] },
        context: makeContext(true),
        catalogue: true,
      },
    });
    expect(screen.getByText(/Nothing is for sale right now/)).toBeTruthy();
  });

  it("says so when every stock line is hidden", () => {
    render(ItemTableNode, {
      props: {
        field: {
          ...stock,
          rows: stock.rows?.map((row) => ({
            ...row,
            stock: {
              ...(row.stock as Record<string, unknown>),
              availability: "hidden" as const,
            },
          })),
        },
        context: makeContext(true),
        catalogue: true,
      },
    });
    expect(screen.getByText(/Nothing is for sale right now/)).toBeTruthy();
    expect(screen.queryAllByTestId("stock-row")).toHaveLength(0);
  });

  it("keeps GM notes and hidden lines visible in the plain read-only view", () => {
    render(ItemTableNode, {
      props: { field: stock, context: makeContext(true) },
    });
    // Without the catalogue flag the note is shown, so the flag is what hides it.
    expect(screen.getByText("Cheap because it frays")).toBeTruthy();
  });
});

describe("ItemTableNode GM shortcuts (#3962)", () => {
  it("opens the linked Item from a stock line", async () => {
    vaultState.selectedEntityId = null;
    render(ItemTableNode, {
      props: { field: stock, context: makeContext(false) },
    });
    await fireEvent.click(
      screen.getByRole("button", { name: "Open Hooded Lantern" }),
    );
    expect(vaultState.selectedEntityId).toBe("lantern");
  });

  it("offers no shortcut on unlinked lines or when the Item is gone", () => {
    const field = {
      ...stock,
      rows: [
        { rowId: "rope", name: "Rope", stock: { kind: "item", quantity: 1 } },
        {
          rowId: "gone",
          name: "Lost relic",
          entityId: "deleted-item",
          stock: { kind: "item", quantity: 1 },
        },
      ],
    } as StatSheetField;
    render(ItemTableNode, {
      props: { field, context: makeContext(false) },
    });
    expect(screen.queryAllByRole("button", { name: /^Open / })).toHaveLength(0);
    expect(screen.getByText(/Linked item no longer exists/)).toBeTruthy();
  });
});
