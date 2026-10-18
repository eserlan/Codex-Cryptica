import { describe, it, expect } from "vitest";
import { emptyDeckState, prune, remainingCards } from "../src/deck-state";
import type { Card, DeckState, RandomSource } from "../src/types";

const cards: Card[] = [
  { id: "c1", title: "One", body: "one" },
  { id: "c2", title: "Two", body: "two" },
  { id: "c3", title: "Three", body: "three" },
];

const deck: RandomSource = {
  id: "d1",
  name: "Deck",
  kind: "deck",
  labels: [],
  cards,
  deckOptions: { drawMode: "without-replacement", allowReversals: false },
};

describe("deck state", () => {
  it("treats a missing state file as an untouched deck", () => {
    const state = emptyDeckState(deck.id);
    expect(state.drawn).toEqual([]);
    expect(remainingCards(deck, undefined)).toHaveLength(3);
  });

  it("removes drawn cards from the remaining deck", () => {
    const state: DeckState = { deckId: "d1", drawn: ["c2"], updatedAt: 0 };
    expect(remainingCards(deck, state).map((c) => c.id)).toEqual(["c1", "c3"]);
  });

  it("returns an empty remainder once every card is drawn", () => {
    const state: DeckState = {
      deckId: "d1",
      drawn: ["c1", "c2", "c3"],
      updatedAt: 0,
    };
    expect(remainingCards(deck, state)).toHaveLength(0);
  });

  it("ignores drawn ids for cards that no longer exist", () => {
    const state: DeckState = {
      deckId: "d1",
      drawn: ["c2", "gone"],
      updatedAt: 0,
    };
    expect(remainingCards(deck, state).map((c) => c.id)).toEqual(["c1", "c3"]);
  });

  it("prunes stale ids so a deleted card cannot corrupt the pile", () => {
    const state: DeckState = {
      deckId: "d1",
      drawn: ["c2", "gone"],
      updatedAt: 0,
    };
    expect(prune(deck, state).drawn).toEqual(["c2"]);
  });

  it("leaves a clean state untouched when pruning", () => {
    const state: DeckState = { deckId: "d1", drawn: ["c1"], updatedAt: 5 };
    expect(prune(deck, state).drawn).toEqual(["c1"]);
  });
});
