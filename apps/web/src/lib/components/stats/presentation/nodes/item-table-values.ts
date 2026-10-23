import type { Entity, StatSheetField } from "schema";
import { parseMoney } from "@codex/stat-sheet-engine";

export type ItemTableColumn = NonNullable<StatSheetField["columns"]>[number];
export type ItemTableRow = Record<string, any>;

export const isTextColumn = (id: string) =>
  [
    "name",
    "title",
    "item",
    "effects",
    "traits",
    "description",
    "notes",
    "special",
  ].includes(id);

export function parseTableMoney(amount: string, unit: string) {
  const precision = Math.min(6, (amount.split(".")[1] ?? "").length);
  return parseMoney(amount, unit, precision);
}

export function adjustCounterCell(current: any, delta: number, min: number) {
  const isObject = current && typeof current === "object";
  const value = Number(isObject ? current.value : current);
  const max = isObject ? Number(current.max) : NaN;
  const adjusted = (Number.isFinite(value) ? value : 0) + delta;
  const nextValue = Math.max(
    min,
    Number.isFinite(max) ? Math.min(max, adjusted) : adjusted,
  );
  return isObject ? { ...current, value: nextValue } : nextValue;
}

export function linkedValue(entity: Entity | undefined, columnId: string) {
  if (!entity) return undefined;
  if (columnId === "name") return entity.title;
  const sourceField = entity.statSheet?.fields?.find(
    (candidate) => candidate.id === columnId,
  );
  return sourceField?.value ?? sourceField?.formula;
}

export function moneyCell(row: Record<string, any>, colId: string) {
  const v = row[colId];
  return v && typeof v === "object" && typeof v.units === "number"
    ? (v as { units: number; currency: string; precision: number })
    : undefined;
}

export function defaultCellValue(col: ItemTableColumn) {
  switch (col.type) {
    case "counter": {
      const max = col.max ?? 6;
      return { value: Math.max(col.min ?? 0, max), max };
    }
    case "number":
      return 0;
    case "dice":
      return col.formula || "1d6";
    case "checkbox":
      return false;
    default:
      return "";
  }
}

export function getColumnHeaderClass(col: {
  id: string;
  type: string;
}): string {
  if (col.type === "checkbox") return "w-10 px-1 py-1 text-center";
  if (col.type === "number")
    return "w-16 px-1 py-1 text-center whitespace-nowrap";
  if (col.type === "dice")
    return "w-24 px-1.5 py-1 text-center whitespace-nowrap";
  if (col.type === "counter")
    return "w-24 px-1.5 py-1 text-center whitespace-nowrap";
  if (["name", "title", "item"].includes(col.id))
    return "min-w-[7rem] px-2 py-1 text-left";
  if (["effects", "traits", "description", "notes", "special"].includes(col.id))
    return "min-w-[8rem] px-2 py-1 text-left";
  return "min-w-[4rem] px-1.5 py-1 text-center whitespace-nowrap";
}

export function getColumnCellClass(col: { id: string; type: string }): string {
  if (col.type === "checkbox") return "w-10 px-1 py-1 text-center align-middle";
  if (col.type === "number") return "w-16 px-1 py-1 text-center align-middle";
  if (col.type === "dice") return "w-24 px-1.5 py-1 text-center align-middle";
  if (col.type === "counter")
    return "w-24 px-1.5 py-1 text-center align-middle";
  if (isTextColumn(col.id)) {
    return "min-w-[7rem] px-2 py-1 text-left align-middle";
  }
  return "min-w-[4rem] px-1.5 py-1 text-center align-middle";
}
