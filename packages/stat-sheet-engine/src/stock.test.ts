import { describe, expect, it } from "vitest";
import {
  adjustQuantity,
  ensureRowIds,
  formatMoney,
  multiplyMoney,
  parseMoney,
  patchStock,
  resolveStockDisplay,
  sumMoney,
} from "./stock";

const ids = () => {
  let n = 0;
  return () => `id-${++n}`;
};

describe("ensureRowIds", () => {
  it("adds ids to legacy rows without altering their data or order", () => {
    const rows = [{ name: "Sword" }, { name: "Axe", entityId: "axe" }];
    const out = ensureRowIds(rows, ids());
    expect(out.map((r) => r.name)).toEqual(["Sword", "Axe"]);
    expect(out[1].entityId).toBe("axe");
    expect(out.map((r) => r.rowId)).toEqual(["id-1", "id-2"]);
  });

  it("keeps existing ids and returns the same array when nothing changes", () => {
    const rows = [{ rowId: "a" }, { rowId: "b" }];
    expect(ensureRowIds(rows, ids())).toBe(rows);
  });

  it("gives duplicate item references separate ids and re-ids duplicates", () => {
    const out = ensureRowIds(
      [
        { entityId: "sword" },
        { entityId: "sword" },
        { rowId: "x" },
        { rowId: "x" },
      ],
      ids(),
    );
    expect(new Set(out.map((r) => r.rowId)).size).toBe(4);
    expect(out[2].rowId).toBe("x");
  });

  it("ids survive reordering", () => {
    const out = ensureRowIds([{ name: "a" }, { name: "b" }], ids());
    const reversed = [...out].reverse();
    expect(ensureRowIds(reversed, ids())).toBe(reversed);
  });
});

describe("money", () => {
  it("round-trips exactly through parse and format", () => {
    for (const [text, precision] of [
      ["12", 0],
      ["12.5", 1],
      ["0.07", 2],
      ["1234567.89", 2],
    ] as const) {
      const m = parseMoney(text, "gp", precision)!;
      expect(formatMoney(m, false)).toBe(precision ? text : text);
    }
    expect(parseMoney("0.1", "gp", 2)).toEqual({
      units: 10,
      currency: "gp",
      precision: 2,
    });
  });

  it("avoids float errors in totals", () => {
    const tenth = parseMoney("0.1", "cr", 1)!;
    const total = sumMoney([tenth, tenth, tenth])!;
    expect(total.units).toBe(3);
    expect(formatMoney(total)).toBe("0.3 cr");
  });

  it("rejects negative, malformed, rounding and unsafe input", () => {
    expect(parseMoney("-1", "gp")).toBeNull();
    expect(parseMoney("abc", "gp")).toBeNull();
    expect(parseMoney("", "gp")).toBeNull();
    expect(parseMoney("1.5", "gp", 0)).toBeNull();
    expect(parseMoney("1", "  ")).toBeNull();
    expect(parseMoney("99999999999999999999", "gp")).toBeNull();
  });

  it("allows trailing zeros beyond precision", () => {
    expect(parseMoney("2.50", "gp", 1)?.units).toBe(25);
  });

  it("refuses to sum mixed currencies and to overflow", () => {
    const a = { units: 1, currency: "gp", precision: 0 };
    expect(sumMoney([a, { ...a, currency: "sp" }])).toBeNull();
    expect(sumMoney([a, { ...a, precision: 2 }])).toBeNull();
    expect(sumMoney([])).toBeNull();
    expect(
      multiplyMoney({ ...a, units: Number.MAX_SAFE_INTEGER }, 2),
    ).toBeNull();
    expect(multiplyMoney(a, -1)).toBeNull();
    expect(multiplyMoney({ ...a, units: 7 }, 3)?.units).toBe(21);
  });
});

describe("adjustQuantity", () => {
  it("never goes negative and reports the clamp", () => {
    expect(adjustQuantity(1, -1)).toEqual({ quantity: 0, clamped: false });
    expect(adjustQuantity(0, -1)).toEqual({ quantity: 0, clamped: true });
    expect(adjustQuantity(undefined, 3)).toEqual({
      quantity: 3,
      clamped: false,
    });
  });
});

describe("resolveStockDisplay / patchStock", () => {
  const sword = {
    title: "Steel Sword",
    statSheet: { fields: [{ id: "price", value: "15 gp" }] },
  };

  it("shows the item price as source and the shop price as override", () => {
    const row = patchStock(
      { entityId: "sword" },
      { price: { units: 20, currency: "gp", precision: 0 } },
    );
    const d = resolveStockDisplay(row, sword);
    expect(d.linked).toBe(true);
    expect(d.sourcePrice).toBe("15 gp");
    expect(d.priceIsOverride).toBe(true);
    // The Item template is never mutated.
    expect(sword.statSheet.fields[0].value).toBe("15 gp");
  });

  it("falls back to the row name when the item is deleted", () => {
    const d = resolveStockDisplay(
      { entityId: "gone", name: "Old Sword" },
      undefined,
    );
    expect(d).toMatchObject({
      linked: false,
      missing: true,
      name: "Old Sword",
    });
  });

  it("supports unlinked service lines", () => {
    const d = resolveStockDisplay({ name: "Sharpening" }, undefined);
    expect(d).toMatchObject({
      linked: false,
      missing: false,
      name: "Sharpening",
    });
    expect(resolveStockDisplay({}, undefined).name).toBe("Unnamed stock");
  });

  it("keeps independent stock per row for the same item", () => {
    const a = patchStock({ entityId: "s" }, { quantity: 1 });
    const b = patchStock({ entityId: "s" }, { quantity: 5 });
    expect((a.stock as any).quantity).toBe(1);
    expect((b.stock as any).quantity).toBe(5);
  });
});
