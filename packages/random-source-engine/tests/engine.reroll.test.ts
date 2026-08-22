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

const engine = () => new RandomSourceEngine(new DiceEngine(seededCrypto(21)));

describe("rerollFragment (FR-019)", () => {
  const creature = table("creature", ["troll"]);
  const treasure = table("treasure", ["gold", "silver", "copper", "iron"]);
  const parent = table("parent", ["A {creature} guarding {treasure}"]);
  const ctx = ctxOf(creature, treasure, parent);

  it("leaves the untouched sibling fragment alone", () => {
    const e = engine();
    const first = e.roll(parent, ctx);
    const next = e.rerollFragment(first, [0, 1], ctx);
    expect(next.chain[0].children[0].text).toBe("troll");
  });

  it("recomposes the parent text around the new fragment", () => {
    const e = engine();
    const first = e.roll(parent, ctx);
    const next = e.rerollFragment(first, [0, 1], ctx);
    expect(next.finalText.startsWith("A troll guarding ")).toBe(true);
    const word = next.finalText.replace("A troll guarding ", "");
    expect(["gold", "silver", "copper", "iron"]).toContain(word);
  });

  it("does not mutate the original outcome", () => {
    const e = engine();
    const first = e.roll(parent, ctx);
    const before = first.finalText;
    e.rerollFragment(first, [0, 1], ctx);
    expect(first.finalText).toBe(before);
  });

  it("returns the outcome unchanged for an empty path", () => {
    const e = engine();
    const first = e.roll(parent, ctx);
    expect(e.rerollFragment(first, [], ctx)).toBe(first);
  });

  it("returns the outcome unchanged for an out-of-range path", () => {
    const e = engine();
    const first = e.roll(parent, ctx);
    expect(e.rerollFragment(first, [0, 99], ctx)).toBe(first);
  });

  it("re-rolls the whole result when given the root path", () => {
    const e = engine();
    const first = e.roll(parent, ctx);
    const next = e.rerollFragment(first, [0], ctx);
    expect(next.finalText).toContain("A troll guarding");
  });

  it("never depletes a referenced deck across repeated re-rolls (FR-012a)", () => {
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
    const withDeck = table("p2", ["Draw {oracle}"]);
    const deckCtx = ctxOf(deck, withDeck);
    const e = engine();
    const snapshot = JSON.stringify(deck);
    let outcome = e.roll(withDeck, deckCtx);
    for (let i = 0; i < 20; i++) {
      outcome = e.rerollFragment(outcome, [0, 0], deckCtx);
    }
    expect(JSON.stringify(deck)).toBe(snapshot);
  });
});

describe("rerollFragment cycle guard", () => {
  it("carries the ancestor path into the re-roll, so the loop is cut at the same place a fresh roll cuts it", () => {
    // "outer" expands "inner", and "inner" points back at "outer". Re-rolling
    // the inner fragment used to start from an empty visited set, so "outer"
    // looked unvisited and expanded one extra time before the loop was caught
    // — the re-rolled fragment came back longer than the original.
    const outer = table("outer", ["outer holds {inner}"]);
    const inner = table("inner", ["inner holds {outer}"]);
    const ctx = ctxOf(outer, inner);

    const e = engine();
    const first = e.roll(outer, ctx);
    expect(first.notices.map((n) => n.kind)).toContain("cycle");

    // Path [0, 0] is the "inner" child of the top-level "outer" node.
    const next = e.rerollFragment(first, [0, 0], ctx);
    const rerolled = next.chain[0].children[0];

    expect(rerolled.sourceName).toBe("inner");
    expect(rerolled.text).toBe("inner holds {outer}");
    // The giveaway for a reset visited set: "outer" expanding a second time.
    expect(rerolled.text).not.toContain("outer holds");
    expect(rerolled.children[0].status).toBe("cycle");
    expect(rerolled.children[0].sourceName).toBe("outer");
  });
});
