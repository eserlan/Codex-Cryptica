/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { StatSheetField } from "schema";
import type { PresentationRenderContext } from "../types";

vi.mock("#lib/utils/stat-sheet-field-actions.js", () => ({
  rollStatSheetDiceField: vi.fn(),
}));
vi.mock("#lib/stores/vault.svelte.js", () => ({
  vault: { entities: {}, allEntities: [] },
}));
vi.mock("#lib/services/merchant-trade-instance.js", () => ({
  merchantTradeService: { execute: vi.fn() },
}));

import ItemTableNode from "./ItemTableNode.svelte";

function makeContext(
  over: Partial<PresentationRenderContext> = {},
): PresentationRenderContext {
  return {
    fields: [],
    readOnly: false,
    entityId: "shop",
    mode: "view",
    sectionKeys: new Map(),
    isSectionCollapsed: () => false,
    onToggleSection: vi.fn(),
    onUpdateFieldValue: vi.fn(),
    onUpdateField: vi.fn(),
    onAdjustCounter: vi.fn(),
    ...over,
  } as PresentationRenderContext;
}

const gp = (units: number) => ({ units, currency: "gp", precision: 0 });

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
      stock: { kind: "item", quantity: 5, price: gp(2) },
    },
    {
      rowId: "lamp",
      name: "Lamp",
      stock: { kind: "item", quantity: 1, price: gp(5) },
    },
  ],
};

const tradeButtons = () => screen.queryAllByRole("button", { name: /^Trade / });

describe("Trade control on a stock table (#3963)", () => {
  it("is offered on each line of an editable shop and opens one panel at a time", async () => {
    render(ItemTableNode, {
      props: { field: stock, context: makeContext() },
    });
    expect(tradeButtons()).toHaveLength(2);
    expect(screen.queryByTestId("stock-trade-panel")).toBeNull();

    const [rope, lamp] = tradeButtons();
    await fireEvent.click(rope);
    expect(screen.getAllByTestId("stock-trade-panel")).toHaveLength(1);
    expect(rope.getAttribute("aria-expanded")).toBe("true");

    // Opening another line replaces the first panel.
    await fireEvent.click(lamp);
    const panels = screen.getAllByTestId("stock-trade-panel");
    expect(panels).toHaveLength(1);
    expect(panels[0].getAttribute("aria-label")).toBe("Trade Lamp");

    // Clicking it again closes it.
    await fireEvent.click(lamp);
    expect(screen.queryByTestId("stock-trade-panel")).toBeNull();
  });

  it("keeps the trade form closed while a malformed row receives its id", () => {
    // Deliberately malformed persisted data, before row-id enrichment.
    const field = {
      ...stock,
      rows: [{ rowId: null, name: "Rope", stock: { quantity: 1 } }],
    } as unknown as StatSheetField;
    const context = makeContext();
    render(ItemTableNode, { props: { field, context } });
    expect(context.onUpdateField).toHaveBeenCalled();
    expect(tradeButtons()).toHaveLength(0);
    expect(screen.queryByTestId("stock-trade-panel")).toBeNull();
  });

  it("opening the form changes nothing", async () => {
    const context = makeContext();
    render(ItemTableNode, { props: { field: stock, context } });
    await fireEvent.click(tradeButtons()[0]);
    expect(context.onUpdateField).not.toHaveBeenCalled();
  });

  it.each([
    ["the catalogue", { catalogue: true }, {}],
    ["a read-only sheet", {}, { readOnly: true }],
    ["the template editor preview", {}, { mode: "preview" as const }],
    ["a sheet with no known entity", {}, { entityId: undefined }],
  ])("is not offered in %s", (_name, props, contextOver) => {
    render(ItemTableNode, {
      props: {
        field: stock,
        context: makeContext(contextOver as Partial<PresentationRenderContext>),
        ...props,
      },
    });
    expect(tradeButtons()).toHaveLength(0);
  });

  it("is not offered on an ordinary item table without a stock ledger", () => {
    const plain = { ...stock, stockLedger: false } as StatSheetField;
    render(ItemTableNode, { props: { field: plain, context: makeContext() } });
    expect(tradeButtons()).toHaveLength(0);
  });
});
