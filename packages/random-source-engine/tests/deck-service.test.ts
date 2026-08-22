import { describe, it, expect } from "vitest";
import { DiceEngine } from "dice-engine";
import { DeckService } from "../src/deck-service";
import { seededCrypto } from "./helpers/seeded-crypto";
import type { DeckState, RandomSource, ResolutionContext } from "../src/types";

/** In-memory DeckStateStore standing in for the vault-backed one. */
class MemoryStore {
  states = new Map<string, DeckState>();
  writes = 0;

  async read(deckId: string): Promise<DeckState | undefined> {
    return this.states.get(deckId);
  }

  async write(state: DeckState): Promise<void> {
    this.writes++;
    this.states.set(state.deckId, structuredClone(state));
  }
}

function makeDeck(
  count: number,
  drawMode: "with-replacement" | "without-replacement" = "without-replacement",
): RandomSource {
  return {
    id: "d1",
    name: "Deck",
    kind: "deck",
    labels: [],
    deckOptions: { drawMode, allowReversals: false },
    cards: Array.from({ length: count }, (_, i) => ({
      id: `c${i + 1}`,
      title: `Card ${i + 1}`,
      body: `body ${i + 1}`,
    })),
  };
}

const ctx: ResolutionContext = { lookup: () => undefined };

function service(store = new MemoryStore(), now?: () => number) {
  return {
    store,
    svc: new DeckService(
      store,
      new DiceEngine(seededCrypto(17)),
      undefined,
      now,
    ),
  };
}

describe("drawing without replacement (FR-023)", () => {
  it("never returns the same card twice across a session", async () => {
    const { svc } = service();
    const deck = makeDeck(5);
    const seen = new Set<string>();
    for (let i = 0; i < 5; i++) {
      const out = await svc.draw(deck, 1, ctx);
      const id = out.cards[0].card.id;
      expect(seen.has(id)).toBe(false);
      seen.add(id);
    }
    expect(seen.size).toBe(5);
  });

  it("never repeats within a single multi-card draw", async () => {
    const { svc } = service();
    const out = await svc.draw(makeDeck(6), 4, ctx);
    const ids = out.cards.map((c) => c.card.id);
    expect(new Set(ids).size).toBe(4);
  });

  it("does not collide across two back-to-back draws", async () => {
    const { svc } = service();
    const deck = makeDeck(6);
    const [a, b] = await Promise.all([
      svc.draw(deck, 3, ctx),
      svc.draw(deck, 3, ctx),
    ]);
    const ids = [...a.cards, ...b.cards].map((c) => c.card.id);
    expect(new Set(ids).size).toBe(6);
  });

  it("moves drawn cards to the discard pile", async () => {
    const { svc, store } = service();
    const deck = makeDeck(4);
    await svc.draw(deck, 2, ctx);
    expect((await store.read("d1"))!.drawn).toHaveLength(2);
  });

  it("reports the remaining cards", async () => {
    const { svc } = service();
    const deck = makeDeck(4);
    await svc.draw(deck, 3, ctx);
    expect(await svc.remaining(deck)).toHaveLength(1);
  });
});

describe("drawing with replacement (FR-022)", () => {
  it("leaves the discard pile untouched", async () => {
    const { svc, store } = service();
    const deck = makeDeck(3, "with-replacement");
    await svc.draw(deck, 3, ctx);
    const state = await store.read("d1");
    expect(state?.drawn ?? []).toHaveLength(0);
  });

  it("never runs out", async () => {
    const { svc } = service();
    const deck = makeDeck(2, "with-replacement");
    for (let i = 0; i < 10; i++) {
      const out = await svc.draw(deck, 1, ctx);
      expect(out.exhausted).toBe(false);
      expect(out.cards).toHaveLength(1);
    }
  });
});

describe("exhaustion (FR-026)", () => {
  it("flags exhaustion when the request cannot be filled", async () => {
    const { svc } = service();
    const deck = makeDeck(2);
    const out = await svc.draw(deck, 5, ctx);
    expect(out.exhausted).toBe(true);
    expect(out.cards).toHaveLength(2);
  });

  it("returns nothing and does not mutate once fully drawn", async () => {
    const { svc, store } = service();
    const deck = makeDeck(2);
    await svc.draw(deck, 2, ctx);
    const writesBefore = store.writes;
    const out = await svc.draw(deck, 1, ctx);
    expect(out.cards).toHaveLength(0);
    expect(out.exhausted).toBe(true);
    expect(store.writes).toBe(writesBefore);
  });

  it("distinguishes a deck with no cards authored from an exhausted one", async () => {
    const { svc } = service();
    const out = await svc.draw(makeDeck(0), 1, ctx);
    expect(out.empty).toBe(true);
    expect(out.exhausted).toBe(false);
  });
});

describe("reset and shuffle (FR-025)", () => {
  it("returns every discarded card", async () => {
    const { svc } = service();
    const deck = makeDeck(4);
    await svc.draw(deck, 3, ctx);
    await svc.reset(deck);
    expect(await svc.remaining(deck)).toHaveLength(4);
  });

  it("clears the discard pile", async () => {
    const mockTime = 1234567890;
    const { svc, store } = service(new MemoryStore(), () => mockTime);
    const deck = makeDeck(4);
    await svc.draw(deck, 2, ctx);
    await svc.reset(deck);
    const finalState = await store.read("d1");
    expect(finalState!.drawn).toEqual([]);
    expect(finalState!.updatedAt).toBe(mockTime);
  });
});

describe("card body references", () => {
  it("resolves references in a drawn card's body (FR-012)", async () => {
    const { svc } = service();
    const creature: RandomSource = {
      id: "t",
      name: "creature",
      kind: "table",
      labels: [],
      selection: { mode: "weighted" },
      entries: [{ id: "e", text: "troll" }],
    };
    const deck: RandomSource = {
      ...makeDeck(1),
      cards: [{ id: "c1", title: "Card", body: "A {creature} arrives" }],
    };
    const out = await svc.draw(deck, 1, {
      lookup: (n) => (n.toLowerCase() === "creature" ? creature : undefined),
    });
    expect(out.cards[0].resolved.finalText).toBe("A troll arrives");
  });
});
