import type { StatSheetField } from "schema";
import type { RollResult } from "dice-engine";
import { rollStatSheetDiceField } from "#lib/utils/stat-sheet-field-actions.js";
import type { ItemTableColumn, ItemTableRow } from "./item-table-values";

export interface ItemTableRollState {
  rolling: boolean;
  text?: string;
  success?: boolean;
  isError?: boolean;
  roll?: RollResult;
}

/** Keep roll identity and labels stable regardless of which cell renders them. */
export async function rollItemTableDice(
  field: StatSheetField,
  columns: ItemTableColumn[],
  row: ItemTableRow | undefined,
  rowIndex: number,
  colId: string,
  formula: string,
  roll = rollStatSheetDiceField,
): Promise<ItemTableRollState> {
  const columnLabel =
    columns.find((column) => column.id === colId)?.label ?? "Roll";
  try {
    const result = await roll({
      id: `${field.id}_${rowIndex}_${colId}`,
      label: `${row?.name || field.label} ${columnLabel}`,
      type: "dice",
      formula,
    });
    return {
      rolling: false,
      text: result.text,
      isError: result.isError,
      success: result.success,
      roll: result.roll,
    };
  } catch {
    return { rolling: false, text: "Error", isError: true };
  }
}
