import type { Card, DeckState, RandomSource } from "./types";

/**
 * Deck state helpers.
 *
 * State is a plain per-deck record: the ids currently in the discard pile, and
 * nothing else. There is no merge rule, device identity, or generation counter,
 * because Google Drive transfer is an explicit whole-vault push/pull rather
 * than live sync — two devices are never holding the same deck at once (R3).
 */

export function emptyDeckState(deckId: string): DeckState {
  return { deckId, drawn: [], updatedAt: 0 };
}

/** Cards still available to draw. A missing state means an untouched deck. */
export function remainingCards(
  deck: RandomSource,
  state: DeckState | undefined,
): Card[] {
  const cards = deck.cards ?? [];
  if (!state || state.drawn.length === 0) return [...cards];
  const drawn = new Set(state.drawn);
  return cards.filter((c) => !drawn.has(c.id));
}

/**
 * Drops ids for cards that no longer exist.
 *
 * Deleting a card would otherwise leave an id stranded in the pile forever,
 * quietly shrinking the deck by one on every reset cycle.
 */
export function prune(deck: RandomSource, state: DeckState): DeckState {
  const known = new Set((deck.cards ?? []).map((c) => c.id));
  const drawn = state.drawn.filter((id) => known.has(id));
  return drawn.length === state.drawn.length ? state : { ...state, drawn };
}
