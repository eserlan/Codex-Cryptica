/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { StatSheetField } from "schema";

const { vaultState } = vi.hoisted(() => ({
  vaultState: {
    entities: {
      hero: {
        id: "hero",
        type: "character",
        title: "Mira",
        statSheet: {
          fields: [
            {
              id: "w",
              key: "wallet_gp",
              label: "Gold",
              type: "number",
              value: 20,
            },
          ],
        },
      },
      pauper: {
        id: "pauper",
        type: "character",
        title: "Tobin",
        statSheet: { fields: [] },
      },
      cave: { id: "cave", type: "location", title: "Cave" },
    } as Record<string, any>,
  },
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
vi.mock("$lib/services/merchant-trade-instance", () => ({
  merchantTradeService: { execute: vi.fn() },
}));

import StockTradePanel from "./StockTradePanel.svelte";

const gp = (units: number) => ({ units, currency: "gp", precision: 0 });

const field: StatSheetField = {
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
  ],
};

function setup(over: Record<string, unknown> = {}) {
  const execute = vi.fn().mockResolvedValue({
    status: "done",
    alreadyDone: false,
    message: "Trade recorded. No funds were moved.",
    record: {},
  });
  const onClose = vi.fn();
  const onDone = vi.fn();
  render(StockTradePanel, {
    props: {
      shopId: "shop",
      field,
      row: field.rows![0],
      name: "Rope",
      service: { execute },
      onClose,
      onDone,
      ...over,
    },
  });
  return { execute, onClose, onDone };
}

const preview = () => screen.getByTestId("trade-preview").textContent ?? "";

describe("StockTradePanel preview", () => {
  it("shows exactly what will change before anything is saved", async () => {
    const { execute } = setup();
    await fireEvent.input(screen.getByTestId("trade-quantity"), {
      target: { value: "2" },
    });
    expect(preview()).toContain("Customer buys 2× Rope for 4 gp.");
    expect(preview()).toContain("Stock: 5 → 3");
    expect(preview()).toContain("Record only. No funds will be moved.");
    expect(execute).not.toHaveBeenCalled();
  });

  it("describes a sale to the shop the other way round", async () => {
    setup();
    await fireEvent.change(screen.getByTestId("trade-kind"), {
      target: { value: "sell" },
    });
    expect(preview()).toContain("Shop buys Rope for 2 gp.");
    expect(preview()).toContain("Stock: 5 → 6");
  });

  it("blocks and explains a trade that cannot happen", async () => {
    setup();
    await fireEvent.input(screen.getByTestId("trade-quantity"), {
      target: { value: "9" },
    });
    expect(screen.getByTestId("trade-problem").textContent).toContain(
      "Only 5 in stock",
    );
    expect(
      (screen.getByTestId("trade-confirm") as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("blocks an unreadable price", async () => {
    setup();
    await fireEvent.input(screen.getByTestId("trade-price"), {
      target: { value: "two gold" },
    });
    expect(screen.getByTestId("trade-problem").textContent).toContain(
      "price as digits",
    );
    expect(
      (screen.getByTestId("trade-confirm") as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("only offers characters as the other party", () => {
    setup();
    const options = Array.from(
      screen.getByTestId("trade-counterparty").querySelectorAll("option"),
    ).map((o) => o.textContent?.trim());
    expect(options).toEqual(["No one (record only)", "Mira", "Tobin"]);
  });
});

describe("StockTradePanel confirmation", () => {
  it("does nothing until the operator confirms, then sends one trade", async () => {
    const { execute, onClose, onDone } = setup();
    await fireEvent.input(screen.getByTestId("trade-quantity"), {
      target: { value: "2" },
    });
    expect(execute).not.toHaveBeenCalled();

    await fireEvent.click(screen.getByTestId("trade-confirm"));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute.mock.calls[0][0]).toMatchObject({
      shopId: "shop",
      fieldId: "stock",
      command: {
        kind: "purchase",
        rowId: "rope",
        quantity: 2,
        accounting: "record-only",
      },
    });
    expect(execute.mock.calls[0][0].command.unitPrice).toEqual(gp(2));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("cancelling closes the panel and never reaches the service", async () => {
    const { execute, onClose, onDone } = setup();
    await fireEvent.click(screen.getByTestId("trade-cancel"));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(execute).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });

  it("Escape cancels", async () => {
    const { execute, onClose } = setup();
    await fireEvent.keyDown(screen.getByTestId("stock-trade-panel"), {
      key: "Escape",
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(execute).not.toHaveBeenCalled();
  });

  it("a double click sends the trade once", async () => {
    let release: (value: unknown) => void = () => {};
    const execute = vi.fn(() => new Promise((resolve) => (release = resolve)));
    setup({ service: { execute } });
    const confirm = screen.getByTestId("trade-confirm");
    await fireEvent.click(confirm);
    await fireEvent.click(confirm);
    await fireEvent.click(confirm);
    expect(execute).toHaveBeenCalledTimes(1);
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
    release({ status: "done", alreadyDone: false, message: "", record: {} });
  });

  it("keeps the panel open and shows why when the trade fails", async () => {
    const execute = vi.fn().mockResolvedValue({
      status: "failed",
      message: "The trade could not be saved. Nothing was changed.",
    });
    const { onClose } = setup({ service: { execute } });
    await fireEvent.click(screen.getByTestId("trade-confirm"));
    await waitFor(() =>
      expect(screen.getByTestId("trade-outcome").textContent).toContain(
        "Nothing was changed",
      ),
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(
      (screen.getByTestId("trade-confirm") as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  it("offers to finish a half-done trade and retries with the same trade id", async () => {
    const execute = vi
      .fn()
      .mockResolvedValueOnce({
        status: "needs-recovery",
        message: "The wallet update did not finish.",
      })
      .mockResolvedValueOnce({
        status: "done",
        alreadyDone: false,
        message: "",
        record: {},
      });
    const { onClose } = setup({ service: { execute } });

    await fireEvent.click(screen.getByTestId("trade-confirm"));
    await waitFor(() =>
      expect(screen.getByTestId("trade-confirm").textContent).toContain(
        "Finish trade",
      ),
    );
    await fireEvent.click(screen.getByTestId("trade-confirm"));
    await waitFor(() => expect(onClose).toHaveBeenCalled());

    expect(execute).toHaveBeenCalledTimes(2);
    expect(execute.mock.calls[1][0].command.tradeId).toBe(
      execute.mock.calls[0][0].command.tradeId,
    );
  });

  it("reopens a persisted pending trade with its original id and terms", async () => {
    const interruptedField: StatSheetField = {
      ...field,
      tradeLog: [
        {
          tradeId: "trade-pending",
          kind: "purchase",
          rowId: "rope",
          itemName: "Rope",
          quantity: 2,
          total: gp(4),
          accounting: "wallet",
          counterpartyId: "hero",
          status: "pending",
          at: "2026-10-12T12:00:00.000Z",
        },
      ],
    };
    const { execute } = setup({ field: interruptedField });

    expect(preview()).toContain("Finishing a trade that was already started");
    expect(screen.getByTestId("trade-confirm").textContent).toContain(
      "Finish trade",
    );
    await fireEvent.click(screen.getByTestId("trade-confirm"));
    await waitFor(() => expect(execute).toHaveBeenCalledTimes(1));
    expect(execute.mock.calls[0][0].command).toMatchObject({
      tradeId: "trade-pending",
      kind: "purchase",
      rowId: "rope",
      quantity: 2,
      accounting: "wallet",
      counterpartyId: "hero",
    });
  });

  it("shows and locks the original price when the stock line price changed", async () => {
    const changedPrice = gp(9);
    const originalRow = field.rows![0] as Record<string, unknown>;
    const originalStock = originalRow.stock as Record<string, unknown>;
    const interruptedField: StatSheetField = {
      ...field,
      rows: [
        {
          ...originalRow,
          stock: { ...originalStock, price: changedPrice },
        },
      ],
      tradeLog: [
        {
          tradeId: "trade-pending",
          kind: "purchase",
          rowId: "rope",
          itemName: "Rope",
          quantity: 2,
          total: gp(4),
          accounting: "wallet",
          counterpartyId: "hero",
          status: "pending",
          at: "2026-10-12T12:00:00.000Z",
        },
      ],
    };
    const { execute } = setup({
      field: interruptedField,
      row: interruptedField.rows![0] as Record<string, any>,
    });

    expect((screen.getByTestId("trade-price") as HTMLInputElement).value).toBe(
      "2",
    );
    expect(
      (screen.getByTestId("trade-price") as HTMLInputElement).disabled,
    ).toBe(true);
    expect(preview()).toContain("Finishing a trade that was already started");

    await fireEvent.click(screen.getByTestId("trade-confirm"));
    await waitFor(() => expect(execute).toHaveBeenCalledTimes(1));
    expect(execute.mock.calls[0][0].command.unitPrice).toEqual(gp(2));
  });

  it("blocks a recovery attempt after its accounting terms are changed", async () => {
    const interruptedField: StatSheetField = {
      ...field,
      tradeLog: [
        {
          tradeId: "trade-pending",
          kind: "purchase",
          rowId: "rope",
          itemName: "Rope",
          quantity: 2,
          total: gp(4),
          accounting: "wallet",
          counterpartyId: "hero",
          status: "pending",
          at: "2026-10-12T12:00:00.000Z",
        },
      ],
    };
    const { execute } = setup({ field: interruptedField });

    await fireEvent.click(screen.getByTestId("trade-use-wallet"));

    expect(preview()).toContain("already used for a different trade");
    expect(
      (screen.getByTestId("trade-confirm") as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(execute).not.toHaveBeenCalled();
  });
});

describe("StockTradePanel wallet", () => {
  it("explains record-only when the character has no matching wallet", async () => {
    const { execute } = setup();
    await fireEvent.change(screen.getByTestId("trade-counterparty"), {
      target: { value: "pauper" },
    });
    expect(screen.getByTestId("trade-no-wallet").textContent).toContain(
      "wallet_gp",
    );
    expect(screen.queryByTestId("trade-use-wallet")).toBeNull();

    await fireEvent.click(screen.getByTestId("trade-confirm"));
    await waitFor(() => expect(execute).toHaveBeenCalled());
    expect(execute.mock.calls[0][0].command).toMatchObject({
      accounting: "record-only",
      counterpartyId: "pauper",
    });
  });

  it("previews the balance change and sends a wallet trade only when ticked", async () => {
    const { execute } = setup();
    await fireEvent.change(screen.getByTestId("trade-counterparty"), {
      target: { value: "hero" },
    });
    // Offered but off by default: still record only.
    expect(preview()).toContain("Record only");

    await fireEvent.click(screen.getByTestId("trade-use-wallet"));
    expect(preview()).toContain("Mira: 20 → 18 gp");

    await fireEvent.click(screen.getByTestId("trade-confirm"));
    await waitFor(() => expect(execute).toHaveBeenCalled());
    expect(execute.mock.calls[0][0].command).toMatchObject({
      accounting: "wallet",
      counterpartyId: "hero",
    });
  });

  it("blocks a purchase the character cannot afford", async () => {
    setup();
    await fireEvent.change(screen.getByTestId("trade-counterparty"), {
      target: { value: "hero" },
    });
    await fireEvent.click(screen.getByTestId("trade-use-wallet"));
    await fireEvent.input(screen.getByTestId("trade-price"), {
      target: { value: "50" },
    });
    expect(screen.getByTestId("trade-problem").textContent).toContain(
      "Not enough funds",
    );
    expect(
      (screen.getByTestId("trade-confirm") as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});
