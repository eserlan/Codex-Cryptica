import { describe, it, expect } from "vitest";
import { DiceEngine } from "dice-engine";
import { DeckService } from "../src/deck-service";
import { seededCrypto } from "./helpers/seeded-crypto";
import type {
  DeckState,
  RandomSource,
  ResolutionContext,
  Spread,
} from "../src/types";

class MemoryStore {
  states = new Map<string, DeckState>();
  async read(deckId: string) {
    return this.states.get(deckId);
  }
  async write(state: DeckState) {
    this.states.set(state.deckId, structuredClone(state));
  }
}

const ctx: ResolutionContext = { lookup: () => undefined };

function deckOf(count: number, allowReversals = false): RandomSource {
  return {
    id: "d1",
    name: "Deck",
    kind: "deck",
    labels: [],
    deckOptions: { drawMode: "without-replacement", allowReversals },
    cards: Array.from({ length: count }, (_, i) => ({
      id: `c${i + 1}`,
      title: `Card ${i + 1}`,
      body: `upright ${i + 1}`,
      reversedMeaning: `reversed ${i + 1}`,
    })),
  };
}

const spread: Spread = {
  id: "s1",
  name: "Three card",
  positions: ["Situation", "Complication", "Outcome"],
};

const svc = () =>
  new DeckService(new MemoryStore(), new DiceEngine(seededCrypto(29)));

describe("reversals (FR-027)", () => {
  it("shows no orientation when reversals are disabled", async () => {
    const out = await svc().draw(deckOf(4, false), 4, ctx);
    expect(out.cards.every((c) => c.reversed === false)).toBe(true);
  });

  it("uses the upright body when reversals are disabled", async () => {
    const out = await svc().draw(deckOf(3, false), 3, ctx);
    expect(
      out.cards.every((c) => c.resolved.finalText.startsWith("upright")),
    ).toBe(true);
  });

  it("produces both orientations over many draws when enabled", async () => {
    const orientations = new Set<boolean>();
    for (let seed = 0; seed < 12; seed++) {
      const service = new DeckService(
        new MemoryStore(),
        new DiceEngine(seededCrypto(seed + 1)),
      );
      const out = await service.draw(deckOf(6, true), 6, ctx);
      out.cards.forEach((c) => orientations.add(c.reversed));
    }
    expect(orientations.has(true)).toBe(true);
    expect(orientations.has(false)).toBe(true);
  });

  it("shows the meaning that matches the orientation", async () => {
    const out = await svc().draw(deckOf(6, true), 6, ctx);
    for (const drawn of out.cards) {
      const expected = drawn.reversed ? "reversed" : "upright";
      expect(drawn.resolved.finalText.startsWith(expected)).toBe(true);
    }
  });
});

describe("spreads (FR-028)", () => {
  it("fills exactly one card per position", async () => {
    const out = await svc().drawSpread(deckOf(6), spread, ctx);
    expect(out.cards).toHaveLength(3);
    expect(out.positions).toEqual(spread.positions);
  });

  it("warns before dealing when the deck cannot fill the spread", async () => {
    const out = await svc().drawSpread(deckOf(2), spread, ctx);
    expect(out.exhausted).toBe(true);
    expect(out.cards).toHaveLength(0);
  });

  it("does not deplete the deck when a spread is refused", async () => {
    const service = svc();
    const deck = deckOf(2);
    await service.drawSpread(deck, spread, ctx);
    expect(await service.remaining(deck)).toHaveLength(2);
  });

  it("never deals the same card into two positions", async () => {
    const out = await svc().drawSpread(deckOf(5), spread, ctx);
    const ids = out.cards.map((c) => c.card.id);
    expect(new Set(ids).size).toBe(3);
  });
});
