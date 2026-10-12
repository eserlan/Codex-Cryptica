import { describe, expect, it } from "vitest";
import type { StatSheetField, StockTradeRecord } from "schema";
import {
  TRADE_LOG_LIMIT,
  appendTradeRecord,
  completeTradeRecord,
  describeTrade,
  findWalletField,
  planTrade,
  planWalletChange,
  walletKeyFor,
  type TradeCommand,
} from "./commerce";
import type { StockRow } from "./stock";

const gp = (units: number) => ({ units, currency: "gp", precision: 0 });
const NOW = "2026-10-12T12:00:00.000Z";

function rows(): StockRow[] {
  return [
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
    {
      rowId: "ring",
      name: "Ring",
      stock: {
        kind: "item",
        quantity: 1,
        price: gp(40),
        availability: "hidden",
      },
    },
    {
      rowId: "held",
      name: "Held sword",
      stock: {
        kind: "item",
        quantity: 1,
        price: gp(30),
        availability: "reserved",
      },
    },
    {
      rowId: "gone",
      name: "Rations",
      stock: {
        kind: "item",
        quantity: 0,
        price: gp(1),
        availability: "sold-out",
      },
    },
    {
      rowId: "boots",
      name: "Resoling",
      stock: { kind: "service", price: gp(2) },
    },
    { rowId: "free", name: "Mystery", stock: { kind: "item", quantity: 3 } },
  ];
}

function plan(
  command: Partial<TradeCommand>,
  input: { rows?: StockRow[]; tradeLog?: StockTradeRecord[] } = {},
) {
  return planTrade(
    {
      rows: input.rows ?? rows(),
      tradeLog: input.tradeLog,
      itemName: (row) => String(row.name ?? ""),
      now: NOW,
    },
    {
      tradeId: "t1",
      kind: "purchase",
      rowId: "rope",
      quantity: 1,
      accounting: "record-only",
      ...command,
    },
  );
}

const rowById = (list: StockRow[], id: string) =>
  list.find((row) => row.rowId === id) as StockRow & { stock: any };

describe("planTrade purchase (customer buys from the shop)", () => {
  it("takes stock off the line and totals the price exactly", () => {
    const result = plan({ quantity: 2 });
    if (!result.ok || result.duplicate) throw new Error("expected a plan");
    expect(rowById(result.nextRows, "rope").stock.quantity).toBe(3);
    expect(result.record.total).toEqual(gp(4));
    expect(result.record).toMatchObject({
      tradeId: "t1",
      kind: "purchase",
      itemName: "Rope",
      status: "complete",
      accounting: "record-only",
      at: NOW,
    });
  });

  it("marks a line sold out when the last unit goes", () => {
    const result = plan({ rowId: "lamp" });
    if (!result.ok || result.duplicate) throw new Error("expected a plan");
    expect(rowById(result.nextRows, "lamp").stock).toMatchObject({
      quantity: 0,
      availability: "sold-out",
    });
  });

  it("uses a typed unit price over the line's shop price", () => {
    const result = plan({ quantity: 2, unitPrice: gp(1) });
    if (!result.ok || result.duplicate) throw new Error("expected a plan");
    expect(result.record.total).toEqual(gp(2));
    // The line's own price is left alone.
    expect(rowById(result.nextRows, "rope").stock.price).toEqual(gp(2));
  });

  it("does not change the input rows", () => {
    const input = rows();
    const before = JSON.stringify(input);
    plan({ quantity: 2 }, { rows: input });
    expect(JSON.stringify(input)).toBe(before);
  });

  it("trades a service without touching stock", () => {
    const result = plan({ rowId: "boots" });
    if (!result.ok || result.duplicate) throw new Error("expected a plan");
    expect(result.nextRows).toEqual(rows());
    expect(result.record.total).toEqual(gp(2));
  });

  it.each([
    ["zero", 0],
    ["negative", -1],
    ["fractional", 1.5],
    ["not a number", Number.NaN],
    ["unsafe", Number.MAX_SAFE_INTEGER + 1],
  ])("rejects a %s quantity", (_name, quantity) => {
    expect(plan({ quantity })).toMatchObject({
      ok: false,
      code: "invalid-quantity",
    });
  });

  it("rejects more than is in stock and says how many there are", () => {
    const result = plan({ quantity: 6 });
    expect(result).toMatchObject({ ok: false, code: "insufficient-stock" });
    expect((result as { message: string }).message).toContain("Only 5");
  });

  it.each([
    ["hidden", "ring"],
    ["reserved", "held"],
    ["sold out", "gone"],
  ])("will not sell a %s line", (_name, rowId) => {
    expect(plan({ rowId })).toMatchObject({ ok: false, code: "not-for-sale" });
  });

  it("rejects a service bought more than once", () => {
    expect(plan({ rowId: "boots", quantity: 2 })).toMatchObject({
      ok: false,
      code: "invalid-quantity",
    });
  });

  it("needs a price when neither the line nor the form has one", () => {
    expect(plan({ rowId: "free" })).toMatchObject({
      ok: false,
      code: "price-required",
    });
  });

  it("rejects a negative or malformed price", () => {
    expect(plan({ unitPrice: gp(-1) })).toMatchObject({
      ok: false,
      code: "invalid-price",
    });
    expect(
      plan({ unitPrice: { units: 1.5, currency: "gp", precision: 0 } }),
    ).toMatchObject({ ok: false, code: "invalid-price" });
  });

  it("rejects a total that would not be a safe integer", () => {
    expect(
      plan({ quantity: 5, unitPrice: gp(Number.MAX_SAFE_INTEGER) }),
    ).toMatchObject({ ok: false, code: "amount-too-large" });
  });

  it("reports a deleted line instead of guessing", () => {
    expect(plan({ rowId: "nope" })).toMatchObject({
      ok: false,
      code: "line-not-found",
    });
  });

  it("needs someone to pay when wallet accounting is chosen", () => {
    expect(plan({ accounting: "wallet" })).toMatchObject({
      ok: false,
      code: "wallet-needs-counterparty",
    });
  });

  it("starts a wallet trade as pending", () => {
    const result = plan({ accounting: "wallet", counterpartyId: "hero" });
    if (!result.ok || result.duplicate) throw new Error("expected a plan");
    expect(result.record.status).toBe("pending");
    expect(result.record.counterpartyId).toBe("hero");
  });
});

