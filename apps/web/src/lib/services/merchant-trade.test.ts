import { describe, expect, it } from "vitest";
import type { StatSheet, StatSheetTemplate } from "schema";
import { SHOP_MERCHANT_TEMPLATE } from "@codex/stat-sheet-engine";
import {
  MerchantTradeService,
  createCommerceRegistry,
  type TradeEntity,
  type TradeRequest,
} from "./merchant-trade";

const gp = (units: number) => ({ units, currency: "gp", precision: 0 });

function shopSheet(): StatSheet {
  return {
    templateId: SHOP_MERCHANT_TEMPLATE.id,
    fields: [
      {
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
            entityId: "item-lamp",
            stock: { kind: "item", quantity: 1, price: gp(5) },
          },
        ],
      },
    ],
  };
}

function heroSheet(gold: unknown = 20): StatSheet {
  return {
    templateId: null,
    fields: [
      {
        id: "wallet",
        key: "wallet_gp",
        label: "Gold",
        type: "number",
        value: gold as number,
      },
    ],
  };
}

interface Harness {
  service: MerchantTradeService;
  entities: Record<string, TradeEntity>;
  saves: string[];
  captures: {
    entryType: string;
    content: string;
    sourceRef?: Record<string, unknown>;
  }[];
  /** Return true to make the nth save of an entity fail. */
  failWhen: { current: (id: string, n: number) => boolean };
  setReadOnly(value: boolean): void;
  publishThrows: { current: boolean };
}

function harness(
  options: { template?: StatSheetTemplate | undefined } = {},
): Harness {
  const entities: Record<string, TradeEntity> = {
    shop: { id: "shop", title: "Tallow's Goods", statSheet: shopSheet() },
    hero: { id: "hero", title: "Mira", statSheet: heroSheet() },
    "item-lamp": { id: "item-lamp", title: "Hooded Lantern" },
  };
  const saves: string[] = [];
  const counts: Record<string, number> = {};
  const captures: Harness["captures"] = [];
  const failWhen = { current: (_id: string, _n: number) => false };
  const publishThrows = { current: false };
  let readOnly = false;
  const template =
    "template" in options ? options.template : SHOP_MERCHANT_TEMPLATE;

  const service = new MerchantTradeService({
    getEntity: (id) => entities[id],
    saveSheet: async (id, statSheet) => {
      counts[id] = (counts[id] ?? 0) + 1;
      if (failWhen.current(id, counts[id])) return false;
      // Yield so overlapping calls really interleave, like real persistence.
      await Promise.resolve();
      saves.push(id);
      entities[id] = { ...entities[id], statSheet };
      return true;
    },
    getTemplate: () => template,
    registry: createCommerceRegistry(),
    publishCapture: (payload) => {
      if (publishThrows.current) throw new Error("journal down");
      captures.push(payload);
    },
    now: () => "2026-10-12T12:00:00.000Z",
    isReadOnly: () => readOnly,
  });

  return {
    service,
    entities,
    saves,
    captures,
    failWhen,
    setReadOnly: (value) => {
      readOnly = value;
    },
    publishThrows,
  };
}

const request = (
  over: Partial<TradeRequest["command"]> = {},
): TradeRequest => ({
  shopId: "shop",
  fieldId: "stock",
  command: {
    tradeId: "trade-1",
    kind: "purchase",
    rowId: "rope",
    quantity: 2,
    accounting: "record-only",
    ...over,
  },
});

const stock = (h: Harness) =>
  h.entities.shop.statSheet!.fields[0].rows as { rowId: string; stock: any }[];
const rope = (h: Harness) => stock(h).find((r) => r.rowId === "rope")!;
const gold = (h: Harness) => h.entities.hero.statSheet!.fields[0].value;
const log = (h: Harness) => h.entities.shop.statSheet!.fields[0].tradeLog;

