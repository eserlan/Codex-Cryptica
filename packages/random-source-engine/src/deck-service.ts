import { DiceEngine, diceEngine as defaultDice } from "dice-engine";
import type {
  Card,
  DeckState,
  RandomSource,
  ResolutionContext,
  RollOutcome,
  Spread,
} from "./types";
import { RandomSourceEngine } from "./engine";
import { emptyDeckState, prune, remainingCards } from "./deck-state";
import { selectIndex } from "./selection";

/** Persistence seam over the per-deck state file. Mocked in tests. */
export interface DeckStateStore {
  read(deckId: string): Promise<DeckState | undefined>;
  write(state: DeckState): Promise<void>;
}

export interface DrawnCard {
  card: Card;
  reversed: boolean;
  /** The card's body with any `{reference}` tokens resolved. */
  resolved: RollOutcome;
}

export interface DrawOutcome {
  cards: DrawnCard[];
  /** Present for spread draws. */
  positions?: string[];
  /** The request could not be filled from the remaining cards. */
  exhausted: boolean;
  /** The deck has no cards authored at all — a different problem entirely. */
  empty: boolean;
}

/**
 * Drawing is the only mutating operation in this feature.
 *
 * Writes are serialised through a promise chain so two rapid draws cannot
 * interleave read-modify-write and hand out the same card twice — the one
 * genuine concurrency case in single-player use.
 */
export class DeckService {
  private queue: Promise<unknown> = Promise.resolve();

  private engine: RandomSourceEngine;

  constructor(
    private store: DeckStateStore,
    private dice: DiceEngine = defaultDice,
    engine?: RandomSourceEngine,
    private now: () => number = Date.now,
  ) {
    // The engine defaults to one sharing this service's dice, so a seeded
    // provider makes both card selection and reference resolution
    // deterministic together.
    this.engine = engine ?? new RandomSourceEngine(dice);
  }

  /** Draws `count` cards, respecting the deck's configured draw mode. */
  draw(
    deck: RandomSource,
    count: number,
    ctx: ResolutionContext,
  ): Promise<DrawOutcome> {
    return this.serialise(() => this.drawNow(deck, count, ctx));
  }

  /**
   * Draws into a spread's named positions.
   *
   * Capacity is checked before anything is dealt, so a spread is never
   * partially filled (FR-028).
   */
  drawSpread(
    deck: RandomSource,
    spread: Spread,
    ctx: ResolutionContext,
  ): Promise<DrawOutcome> {
    return this.serialise(async () => {
      const need = spread.positions.length;
      const available = await this.remainingNow(deck);
      if (
        deck.deckOptions?.drawMode === "without-replacement" &&
        available.length < need
      ) {
        return {
          cards: [],
          positions: spread.positions,
          exhausted: true,
          empty: (deck.cards ?? []).length === 0,
        };
      }
      const outcome = await this.drawNow(deck, need, ctx);
      return { ...outcome, positions: spread.positions };
    });
  }

  /** Returns every discarded card to the deck (FR-025). */
  reset(deck: RandomSource): Promise<void> {
    return this.serialise(async () => {
      await this.store.write({
        deckId: deck.id,
        drawn: [],
        updatedAt: this.now(),
      });
    });
  }

  /** Cards still available to draw. */
  remaining(deck: RandomSource): Promise<Card[]> {
    return this.serialise(() => this.remainingNow(deck));
  }

  private async remainingNow(deck: RandomSource): Promise<Card[]> {
    const state = await this.store.read(deck.id);
    return remainingCards(deck, state);
  }

  private async drawNow(
    deck: RandomSource,
    count: number,
    ctx: ResolutionContext,
  ): Promise<DrawOutcome> {
    const all = deck.cards ?? [];
    if (all.length === 0) {
      return { cards: [], exhausted: false, empty: true };
    }

    const withReplacement = deck.deckOptions?.drawMode === "with-replacement";
    const allowReversals = deck.deckOptions?.allowReversals ?? false;

    if (withReplacement) {
      const picked: Card[] = [];
      for (let i = 0; i < count; i++) {
        picked.push(
          all[
            selectIndex(
              all.map(() => 1),
              this.dice,
            ).index
          ],
        );
      }
      return {
        cards: picked.map((c) => this.present(c, allowReversals, ctx)),
        exhausted: false,
        empty: false,
      };
    }

    const state = prune(
      deck,
      (await this.store.read(deck.id)) ?? emptyDeckState(deck.id),
    );
    const available = remainingCards(deck, state);

    const picked: Card[] = [];
    const pool = [...available];
    while (picked.length < count && pool.length > 0) {
      const { index } = selectIndex(
        pool.map(() => 1),
        this.dice,
      );
      picked.push(pool.splice(index, 1)[0]);
    }

    // Nothing dealt means nothing to persist — an exhausted deck must not
    // rewrite state on every failed attempt.
    if (picked.length > 0) {
      await this.store.write({
        deckId: deck.id,
        drawn: [...state.drawn, ...picked.map((c) => c.id)],
        updatedAt: this.now(),
      });
    }

    return {
      cards: picked.map((c) => this.present(c, allowReversals, ctx)),
      exhausted: picked.length < count,
      empty: false,
    };
  }

  /** Applies orientation and resolves references in the card's text. */
  private present(
    card: Card,
    allowReversals: boolean,
    ctx: ResolutionContext,
  ): DrawnCard {
    const reversed =
      allowReversals && selectIndex([1, 1], this.dice).index === 1;
    const text =
      reversed && card.reversedMeaning ? card.reversedMeaning : card.body;
    const asSource: RandomSource = {
      id: card.id,
      name: card.title,
      kind: "table",
      labels: [],
      selection: { mode: "weighted" },
      entries: [{ id: card.id, text }],
    };
    return { card, reversed, resolved: this.engine.roll(asSource, ctx) };
  }

  /** Serialises every mutating operation against this service instance. */
  private serialise<T>(op: () => Promise<T>): Promise<T> {
    const next = this.queue.then(op, op);
    this.queue = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }
}

/**
 * Convenience constructor for the app layer.
 *
 * There is no module-level singleton here, unlike the other engines: a
 * DeckService is meaningless without a store, and the store is vault-scoped.
 */
export function createDeckService(store: DeckStateStore): DeckService {
  return new DeckService(store);
}
