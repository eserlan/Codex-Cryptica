import { describe, expect, test } from "bun:test";
import type { MarketChange } from "schema";
import {
  appendChange,
  applyPlan,
  draftFromSignal,
  effectProblem,
  planPressure,
  replayChanges,
  revertChange,
  rowsMatching,
  standingPressure,
  MARKET_HISTORY_LIMIT,
  MAX_CHANGE_ROWS,
  type ApplyMeta,
} from "./market-pressure";

const gp = (units: number, precision = 0) => ({
  units,
  currency: "gp",
  precision,
});

const shop = () => [
  { rowId: "iron", name: "Iron ingot", stock: { quantity: 9, price: gp(10) } },
  { rowId: "rope", name: "Rope", stock: { quantity: 4, price: gp(1) } },
  { rowId: "map", name: "Old map", stock: { kind: "service", price: gp(20) } },
  { rowId: "gem", name: "Gem", stock: { quantity: 2 } },
];

const meta = (id = "c1"): ApplyMeta => ({
  id,
  label: "Shortage: iron",
  reason: "The road to the mine is closed",
  cause: { kind: "gm" },
  at: "2026-10-13T00:00:00.000Z",
});

const stockOf = (rows: Record<string, unknown>[], id: string) =>
  rows.find((r) => r.rowId === id)!.stock as Record<string, any>;

describe("planPressure", () => {
  test("proposes a diff without changing anything", () => {
    const rows = shop();
    const snapshot = JSON.stringify(rows);
    const plan = planPressure(rows, {
      pricePercent: 50,
      quantity: { mode: "percent", value: 34 },
    });
    expect(JSON.stringify(rows)).toBe(snapshot);
    const iron = plan.find((p) => p.rowId === "iron")!;
    expect(iron.change.price).toEqual({ before: gp(10), after: gp(15) });
    expect(iron.change.quantity).toEqual({ before: 9, after: 3 });
    expect(iron.reasons.join(" ")).toMatch(/\+50%/);
  });

  test("only the chosen rows are planned", () => {
    const plan = planPressure(
      shop(),
      { pricePercent: 10 },
      { rowIds: new Set(["rope"]) },
    );
    expect(plan.map((p) => p.rowId)).toEqual(["rope"]);
  });

  test("rows that cannot take a change say why and are not applied", () => {
    const plan = planPressure(shop(), { pricePercent: 50 });
    expect(plan.find((p) => p.rowId === "gem")!.skipped).toBe("no-price");
    const services = planPressure(shop(), {
      quantity: { mode: "add", value: 5 },
    });
    expect(services.find((p) => p.rowId === "map")!.skipped).toBe(
      "no-quantity",
    );
  });

  test("a shortage thins the shelf but never empties it by rounding", () => {
    const plan = planPressure(
      [{ rowId: "a", name: "A", stock: { quantity: 3, price: gp(5) } }],
      { quantity: { mode: "percent", value: 10 } },
    );
    expect(plan[0].change.quantity!.after).toBe(1);
  });

  test("price shifts stay exact at any precision and never go below one unit", () => {
    const fine = planPressure(
      [{ rowId: "a", name: "A", stock: { price: gp(250, 2) } }],
      { pricePercent: 20 },
    );
    expect(fine[0].change.price!.after).toEqual(gp(300, 2));
    const tiny = planPressure(
      [{ rowId: "a", name: "A", stock: { price: gp(1) } }],
      { pricePercent: -90 },
    );
    expect(tiny[0].change.price?.after.units ?? 1).toBe(1);
    const huge = planPressure(
      [
        {
          rowId: "a",
          name: "A",
          stock: { price: gp(Number.MAX_SAFE_INTEGER) },
        },
      ],
      { pricePercent: 100 },
    );
    expect(huge[0].skipped).toBe("unsafe-price");
  });

  test("a restock puts a sold-out line back on sale", () => {
    const rows = [
      {
        rowId: "a",
        name: "A",
        stock: { quantity: 0, availability: "sold-out", price: gp(3) },
      },
    ];
    const plan = planPressure(rows, { quantity: { mode: "add", value: 4 } });
    expect(plan[0].change.quantity).toEqual({ before: 0, after: 4 });
    expect(plan[0].change.availability).toEqual({
      before: "sold-out",
      after: "available",
    });
  });
});

describe("applyPlan", () => {
  test("changes only planned rows and leaves the rest as they were", () => {
    const rows = shop();
    const plan = planPressure(
      rows,
      { pricePercent: 50 },
      { rowIds: new Set(["iron"]) },
    );
    const out = applyPlan(rows, plan, meta())!;
    expect(stockOf(out.rows, "iron").price).toEqual(gp(15));
    expect(out.rows[1]).toBe(rows[1]);
    expect(out.rows[2]).toBe(rows[2]);
    expect(out.change.status).toBe("applied");
    expect(out.change.rows).toHaveLength(1);
  });

  test("nothing to apply gives null, so cancelling or an empty diff changes nothing", () => {
    const rows = shop();
    expect(applyPlan(rows, [], meta())).toBeNull();
    const skipped = planPressure(
      rows,
      { pricePercent: 50 },
      { rowIds: new Set(["gem"]) },
    );
    expect(applyPlan(rows, skipped, meta())).toBeNull();
  });
});

