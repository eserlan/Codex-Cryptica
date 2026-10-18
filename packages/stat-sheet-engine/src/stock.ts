import type { MoneyAmount, StockMeta } from "schema";

/**
 * Merchant stock ledger helpers (#3961). Pure and framework-free: stable row
 * ids, integer-based money and non-negative quantities. Nothing here converts
 * between currencies or touches Item entities.
 */

export type StockRow = Record<string, unknown>;

export const ROW_ID_KEY = "rowId";
export const STOCK_KEY = "stock";

const defaultIdFactory = (): string => `row-${globalThis.crypto.randomUUID()}`;

/**
 * Non-destructive normalisation: rows keep every existing key and order; a
 * row gains a `rowId` only when it has none, and a later duplicate id (for
 * example from copy/paste or import) is replaced with a fresh one. Returns
 * the same array when nothing needed to change so callers can skip a write.
 */
export function ensureRowIds<T extends StockRow>(
  rows: readonly T[],
  idFactory: () => string = defaultIdFactory,
): T[] {
  const seen = new Set<string>();
  let changed = false;
  const next = rows.map((row) => {
    const current = row[ROW_ID_KEY];
    if (typeof current === "string" && current && !seen.has(current)) {
      seen.add(current);
      return row;
    }
    let id = idFactory();
    while (seen.has(id)) id = idFactory();
    seen.add(id);
    changed = true;
    return { ...row, [ROW_ID_KEY]: id };
  });
  return changed ? next : (rows as T[]);
}

/** Digits-only decimal, optional single point, optional leading minus. */
const DECIMAL = /^(-)?(\d*)(?:\.(\d*))?$/;

/**
 * Parses user text such as "12", "12.5" or "0.05" into integer units at the
 * given precision using string arithmetic only. Returns null for empty,
 * malformed, negative, over-precise (would round) or unsafe-sized input.
 */
export function parseMoney(
  text: string,
  currency: string,
  precision = 0,
): MoneyAmount | null {
  const unit = currency.trim();
  if (!unit || !Number.isInteger(precision) || precision < 0 || precision > 6) {
    return null;
  }
  const match = DECIMAL.exec(text.trim());
  if (!match || match[1]) return null;
  const whole = match[2] ?? "";
  const fraction = match[3] ?? "";
  if (!whole && !fraction) return null;
  if (fraction.length > precision) {
    // Allow trailing zeros ("1.50" at precision 1) but never silently round.
    if (/[^0]/.test(fraction.slice(precision))) return null;
  }
  const padded = fraction.slice(0, precision).padEnd(precision, "0");
  const units = Number(`${whole || "0"}${padded}`);
  if (!Number.isSafeInteger(units)) return null;
  return { units, currency: unit, precision };
}

/** Formats units as a decimal string without floating-point division. */
export function formatMoney(amount: MoneyAmount, withCurrency = true): string {
  const { units, currency, precision } = amount;
  const sign = units < 0 ? "-" : "";
  const digits = String(Math.abs(units)).padStart(precision + 1, "0");
  const whole = digits.slice(0, digits.length - precision);
  const fraction = precision
    ? `.${digits.slice(digits.length - precision)}`
    : "";
  return `${sign}${whole}${fraction}${withCurrency ? ` ${currency}` : ""}`;
}

/**
 * Exact total of price x quantity. Returns null when the result would not be
 * a safe integer, so callers never display a silently-rounded figure.
 */
export function multiplyMoney(
  amount: MoneyAmount,
  quantity: number,
): MoneyAmount | null {
  if (!Number.isInteger(quantity) || quantity < 0) return null;
  const units = amount.units * quantity;
  if (!Number.isSafeInteger(units)) return null;
  return { ...amount, units };
}

/**
 * Sums amounts of one denomination. Mixed currencies or precisions have no
 * implicit exchange rate, so they return null rather than a wrong total.
 */
export function sumMoney(amounts: readonly MoneyAmount[]): MoneyAmount | null {
  const first = amounts[0];
  if (!first) return null;
  let units = 0;
  for (const amount of amounts) {
    if (
      amount.currency !== first.currency ||
      amount.precision !== first.precision
    ) {
      return null;
    }
    units += amount.units;
    if (!Number.isSafeInteger(units)) return null;
  }
  return { ...first, units };
}

export interface QuantityAdjustment {
  quantity: number;
  /** True when the request would have gone below zero and was held at 0. */
  clamped: boolean;
}

/**
 * Manual +/- control: stock can reach 0 but never goes negative. A missing
 * quantity means "untracked" and is treated as 0 only when decrementing.
 */
export function adjustQuantity(
  current: number | undefined,
  delta: number,
): QuantityAdjustment {
  const base = Number.isInteger(current) ? (current as number) : 0;
  const raw = base + Math.trunc(delta);
  if (raw < 0) return { quantity: 0, clamped: true };
  return { quantity: Math.min(raw, Number.MAX_SAFE_INTEGER), clamped: false };
}

export interface StockDisplay {
  linked: boolean;
  /** The linked entity was referenced but is gone; display falls back. */
  missing: boolean;
  name: string;
  /** Price the Item itself advertises, if any (never edited from a shop). */
  sourcePrice?: string;
  /** Shop-local override, if set. */
  shopPrice?: MoneyAmount;
  priceIsOverride: boolean;
}

interface LinkedEntityLike {
  title: string;
  statSheet?: {
    fields?: { id: string; value?: unknown; formula?: string }[];
  };
}

/**
 * Resolves what a stock row shows. The row's own `name` is the fallback when
 * the Item is unlinked or deleted, so the line stays intelligible and
 * editable. The item's own price is read-only context.
 */
export function resolveStockDisplay(
  row: StockRow,
  entity: LinkedEntityLike | undefined,
): StockDisplay {
  const entityId = row.entityId;
  const hasLink = typeof entityId === "string" && entityId !== "";
  const stock = (row[STOCK_KEY] ?? {}) as StockMeta;
  const rowName = typeof row.name === "string" ? row.name : "";
  const priceField = entity?.statSheet?.fields?.find((f) => f.id === "price");
  const rawPrice = priceField?.value ?? priceField?.formula;
  return {
    linked: hasLink && !!entity,
    missing: hasLink && !entity,
    name: entity?.title || rowName || "Unnamed stock",
    sourcePrice:
      rawPrice !== undefined && rawPrice !== "" ? String(rawPrice) : undefined,
    shopPrice: stock.price,
    priceIsOverride: !!stock.price,
  };
}

/** Returns a copy of `row` with a shallow patch applied to its `stock`. */
export function patchStock(row: StockRow, patch: Partial<StockMeta>): StockRow {
  const current = (row[STOCK_KEY] ?? {}) as StockMeta;
  return { ...row, [STOCK_KEY]: { ...current, ...patch } };
}
