/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { StatSheetField } from "schema";
import type { PresentationRenderContext } from "../types";

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    entities: {
      shop: {
        id: "shop",
        type: "location",
        title: "The Fishmonger",
        labels: [],
        content: "A fantasy stall selling the morning catch.",
        connections: [{ target: "town", type: "located in" }],
      },
      town: {
        id: "town",
        type: "settlement",
        title: "Greyhaven",
        labels: [],
        content:
          "A harbour town where fishing boats land cod daily. Iron tools are scarce here.",
        connections: [],
      },
      lantern: {
        id: "lantern",
        type: "item",
        title: "Smoked river fish",
        labels: [],
        content: "",
        connections: [],
      },
    },
  },
}));

import StockSuggestionPanel from "./StockSuggestionPanel.svelte";

const gp = (units: number) => ({ units, currency: "gp", precision: 0 });

function setup(rows: Record<string, unknown>[] = []) {
  const field = {
    id: "stock",
    label: "Stock",
    type: "item-table",
    stockLedger: true,
    columns: [{ id: "name", label: "Item", type: "text" }],
    rows,
  } as unknown as StatSheetField;
  const onUpdateField = vi.fn();
  const context = {
    fields: [field],
    readOnly: false,
    entityId: "shop",
    mode: "view",
    onUpdateField,
  } as unknown as PresentationRenderContext;
  render(StockSuggestionPanel, { props: { field, context } });
  return { onUpdateField };
}

const open = () => fireEvent.click(screen.getByTestId("stock-suggest-toggle"));

