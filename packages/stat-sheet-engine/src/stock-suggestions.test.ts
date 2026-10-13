import { describe, expect, test } from "vitest";
import {
  SUGGESTION_NOTE,
  applyAcceptedLines,
  deriveShopContext,
  editedStock,
  inferGenre,
  invalidLineEditFields,
  proposeStock,
  reviewProposal,
} from "./stock-suggestions";

const names = (p: ReturnType<typeof proposeStock>) =>
  p.lines.map((l) => l.name);

describe("deriveShopContext", () => {
  test("reads themes and scarcity from the place text", () => {
    const ctx = deriveShopContext({
      shopText: "A general store.",
      placeText:
        "Greyhaven mills timber from the upriver forests. Salt is scarce since the road closed.",
    });
    expect(ctx.plentiful).toContain("timber");
    expect(ctx.scarce).toContain("salt");
    expect(ctx.plentiful).not.toContain("salt");
  });

  test("reads wealth, defaulting to modest", () => {
    expect(deriveShopContext({ shopText: "A wealthy outfitter" }).wealth).toBe(
      "rich",
    );
    expect(deriveShopContext({ shopText: "A struggling stall" }).wealth).toBe(
      "poor",
    );
    expect(
      deriveShopContext({ shopText: "Not wealthy, but struggling." }).wealth,
    ).toBe("poor");
    expect(
      deriveShopContext({ shopText: "Wealthy, but struggling." }).wealth,
    ).toBe("poor");
    expect(
      deriveShopContext({ shopText: "Not poor; the shop is thriving." }).wealth,
    ).toBe("comfortable");
    expect(
      deriveShopContext({
        shopText: "The shop was poor, but is now wealthy.",
      }).wealth,
    ).toBe("rich");
    expect(deriveShopContext({ shopText: "A stall" }).wealth).toBe("modest");
  });

  test("an explicit genre beats the text", () => {
    expect(
      deriveShopContext({ genre: "fantasy", placeText: "A starport station" })
        .genre,
    ).toBe("fantasy");
    expect(inferGenre("Docked at the orbital station, paid in credits")).toBe(
      "sci-fi",
    );
    expect(inferGenre("The castle guild hall")).toBe("fantasy");
    expect(inferGenre("A shop")).toBe("generic");
  });
});

describe("proposeStock", () => {
  test("context materially changes which goods are proposed", () => {
    const coast = proposeStock(
      deriveShopContext({
        genre: "fantasy",
        placeText: "A harbour town. Fishing boats land cod and herring daily.",
      }),
    );
    const mine = proposeStock(
      deriveShopContext({
        genre: "fantasy",
        placeText: "A mining town. Iron ore is smelted in the foundry.",
      }),
    );
    expect(names(coast).some((n) => /fish|cod/i.test(n))).toBe(true);
    expect(names(mine).some((n) => /iron|nails|ingot/i.test(n))).toBe(true);
    expect(names(coast).some((n) => /ingot/i.test(n))).toBe(false);
    expect(names(coast)).not.toEqual(names(mine));
  });

  test("genre changes the stock and the currency", () => {
    const fantasy = proposeStock(
      deriveShopContext({ genre: "fantasy", shopText: "Tools and repair." }),
    );
    const scifi = proposeStock(
      deriveShopContext({ genre: "sci-fi", shopText: "Tools and repair." }),
    );
    expect(fantasy.lines[0].stock.price?.currency).toBe("gp");
    expect(scifi.lines[0].stock.price?.currency).toBe("cr");
    expect(names(fantasy)).not.toEqual(names(scifi));
  });

  test("scarce goods are few and dear, plentiful ones cheaper", () => {
    const base = proposeStock(
      deriveShopContext({
        genre: "fantasy",
        shopText: "Sells salt and timber.",
      }),
      { seed: "x" },
    );
    const shifted = proposeStock(
      deriveShopContext({
        genre: "fantasy",
        shopText: "Sells salt and timber.",
        placeText: "Salt is scarce here. Timber is plentiful.",
      }),
      { seed: "x" },
    );
    const price = (p: typeof base, n: RegExp) =>
      p.lines.find((l) => n.test(l.name))?.stock.price?.units ?? 0;
    expect(price(shifted, /salt/i)).toBeGreaterThan(price(base, /salt/i));
    expect(price(shifted, /planks/i)).toBeLessThan(price(base, /planks/i));
    expect(shifted.constraints.join(" ")).toMatch(/salt/i);
  });

  test("a shop with no context still gets a coherent generic spread", () => {
    const p = proposeStock(deriveShopContext({}));
    expect(p.lines.length).toBeGreaterThan(0);
    expect(p.lines.every((l) => l.stock.note === SUGGESTION_NOTE)).toBe(true);
  });

  test("poor shops get no rare goods", () => {
    const p = proposeStock(
      deriveShopContext({ genre: "fantasy", shopText: "A poor weapon seller" }),
      { count: 16 },
    );
    expect(names(p)).not.toContain("Chain shirt");
  });

  test("the same seed repeats and another seed can vary", () => {
    const ctx = deriveShopContext({ genre: "fantasy" });
    expect(names(proposeStock(ctx, { seed: "a" }))).toEqual(
      names(proposeStock(ctx, { seed: "a" })),
    );
  });

  test("prices are whole integer units and never zero", () => {
    const p = proposeStock(deriveShopContext({ genre: "sci-fi" }), {
      count: 16,
    });
    for (const l of p.lines) {
      expect(Number.isInteger(l.stock.price?.units)).toBe(true);
      expect(l.stock.price!.units).toBeGreaterThan(0);
    }
  });
});

