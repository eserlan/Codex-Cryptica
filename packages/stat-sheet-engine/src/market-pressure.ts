import type {
  MarketChange,
  MarketRowChange,
  MoneyAmount,
  StockAvailability,
  StockMeta,
} from "schema";
import { STOCK_KEY, patchStock, type StockRow } from "./stock";

/**
 * Optional market pressure for a shop (#3966): a shortage, glut, embargo,
 * festival or restock applied to a chosen set of stock rows, as a reviewable
 * diff. Pure and framework-free.
 *
 * Nothing here runs by itself. A plan is only a proposal; rows change when
 * the GM applies it, and every applied change keeps what each value was
 * before and after, so it can be undone without disturbing anything the GM
 * edited since. Prices stay in the shop's own currency and precision, using
 * whole units only, and are never converted.
 */

export interface PressureEffect {
  /** Whole-percent change to the asking price, e.g. 50 is +50%, -20 is -20%. */
  pricePercent?: number;
  /** How the quantity moves: to a percentage of what it is, or by a number. */
  quantity?: { mode: "percent" | "add"; value: number };
  availability?: StockAvailability;
}

export type PressureKind =
  "shortage" | "glut" | "embargo" | "festival" | "restock";

export interface PressurePreset {
  kind: PressureKind;
  label: string;
  description: string;
  effect: PressureEffect;
}

/** Starting points the GM can adjust before applying. System-neutral. */
export const PRESSURE_PRESETS: readonly PressurePreset[] = [
  {
    kind: "shortage",
    label: "Shortage",
    description: "Goods are scarce: fewer on the shelf, and dearer.",
    effect: { pricePercent: 50, quantity: { mode: "percent", value: 34 } },
  },
  {
    kind: "glut",
    label: "Glut",
    description: "Goods are plentiful: more on the shelf, and cheaper.",
    effect: { pricePercent: -20, quantity: { mode: "percent", value: 150 } },
  },
  {
    kind: "embargo",
    label: "Embargo",
    description: "These goods cannot be sold for now. Quantities are kept.",
    effect: { availability: "sold-out" },
  },
  {
    kind: "festival",
    label: "Festival",
    description: "Demand is up, so prices rise. Stock is unchanged.",
    effect: { pricePercent: 25 },
  },
  {
    kind: "restock",
    label: "Restock",
    description: "A delivery arrives: add to the quantities on hand.",
    effect: { quantity: { mode: "add", value: 5 } },
  },
];

export const MARKET_HISTORY_LIMIT = 20;
/** The most lines one change can cover; matches the stored schema. */
export const MAX_CHANGE_ROWS = 200;
const MAX_PRICE_PERCENT = 500;
const MIN_PRICE_PERCENT = -90;

export type SkipReason =
  "no-price" | "no-quantity" | "unsafe-price" | "unsafe-quantity" | "no-change";

const SKIP_TEXT: Record<SkipReason, string> = {
  "no-price": "Has no price to change.",
  "no-quantity": "Has no counted quantity to change.",
  "unsafe-price": "The new price is too large to store exactly.",
  "unsafe-quantity": "The new quantity is too large to store exactly.",
  "no-change": "Nothing would change.",
};

export const skipText = (reason: SkipReason): string => SKIP_TEXT[reason];

export interface PlannedRow {
  rowId: string;
  name: string;
  /** What would change, in the same shape that is stored when applied. */
  change: MarketRowChange;
  /** Plain-language lines explaining each change. */
  reasons: string[];
  skipped?: SkipReason;
}

const stockOf = (row: StockRow): StockMeta =>
  (row[STOCK_KEY] ?? {}) as StockMeta;

const availabilityOf = (stock: StockMeta): StockAvailability =>
  stock.availability ?? "available";

function nameOf(
  row: StockRow,
  resolveName?: (id: string) => string | undefined,
) {
  const own = typeof row.name === "string" ? row.name.trim() : "";
  const linked =
    typeof row.entityId === "string" ? resolveName?.(row.entityId) : undefined;
  return (own || linked || "Item").slice(0, 200);
}

function shiftedPrice(price: MoneyAmount, percent: number): MoneyAmount | null {
  const factor = 100 + percent;
  const scaled = price.units * factor;
  if (!Number.isSafeInteger(scaled)) return null;
  const units = Math.max(1, Math.round(scaled / 100));
  return Number.isSafeInteger(units) ? { ...price, units } : null;
}

function shiftedQuantity(
  before: number,
  quantity: NonNullable<PressureEffect["quantity"]>,
): number {
  if (quantity.mode === "add") return Math.max(0, before + quantity.value);
  const scaled = Math.round((before * quantity.value) / 100);
  // A shortage thins the shelf; it does not empty it by rounding.
  return before > 0 && quantity.value > 0 ? Math.max(1, scaled) : scaled;
}