describe("record-only trade", () => {
  it("changes stock in one write, logs it, and journals it once", async () => {
    const h = harness();
    const outcome = await h.service.execute(request());

    expect(outcome).toMatchObject({ status: "done", alreadyDone: false });
    expect(outcome.status === "done" && outcome.message).toContain(
      "No funds were moved",
    );
    expect(rope(h).stock.quantity).toBe(3);
    expect(log(h)).toEqual([
      expect.objectContaining({ tradeId: "trade-1", status: "complete" }),
    ]);
    expect(h.saves).toEqual(["shop"]);
    expect(gold(h)).toBe(20);
    expect(h.captures).toHaveLength(1);
    expect(h.captures[0]).toMatchObject({
      entryType: "trade",
      content:
        "Bought 2× Rope from Tallow's Goods for 4 gp (record only, no funds moved).",
    });
  });

  it("uses the linked item's current name, and survives that item being deleted", async () => {
    const h = harness();
    await h.service.execute(
      request({ tradeId: "a", rowId: "lamp", quantity: 1 }),
    );
    expect(h.captures[0].content).toContain("Hooded Lantern");

    const gone = harness();
    delete gone.entities["item-lamp"];
    const outcome = await gone.service.execute(
      request({ tradeId: "b", rowId: "lamp", quantity: 1 }),
    );
    expect(outcome.status).toBe("done");
    // Falls back to the name saved on the row.
    expect(gone.captures[0].content).toContain("Lamp");
  });

  it("buys goods from a customer", async () => {
    const h = harness();
    const outcome = await h.service.execute(
      request({ kind: "sell", quantity: 3, unitPrice: gp(1) }),
    );
    expect(outcome.status).toBe("done");
    expect(rope(h).stock.quantity).toBe(8);
    expect(h.captures[0].content).toContain(
      "Sold 3× Rope to Tallow's Goods for 3 gp",
    );
  });
});

describe("a rejected trade changes nothing", () => {
  it.each([
    ["not enough stock", { quantity: 6 }, "insufficient-stock"],
    ["a zero quantity", { quantity: 0 }, "invalid-quantity"],
    ["an unknown line", { rowId: "missing" }, "line-not-found"],
    [
      "a missing price on a free line",
      { rowId: "rope", unitPrice: gp(-1) },
      "invalid-price",
    ],
  ])("%s", async (_name, over, code) => {
    const h = harness();
    const before = JSON.stringify(h.entities.shop.statSheet);
    const outcome = await h.service.execute(request(over));
    expect(outcome).toMatchObject({ status: "rejected", code });
    expect(h.saves).toEqual([]);
    expect(JSON.stringify(h.entities.shop.statSheet)).toBe(before);
    expect(h.captures).toEqual([]);
  });

  it("refuses when the sheet's template does not allow trading", async () => {
    const h = harness({ template: undefined });
    const outcome = await h.service.execute(request());
    expect(outcome).toMatchObject({ status: "rejected", code: "not-allowed" });
    expect(h.saves).toEqual([]);
  });

  it("refuses an action the template did not declare", async () => {
    const h = harness({
      template: { ...SHOP_MERCHANT_TEMPLATE, capabilities: ["something-else"] },
    });
    const outcome = await h.service.execute(request());
    expect(outcome).toMatchObject({ status: "rejected", code: "not-allowed" });
  });

  it("refuses in a read-only vault", async () => {
    const h = harness();
    h.setReadOnly(true);
    expect(await h.service.execute(request())).toMatchObject({
      status: "rejected",
      code: "not-allowed",
    });
    expect(h.saves).toEqual([]);
  });

  it("refuses a field that is not a stock ledger", async () => {
    const h = harness();
    const outcome = await h.service.execute({ ...request(), fieldId: "nope" });
    expect(outcome).toMatchObject({ status: "rejected", code: "not-allowed" });
  });
});

