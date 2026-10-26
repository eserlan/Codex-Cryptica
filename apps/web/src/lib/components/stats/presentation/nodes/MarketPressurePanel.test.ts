/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { StatSheetField } from "schema";
import type { PresentationRenderContext } from "../types";

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: { entities: {} },
}));

import MarketPressurePanel from "./MarketPressurePanel.svelte";

const gp = (units: number) => ({ units, currency: "gp", precision: 0 });

function setup(extra: Partial<StatSheetField> = {}) {
  const field = {
    id: "stock",
    label: "Stock",
    type: "item-table",
    stockLedger: true,
    columns: [{ id: "name", label: "Item", type: "text" }],
    rows: [
      {
        rowId: "iron",
        name: "Iron ingot",
        stock: { quantity: 9, price: gp(10) },
      },
      { rowId: "rope", name: "Rope", stock: { quantity: 4, price: gp(1) } },
    ],
    ...extra,
  } as unknown as StatSheetField;
  const onUpdateField = vi.fn();
  const context = {
    fields: [field],
    readOnly: false,
    entityId: "shop",
    mode: "view",
    onUpdateField,
  } as unknown as PresentationRenderContext;
  const view = render(MarketPressurePanel, {
    props: {
      field,
      context,
      idGenerator: { uuid: () => "fixed-id" },
      clock: { now: () => 0 },
    },
  });
  return { field, onUpdateField, view };
}

const open = () => fireEvent.click(screen.getByTestId("market-toggle"));

describe("MarketPressurePanel (#3966)", () => {
  it("is closed and changes nothing until the GM opens and applies it", async () => {
    const { onUpdateField } = setup();
    expect(screen.queryByTestId("market-panel")).toBeNull();
    await open();
    expect(screen.getAllByTestId("market-diff-row")).toHaveLength(2);
    expect(onUpdateField).not.toHaveBeenCalled();
  });

  it("shows the diff with before and after before anything is saved", async () => {
    setup();
    await open();
    const first = screen.getAllByTestId("market-diff-row")[0].textContent ?? "";
    expect(first).toContain("10 gp → 15 gp");
    expect(first).toContain("×9 → ×3");
  });

  it("applies only the ticked lines, keeps the others, and records history", async () => {
    const { onUpdateField, field } = setup();
    await open();
    await fireEvent.click(screen.getByLabelText("Change Rope"));
    await fireEvent.input(screen.getByTestId("market-label"), {
      target: { value: "Iron shortage" },
    });
    await fireEvent.input(screen.getByTestId("market-reason"), {
      target: { value: "The mine road is closed" },
    });
    await fireEvent.click(screen.getByTestId("market-apply"));

    expect(onUpdateField).toHaveBeenCalledTimes(1);
    const update = onUpdateField.mock.calls[0][1];
    expect(update.rows[0].stock.price).toEqual(gp(15));
    expect(update.rows[1]).toBe((field.rows as unknown[])[1]);
    const [change] = update.marketHistory;
    expect(change).toMatchObject({
      id: "market-fixed-id",
      label: "Iron shortage",
      reason: "The mine road is closed",
      cause: { kind: "gm" },
      status: "applied",
    });
    expect(change.rows).toHaveLength(1);
  });

  it("the filter narrows which lines are proposed", async () => {
    setup();
    await open();
    await fireEvent.input(screen.getByTestId("market-applies-to"), {
      target: { value: "iron" },
    });
    expect(screen.getAllByTestId("market-diff-row")).toHaveLength(1);
  });

  it("cancel applies nothing", async () => {
    const { onUpdateField } = setup();
    await open();
    await fireEvent.click(screen.getByTestId("market-cancel"));
    expect(onUpdateField).not.toHaveBeenCalled();
    expect(screen.queryByTestId("market-panel")).toBeNull();
  });

  it("will not apply an out-of-range change", async () => {
    const { onUpdateField } = setup();
    await open();
    await fireEvent.input(screen.getByTestId("market-percent"), {
      target: { value: "900" },
    });
    expect(screen.getByRole("alert").textContent).toMatch(/between/);
    const apply = screen.getByTestId("market-apply") as HTMLButtonElement;
    expect(apply.disabled).toBe(true);
    await fireEvent.click(apply);
    expect(onUpdateField).not.toHaveBeenCalled();
  });

  it("refuses to apply to more lines than can be stored", async () => {
    const rows = Array.from({ length: 201 }, (_, i) => ({
      rowId: `r${i}`,
      name: `Item ${i}`,
      stock: { quantity: 2, price: gp(2) },
    }));
    const { onUpdateField } = setup({ rows } as never);
    await open();
    expect(screen.getByTestId("market-too-many").textContent).toContain("201");
    const apply = screen.getByTestId("market-apply") as HTMLButtonElement;
    expect(apply.disabled).toBe(true);
    await fireEvent.click(apply);
    expect(onUpdateField).not.toHaveBeenCalled();
    await fireEvent.input(screen.getByTestId("market-applies-to"), {
      target: { value: "Item 1" },
    });
    expect(screen.queryByTestId("market-too-many")).toBeNull();
    expect(apply.disabled).toBe(false);
  });

  it("undo restores the lines, and keeps a price the GM set since", async () => {
    const applied = {
      id: "m1",
      label: "Iron shortage",
      reason: "Road closed",
      cause: { kind: "gm" as const },
      at: "t",
      status: "applied" as const,
      rows: [
        {
          rowId: "iron",
          name: "Iron ingot",
          price: { before: gp(10), after: gp(15) },
        },
        {
          rowId: "rope",
          name: "Rope",
          price: { before: gp(1), after: gp(2) },
        },
      ],
    };
    const { onUpdateField } = setup({
      rows: [
        {
          rowId: "iron",
          name: "Iron ingot",
          stock: { quantity: 9, price: gp(15) },
        },
        { rowId: "rope", name: "Rope", stock: { quantity: 4, price: gp(7) } },
      ],
      marketHistory: [applied],
    } as never);
    expect(screen.getAllByTestId("market-standing-row").length).toBe(2);
    expect(
      screen.getAllByTestId("market-standing-row")[0].textContent,
    ).toContain("usual 10 gp, asking 15 gp");
    await fireEvent.click(screen.getByLabelText("Undo Iron shortage"));
    const update = onUpdateField.mock.calls[0][1];
    expect(update.rows[0].stock.price).toEqual(gp(10));
    expect(update.rows[1].stock.price).toEqual(gp(7));
    expect(update.marketHistory[0].status).toBe("reverted");
    expect(screen.getByTestId("market-conflicts").textContent).toContain(
      "Rope",
    );
  });
});
