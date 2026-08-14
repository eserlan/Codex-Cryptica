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
