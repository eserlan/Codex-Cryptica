import {
  MoneyAmountSchema,
  type MoneyAmount,
  type StatSheetField,
  type StockMeta,
  type StockTradeRecord,
} from "schema";
import {
  ROW_ID_KEY,
  STOCK_KEY,
  formatMoney,
  multiplyMoney,
  type StockRow,
} from "./stock";

/**
 * Merchant trade rules (#3963). Pure and framework-free: this module decides
 * whether a trade is allowed and what it would change, and never reads or
 * writes the vault. Applying the result, ordering the writes and recovering
 * from a failed write belong to the app's trade service.
 *
 * A trade is always explicit. Nothing here runs on open, render or
 * generation, and a rejected plan changes nothing.
 */

export type TradeKind = "purchase" | "sell";

/**
 * `record-only` changes the shop's stock and logs the trade, nothing else:
 * no funds move. `wallet` also updates a wallet number on the other party.
 */
export type TradeAccounting = "record-only" | "wallet";

export interface TradeCommand {
  /** Minted once when the trade form opens; a retry reuses it. */
  tradeId: string;
  /** From the customer's side: a purchase buys from the shop. */
  kind: TradeKind;
  rowId: string;
  quantity: number;
  /** Per unit. Defaults to the line's shop price. */
  unitPrice?: MoneyAmount;
  accounting: TradeAccounting;
  counterpartyId?: string;
}

export type TradeErrorCode =
  | "invalid-trade"
  | "invalid-quantity"
  | "line-not-found"
  | "not-for-sale"
  | "insufficient-stock"
  | "service-not-sellable"
  | "price-required"
  | "invalid-price"
  | "amount-too-large"
  | "too-many-pending-trades"
  | "wallet-needs-counterparty"
  | "wallet-unavailable"
  | "wallet-precision"
  | "insufficient-funds";

export interface TradeRejection {
  ok: false;
  code: TradeErrorCode;
  message: string;
}

const reject = (code: TradeErrorCode, message: string): TradeRejection => ({
  ok: false,
  code,
  message,
});

/** Most recent trades kept per field. Older complete ones are dropped first. */
export const TRADE_LOG_LIMIT = 25;

export interface TradePlanInput {
  rows: readonly StockRow[];
  tradeLog?: readonly StockTradeRecord[];
  /** The line's display name, used in the record and the journal entry. */
  itemName: (row: StockRow) => string;
  /** ISO timestamp for the record. */
  now: string;
}

export interface TradePlan {
  ok: true;
  /** True when this trade id is already in the log; nothing new to apply. */
  duplicate: false;
  nextRows: StockRow[];
  record: StockTradeRecord;
  unitPrice: MoneyAmount;
}

export interface DuplicateTrade {
  ok: true;
  duplicate: true;
  record: StockTradeRecord;
}

function stockOf(row: StockRow): StockMeta {
  return (row[STOCK_KEY] ?? {}) as StockMeta;
}

function checkCommandShape(command: TradeCommand): TradeRejection | null {
  const { tradeId, kind, accounting } = command;
  if (!tradeId || tradeId.length > 80) {
    return reject("invalid-trade", "This trade has no valid reference.");
  }
  if (kind !== "purchase" && kind !== "sell") {
    return reject("invalid-trade", "Choose whether this is a buy or a sell.");
  }
  if (accounting !== "record-only" && accounting !== "wallet") {
    return reject("invalid-trade", "Choose how to account for this trade.");
  }
  if (accounting === "wallet" && !command.counterpartyId) {
    return reject(
      "wallet-needs-counterparty",
      "Choose who is paying or being paid, or use record-only.",
    );
  }
  return null;
}

/** A logged trade id means "already started"; a different trade must not reuse it. */
function matchesLoggedTerms(
  existing: StockTradeRecord,
  command: TradeCommand,
): boolean {
  return (
    existing.kind === command.kind &&
    existing.rowId === command.rowId &&
    existing.quantity === command.quantity &&
    existing.accounting === command.accounting &&
    existing.counterpartyId === command.counterpartyId
  );
}