describe("StockSuggestionPanel (#3965)", () => {
  it("shows nothing and changes nothing until opened", () => {
    const { onUpdateField } = setup();
    expect(screen.queryByTestId("stock-suggest-panel")).toBeNull();
    expect(onUpdateField).not.toHaveBeenCalled();
  });

  it("proposes stock shaped by the shop and its settlement", async () => {
    setup();
    await open();
    expect(screen.getByTestId("stock-suggest-summary").textContent).toMatch(
      /fantasy.*plentiful.*fish.*scarce.*iron/i,
    );
    const lines = screen
      .getAllByTestId("stock-suggest-line")
      .map((l) => l.textContent ?? "");
    expect(lines.some((t) => /cod|fish/i.test(t))).toBe(true);
  });

  it("adds only the ticked lines and leaves existing rows untouched", async () => {
    const existing = {
      rowId: "keep",
      name: "Mackerel",
      stock: { quantity: 4, price: gp(77), note: "my price" },
    };
    const { onUpdateField } = setup([existing]);
    await open();
    const boxes = screen.getAllByRole("checkbox", { name: /^Add / });
    for (const box of boxes.slice(1)) await fireEvent.click(box);
    await fireEvent.click(screen.getByTestId("stock-suggest-add"));
    expect(onUpdateField).toHaveBeenCalledTimes(1);
    const rows = onUpdateField.mock.calls[0][1].rows as Record<
      string,
      unknown
    >[];
    expect(rows[0]).toBe(existing);
    expect(rows).toHaveLength(2);
    expect((rows[1].stock as { note: string }).note).toMatch(
      /not an official/i,
    );
  });

  it("applies an edited quantity and price", async () => {
    const { onUpdateField } = setup();
    await open();
    const qty = screen.getAllByLabelText(/^Quantity for /)[0];
    const name = qty.getAttribute("aria-label")!.replace("Quantity for ", "");
    await fireEvent.input(qty, { target: { value: "7" } });
    await fireEvent.input(screen.getByLabelText(`Price for ${name}`), {
      target: { value: "42" },
    });
    for (const box of screen.getAllByRole("checkbox", { name: /^Add / })) {
      if (box.getAttribute("aria-label") !== `Add ${name}`) {
        await fireEvent.click(box);
      }
    }
    await fireEvent.click(screen.getByTestId("stock-suggest-add"));
    const row = onUpdateField.mock.calls[0][1].rows[0];
    expect(row.name).toBe(name);
    expect(row.stock.quantity).toBe(7);
    expect(row.stock.price.units).toBe(42);
  });

  it("shows invalid edits and blocks Add until each value is corrected", async () => {
    const { onUpdateField } = setup();
    await open();
    const quantity = screen.getAllByLabelText(/^Quantity for /)[0];
    const name = quantity
      .getAttribute("aria-label")!
      .replace("Quantity for ", "");
    const price = screen.getByLabelText(`Price for ${name}`);
    await fireEvent.input(quantity, { target: { value: "2.5" } });
    await fireEvent.input(price, { target: { value: "0" } });

    expect(quantity.getAttribute("aria-invalid")).toBe("true");
    expect(price.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getAllByRole("alert")).toHaveLength(2);
    const add = screen.getByTestId("stock-suggest-add") as HTMLButtonElement;
    expect(add.disabled).toBe(true);
    expect(onUpdateField).not.toHaveBeenCalled();

    await fireEvent.input(quantity, { target: { value: "2" } });
    await fireEvent.input(price, { target: { value: "1" } });
    expect(add.disabled).toBe(false);
    await fireEvent.click(add);

    const rows = onUpdateField.mock.calls[0][1].rows as {
      name: string;
      stock: { quantity: number; price: { units: number } };
    }[];
    const added = rows.find((row) => row.name === name)!;
    expect(added.stock.quantity).toBe(2);
    expect(added.stock.price.units).toBe(1);
  });

  it("shows and edits prices using fractional shop precision", async () => {
    const existing = {
      rowId: "priced-row",
      name: "Existing stock",
      stock: {
        quantity: 1,
        price: { units: 123, currency: "gp", precision: 2 },
      },
    };
    const { onUpdateField } = setup([existing]);
    await open();
    const price = screen.getAllByLabelText(
      /^Price for /,
    )[0] as HTMLInputElement;
    const name = price.getAttribute("aria-label")!.replace("Price for ", "");
    expect(price.value).toMatch(/^\d+\.\d{2}$/);
    expect(price.step).toBe("0.01");
    await fireEvent.input(price, { target: { value: "1.50" } });
    for (const box of screen.getAllByRole("checkbox", { name: /^Add / })) {
      if (box.getAttribute("aria-label") !== `Add ${name}`) {
        await fireEvent.click(box);
      }
    }
    await fireEvent.click(screen.getByTestId("stock-suggest-add"));
    const rows = onUpdateField.mock.calls[0][1].rows as {
      name: string;
      stock: { price?: unknown };
    }[];
    const added = rows.find((row) => row.name === name)!;
    expect(added.stock.price).toEqual({
      units: 150,
      currency: "gp",
      precision: 2,
    });
  });

  it("flags lines the shop already has and will not add them", async () => {
    const { onUpdateField } = setup([
      { rowId: "r", name: "Smoked river fish", stock: { quantity: 1 } },
    ]);
    await open();
    const dup = screen
      .getAllByTestId("stock-suggest-line")
      .find((l) => /Already in this shop/.test(l.textContent ?? ""));
    expect(dup).toBeDefined();
    expect(
      (dup!.querySelector("input[type=checkbox]") as HTMLInputElement).disabled,
    ).toBe(true);
    await fireEvent.click(screen.getByTestId("stock-suggest-add"));
    const rows = onUpdateField.mock.calls[0][1].rows as { name: string }[];
    expect(rows.filter((r) => r.name === "Smoked river fish")).toHaveLength(1);
  });

  it("links an existing Item only when the GM ticks it", async () => {
    const { onUpdateField } = setup();
    await open();
    expect(screen.getByTestId("stock-suggest-link")).toBeTruthy();
    await fireEvent.click(screen.getByTestId("stock-suggest-add"));
    const unlinked = onUpdateField.mock.calls[0][1].rows as Record<
      string,
      unknown
    >[];
    expect(unlinked.every((r) => r.entityId === undefined)).toBe(true);

    onUpdateField.mockClear();
    await open();
    await fireEvent.click(screen.getByTestId("stock-suggest-link"));
    await fireEvent.click(screen.getByTestId("stock-suggest-add"));
    const linked = onUpdateField.mock.calls[0][1].rows as Record<
      string,
      unknown
    >[];
    expect(linked.filter((r) => r.entityId === "lantern")).toHaveLength(1);
  });

  it("trying another set changes the proposal and clears earlier choices", async () => {
    setup();
    await open();
    const snapshot = () =>
      screen
        .getAllByTestId("stock-suggest-line")
        .map((l) => l.textContent)
        .join("|");
    const first = snapshot();
    const [firstBox] = screen.getAllByRole("checkbox", { name: /^Add / });
    await fireEvent.click(firstBox);
    expect((firstBox as HTMLInputElement).checked).toBe(false);

    let changed = false;
    for (let i = 0; i < 6 && !changed; i++) {
      await fireEvent.click(screen.getByTestId("stock-suggest-reroll"));
      changed = snapshot() !== first;
    }
    expect(changed).toBe(true);
    for (const box of screen.getAllByRole("checkbox", { name: /^Add / })) {
      expect((box as HTMLInputElement).checked).toBe(true);
    }
  });

  it("cancel adds nothing", async () => {
    const { onUpdateField } = setup();
    await open();
    await fireEvent.click(screen.getByTestId("stock-suggest-cancel"));
    expect(onUpdateField).not.toHaveBeenCalled();
    expect(screen.queryByTestId("stock-suggest-panel")).toBeNull();
  });
});