describe("duplicates and retries", () => {
  it("a double click applies the trade once", async () => {
    const h = harness();
    const [first, second] = await Promise.all([
      h.service.execute(request()),
      h.service.execute(request()),
    ]);
    expect([first.status, second.status].sort()).toEqual([
      "done",
      "in-progress",
    ]);
    expect(rope(h).stock.quantity).toBe(3);
    expect(h.captures).toHaveLength(1);
  });

  it("a later retry of a finished trade changes nothing and journals nothing", async () => {
    const h = harness();
    await h.service.execute(request());
    const savesAfterFirst = h.saves.length;

    const again = await h.service.execute(request());
    expect(again).toMatchObject({ status: "done", alreadyDone: true });
    expect(rope(h).stock.quantity).toBe(3);
    expect(h.saves).toHaveLength(savesAfterFirst);
    expect(h.captures).toHaveLength(1);
  });

  it("a new trade id is a new trade", async () => {
    const h = harness();
    await h.service.execute(request());
    await h.service.execute(request({ tradeId: "trade-2" }));
    expect(rope(h).stock.quantity).toBe(1);
    expect(h.captures).toHaveLength(2);
  });
});

describe("persistence failure", () => {
  it("a failed save changes nothing and journals nothing", async () => {
    const h = harness();
    h.failWhen.current = () => true;
    const outcome = await h.service.execute(request());
    expect(outcome).toMatchObject({ status: "failed" });
    expect(rope(h).stock.quantity).toBe(5);
    expect(h.captures).toEqual([]);
  });

  it("a save that throws is treated the same way", async () => {
    const h = harness();
    const throwing = new MerchantTradeService({
      getEntity: (id) => h.entities[id],
      saveSheet: async () => {
        throw new Error("disk full");
      },
      getTemplate: () => SHOP_MERCHANT_TEMPLATE,
      registry: createCommerceRegistry(),
      publishCapture: (p) => h.captures.push(p),
      now: () => "2026-10-12T12:00:00.000Z",
      isReadOnly: () => false,
    });
    expect(await throwing.execute(request())).toMatchObject({
      status: "failed",
    });
    expect(rope(h).stock.quantity).toBe(5);
    expect(h.captures).toEqual([]);
  });

  it("a journal failure never fails the trade", async () => {
    const h = harness();
    h.publishThrows.current = true;
    expect((await h.service.execute(request())).status).toBe("done");
    expect(rope(h).stock.quantity).toBe(3);
  });
});