describe("reviewProposal and applyAcceptedLines", () => {
  const existing = [
    {
      rowId: "r1",
      name: "Longsword",
      stock: {
        quantity: 2,
        price: { units: 99, currency: "gp", precision: 0 },
        note: "mine",
      },
    },
  ];
  const lines = [
    {
      key: "a",
      name: "Longswords",
      stock: { quantity: 5 },
      reason: "",
      matched: [],
    },
    {
      key: "b",
      name: "Hooded lantern",
      stock: { quantity: 3 },
      reason: "",
      matched: [],
    },
  ];

  test("flags lines the shop already stocks and leaves them alone", () => {
    const reviewed = reviewProposal(existing, lines);
    expect(reviewed.map((l) => l.status)).toEqual(["duplicate", "new"]);
  });

  test("existing rows and their overrides survive adding new ones", () => {
    const out = applyAcceptedLines(existing, [
      { name: "Longsword", stock: { quantity: 9 } },
      { name: "Hooded lantern", stock: { quantity: 3 } },
    ]);
    expect(out).toHaveLength(2);
    expect(out[0]).toBe(existing[0]);
    expect(out[1].name).toBe("Hooded lantern");
    expect(typeof out[1].rowId).toBe("string");
  });

  test("running the same acceptance twice does not double a line", () => {
    const once = applyAcceptedLines(existing, [{ name: "Rope", stock: {} }]);
    const twice = applyAcceptedLines(once, [{ name: "Rope", stock: {} }]);
    expect(twice).toHaveLength(once.length);
  });

  test("a linked row counts by its Item title", () => {
    const rows = [{ rowId: "r2", entityId: "lamp" }];
    const reviewed = reviewProposal(rows, lines, {
      resolveName: (id) => (id === "lamp" ? "Hooded lantern" : undefined),
    });
    expect(reviewed[1].status).toBe("duplicate");
  });

  test("an Item is only offered for linking when one already exists", () => {
    const reviewed = reviewProposal([], lines, {
      findItem: (t) =>
        t === "Hooded lantern" ? { id: "i1", title: t } : undefined,
    });
    expect(reviewed[0].itemMatch).toBeUndefined();
    expect(reviewed[1].itemMatch).toEqual({
      id: "i1",
      title: "Hooded lantern",
    });
    const plain = applyAcceptedLines(
      [],
      [{ name: "Hooded lantern", stock: {} }],
    );
    expect(plain[0].entityId).toBeUndefined();
    const linked = applyAcceptedLines(
      [],
      [{ name: "Hooded lantern", stock: {}, linkItemId: "i1" }],
    );
    expect(linked[0].entityId).toBe("i1");
  });

  test("accepting nothing changes nothing", () => {
    expect(applyAcceptedLines(existing, [])).toEqual(existing);
  });
});

