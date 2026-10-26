import { describe, expect, it, vi } from "vitest";
import type { StatSheetField } from "schema";
import { rollItemTableDice } from "./item-table-rolls";

vi.mock("#lib/utils/stat-sheet-field-actions.js", () => ({
  rollStatSheetDiceField: vi.fn(),
}));
const field: StatSheetField = {
  id: "items",
  label: "Weapons",
  type: "item-table",
};

describe("item table rolls", () => {
  it("uses stable cell identity and the column name, preserving roll details", async () => {
    const roll = vi.fn().mockResolvedValue({
      text: "12",
      success: true,
      isError: false,
      roll: { total: 12 },
    });
    const result = await rollItemTableDice(
      field,
      [{ id: "attack", label: "Attack", type: "dice" }],
      { name: "Sword" },
      2,
      "attack",
      "1d20",
      roll,
    );
    expect(roll).toHaveBeenCalledWith({
      id: "items_2_attack",
      label: "Sword Attack",
      type: "dice",
      formula: "1d20",
    });
    expect(result).toEqual({
      rolling: false,
      text: "12",
      success: true,
      isError: false,
      roll: { total: 12 },
    });
  });

  it("uses field and generic roll labels when the row or column is missing", async () => {
    const roll = vi.fn().mockResolvedValue({ text: "3" });
    await rollItemTableDice(field, [], undefined, 0, "missing", "1d6", roll);
    expect(roll).toHaveBeenCalledWith(
      expect.objectContaining({ label: "Weapons Roll" }),
    );
  });

  it("returns the error state if rolling rejects", async () => {
    const roll = vi.fn().mockRejectedValue(new Error("Unavailable"));
    expect(
      await rollItemTableDice(field, [], {}, 0, "damage", "bad", roll),
    ).toEqual({ rolling: false, text: "Error", isError: true });
  });
});