function matchesLoggedPrice(
  existing: StockTradeRecord,
  command: TradeCommand,
  rows: readonly StockRow[],
): boolean {
  const row = rows.find((candidate) => candidate[ROW_ID_KEY] === command.rowId);
  const price = command.unitPrice ?? (row && stockOf(row).price);
  const requestedTotal = price && multiplyMoney(price, command.quantity);
  return (
    !!requestedTotal &&
    requestedTotal.units === existing.total.units &&
    requestedTotal.currency === existing.total.currency &&
    requestedTotal.precision === existing.total.precision
  );
}

function checkLogged(
  existing: StockTradeRecord,
  command: TradeCommand,
  rows: readonly StockRow[],
): DuplicateTrade | TradeRejection {
  if (
    !matchesLoggedTerms(existing, command) ||
    !matchesLoggedPrice(existing, command, rows)
  ) {
    return reject(
      "invalid-trade",
      "That trade reference was already used for a different trade.",
    );
  }
  return { ok: true, duplicate: true, record: existing };
}

function hasTradeLogCapacity(
  log: readonly StockTradeRecord[] | undefined,
): boolean {
  return (
    (log?.length ?? 0) < TRADE_LOG_LIMIT ||
    log?.some((entry) => entry.status === "complete") === true
  );
}

const SALE_BLOCKED: Record<string, string> = {
  "sold-out": "That line is sold out.",
  reserved: "That line is reserved.",
  hidden: "That line is not for sale.",
};

/** The line's stock after the shop sells to a customer. */
function afterPurchase(
  stock: StockMeta,
  quantity: number,
  tracked: boolean,
): StockMeta | TradeRejection {
  const availability = stock.availability ?? "available";
  if (availability !== "available") {
    return reject("not-for-sale", SALE_BLOCKED[availability]);
  }
  if (!tracked) return stock;
  const have = stock.quantity ?? 0;
  if (quantity > have) {
    return reject(
      "insufficient-stock",
      `Only ${have} in stock, but ${quantity} requested.`,
    );
  }
  const left = have - quantity;
  return {
    ...stock,
    quantity: left,
    ...(left === 0 ? { availability: "sold-out" as const } : {}),
  };
}

/** The line's stock after the shop buys from a customer. */
function afterSell(
  stock: StockMeta,
  quantity: number,
  tracked: boolean,
): StockMeta | TradeRejection {
  if (!tracked) {
    return reject(
      "service-not-sellable",
      "A shop can only buy items, not services or commissions.",
    );
  }
  const next = (stock.quantity ?? 0) + quantity;
  if (!Number.isSafeInteger(next)) {
    return reject("amount-too-large", "That quantity is too large.");
  }
  return {
    ...stock,
    quantity: next,
    ...(stock.availability === "sold-out"
      ? { availability: "available" as const }
      : {}),
  };
}

function isRejection(
  value: StockMeta | TradeRejection,
): value is TradeRejection {
  return (value as TradeRejection).ok === false;
}

/** The per-unit price and exact total, or why there is no usable price. */
function priceTrade(
  command: TradeCommand,
  stock: StockMeta,
): { unitPrice: MoneyAmount; total: MoneyAmount } | TradeRejection {
  const rawPrice = command.unitPrice ?? stock.price;
  if (!rawPrice) {
    return reject("price-required", "Set a price for this line first.");
  }
  const parsed = MoneyAmountSchema.safeParse(rawPrice);
  if (!parsed.success || parsed.data.units < 0) {
    return reject("invalid-price", "That price is not valid.");
  }
  const total = multiplyMoney(parsed.data, command.quantity);
  if (!total) {
    return reject("amount-too-large", "That total is too large to record.");
  }
  return { unitPrice: parsed.data, total };
}