const sameMoney = (a: MoneyAmount, b: MoneyAmount) =>
  a.units === b.units &&
  a.currency === b.currency &&
  a.precision === b.precision;

function priceStep(
  stock: StockMeta,
  percent: number | undefined,
): { shift?: MarketRowChange["price"]; reason?: string; skip?: SkipReason } {
  if (percent === undefined || percent === 0) return {};
  if (!stock.price) return { skip: "no-price" };
  const after = shiftedPrice(stock.price, percent);
  if (!after) return { skip: "unsafe-price" };
  if (sameMoney(stock.price, after)) return {};
  const sign = percent > 0 ? "+" : "";
  return {
    shift: { before: stock.price, after },
    reason: `Price ${sign}${percent}%`,
  };
}

function quantityStep(
  stock: StockMeta,
  quantity: PressureEffect["quantity"],
): { shift?: MarketRowChange["quantity"]; reason?: string; skip?: SkipReason } {
  if (!quantity) return {};
  // A line with no quantity is not counted at all, so there is nothing to
  // change, and undoing could not tell "none" from "zero".
  const untracked = stock.quantity === undefined;
  if (untracked || stock.kind === "service" || stock.kind === "commission") {
    return { skip: "no-quantity" };
  }
  const before = stock.quantity ?? 0;
  const after = shiftedQuantity(before, quantity);
  if (!Number.isSafeInteger(after)) return { skip: "unsafe-quantity" };
  if (after === before) return {};
  return { shift: { before, after }, reason: `Quantity ${before} to ${after}` };
}

function availabilityStep(
  stock: StockMeta,
  effect: PressureEffect,
  quantityAfter: number | undefined,
): { shift?: MarketRowChange["availability"]; reason?: string } {
  const before = availabilityOf(stock);
  let target = effect.availability;
  // Goods delivered to a sold-out line put it back on sale.
  if (!target && before === "sold-out" && (quantityAfter ?? 0) > 0) {
    target = "available";
  }
  if (!target || target === before) return {};
  return {
    shift: { before: stock.availability, after: target },
    reason: `Marked ${target}`,
  };
}

/** What a row would look like under the effect. Does not change anything. */
export function planRow(
  row: StockRow,
  effect: PressureEffect,
  resolveName?: (id: string) => string | undefined,
): PlannedRow | null {
  const rowId = row.rowId;
  if (typeof rowId !== "string" || !rowId) return null;
  const stock = stockOf(row);
  const price = priceStep(stock, effect.pricePercent);
  const quantity = quantityStep(stock, effect.quantity);
  const availability = availabilityStep(
    stock,
    effect,
    quantity.shift?.after ?? stock.quantity,
  );

  const change: MarketRowChange = { rowId, name: nameOf(row, resolveName) };
  if (price.shift) change.price = price.shift;
  if (quantity.shift) change.quantity = quantity.shift;
  if (availability.shift) change.availability = availability.shift;
  const reasons = [price.reason, quantity.reason, availability.reason].filter(
    (line): line is string => !!line,
  );

  const changed = reasons.length > 0;
  // A row is only skipped for a reason when nothing else about it changes.
  const skipped = changed
    ? undefined
    : (price.skip ?? quantity.skip ?? "no-change");
  return {
    rowId,
    name: change.name,
    change,
    reasons,
    ...(skipped ? { skipped } : {}),
  };
}

/** The effect applied to the chosen rows (all stock rows when none chosen). */
export function planPressure(
  rows: readonly StockRow[],
  effect: PressureEffect,
  options: {
    rowIds?: ReadonlySet<string>;
    resolveName?: (id: string) => string | undefined;
  } = {},
): PlannedRow[] {
  const planned: PlannedRow[] = [];
  for (const row of rows) {
    if (options.rowIds && !options.rowIds.has(String(row.rowId))) continue;
    const plan = planRow(row, effect, options.resolveName);
    if (plan) planned.push(plan);
  }
  return planned;
}

/** Why an effect cannot be applied, or null when it is fine. */
export function effectProblem(effect: PressureEffect): string | null {
  const { pricePercent, quantity } = effect;
  if (pricePercent !== undefined) {
    if (!Number.isInteger(pricePercent)) {
      return "Price change must be a whole percent.";
    }
    if (pricePercent < MIN_PRICE_PERCENT || pricePercent > MAX_PRICE_PERCENT) {
      return `Price change must be between ${MIN_PRICE_PERCENT}% and +${MAX_PRICE_PERCENT}%.`;
    }
  }
  if (quantity) {
    const negativePercent = quantity.mode === "percent" && quantity.value < 0;
    if (!Number.isSafeInteger(quantity.value) || negativePercent) {
      return "Quantity change must be a whole number.";
    }
  }
  const empty = !pricePercent && !quantity && !effect.availability;
  return empty ? "Choose at least one change." : null;
}