describe("planTrade sell (customer sells to the shop)", () => {
  it("adds stock and reopens a sold-out line", () => {
    const result = plan({ kind: "sell", rowId: "gone", quantity: 4 });
    if (!result.ok || result.duplicate) throw new Error("expected a plan");
    expect(rowById(result.nextRows, "gone").stock).toMatchObject({
      quantity: 4,
      availability: "available",
    });
    expect(result.record.total).toEqual(gp(4));
  });

  it("keeps a hidden line hidden", () => {
    const result = plan({ kind: "sell", rowId: "ring" });
    if (!result.ok || result.duplicate) throw new Error("expected a plan");
    expect(rowById(result.nextRows, "ring").stock.availability).toBe("hidden");
  });

  it("will not buy a service from a customer", () => {
    expect(plan({ kind: "sell", rowId: "boots" })).toMatchObject({
      ok: false,
      code: "service-not-sellable",
    });
  });

  it("rejects a quantity that overflows the stock count", () => {
    const input = rows();
    input[0] = {
      rowId: "rope",
      name: "Rope",
      stock: { kind: "item", quantity: Number.MAX_SAFE_INTEGER, price: gp(1) },
    };
    expect(plan({ kind: "sell", quantity: 1 }, { rows: input })).toMatchObject({
      ok: false,
      code: "amount-too-large",
    });
  });
});