/**
 * Checks a trade against the shop's stock and returns the rows it would
 * leave behind, or a plain-language reason it cannot go ahead.
 */
export function planTrade(
  input: TradePlanInput,
  command: TradeCommand,
): TradePlan | DuplicateTrade | TradeRejection {
  const shapeError = checkCommandShape(command);
  if (shapeError) return shapeError;

  const existing = input.tradeLog?.find(
    (entry) => entry.tradeId === command.tradeId,
  );
  if (existing) return checkLogged(existing, command, input.rows);

  if (!hasTradeLogCapacity(input.tradeLog)) {
    return reject(
      "too-many-pending-trades",
      "Finish one of this shop's pending trades before recording another.",
    );
  }

  const { kind, rowId, quantity } = command;
  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    return reject(
      "invalid-quantity",
      "Quantity must be a whole number of 1 or more.",
    );
  }

  const index = input.rows.findIndex((row) => row[ROW_ID_KEY] === rowId);
  const row = input.rows[index];
  if (!row) {
    return reject("line-not-found", "That stock line no longer exists.");
  }

  const stock = stockOf(row);
  const tracked = (stock.kind ?? "item") === "item";
  if (!tracked && quantity !== 1) {
    return reject(
      "invalid-quantity",
      "Services and commissions are traded one at a time.",
    );
  }

  const nextStock =
    kind === "purchase"
      ? afterPurchase(stock, quantity, tracked)
      : afterSell(stock, quantity, tracked);
  if (isRejection(nextStock)) return nextStock;

  const priced = priceTrade(command, stock);
  if ("ok" in priced) return priced;

  return {
    ok: true,
    duplicate: false,
    nextRows: input.rows.map((current, i) =>
      i === index ? { ...current, [STOCK_KEY]: nextStock } : current,
    ),
    unitPrice: priced.unitPrice,
    record: {
      tradeId: command.tradeId,
      kind,
      rowId,
      itemName: input.itemName(row).slice(0, 200),
      quantity,
      total: priced.total,
      accounting: command.accounting,
      ...(command.counterpartyId
        ? { counterpartyId: command.counterpartyId }
        : {}),
      status: command.accounting === "wallet" ? "pending" : "complete",
      at: input.now,
    },
  };
}

/** Appends a record, keeping the log bounded. Pending records are kept longest. */
export function appendTradeRecord(
  log: readonly StockTradeRecord[] | undefined,
  record: StockTradeRecord,
): StockTradeRecord[] {
  const next = [...(log ?? []), record];
  while (next.length > TRADE_LOG_LIMIT) {
    const oldestComplete = next.findIndex(
      (entry) => entry.status === "complete",
    );
    next.splice(oldestComplete === -1 ? 0 : oldestComplete, 1);
  }
  return next;
}

/** Marks one logged trade complete. Returns the same array when unchanged. */
export function completeTradeRecord(
  log: readonly StockTradeRecord[] | undefined,
  tradeId: string,
): StockTradeRecord[] {
  const current = log ?? [];
  if (!current.some((e) => e.tradeId === tradeId && e.status !== "complete")) {
    return current as StockTradeRecord[];
  }
  return current.map((entry) =>
    entry.tradeId === tradeId
      ? { ...entry, status: "complete" as const }
      : entry,
  );
}

/**
 * The wallet convention: a `number` field whose key or id is `wallet_<unit>`,
 * for example `wallet_gp`, holding whole units of that denomination. There is
 * no exchange rate, so a trade priced in another unit cannot use the wallet.
 */
export function walletKeyFor(currency: string): string {
  const unit = currency.toLowerCase().replace(/[^a-z0-9]/g, "");
  return unit ? `wallet_${unit}` : "";
}

export function findWalletField(
  fields: readonly StatSheetField[],
  currency: string,
): StatSheetField | undefined {
  const key = walletKeyFor(currency);
  if (!key) return undefined;
  return fields.find(
    (field) =>
      field.type === "number" && (field.key === key || field.id === key),
  );
}