describe("editedStock", () => {
  const stock = {
    quantity: 3,
    price: { units: 10, currency: "gp", precision: 0 },
  };

  test("applies a valid quantity and price", () => {
    const out = editedStock(stock, { quantity: "9", price: "25" });
    expect(out.quantity).toBe(9);
    expect(out.price).toEqual({ units: 25, currency: "gp", precision: 0 });
  });

  test("parses decimal prices using the stock precision", () => {
    const fractional = {
      ...stock,
      price: { units: 100, currency: "gp", precision: 2 },
    };
    expect(editedStock(fractional, { price: "1.50" }).price).toEqual({
      units: 150,
      currency: "gp",
      precision: 2,
    });
  });

  test("ignores blank, fractional, negative and zero-price text", () => {
    expect(editedStock(stock, { quantity: "", price: "0" })).toEqual(stock);
    expect(editedStock(stock, { quantity: "2.5", price: "-4" })).toEqual(stock);
    expect(editedStock(stock, { quantity: "-1" })).toEqual(stock);
  });

  test("identifies edits that cannot be applied so the review can block Add", () => {
    expect(
      invalidLineEditFields(stock, { quantity: "2.5", price: "-4" }),
    ).toEqual(["quantity", "price"]);
    expect(
      invalidLineEditFields(stock, { quantity: "0", price: "25" }),
    ).toEqual([]);
  });

  test("flags unsafe quantity and price edits so the review can block Add", () => {
    expect(invalidLineEditFields(stock, { quantity: "1e21" })).toEqual([
      "quantity",
    ]);
    expect(invalidLineEditFields(stock, { price: "1e300" })).toEqual(["price"]);
  });

  test("never mutates its input", () => {
    editedStock(stock, { quantity: "9" });
    expect(stock.quantity).toBe(3);
  });
});

describe("review fixes", () => {
  test("suggested prices follow the shop's currency and precision", () => {
    const p = proposeStock(deriveShopContext({ genre: "fantasy" }), {
      currency: "sp",
      precision: 2,
    });
    for (const l of p.lines) {
      expect(l.stock.price?.currency).toBe("sp");
      expect(l.stock.price?.precision).toBe(2);
      expect(l.stock.price!.units).toBeGreaterThanOrEqual(100);
    }
  });

  test("an unsafe typed number is ignored", () => {
    const stock = {
      quantity: 3,
      price: { units: 10, currency: "gp", precision: 0 },
    };
    expect(editedStock(stock, { quantity: "1e21", price: "1e300" })).toEqual(
      stock,
    );
  });
});

describe("mixed shortage and surplus claims", () => {
  test("imports and exports in one sentence are told apart", () => {
    const ctx = deriveShopContext({
      placeText: "Greyhaven imports salt and exports barley.",
    });
    expect(ctx.scarce).toContain("salt");
    expect(ctx.plentiful).toContain("grain");
    expect(ctx.plentiful).not.toContain("salt");
  });

  test("a 'but' clause does not flip the earlier claim", () => {
    const ctx = deriveShopContext({
      placeText: "Salt is scarce here, but timber is plentiful.",
    });
    expect(ctx.scarce).toContain("salt");
    expect(ctx.plentiful).toContain("timber");
    expect(ctx.plentiful).not.toContain("salt");
  });

  test("a scarce good is never cheaper or more plentiful than the baseline", () => {
    const base = proposeStock(
      deriveShopContext({ genre: "fantasy", shopText: "Sells salt." }),
      { seed: "m" },
    );
    const scarce = proposeStock(
      deriveShopContext({
        genre: "fantasy",
        shopText: "Sells salt.",
        placeText: "The town imports salt and exports barley.",
      }),
      { seed: "m" },
    );
    const salt = (p: typeof base) => p.lines.find((l) => /salt/i.test(l.name))!;
    expect(salt(scarce).stock.price!.units).toBeGreaterThan(
      salt(base).stock.price!.units,
    );
    expect(salt(scarce).stock.quantity!).toBeLessThanOrEqual(
      salt(base).stock.quantity!,
    );
  });
});

describe("re-rolling", () => {
  test("different seeds give different proposals for the same context", () => {
    const ctx = deriveShopContext({ genre: "fantasy" });
    const seen = new Set(
      ["a", "b", "c", "d", "e", "f"].map((seed) =>
        JSON.stringify(proposeStock(ctx, { seed }).lines),
      ),
    );
    expect(seen.size).toBeGreaterThan(1);
  });
});