describe("planTrade duplicate submissions", () => {
  const done: StockTradeRecord = {
    tradeId: "t1",
    kind: "purchase",
    rowId: "rope",
    itemName: "Rope",
    quantity: 1,
    total: gp(2),
    accounting: "record-only",
    status: "complete",
    at: NOW,
  };

  it("returns the existing record instead of applying twice", () => {
    const result = plan({}, { tradeLog: [done] });
    expect(result).toEqual({ ok: true, duplicate: true, record: done });
  });

  it("refuses a reused id for a different trade", () => {
    expect(plan({ quantity: 3 }, { tradeLog: [done] })).toMatchObject({
      ok: false,
      code: "invalid-trade",
    });
    expect(plan({ rowId: "lamp" }, { tradeLog: [done] })).toMatchObject({
      ok: false,
      code: "invalid-trade",
    });
  });

  it("refuses a retry that changes accounting or counterparty", () => {
    const pending: StockTradeRecord = {
      ...done,
      accounting: "wallet",
      counterpartyId: "hero",
      status: "pending",
    };

    expect(
      plan(
        { accounting: "record-only", counterpartyId: "hero" },
        { tradeLog: [pending] },
      ),
    ).toMatchObject({ ok: false, code: "invalid-trade" });
    expect(
      plan(
        { accounting: "wallet", counterpartyId: "someone-else" },
        { tradeLog: [pending] },
      ),
    ).toMatchObject({ ok: false, code: "invalid-trade" });
  });

  it("refuses a retry with a different price", () => {
    const pending: StockTradeRecord = {
      ...done,
      accounting: "wallet",
      counterpartyId: "hero",
      status: "pending",
    };

    expect(
      plan(
        {
          accounting: "wallet",
          counterpartyId: "hero",
          unitPrice: gp(3),
        },
        { tradeLog: [pending] },
      ),
    ).toMatchObject({ ok: false, code: "invalid-trade" });
  });

  it("refuses a retry when the supplied total uses another currency or precision", () => {
    const pending: StockTradeRecord = {
      ...done,
      accounting: "wallet",
      counterpartyId: "hero",
      status: "pending",
    };

    for (const unitPrice of [
      { units: 2, currency: "sp", precision: 0 },
      { units: 20, currency: "gp", precision: 1 },
    ]) {
      expect(
        plan(
          { accounting: "wallet", counterpartyId: "hero", unitPrice },
          { tradeLog: [pending] },
        ),
      ).toMatchObject({ ok: false, code: "invalid-trade" });
    }
  });

  it("keeps every pending trade recoverable when the log is full", () => {
    const pending = Array.from({ length: TRADE_LOG_LIMIT }, (_, index) => ({
      ...done,
      tradeId: `pending-${index}`,
      status: "pending" as const,
    }));

    expect(plan({}, { tradeLog: pending })).toMatchObject({
      ok: false,
      code: "too-many-pending-trades",
    });
    expect(pending).toHaveLength(TRADE_LOG_LIMIT);
  });

  it("rejects a missing trade reference", () => {
    expect(plan({ tradeId: "" })).toMatchObject({
      ok: false,
      code: "invalid-trade",
    });
  });
});

describe("trade log", () => {
  const entry = (n: number, status: "pending" | "complete") =>
    ({
      tradeId: `t${n}`,
      kind: "purchase",
      rowId: "rope",
      itemName: "Rope",
      quantity: 1,
      total: gp(1),
      accounting: "record-only",
      status,
      at: NOW,
    }) as StockTradeRecord;

  it("stays bounded and drops the oldest complete trade first", () => {
    let log: StockTradeRecord[] = [entry(0, "pending")];
    for (let i = 1; i <= TRADE_LOG_LIMIT + 3; i++) {
      log = appendTradeRecord(log, entry(i, "complete"));
    }
    expect(log).toHaveLength(TRADE_LOG_LIMIT);
    // The old pending trade survives; the oldest completes were dropped.
    expect(log[0].tradeId).toBe("t0");
    expect(log.some((e) => e.tradeId === "t1")).toBe(false);
  });

  it("completes a pending record and leaves a finished log untouched", () => {
    const log = [entry(1, "pending")];
    expect(completeTradeRecord(log, "t1")[0].status).toBe("complete");
    const finished = [entry(2, "complete")];
    expect(completeTradeRecord(finished, "t2")).toBe(finished);
    expect(completeTradeRecord(finished, "missing")).toBe(finished);
  });
});