describe("revertChange", () => {
  const applied = () => {
    const rows = shop();
    const plan = planPressure(
      rows,
      { pricePercent: 50, quantity: { mode: "percent", value: 34 } },
      { rowIds: new Set(["iron", "rope"]) },
    );
    const out = applyPlan(rows, plan, meta())!;
    return { rows, out, history: appendChange(undefined, out.change) };
  };

  test("restores exactly the original rows", () => {
    const { rows, out, history } = applied();
    const back = revertChange(out.rows, history, "c1");
    expect(back.conflicts).toEqual([]);
    expect(JSON.parse(JSON.stringify(back.rows))).toEqual(
      JSON.parse(JSON.stringify(rows)),
    );
    expect(back.history[0].status).toBe("reverted");
  });

  test("keeps a price the GM changed since and reports it", () => {
    const { out, history } = applied();
    const edited = out.rows.map((r) =>
      r.rowId === "iron"
        ? { ...r, stock: { ...(r.stock as object), price: gp(99) } }
        : r,
    );
    const back = revertChange(edited, history, "c1");
    expect(stockOf(back.rows, "iron").price).toEqual(gp(99));
    expect(stockOf(back.rows, "iron").quantity).toBe(9);
    expect(back.conflicts).toEqual([
      { rowId: "iron", name: "Iron ingot", kept: ["price"] },
    ]);
    expect(stockOf(back.rows, "rope").price).toEqual(gp(1));
  });

  test("keeps a quantity a trade changed since", () => {
    const { out, history } = applied();
    const traded = out.rows.map((r) =>
      r.rowId === "rope"
        ? { ...r, stock: { ...(r.stock as object), quantity: 0 } }
        : r,
    );
    const back = revertChange(traded, history, "c1");
    expect(stockOf(back.rows, "rope").quantity).toBe(0);
    expect(back.conflicts.find((c) => c.rowId === "rope")!.kept).toEqual([
      "quantity",
    ]);
  });

  test("reverting twice, or an unknown change, does nothing", () => {
    const { out, history } = applied();
    const once = revertChange(out.rows, history, "c1");
    const twice = revertChange(once.rows, once.history, "c1");
    expect(twice.restored).toBe(0);
    expect(revertChange(out.rows, history, "nope").restored).toBe(0);
  });

  test("a row removed from the shop is reported, not an error", () => {
    const { out, history } = applied();
    const without = out.rows.filter((r) => r.rowId !== "iron");
    const back = revertChange(without, history, "c1");
    expect(back.conflicts.some((c) => c.rowId === "iron")).toBe(true);
  });
});

describe("history, standing pressure and replay", () => {
  test("the baseline stays separate from the asking price", () => {
    const rows = shop();
    const out = applyPlan(
      rows,
      planPressure(rows, { pricePercent: 50 }, { rowIds: new Set(["iron"]) }),
      meta(),
    )!;
    const standing = standingPressure(out.rows, [out.change]);
    expect(standing).toHaveLength(1);
    expect(standing[0].baseline).toEqual(gp(10));
    expect(standing[0].asking).toEqual(gp(15));
    expect(standing[0].edited).toBe(false);
    expect(standing[0].reasons[0]).toContain("closed");
  });

  test("a price the GM set afterwards is marked as an override", () => {
    const rows = shop();
    const out = applyPlan(
      rows,
      planPressure(rows, { pricePercent: 50 }, { rowIds: new Set(["iron"]) }),
      meta(),
    )!;
    const edited = out.rows.map((r) =>
      r.rowId === "iron"
        ? { ...r, stock: { ...(r.stock as object), price: gp(12) } }
        : r,
    );
    expect(standingPressure(edited, [out.change])[0].edited).toBe(true);
  });

  test("a reverted change is no longer standing", () => {
    const rows = shop();
    const out = applyPlan(
      rows,
      planPressure(rows, { pricePercent: 50 }),
      meta(),
    )!;
    const reverted: MarketChange[] = [{ ...out.change, status: "reverted" }];
    expect(standingPressure(out.rows, reverted)).toEqual([]);
  });

  test("replaying the same changes on the same baseline gives the same shop", () => {
    const rows = shop();
    const first = applyPlan(
      rows,
      planPressure(rows, { pricePercent: 50 }),
      meta("a"),
    )!;
    const second = applyPlan(
      first.rows,
      planPressure(first.rows, { quantity: { mode: "add", value: 2 } }),
      meta("b"),
    )!;
    const history = [first.change, second.change];
    const replayed = replayChanges(rows, history);
    expect(JSON.parse(JSON.stringify(replayed))).toEqual(
      JSON.parse(JSON.stringify(second.rows)),
    );
    expect(JSON.stringify(replayChanges(rows, history))).toBe(
      JSON.stringify(replayed),
    );
  });

  test("replay skips a change whose starting values no longer match", () => {
    const rows = shop();
    const out = applyPlan(
      rows,
      planPressure(rows, { pricePercent: 50 }, { rowIds: new Set(["iron"]) }),
      meta(),
    )!;
    const changedBaseline = rows.map((r) =>
      r.rowId === "iron"
        ? { ...r, stock: { ...(r.stock as object), price: gp(11) } }
        : r,
    );
    expect(
      stockOf(replayChanges(changedBaseline, [out.change]), "iron").price,
    ).toEqual(gp(11));
  });

  test("history is bounded to the newest changes", () => {
    let history: MarketChange[] | undefined;
    for (let i = 0; i < MARKET_HISTORY_LIMIT + 5; i++) {
      history = appendChange(history, {
        ...meta(`c${i}`),
        status: "applied",
        rows: [],
      });
    }
    expect(history).toHaveLength(MARKET_HISTORY_LIMIT);
    expect(history![0].id).toBe("c5");
  });
});

