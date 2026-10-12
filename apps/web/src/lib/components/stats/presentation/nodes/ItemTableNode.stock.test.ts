/** @vitest-environment jsdom */

import { render, screen, fireEvent } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { StatSheetField } from "schema";
import type { PresentationRenderContext } from "../types";

const { vaultState } = vi.hoisted(() => ({
  vaultState: {
    entities: {
      sword: {
        id: "sword",
        type: "item",
        title: "Steel Sword",
        statSheet: {
          fields: [
            { id: "price", label: "Price", type: "text", value: "15 gp" },
          ],
        },
      },
    } as Record<string, any>,
  },
}));

vi.mock("$lib/utils/stat-sheet-field-actions", () => ({
  rollStatSheetDiceField: vi.fn(),
}));
vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    get entities() {
      return vaultState.entities;
    },
    get allEntities() {
      return Object.values(vaultState.entities);
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

const base: StatSheetField = {
  id: "stock",
  label: "Stock",
  type: "item-table",
  stockLedger: true,
  columns: [{ id: "name", label: "Name", type: "text" }],
  rows: [
    {
      rowId: "a",
      entityId: "sword",
      stock: { kind: "item", quantity: 1, availability: "available" },
    },
    {
      rowId: "b",
      entityId: "sword",
      stock: { kind: "item", quantity: 4, availability: "available" },
    },
  ],
};

const lastRows = (ctx: PresentationRenderContext) =>
  (ctx.onUpdateField as any).mock.calls.at(-1)[1].rows as any[];

describe("ItemTableNode stock ledger", () => {
  it("edits one lot's quantity without touching the other lot or the Item", async () => {
    const ctx = makeContext();
    render(ItemTableNode, { props: { field: base, context: ctx } });
    const incs = screen.getAllByRole("button", { name: /Increase quantity/ });
    await fireEvent.click(incs[0]);
    const rows = lastRows(ctx);
    expect(rows[0].stock.quantity).toBe(2);
    expect(rows[1].stock.quantity).toBe(4);
    expect(vaultState.entities.sword.statSheet.fields[0].value).toBe("15 gp");
  });

  it("does not drop below zero and explains why", async () => {
    const ctx = makeContext();
    const field = {
      ...base,
      rows: [
        { rowId: "a", name: "Rope", stock: { kind: "item", quantity: 0 } },
      ],
    } as StatSheetField;
    render(ItemTableNode, { props: { field, context: ctx } });
    await fireEvent.click(
      screen.getByRole("button", { name: /Decrease quantity/ }),
    );
    expect(lastRows(ctx)[0].stock.quantity).toBe(0);
    expect(screen.getByTestId("stock-notice").textContent).toContain("below 0");
  });

  it("clamps a typed negative quantity", async () => {
    const ctx = makeContext();
    render(ItemTableNode, { props: { field: base, context: ctx } });
    const qty = screen.getAllByRole("spinbutton")[0];
    await fireEvent.change(qty, { target: { value: "-5" } });
    expect(lastRows(ctx)[0].stock.quantity).toBe(0);
  });

  it("stores a shop price as exact integer units and marks it as an override", async () => {
    const ctx = makeContext();
    const { rerender } = render(ItemTableNode, {
      props: { field: base, context: ctx },
    });
    expect(screen.getAllByTestId("price-source")[0].textContent).toContain(
      "Using item price: 15 gp",
    );
    const price = screen.getAllByLabelText(/Shop price of/)[0];
    await fireEvent.change(price, { target: { value: "0.30" } });
    const row = lastRows(ctx)[0];
    expect(row.stock.price).toEqual({
      units: 30,
      currency: "gp",
      precision: 2,
    });
    await rerender({ field: { ...base, rows: lastRows(ctx) }, context: ctx });
    expect(screen.getAllByTestId("price-source")[0].textContent).toContain(
      "Shop override (item: 15 gp)",
    );
  });

  it("rejects an unparseable price instead of saving it", async () => {
    const ctx = makeContext();
    render(ItemTableNode, { props: { field: base, context: ctx } });
    const price = screen.getAllByLabelText(/Shop price of/)[0];
    (ctx.onUpdateField as any).mockClear();
    await fireEvent.change(price, { target: { value: "lots" } });
    expect(ctx.onUpdateField).not.toHaveBeenCalled();
    expect(screen.getByTestId("stock-notice")).toBeTruthy();
  });

  it("keeps a deleted item's saved name and stays editable", () => {
    const field = {
      ...base,
      rows: [
        {
          rowId: "z",
          entityId: "gone",
          name: "Old Axe",
          stock: { quantity: 2 },
        },
      ],
    } as StatSheetField;
    render(ItemTableNode, { props: { field, context: makeContext() } });
    expect(screen.getByText(/no longer exists/)).toBeTruthy();
    expect(screen.getByLabelText("Quantity of Old Axe")).toBeTruthy();
  });

  it("supports an unlinked service line without quantity", () => {
    const field = {
      ...base,
      rows: [{ rowId: "s", name: "Sharpening", stock: { kind: "service" } }],
    } as StatSheetField;
    render(ItemTableNode, { props: { field, context: makeContext() } });
    expect(screen.queryByLabelText(/Quantity of/)).toBeNull();
  });

  it("assigns ids to legacy rows when an editor opens a ledger", () => {
    const ctx = makeContext();
    const field = { ...base, rows: [{ name: "Legacy" }] } as StatSheetField;
    render(ItemTableNode, { props: { field, context: ctx } });
    expect(lastRows(ctx)[0]).toMatchObject({ name: "Legacy" });
    expect(typeof lastRows(ctx)[0].rowId).toBe("string");
  });

  it("hides hidden lines from readers and never writes in read-only mode", () => {
    const ctx = makeContext(true);
    const field = {
      ...base,
      rows: [
        {
          rowId: "h",
          name: "Secret Stash",
          stock: { availability: "hidden", quantity: 1 },
        },
        { rowId: "v", name: "Rope", stock: { quantity: 3 } },
      ],
    } as StatSheetField;
    render(ItemTableNode, { props: { field, context: ctx } });
    expect(
      screen.queryByText("Secret Stash", { selector: "span.font-bold" }),
    ).toBeNull();
    expect(
      screen.getByText("Rope", { selector: "span.font-bold" }),
    ).toBeTruthy();
    expect(ctx.onUpdateField).not.toHaveBeenCalled();
  });

  it("leaves legacy tables untouched (no ids, no stock UI)", async () => {
    const ctx = makeContext();
    const field: StatSheetField = {
      id: "w",
      label: "Weapons",
      type: "item-table",
      columns: [{ id: "name", label: "Name", type: "text" }],
      rows: [{ name: "Hammer" }],
    };
    render(ItemTableNode, { props: { field, context: ctx } });
    expect(screen.queryByTestId("stock-row")).toBeNull();
    await fireEvent.click(screen.getByTestId("item-table-add-row"));
    expect(lastRows(ctx).every((r) => !("rowId" in r) && !("stock" in r))).toBe(
      true,
    );
  });
});
