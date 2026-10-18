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

const engine = () => new RandomSourceEngine(new DiceEngine(seededCrypto(13)));

describe("unresolved references (FR-016)", () => {
  it("preserves the reference visibly instead of dropping it", () => {
    const parent = table("parent", ["A {missing} appears"]);
    const out = engine().roll(parent, ctxOf(parent));
    expect(out.finalText).toContain("{missing}");
  });

  it("never substitutes empty text for a missing target", () => {
    const parent = table("parent", ["{missing}"]);
    const out = engine().roll(parent, ctxOf(parent));
    expect(out.finalText.trim().length).toBeGreaterThan(0);
  });

  it("reports which reference is broken", () => {
    const parent = table("parent", ["A {missing} appears"]);
    const out = engine().roll(parent, ctxOf(parent));
    const notice = out.notices.find((n) => n.kind === "unresolved");
    expect(notice).toBeDefined();
    expect(notice?.message).toContain("missing");
  });

  it("marks the node as unresolved", () => {
    const parent = table("parent", ["{missing}"]);
    const out = engine().roll(parent, ctxOf(parent));
    expect(out.chain[0].children[0].status).toBe("unresolved");
  });

  it("resolves the working references in the same entry", () => {
    const known = table("known", ["ok"]);
    const parent = table("parent", ["{known} and {missing}"]);
    const out = engine().roll(parent, ctxOf(parent, known));
    expect(out.finalText).toContain("ok");
    expect(out.finalText).toContain("{missing}");
  });

  it("reports each distinct broken reference", () => {
    const parent = table("parent", ["{one} {two}"]);
    const out = engine().roll(parent, ctxOf(parent));
    expect(out.notices.filter((n) => n.kind === "unresolved")).toHaveLength(2);
  });
});