describe("wallet trade", () => {
  const wallet = (over: Partial<TradeRequest["command"]> = {}) =>
    request({ accounting: "wallet", counterpartyId: "hero", ...over });

  it("moves stock and funds, in order, and journals once", async () => {
    const h = harness();
    const outcome = await h.service.execute(wallet());

    expect(outcome).toMatchObject({ status: "done", alreadyDone: false });
    expect(h.saves).toEqual(["shop", "hero", "shop"]);
    expect(rope(h).stock.quantity).toBe(3);
    expect(gold(h)).toBe(16);
    expect(log(h)![0].status).toBe("complete");
    expect(h.entities.hero.statSheet!.fields[0].tradeLog![0].tradeId).toBe(
      "trade-1",
    );
    expect(h.captures).toHaveLength(1);
    expect(h.captures[0].content).toBe(
      "Mira bought 2× Rope from Tallow's Goods for 4 gp (wallet updated).",
    );
  });

  it("pays the customer when the shop buys", async () => {
    const h = harness();
    await h.service.execute(
      wallet({ kind: "sell", unitPrice: gp(3), quantity: 2 }),
    );
    expect(gold(h)).toBe(26);
    expect(rope(h).stock.quantity).toBe(7);
  });

  it("rejects insufficient funds before writing anything", async () => {
    const h = harness();
    h.entities.hero.statSheet = heroSheet(1);
    const outcome = await h.service.execute(wallet());
    expect(outcome).toMatchObject({
      status: "rejected",
      code: "insufficient-funds",
    });
    expect(h.saves).toEqual([]);
    expect(rope(h).stock.quantity).toBe(5);
    expect(h.captures).toEqual([]);
  });

  it("rejects a character with no matching wallet before writing anything", async () => {
    const h = harness();
    h.entities.hero.statSheet = { templateId: null, fields: [] };
    expect(await h.service.execute(wallet())).toMatchObject({
      status: "rejected",
      code: "wallet-unavailable",
    });
    expect(h.saves).toEqual([]);
  });

  it("rejects a missing character", async () => {
    const h = harness();
    delete h.entities.hero;
    expect(await h.service.execute(wallet())).toMatchObject({
      status: "rejected",
      code: "wallet-unavailable",
    });
    expect(h.saves).toEqual([]);
  });

  it("undoes the stock change when the wallet cannot be saved", async () => {
    const h = harness();
    const before = JSON.stringify(h.entities.shop.statSheet);
    h.failWhen.current = (id) => id === "hero";
    const outcome = await h.service.execute(wallet());

    expect(outcome).toMatchObject({ status: "failed" });
    expect(JSON.stringify(h.entities.shop.statSheet)).toBe(before);
    expect(gold(h)).toBe(20);
    expect(h.captures).toEqual([]);
  });

  it("keeps the trade recoverable when the undo also fails, and finishes it on retry without doubling", async () => {
    const h = harness();
    // The wallet fails, and so does the shop's second save (the undo).
    h.failWhen.current = (id, n) => id === "hero" || (id === "shop" && n === 2);
    const interrupted = await h.service.execute(wallet());

    expect(interrupted.status).toBe("needs-recovery");
    expect(rope(h).stock.quantity).toBe(3);
    expect(log(h)![0].status).toBe("pending");
    expect(gold(h)).toBe(20);
    expect(h.captures).toEqual([]);

    // The fault clears; confirming the same trade finishes it exactly once.
    h.failWhen.current = () => false;
    const retried = await h.service.execute(wallet());
    expect(retried).toMatchObject({ status: "done" });
    expect(rope(h).stock.quantity).toBe(3);
    expect(gold(h)).toBe(16);
    expect(log(h)![0].status).toBe("complete");
    expect(h.captures).toHaveLength(1);
  });

  it("does not charge twice when only the final 'complete' write fails", async () => {
    const h = harness();
    // Shop saves: 1 = stock + pending, 2 = mark complete.
    h.failWhen.current = (id, n) => id === "shop" && n === 2;
    const interrupted = await h.service.execute(wallet());

    expect(interrupted.status).toBe("needs-recovery");
    expect(gold(h)).toBe(16);
    expect(log(h)![0].status).toBe("pending");

    h.failWhen.current = () => false;
    const retried = await h.service.execute(wallet());
    expect(retried).toMatchObject({ status: "done" });
    // The wallet already carried the trade id, so it did not move again.
    expect(gold(h)).toBe(16);
    expect(rope(h).stock.quantity).toBe(3);
    expect(log(h)![0].status).toBe("complete");
    expect(h.captures).toHaveLength(1);
  });

  it("refuses a retry that would change what the pending trade was", async () => {
    const h = harness();
    h.failWhen.current = (id, n) => id === "shop" && n === 2;
    await h.service.execute(wallet());
    h.failWhen.current = () => false;
    const changed = await h.service.execute(wallet({ quantity: 4 }));
    expect(changed).toMatchObject({
      status: "rejected",
      code: "invalid-trade",
    });
    expect(rope(h).stock.quantity).toBe(3);
  });

  it("refuses to resume a wallet trade as record-only or for another character", async () => {
    const h = harness();
    h.failWhen.current = (id, n) => id === "hero" || (id === "shop" && n === 2);
    await h.service.execute(wallet());
    h.failWhen.current = () => false;

    const changedAccounting = await h.service.execute(
      wallet({ accounting: "record-only" }),
    );
    const changedCounterparty = await h.service.execute(
      wallet({ counterpartyId: "pauper" }),
    );

    expect(changedAccounting).toMatchObject({
      status: "rejected",
      code: "invalid-trade",
    });
    expect(changedCounterparty).toMatchObject({
      status: "rejected",
      code: "invalid-trade",
    });
    expect(gold(h)).toBe(20);
    expect(h.entities.shop.statSheet!.fields[0].tradeLog![0].status).toBe(
      "pending",
    );
    expect(h.captures).toEqual([]);
  });
});