/**
 * A signal from elsewhere (for example a settlement economy or business
 * generator) that the GM has approved. It only picks a preset to review; it
 * never changes a shop by itself.
 */
export interface MarketSignal {
  kind: PressureKind;
  /** What it is about, e.g. "iron". Used to suggest which rows it applies to. */
  subject?: string;
  /** Where the signal came from, kept in the history. */
  source: string;
}

export function draftFromSignal(signal: MarketSignal): {
  preset: PressurePreset;
  label: string;
  appliesTo: string;
} {
  const preset =
    PRESSURE_PRESETS.find((candidate) => candidate.kind === signal.kind) ??
    PRESSURE_PRESETS[0];
  const subject = signal.subject?.trim() ?? "";
  return {
    preset,
    label: subject ? `${preset.label}: ${subject}` : preset.label,
    appliesTo: subject,
  };
}

export interface ApplyMeta {
  id: string;
  label: string;
  reason: string;
  cause: MarketChange["cause"];
  at: string;
}

function patchedRow(row: StockRow, change: MarketRowChange): StockRow {
  const patch: Partial<StockMeta> = {};
  if (change.price) patch.price = change.price.after;
  if (change.quantity) patch.quantity = change.quantity.after;
  if (change.availability) patch.availability = change.availability.after;
  return patchStock(row, patch);
}

/**
 * Applies the rows of a plan that actually change something. Rows not in the
 * plan are the same objects, untouched. Returns the new rows and the change
 * record to keep, or null when nothing would change.
 */
export function applyPlan(
  rows: readonly StockRow[],
  plan: readonly PlannedRow[],
  meta: ApplyMeta,
): { rows: StockRow[]; change: MarketChange } | null {
  const byId = new Map(
    plan.filter((p) => !p.skipped).map((p) => [p.rowId, p.change]),
  );
  if (byId.size === 0 || byId.size > MAX_CHANGE_ROWS) return null;
  const next = rows.map((row) => {
    const change = byId.get(String(row.rowId));
    return change ? patchedRow(row, change) : row;
  });
  const change: MarketChange = {
    id: meta.id,
    label: meta.label,
    reason: meta.reason,
    cause: meta.cause,
    at: meta.at,
    status: "applied",
    rows: [...byId.values()],
  };
  return { rows: next, change };
}

/** Keeps the newest changes, within the stored limit. */
export function appendChange(
  history: readonly MarketChange[] | undefined,
  change: MarketChange,
): MarketChange[] {
  return [...(history ?? []), change].slice(-MARKET_HISTORY_LIMIT);
}

export interface RevertConflict {
  rowId: string;
  name: string;
  /** Which values were left as they are because they changed since. */
  kept: Array<"price" | "quantity" | "availability">;
}

export interface RevertResult {
  rows: StockRow[];
  history: MarketChange[];
  conflicts: RevertConflict[];
  /** Number of individual values put back. */
  restored: number;
}

type ValuePatch = Partial<StockMeta>;

function changedValues(change: MarketRowChange): RevertConflict["kept"] {
  const names: RevertConflict["kept"] = [];
  if (change.price) names.push("price");
  if (change.quantity) names.push("quantity");
  if (change.availability) names.push("availability");
  return names;
}

// Each returns the values to put back, or null when the value changed since.
function priceBack(stock: StockMeta, shift: MarketRowChange["price"]) {
  if (!shift) return undefined;
  return stock.price && sameMoney(stock.price, shift.after)
    ? ({ price: shift.before } as ValuePatch)
    : null;
}

function quantityBack(stock: StockMeta, shift: MarketRowChange["quantity"]) {
  if (!shift) return undefined;
  return (stock.quantity ?? 0) === shift.after
    ? ({ quantity: shift.before } as ValuePatch)
    : null;
}

function availabilityBack(
  stock: StockMeta,
  shift: MarketRowChange["availability"],
) {
  if (!shift) return undefined;
  return availabilityOf(stock) === shift.after
    ? ({ availability: shift.before } as ValuePatch)
    : null;
}

function revertRow(
  row: StockRow,
  change: MarketRowChange,
): { row: StockRow; restored: number; kept: RevertConflict["kept"] } {
  const stock = stockOf(row);
  const attempts: Array<
    [RevertConflict["kept"][number], ValuePatch | null | undefined]
  > = [
    ["price", priceBack(stock, change.price)],
    ["quantity", quantityBack(stock, change.quantity)],
    ["availability", availabilityBack(stock, change.availability)],
  ];
  const patch: ValuePatch = {};
  const kept: RevertConflict["kept"] = [];
  let restored = 0;
  for (const [name, back] of attempts) {
    if (back === undefined) continue;
    if (back === null) kept.push(name);
    else {
      Object.assign(patch, back);
      restored += 1;
    }
  }
  return { row: restored ? patchStock(row, patch) : row, restored, kept };
}

