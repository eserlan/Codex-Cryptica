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

const engine = () => new RandomSourceEngine(new DiceEngine(seededCrypto(3)));

describe("reference resolution (FR-012, FR-013)", () => {
  it("replaces a reference with a result from the referenced table", () => {
    const creature = table("creature", ["troll"]);
    const parent = table("parent", ["A {creature} appears"]);
    const out = engine().roll(parent, ctxOf(creature, parent));
    expect(out.finalText).toBe("A troll appears");
  });

  it("resolves every reference in one entry into continuous text", () => {
    const creature = table("creature", ["troll"]);
    const treasure = table("treasure", ["a coin hoard"]);
    const parent = table("parent", ["A {creature} guarding {treasure}"]);
    const out = engine().roll(parent, ctxOf(creature, treasure, parent));
    expect(out.finalText).toBe("A troll guarding a coin hoard");
  });

  it("records which source produced each fragment (SC-009)", () => {
    const creature = table("creature", ["troll"]);
    const parent = table("parent", ["A {creature} appears"]);
    const out = engine().roll(parent, ctxOf(creature, parent));
    const root = out.chain[0];
    expect(root.sourceName).toBe("parent");
    expect(root.children).toHaveLength(1);
    expect(root.children[0].sourceName).toBe("creature");
    expect(root.children[0].text).toBe("troll");
  });

  it("resolves nested references several levels deep", () => {
    const c = table("c", ["deep"]);
    const b = table("b", ["<{c}>"]);
    const a = table("a", ["[{b}]"]);
    const out = engine().roll(a, ctxOf(a, b, c));
    expect(out.finalText).toBe("[<deep>]");
    expect(out.chain[0].children[0].children[0].text).toBe("deep");
  });

  it("is case-insensitive when matching a source name", () => {
    const creature = table("Creature", ["troll"]);
    const parent = table("parent", ["A {creature} appears"]);
    const out = engine().roll(parent, ctxOf(creature, parent));
    expect(out.finalText).toBe("A troll appears");
  });

  it("leaves text without references untouched", () => {
    const parent = table("parent", ["An abandoned shrine"]);
    const out = engine().roll(parent, ctxOf(parent));
    expect(out.finalText).toBe("An abandoned shrine");
    expect(out.notices).toHaveLength(0);
  });
});

describe("deck references do not deplete (FR-012a)", () => {
  const deck: RandomSource = {
    id: "d",
    name: "oracle",
    kind: "deck",
    labels: [],
    deckOptions: { drawMode: "without-replacement", allowReversals: false },
    cards: [
      { id: "c1", title: "One", body: "one" },
      { id: "c2", title: "Two", body: "two" },
    ],
  };

  it("resolves a reference naming a deck", () => {
    const parent = table("parent", ["Draw: {oracle}"]);
    const out = engine().roll(parent, ctxOf(deck, parent));
    expect(["Draw: one", "Draw: two"]).toContain(out.finalText);
    expect(out.chain[0].children[0].sourceKind).toBe("deck");
  });

  it("never mutates the deck, however many times it is resolved", () => {
    const parent = table("parent", ["{oracle}"]);
    const e = engine();
    const before = JSON.stringify(deck);
    for (let i = 0; i < 20; i++) e.roll(parent, ctxOf(deck, parent));
    expect(JSON.stringify(deck)).toBe(before);
  });
});
