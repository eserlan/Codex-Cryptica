import { describe, it, expect } from "vitest";
import { DiceEngine } from "dice-engine";
import { RandomSourceEngine } from "../src/engine";
import { seededCrypto } from "./helpers/seeded-crypto";
import type { RandomSource, ResolutionContext } from "../src/types";

function table(name: string, texts: string[]): RandomSource {
  return {
    id: name,
    name,
    kind: "table",
    labels: [],
    selection: { mode: "weighted" },
    entries: texts.map((text, i) => ({ id: `${name}-${i}`, text })),
  };
}

function ctxOf(...sources: RandomSource[]): ResolutionContext {
  const byName = new Map(sources.map((s) => [s.name.toLowerCase(), s]));
  return { lookup: (n) => byName.get(n.trim().toLowerCase()) };
}

const engine = () => new RandomSourceEngine(new DiceEngine(seededCrypto(11)));

describe("cycle safety (FR-014, SC-006)", () => {
  it("terminates on a direct self-reference", () => {
    const a = table("a", ["loop {a}"]);
    const out = engine().roll(a, ctxOf(a));
    expect(out.finalText).toContain("loop");
    expect(out.notices.some((n) => n.kind === "cycle")).toBe(true);
  });

  it("terminates on an A → B → A loop", () => {
    const a = table("a", ["a{b}"]);
    const b = table("b", ["b{a}"]);
    const out = engine().roll(a, ctxOf(a, b));
    expect(out.notices.some((n) => n.kind === "cycle")).toBe(true);
    expect(out.finalText.length).toBeGreaterThan(0);
  });

  it("marks the offending node as a cycle rather than throwing", () => {
    const a = table("a", ["{a}"]);
    const out = engine().roll(a, ctxOf(a));
    const cut = out.chain[0].children[0];
    expect(cut.status).toBe("cycle");
  });

  it("names the looping source in the notice", () => {
    const a = table("a", ["{a}"]);
    const out = engine().roll(a, ctxOf(a));
    const notice = out.notices.find((n) => n.kind === "cycle");
    expect(notice?.message.toLowerCase()).toContain("loop");
    expect(notice?.sourceName).toBe("a");
  });

  it("still resolves the non-cyclic parts of the same entry", () => {
    const a = table("a", ["{b} and {a}"]);
    const b = table("b", ["beta"]);
    const out = engine().roll(a, ctxOf(a, b));
    expect(out.finalText).toContain("beta");
  });

  it("allows the same source twice in sequence, which is not a cycle", () => {
    const leaf = table("leaf", ["x"]);
    const parent = table("parent", ["{leaf} {leaf}"]);
    const out = engine().roll(parent, ctxOf(parent, leaf));
    expect(out.finalText).toBe("x x");
    expect(out.notices).toHaveLength(0);
  });

  it("completes quickly rather than hanging (SC-006)", () => {
    const a = table("a", ["{b}"]);
    const b = table("b", ["{a}"]);
    const start = Date.now();
    engine().roll(a, ctxOf(a, b));
    expect(Date.now() - start).toBeLessThan(1000);
  });
});
