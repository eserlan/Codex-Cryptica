import { describe, expect, it } from "vitest";
import type { Entity } from "schema";
import {
  adjustCounterCell,
  defaultCellValue,
  getColumnCellClass,
  getColumnHeaderClass,
  linkedValue,
  moneyCell,
  parseTableMoney,
} from "./item-table-values";

describe("item table values", () => {
  it("uses column defaults for newly created cells", () => {
    expect(
      defaultCellValue({ id: "hp", label: "HP", type: "counter", min: 10 }),
    ).toEqual({ value: 10, max: 6 });
    expect(
      defaultCellValue({
        id: "roll",
        label: "Roll",
        type: "dice",
        formula: "2d8",
      }),
    ).toBe("2d8");
    expect(defaultCellValue({ id: "roll", label: "Roll", type: "dice" })).toBe(
      "1d6",
    );
    expect(defaultCellValue({ id: "n", label: "N", type: "number" })).toBe(0);
    expect(defaultCellValue({ id: "c", label: "C", type: "checkbox" })).toBe(
      false,
    );
    expect(defaultCellValue({ id: "t", label: "T", type: "text" })).toBe("");
  });

  it("clamps object counters while preserving metadata and scalar counters", () => {
    expect(adjustCounterCell({ value: 4, max: 5, note: "keep" }, 3, 0)).toEqual(
      { value: 5, max: 5, note: "keep" },
    );
    expect(adjustCounterCell({ value: 0, max: 5 }, -1, 0)).toEqual({
      value: 0,
      max: 5,
    });
    expect(adjustCounterCell("invalid", 2, 0)).toBe(2);
    expect(adjustCounterCell(5, -10, 2)).toBe(2);
    expect(adjustCounterCell(undefined, 1, 0)).toBe(1);
  });

  it("resolves linked names, values and formulas without losing zero", () => {
    const entity = {
      title: "Sword",
      statSheet: {
        fields: [
          { id: "ap", value: 0, formula: "1d6" },
          { id: "damage", formula: "2d6" },
        ],
      },
    } as Entity;
    expect(linkedValue(entity, "name")).toBe("Sword");
    expect(linkedValue(entity, "ap")).toBe(0);
    expect(linkedValue(entity, "damage")).toBe("2d6");
    expect(linkedValue(entity, "missing")).toBeUndefined();
    expect(linkedValue(undefined, "name")).toBeUndefined();
  });

  it("recognises money cells and rejects invalid prices", () => {
    const price = { units: 123, currency: "gp", precision: 2 };
    expect(moneyCell({ price }, "price")).toBe(price);
    expect(moneyCell({ price: "1 gp" }, "price")).toBeUndefined();
    expect(moneyCell({}, "price")).toBeUndefined();
    expect(parseTableMoney("1.23", "gp")).toEqual(price);
    expect(parseTableMoney("bad", "gp")).toBeFalsy();
  });

  it("preserves compact and descriptive column alignment", () => {
    expect(getColumnHeaderClass({ id: "name", type: "text" })).toContain(
      "text-left",
    );
    expect(getColumnHeaderClass({ id: "notes", type: "text" })).toContain(
      "min-w-[8rem]",
    );
    expect(getColumnCellClass({ id: "notes", type: "text" })).toContain(
      "text-left",
    );
    for (const type of ["number", "dice", "counter", "checkbox"]) {
      expect(getColumnCellClass({ id: "x", type })).toContain("text-center");
      expect(getColumnHeaderClass({ id: "x", type })).toContain("text-center");
    }
    expect(getColumnCellClass({ id: "other", type: "text" })).toContain(
      "min-w-[4rem]",
    );
  });
});