/**
 * Puts back the values a change set, but only those still exactly as the
 * change left them. A price, quantity or status the GM (or a trade) changed
 * since is kept and reported, never overwritten. Rows no longer in the shop
 * are reported too. An already reverted change does nothing.
 */
export function revertChange(
  rows: readonly StockRow[],
  history: readonly MarketChange[],
  changeId: string,
): RevertResult {
  const target = history.find((entry) => entry.id === changeId);
  if (!target || target.status === "reverted") {
    return {
      rows: [...rows],
      history: [...history],
      conflicts: [],
      restored: 0,
    };
  }
  const byId = new Map(target.rows.map((r) => [r.rowId, r]));
  const conflicts: RevertConflict[] = [];
  let restored = 0;
  const seen = new Set<string>();

  const next = rows.map((row) => {
    const change = byId.get(String(row.rowId));
    if (!change) return row;
    seen.add(change.rowId);
    const result = revertRow(row, change);
    restored += result.restored;
    if (result.kept.length) {
      conflicts.push({
        rowId: change.rowId,
        name: change.name,
        kept: result.kept,
      });
    }
    return result.row;
  });
  for (const change of target.rows) {
    if (!seen.has(change.rowId)) {
      conflicts.push({
        rowId: change.rowId,
        name: change.name,
        kept: changedValues(change),
      });
    }
  }
  const updated = history.map((entry) =>
    entry.id === changeId ? { ...entry, status: "reverted" as const } : entry,
  );
  return { rows: next, history: updated, conflicts, restored };
}

export interface StandingPressure {
  rowId: string;
  name: string;
  /** The price before any applied change touched it. */
  baseline?: MoneyAmount;
  /** The price now. */
  asking?: MoneyAmount;
  /** True when the GM has set a price different from the last applied one. */
  edited: boolean;
  reasons: string[];
}

/** For each row under an applied change: baseline price, asking price, why. */
export function standingPressure(
  rows: readonly StockRow[],
  history: readonly MarketChange[] | undefined,
): StandingPressure[] {
  const applied = (history ?? []).filter((entry) => entry.status === "applied");
  const byRow = new Map<string, StandingPressure>();
  for (const entry of applied) {
    for (const change of entry.rows) {
      const row = rows.find((candidate) => candidate.rowId === change.rowId);
      if (!row) continue;
      const stock = stockOf(row);
      const current =
        byRow.get(change.rowId) ??
        ({
          rowId: change.rowId,
          name: change.name,
          edited: false,
          reasons: [],
        } as StandingPressure);
      if (change.price) {
        current.baseline ??= change.price.before;
        current.asking = stock.price;
        current.edited =
          !stock.price || !sameMoney(stock.price, change.price.after);
      }
      current.reasons.push(`${entry.label}: ${entry.reason}`);
      byRow.set(change.rowId, current);
    }
  }
  return [...byRow.values()];
}

/**
 * Rebuilds rows by replaying changes onto a baseline: each applied change's
 * values are set only where the row still has the value the change started
 * from. The same baseline and changes always give the same rows.
 */
export function replayChanges(
  baseline: readonly StockRow[],
  history: readonly MarketChange[],
): StockRow[] {
  let rows = [...baseline];
  for (const entry of history) {
    if (entry.status !== "applied") continue;
    const byId = new Map(entry.rows.map((r) => [r.rowId, r]));
    rows = rows.map((row) => {
      const change = byId.get(String(row.rowId));
      return change && startsFrom(row, change) ? patchedRow(row, change) : row;
    });
  }
  return rows;
}

function startsFrom(row: StockRow, change: MarketRowChange): boolean {
  const stock = stockOf(row);
  const priceOk =
    !change.price ||
    (!!stock.price && sameMoney(stock.price, change.price.before));
  const quantityOk =
    !change.quantity || (stock.quantity ?? 0) === change.quantity.before;
  const availabilityOk =
    !change.availability ||
    availabilityOf(stock) === (change.availability.before ?? "available");
  return priceOk && quantityOk && availabilityOk;
}

/** Rows whose name contains the text, for choosing what a pressure applies to. */
export function rowsMatching(
  rows: readonly StockRow[],
  text: string,
  resolveName?: (id: string) => string | undefined,
): Set<string> {
  const needle = text.trim().toLowerCase();
  const ids = new Set<string>();
  for (const row of rows) {
    if (typeof row.rowId !== "string") continue;
    if (!needle || nameOf(row, resolveName).toLowerCase().includes(needle)) {
      ids.add(row.rowId);
    }
  }
  return ids;
}
