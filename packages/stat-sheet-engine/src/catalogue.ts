import {
  MoneyAmountSchema,
  type StatSheet,
  type StatSheetField,
  type StockMeta,
} from "schema";
import { STOCK_KEY, type StockRow } from "./stock";

/**
 * The player catalogue projection (#3964). A shop's stock ledger is shared
 * with players only when the GM publishes it, and only as a new object built
 * from an allowlist of safe pieces. Nothing is filtered out of the GM's sheet
 * and passed on: whatever this module does not name is never copied, so a
 * field added to the sheet later stays private until it is deliberately added
 * here.
 *
 * Pure and framework-free. It is the one place that decides what a player
 * may see, used by the guest transport, by the capability projector and by
 * the GM's "Preview as player".
 */

/**
 * Business details a GM may choose to show players, by field id. Purchasing
 * power, GM notes and every unlisted field can never be shared.
 */
export const SHAREABLE_SHEET_FIELD_IDS: readonly string[] = [
  "owner",
  "speciality",
  "reputation",
  "services",
  "public_notices",
];

export interface CatalogueOptions {
  /**
   * Looks up the title of a linked Item for a stock line that has no name of
   * its own. Without it such a line is shown as "Item". The title is the only
   * thing ever read from a linked entity.
   */
  resolveName?: (entityId: string) => string | undefined;
}

/** What replaces a sheet that is not shared, so a guest keeps nothing stale. */
export const WITHDRAWN_SHEET: StatSheet = Object.freeze({
  templateId: null,
  fields: [],
}) as StatSheet;

const text = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

/** The stock details a player may see; every other key is left behind. */
function publicStock(stock: StockMeta): StockMeta {
  const shown: StockMeta = {};
  for (const key of ["kind", "condition", "availability"] as const) {
    if (stock[key]) Object.assign(shown, { [key]: stock[key] });
  }
  if (stock.quantity !== undefined) shown.quantity = stock.quantity;
  const price = stock.price && MoneyAmountSchema.safeParse(stock.price);
  if (price && price.success) shown.price = price.data;
  return shown;
}

/** A stock line as a player sees it, or null when the line is hidden. */
function publicRow(row: StockRow, options: CatalogueOptions): StockRow | null {
  const stock = (row[STOCK_KEY] ?? {}) as StockMeta;
  if (stock.availability === "hidden") return null;

  const linkedId = typeof row.entityId === "string" ? row.entityId : "";
  const name =
    text(row.name) || (linkedId && options.resolveName?.(linkedId)) || "Item";
  return { name: name.slice(0, 200), stock: publicStock(stock) };
}

function publicLedger(
  field: StatSheetField,
  options: CatalogueOptions,
): StatSheetField {
  const rows: StockRow[] = [];
  for (const row of field.rows ?? []) {
    const shown = publicRow(row as StockRow, options);
    if (shown) rows.push(shown);
  }
  return {
    id: field.id,
    label: field.label,
    type: "item-table",
    columns: [{ id: "name", label: "Item", type: "text" }],
    stockLedger: true,
    linkVaultItems: false,
    rows: rows as NonNullable<StatSheetField["rows"]>,
  };
}

const isPublishedLedger = (field: StatSheetField): boolean =>
  field.type === "item-table" &&
  field.stockLedger === true &&
  field.playerCatalogue?.published === true;

/**
 * The fields players may see: each published stock ledger (hidden lines
 * removed, notes and links dropped) and the business details the GM opted
 * to share. An empty list means nothing is published.
 */
export function projectCatalogueFields(
  fields: readonly StatSheetField[],
  options: CatalogueOptions = {},
): StatSheetField[] {
  const published = fields.filter(isPublishedLedger);
  if (published.length === 0) return [];

  const shared = new Set<string>();
  for (const ledger of published) {
    for (const id of ledger.playerCatalogue?.fields ?? []) {
      if (SHAREABLE_SHEET_FIELD_IDS.includes(id)) shared.add(id);
    }
  }

  const out: StatSheetField[] = [];
  for (const field of fields) {
    if (isPublishedLedger(field)) {
      out.push(publicLedger(field, options));
    } else if (
      shared.has(field.id) &&
      (field.type === "text" || field.type === "longtext") &&
      text(field.value)
    ) {
      out.push({
        id: field.id,
        label: field.label,
        type: field.type,
        value: text(field.value),
      });
    }
  }
  return out;
}

/** True when any field on the sheet is a merchant stock ledger. */
export function hasStockLedger(sheet: Pick<StatSheet, "fields">): boolean {
  return sheet.fields.some((field) => field.stockLedger === true);
}

/**
 * The shop sheet as players receive it, or null when nothing is published.
 * The result shares no references with the GM's sheet.
 */
export function projectShopSheetForPlayers(
  sheet: Pick<StatSheet, "templateId" | "fields">,
  options: CatalogueOptions = {},
): StatSheet | null {
  const fields = projectCatalogueFields(sheet.fields, options);
  if (fields.length === 0) return null;
  return {
    templateId: sheet.templateId ?? null,
    fields,
    presentationTemplateId: null,
  };
}

function withoutTradeLog(field: StatSheetField): StatSheetField {
  if (!("tradeLog" in field)) return field;
  const { tradeLog: _tradeLog, ...rest } = field;
  return rest;
}

/**
 * The only way a stat sheet goes to guests. A merchant sheet becomes its
 * player catalogue, or an empty sheet when it is not published (an explicit
 * empty sheet, not an absent one, because guests merge updates over what
 * they already hold and an absent sheet would leave a withdrawn catalogue
 * on screen). Any other sheet is passed on without trade history, which
 * belongs to the GM's bookkeeping.
 */
export function sanitizeSheetForGuests(
  sheet: StatSheet | undefined,
  options: CatalogueOptions = {},
): StatSheet | undefined {
  if (!sheet) return sheet;
  if (hasStockLedger(sheet)) {
    return projectShopSheetForPlayers(sheet, options) ?? { ...WITHDRAWN_SHEET };
  }
  return { ...sheet, fields: sheet.fields.map(withoutTradeLog) };
}