describe("limits and signals", () => {
  test("rejects effects outside the allowed range or empty", () => {
    expect(effectProblem({ pricePercent: 600 })).toMatch(/between/);
    expect(effectProblem({ pricePercent: -95 })).toMatch(/between/);
    expect(effectProblem({ pricePercent: 2.5 })).toMatch(/whole/);
    expect(effectProblem({ quantity: { mode: "percent", value: -5 } })).toMatch(
      /whole/,
    );
    expect(effectProblem({})).toMatch(/at least one/);
    expect(effectProblem({ pricePercent: 25 })).toBeNull();
  });

  test("an approved signal only drafts a preset and a row filter", () => {
    const draft = draftFromSignal({
      kind: "shortage",
      subject: "iron",
      source: "Settlement economy",
    });
    expect(draft.preset.kind).toBe("shortage");
    expect(draft.label).toBe("Shortage: iron");
    const ids = rowsMatching(shop(), draft.appliesTo);
    expect([...ids]).toEqual(["iron"]);
  });

  test("an empty filter selects every row", () => {
    expect(rowsMatching(shop(), "").size).toBe(4);
  });
});

describe("stored-size limits", () => {
  test("a quantity that cannot be stored exactly is skipped, not saved", () => {
    const rows = [
      { rowId: "a", name: "A", stock: { quantity: 5, price: gp(1) } },
    ];
    const plan = planPressure(rows, {
      quantity: { mode: "add", value: Number.MAX_SAFE_INTEGER },
    });
    expect(plan[0].skipped).toBe("unsafe-quantity");
    expect(applyPlan(rows, plan, meta())).toBeNull();
  });

  test("a change is refused if it would cover more lines than can be stored", () => {
    const rows = Array.from({ length: MAX_CHANGE_ROWS + 1 }, (_, i) => ({
      rowId: `r${i}`,
      name: `Item ${i}`,
      stock: { quantity: 2, price: gp(10) },
    }));
    const plan = planPressure(rows, { pricePercent: 10 });
    expect(plan).toHaveLength(MAX_CHANGE_ROWS + 1);
    expect(applyPlan(rows, plan, meta())).toBeNull();
    const limited = planPressure(
      rows,
      { pricePercent: 10 },
      {
        rowIds: new Set(rows.slice(0, MAX_CHANGE_ROWS).map((r) => r.rowId)),
      },
    );
    expect(applyPlan(rows, limited, meta())!.change.rows).toHaveLength(
      MAX_CHANGE_ROWS,
    );
  });

  test("a row removed from the shop reports every value that could not be put back", () => {
    const rows = shop();
    const out = applyPlan(
      rows,
      planPressure(
        rows,
        { pricePercent: 50, quantity: { mode: "add", value: 1 } },
        { rowIds: new Set(["iron"]) },
      ),
      meta(),
    )!;
    const back = revertChange(
      out.rows.filter((r) => r.rowId !== "iron"),
      [out.change],
      "c1",
    );
    expect(back.conflicts[0].kept).toEqual(["price", "quantity"]);
  });
});

describe("lines without a counted quantity", () => {
  const rows = [{ rowId: "u", name: "Untracked", stock: { price: gp(10) } }];

  test("a quantity change skips them, so nothing can turn into ×0", () => {
    const plan = planPressure(rows, { quantity: { mode: "add", value: 3 } });
    expect(plan[0].skipped).toBe("no-quantity");
    expect(applyPlan(rows, plan, meta())).toBeNull();
  });

  test("a price change still applies, and undo leaves no quantity behind", () => {
    const out = applyPlan(
      rows,
      planPressure(rows, {
        pricePercent: 50,
        quantity: { mode: "add", value: 3 },
      }),
      meta(),
    )!;
    expect(out.change.rows[0].quantity).toBeUndefined();
    const back = revertChange(out.rows, [out.change], "c1");
    expect("quantity" in (back.rows[0].stock as object)).toBe(false);
    expect(stockOf(back.rows, "u").price).toEqual(gp(10));
  });
});