describe("wallet", () => {
  const record = (
    kind: "purchase" | "sell",
    total = gp(10),
  ): StockTradeRecord => ({
    tradeId: "t1",
    kind,
    rowId: "rope",
    itemName: "Rope",
    quantity: 1,
    total,
    accounting: "wallet",
    counterpartyId: "hero",
    status: "pending",
    at: NOW,
  });
  const sheet = (value: unknown = 25): StatSheetField[] => [
    { id: "hp", label: "HP", type: "counter", value: 8 },
    {
      id: "w",
      key: "wallet_gp",
      label: "Gold",
      type: "number",
      value,
    } as StatSheetField,
  ];

  it("names the wallet field after the denomination", () => {
    expect(walletKeyFor("gp")).toBe("wallet_gp");
    expect(walletKeyFor("Imperial Credits")).toBe("wallet_imperialcredits");
    expect(walletKeyFor("!!!")).toBe("");
    expect(findWalletField(sheet(), "GP")?.id).toBe("w");
    expect(findWalletField(sheet(), "cr")).toBeUndefined();
  });

  it("spends on a purchase and records the trade id on the wallet", () => {
    const result = planWalletChange(sheet(), "purchase", record("purchase"));
    if (!result.ok) throw new Error("expected a wallet plan");
    expect(result.balanceBefore).toBe(25);
    expect(result.balanceAfter).toBe(15);
    const wallet = result.nextFields.find((f) => f.id === "w")!;
    expect(wallet.value).toBe(15);
    expect(wallet.tradeLog).toEqual([
      expect.objectContaining({ tradeId: "t1", status: "complete" }),
    ]);
    // Other fields are untouched.
    expect(result.nextFields.find((f) => f.id === "hp")).toEqual(sheet()[0]);
  });

  it("earns on a sell", () => {
    const result = planWalletChange(sheet(), "sell", record("sell"));
    if (!result.ok) throw new Error("expected a wallet plan");
    expect(result.balanceAfter).toBe(35);
  });

  it("is idempotent: a wallet that already has the trade id does not move", () => {
    const first = planWalletChange(sheet(), "purchase", record("purchase"));
    if (!first.ok) throw new Error("expected a wallet plan");
    const again = planWalletChange(
      first.nextFields,
      "purchase",
      record("purchase"),
    );
    if (!again.ok) throw new Error("expected a wallet plan");
    expect(again.alreadyApplied).toBe(true);
    expect(again.balanceAfter).toBe(15);
    expect(again.nextFields).toBe(first.nextFields);
  });

  it("refuses to overspend and says what is available", () => {
    const result = planWalletChange(sheet(5), "purchase", record("purchase"));
    expect(result).toMatchObject({ ok: false, code: "insufficient-funds" });
    expect((result as { message: string }).message).toContain("5 gp");
  });

  it("will not mix currencies", () => {
    const result = planWalletChange(
      sheet(),
      "purchase",
      record("purchase", { units: 10, currency: "cr", precision: 0 }),
    );
    expect(result).toMatchObject({ ok: false, code: "wallet-unavailable" });
  });

  it("will not round a priced-in-decimals trade into a whole-number wallet", () => {
    const result = planWalletChange(
      sheet(),
      "purchase",
      record("purchase", { units: 150, currency: "gp", precision: 2 }),
    );
    expect(result).toMatchObject({ ok: false, code: "wallet-precision" });
  });

  it.each([
    ["text", "lots"],
    ["negative", -3],
    ["fractional", 2.5],
  ])("will not use a %s wallet value", (_name, value) => {
    expect(
      planWalletChange(sheet(value), "purchase", record("purchase")),
    ).toMatchObject({
      ok: false,
      code: "wallet-unavailable",
    });
  });

  it("guards the sell balance against overflow", () => {
    const result = planWalletChange(
      sheet(Number.MAX_SAFE_INTEGER),
      "sell",
      record("sell"),
    );
    expect(result).toMatchObject({ ok: false, code: "amount-too-large" });
  });
});

describe("describeTrade", () => {
  const base: StockTradeRecord = {
    tradeId: "t1",
    kind: "purchase",
    rowId: "rope",
    itemName: "Rope",
    quantity: 2,
    total: gp(4),
    accounting: "record-only",
    status: "complete",
    at: NOW,
  };

  it("says plainly when no funds moved", () => {
    const entry = describeTrade(base, {
      shopId: "shop",
      shopName: "Tallow's Goods",
      counterpartyName: "Mira",
    });
    expect(entry.entryType).toBe("trade");
    expect(entry.content).toBe(
      "Mira bought 2× Rope from Tallow's Goods for 4 gp (record only, no funds moved).",
    );
    expect(entry.sourceRef).toMatchObject({
      tradeId: "t1",
      shopId: "shop",
      accounting: "record-only",
      quantity: 2,
    });
  });

  it("says when a wallet was updated, and phrases a sell from the shop's side", () => {
    const entry = describeTrade(
      {
        ...base,
        kind: "sell",
        quantity: 1,
        accounting: "wallet",
        counterpartyId: "mira",
      },
      { shopId: "shop", shopName: "Tallow's Goods" },
    );
    expect(entry.content).toBe(
      "Sold Rope to Tallow's Goods for 4 gp (wallet updated).",
    );
    expect(entry.sourceRef.counterpartyId).toBe("mira");
  });
});
