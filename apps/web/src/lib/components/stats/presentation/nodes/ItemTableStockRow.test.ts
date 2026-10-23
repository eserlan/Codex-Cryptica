import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { Entity, StatSheetField } from "schema";
import type { PresentationRenderContext } from "../types";
import type { ItemTableRow } from "./item-table-values";

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: { entities: {}, allEntities: [] },
}));
vi.mock("$lib/services/merchant-trade-instance", () => ({
  merchantTradeService: { execute: vi.fn() },
}));
import ItemTableStockRow from "./ItemTableStockRow.svelte";

function props(
  row: ItemTableRow = {
    rowId: "rope",
    name: "Rope",
    stock: { quantity: 1, note: "GM secret" },
  },
) {
  return {
    row,
    columnCount: 2,
    field: {
      id: "stock",
      label: "Stock",
      type: "item-table",
    } as StatSheetField,
    context: {
      readOnly: false,
      mode: "view",
      entityId: "shop",
    } as PresentationRenderContext,
    catalogue: false,
    tradingEnabled: true,
    tradeOpen: false,
    onPatch: vi.fn(),
    onNotice: vi.fn(),
    onToggleTrade: vi.fn(),
    onCloseTrade: vi.fn(),
    onOpenLinked: vi.fn(),
  };
}

describe("ItemTableStockRow", () => {
  it("patches stock quantity, clamps negatives and preserves cleared quantities", async () => {
    const p = props();
    render(ItemTableStockRow, { props: p });
    await fireEvent.click(
      screen.getByRole("button", { name: "Increase quantity of Rope" }),
    );
    expect(p.onPatch).toHaveBeenLastCalledWith({ quantity: 2 });
    const input = screen.getByLabelText("Quantity of Rope");
    await fireEvent.change(input, { target: { value: "-4" } });
    expect(p.onPatch).toHaveBeenLastCalledWith({ quantity: 0 });
    expect(p.onNotice).toHaveBeenLastCalledWith("Stock can't go below 0.");
    await fireEvent.change(input, { target: { value: "" } });
    expect(p.onPatch).toHaveBeenLastCalledWith({ quantity: 1 });
    expect(p.onNotice).toHaveBeenLastCalledWith("");
  });

  it("parses prices, rejects invalid prices and clears overrides", async () => {
    const p = props();
    render(ItemTableStockRow, { props: p });
    const input = screen.getByLabelText("Shop price of Rope");
    await fireEvent.change(input, { target: { value: "2.30" } });
    expect(p.onPatch).toHaveBeenLastCalledWith({
      price: { units: 230, precision: 2, currency: "gp" },
    });
    p.onPatch.mockClear();
    await fireEvent.change(input, { target: { value: "bad" } });
    expect(p.onPatch).not.toHaveBeenCalled();
    expect(p.onNotice).toHaveBeenLastCalledWith(
      "Enter a price as digits, with a unit such as gp.",
    );
    await fireEvent.change(input, { target: { value: "" } });
    expect(p.onPatch).toHaveBeenLastCalledWith({ price: undefined });
    expect(p.onNotice).toHaveBeenLastCalledWith("");
  });

  it("edits metadata and requests a trade without changing the source item", async () => {
    const p = props();
    render(ItemTableStockRow, { props: p });
    await fireEvent.change(screen.getByLabelText("Availability"), {
      target: { value: "reserved" },
    });
    expect(p.onPatch).toHaveBeenLastCalledWith({ availability: "reserved" });
    await fireEvent.input(screen.getByLabelText("Condition"), {
      target: { value: "Worn" },
    });
    expect(p.onPatch).toHaveBeenLastCalledWith({ condition: "Worn" });
    await fireEvent.input(screen.getByLabelText("Note"), {
      target: { value: "Keep" },
    });
    expect(p.onPatch).toHaveBeenLastCalledWith({ note: "Keep" });
    await fireEvent.click(screen.getByRole("button", { name: "Trade Rope" }));
    expect(p.onToggleTrade).toHaveBeenCalledOnce();
  });

  it("opens linked items through the supplied action", async () => {
    const p = props({
      rowId: "s",
      entityId: "sword",
      stock: { kind: "service" },
    });
    render(ItemTableStockRow, {
      props: { ...p, linked: { title: "Sword" } as Entity },
    });
    await fireEvent.click(screen.getByRole("button", { name: "Open Sword" }));
    expect(p.onOpenLinked).toHaveBeenCalledWith("sword");
    expect(screen.queryByRole("spinbutton")).toBeNull();
  });

  it("shows stock summaries with GM notes only outside catalogue mode", async () => {
    const p = props();
    p.context.readOnly = true;
    const { rerender } = render(ItemTableStockRow, { props: p });
    expect(screen.getByText("Rope")).toBeTruthy();
    expect(screen.getByText("×1")).toBeTruthy();
    expect(screen.getByText("GM secret")).toBeTruthy();
    await rerender({ ...p, catalogue: true });
    expect(screen.queryByText("Rope")).toBeNull();
    expect(screen.queryByText("GM secret")).toBeNull();
    expect(screen.getByText("×1")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("does not show hidden stock details in a read-only row", () => {
    const p = props({
      name: "Secret",
      stock: { availability: "hidden", note: "GM secret" },
    });
    p.context.readOnly = true;
    render(ItemTableStockRow, { props: p });
    expect(screen.queryByText("Secret")).toBeNull();
    expect(screen.queryByText("GM secret")).toBeNull();
  });
});
