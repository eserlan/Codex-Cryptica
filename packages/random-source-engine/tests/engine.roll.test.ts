import { describe, it, expect } from "vitest";
import { DiceEngine } from "dice-engine";
import { RandomSourceEngine } from "../src/engine";
import { seededCrypto } from "./helpers/seeded-crypto";
import type { RandomSource, ResolutionContext } from "../src/types";

const emptyCtx: ResolutionContext = { lookup: () => undefined };

const table = (entries: RandomSource["entries"]): RandomSource => ({
  id: "t",
  name: "T",
  kind: "table",
  labels: [],
  selection: { mode: "weighted" },
  entries,
});

const engine = () => new RandomSourceEngine(new DiceEngine(seededCrypto(7)));

describe("RandomSourceEngine.roll", () => {
  it("returns exactly one entry", () => {
    const src = table([
      { id: "a", text: "Alpha" },
      { id: "b", text: "Beta" },
    ]);
    const out = engine().roll(src, emptyCtx);
    expect(["Alpha", "Beta"]).toContain(out.finalText);
    expect(out.chain).toHaveLength(1);
  });

  it("always returns the only entry of a single-entry table", () => {
    const src = table([{ id: "a", text: "Only" }]);
    for (let i = 0; i < 10; i++) {
      expect(engine().roll(src, emptyCtx).finalText).toBe("Only");
    }
  });

  it("reports a die value alongside the result (FR-011)", () => {
    const src = table([
      { id: "a", text: "Alpha", weight: 2 },
      { id: "b", text: "Beta", weight: 3 },
    ]);
    const out = engine().roll(src, emptyCtx);
    const die = out.chain[0].dieValue;
    expect(die).toBeGreaterThanOrEqual(1);
    expect(die).toBeLessThanOrEqual(5);
  });

  it("names the source that produced the result", () => {
    const out = engine().roll(table([{ id: "a", text: "Alpha" }]), emptyCtx);
    expect(out.chain[0].sourceName).toBe("T");
    expect(out.chain[0].sourceKind).toBe("table");
    expect(out.chain[0].status).toBe("ok");
  });

  it("reports an empty table rather than throwing", () => {
    const out = engine().roll(table([]), emptyCtx);
    expect(out.notices.length).toBeGreaterThan(0);
    expect(out.finalText).toBe("");
  });

  it("selects by range in ranged mode", () => {
    const src: RandomSource = {
      id: "t",
      name: "T",
      kind: "table",
      labels: [],
      selection: { mode: "ranged", die: { sides: 100 } },
      entries: [
        { id: "a", text: "Low", range: { min: 1, max: 50 } },
        { id: "b", text: "High", range: { min: 51, max: 100 } },
      ],
    };
    const out = engine().roll(src, emptyCtx);
    expect(["Low", "High"]).toContain(out.finalText);
    const die = out.chain[0].dieValue!;
    expect(out.finalText).toBe(die <= 50 ? "Low" : "High");
  });
});

describe("RandomSourceEngine.rollMany", () => {
  it("combines several sources into one outcome (FR-017)", () => {
    const a = { ...table([{ id: "a", text: "Alpha" }]), name: "A" };
    const b = { ...table([{ id: "b", text: "Beta" }]), name: "B" };
    const out = engine().rollMany([a, b], emptyCtx);
    expect(out.chain).toHaveLength(2);
    expect(out.finalText).toContain("Alpha");
    expect(out.finalText).toContain("Beta");
  });

  it("returns an empty outcome for no sources", () => {
    const out = engine().rollMany([], emptyCtx);
    expect(out.chain).toHaveLength(0);
  });
});

describe("RandomSourceEngine.roll with unusable weights", () => {
  it("reports a notice instead of throwing when every entry weighs nothing", () => {
    // Clearing the editor's weight input reads as `Number("") === 0`, so a
    // table in this state is ordinary mid-edit, not a corrupt file. Rolling is
    // documented as total, and a throw here escapes into the roller.
    const src = table([
      { id: "a", text: "Alpha", weight: 0 },
      { id: "b", text: "Beta", weight: 0 },
    ]);

    const out = engine().roll(src, emptyCtx);

    expect(out.chain[0].status).toBe("unresolved");
    expect(out.notices).toHaveLength(1);
    expect(out.notices[0].message).toContain("weight of 0");
  });

  it("distinguishes a zeroed table from an empty one in the notice", () => {
    const out = engine().roll(table([]), emptyCtx);
    expect(out.notices[0].message).toContain("no entries to roll");
  });

  it("skips a zero-weighted entry but still rolls the rest", () => {
    const src = table([
      { id: "a", text: "Alpha", weight: 0 },
      { id: "b", text: "Beta", weight: 1 },
    ]);
    for (let i = 0; i < 20; i++) {
      expect(engine().roll(src, emptyCtx).finalText).toBe("Beta");
    }
  });

  it("survives a NaN weight rather than silently biasing to the last entry", () => {
    const src = table([
      { id: "a", text: "Alpha" },
      { id: "b", text: "Beta", weight: NaN },
      { id: "c", text: "Gamma" },
    ]);
    const seen = new Set<string>();
    const e = engine();
    for (let i = 0; i < 200; i++) seen.add(e.roll(src, emptyCtx).finalText);
    expect([...seen].sort()).toEqual(["Alpha", "Gamma"]);
  });

  it("reports the actual roll as the die value, not the winning band's floor", () => {
    const src = table([
      { id: "a", text: "Alpha", weight: 5 },
      { id: "b", text: "Beta", weight: 5 },
    ]);
    const e = engine();
    const values = new Set<number>();
    for (let i = 0; i < 300; i++) {
      const out = e.roll(src, emptyCtx);
      values.add(out.chain[0].dieValue!);
    }
    // Band floors would only ever be 1 and 6. A real 1d10 visits far more.
    expect(values.size).toBeGreaterThan(2);
    for (const v of values) {
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(10);
    }
  });
});