export interface WalletPlan {
  ok: true;
  /** The wallet already carries this trade id, so it must not move again. */
  alreadyApplied: boolean;
  nextFields: StatSheetField[];
  balanceBefore: number;
  balanceAfter: number;
}

/**
 * What the other party's sheet looks like after the trade. From their side a
 * purchase spends the total and a sell earns it. The trade id is stored on
 * the wallet field itself, in the same write as the balance, so a retry can
 * tell whether the wallet already moved.
 */
export function planWalletChange(
  fields: readonly StatSheetField[],
  kind: TradeKind,
  record: StockTradeRecord,
): WalletPlan | TradeRejection {
  const { total } = record;
  if (total.precision !== 0) {
    return reject(
      "wallet-precision",
      "Wallet updates need a whole-number price. Use record-only for this one.",
    );
  }
  const field = findWalletField(fields, total.currency);
  if (!field) {
    return reject(
      "wallet-unavailable",
      `That character has no ${walletKeyFor(total.currency) || "wallet"} number field. Use record-only instead.`,
    );
  }
  const balance = Number(field.value);
  if (!Number.isSafeInteger(balance) || balance < 0) {
    return reject(
      "wallet-unavailable",
      "That character's wallet is not a whole number. Use record-only instead.",
    );
  }

  const applied = field.tradeLog?.some(
    (entry) => entry.tradeId === record.tradeId,
  );
  if (applied) {
    return {
      ok: true,
      alreadyApplied: true,
      nextFields: fields as StatSheetField[],
      balanceBefore: balance,
      balanceAfter: balance,
    };
  }

  const after =
    kind === "purchase" ? balance - total.units : balance + total.units;
  if (after < 0) {
    return reject(
      "insufficient-funds",
      `Not enough funds: ${formatMoney({ ...total, units: balance })} available, ${formatMoney(total)} needed.`,
    );
  }
  if (!Number.isSafeInteger(after)) {
    return reject("amount-too-large", "That balance is too large to record.");
  }

  return {
    ok: true,
    alreadyApplied: false,
    balanceBefore: balance,
    balanceAfter: after,
    nextFields: fields.map((candidate) =>
      candidate === field
        ? {
            ...candidate,
            value: after,
            tradeLog: appendTradeRecord(candidate.tradeLog, {
              ...record,
              status: "complete",
            }),
          }
        : candidate,
    ),
  };
}

export interface TradeJournalCapture {
  entryType: "trade";
  content: string;
  sourceRef: Record<string, unknown>;
}

/**
 * One structured, low-noise journal entry for a finished trade. The wording
 * says plainly when no funds moved, so the journal never implies a transfer
 * that did not happen.
 */
export function describeTrade(
  record: StockTradeRecord,
  context: { shopId: string; shopName: string; counterpartyName?: string },
): TradeJournalCapture {
  const what =
    record.quantity > 1
      ? `${record.quantity}× ${record.itemName}`
      : record.itemName;
  const price = formatMoney(record.total);
  const who = context.counterpartyName?.trim();
  const shop = context.shopName.trim() || "the shop";
  const base =
    record.kind === "purchase"
      ? `${who ? `${who} bought` : "Bought"} ${what} from ${shop} for ${price}`
      : `${who ? `${who} sold` : "Sold"} ${what} to ${shop} for ${price}`;
  const note =
    record.accounting === "wallet"
      ? " (wallet updated)."
      : " (record only, no funds moved).";
  return {
    entryType: "trade",
    content: `${base}${note}`,
    sourceRef: {
      tradeId: record.tradeId,
      shopId: context.shopId,
      kind: record.kind,
      rowId: record.rowId,
      itemName: record.itemName,
      quantity: record.quantity,
      total: record.total,
      accounting: record.accounting,
      ...(record.counterpartyId
        ? { counterpartyId: record.counterpartyId }
        : {}),
    },
  };
}
