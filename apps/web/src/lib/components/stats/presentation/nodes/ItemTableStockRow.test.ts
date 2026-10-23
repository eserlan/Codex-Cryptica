import { fireEvent, render, screen } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, it, vi } from "vitest";
import type { Entity } from "schema";
import type { ItemTableRow } from "./item-table-values";
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
    colspan: 3,
    readOnly: false,
    catalogue: false,
    trade: { open: false, onToggle: vi.fn() } as
      { open: boolean; onToggle: () => void } | undefined,
    onPatch: vi.fn(),
    onNotice: vi.fn(),
    onOpenLinked: vi.fn(),
  };
}

const tradePanel = createRawSnippet((name: () => string) => ({
  render: () => `<div data-testid="trade-panel">${name()}</div>`,
}));

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
    expect(p.trade?.onToggle).toHaveBeenCalledOnce();
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
    p.readOnly = true;
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
    p.readOnly = true;
    render(ItemTableStockRow, { props: p });
    expect(screen.queryByText("Secret")).toBeNull();
    expect(screen.queryByText("GM secret")).toBeNull();
  });

  it("renders the trade panel only while the trade form is open", async () => {
    const p = props();
    const { rerender } = render(ItemTableStockRow, {
      props: { ...p, tradePanel },
    });
    expect(screen.queryByTestId("trade-panel")).toBeNull();
    expect(
      screen
        .getByRole("button", { name: "Trade Rope" })
        .getAttribute("aria-expanded"),
    ).toBe("false");
    await rerender({
      ...p,
      tradePanel,
      trade: { open: true, onToggle: vi.fn() },
    });
    expect(screen.getByTestId("trade-panel").textContent).toBe("Rope");
    expect(
      screen
        .getByRole("button", { name: "Trade Rope" })
        .getAttribute("aria-expanded"),
    ).toBe("true");
  });

  it("offers no trade control when the line cannot be traded", () => {
    render(ItemTableStockRow, {
      props: { ...props(), trade: undefined, tradePanel },
    });
    expect(screen.queryByRole("button", { name: "Trade Rope" })).toBeNull();
    expect(screen.queryByTestId("trade-panel")).toBeNull();
  });
});
