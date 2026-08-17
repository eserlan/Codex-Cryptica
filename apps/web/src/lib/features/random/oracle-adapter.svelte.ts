import type {
  DrawOutcome,
  RandomSource,
  RollOutcome,
} from "random-source-engine";
import { DeckService } from "random-source-engine";
import type { RandomSourceStore } from "$lib/stores/random-source-store.svelte";
import {
  diceHistory,
  type DiceHistoryStore,
  type RandomSourceRollPayload,
} from "$lib/stores/dice-history.svelte";
import { deckService, randomSources } from ".";

/**
 * What `/table` and `/deck` talk to (#2247, FR-039).
 *
 * The Oracle executor knows nothing about the vault; this is the seam. Results
 * are written to roll history here rather than in the executor, so a roll made
 * in chat and one made in the editor land in the same place (FR-018).
 */
export interface RandomSourceOracleAdapter {
  findByName(name: string): RandomSource | undefined;
  suggestNames(name: string): string[];
  roll(
    source: RandomSource,
  ): Promise<{ text: string; record: RandomSourceRollPayload }>;
  draw(
    source: RandomSource,
    count: number,
  ): Promise<{ text: string; record: RandomSourceRollPayload }>;
}

export interface OracleAdapterDeps {
  sources?: RandomSourceStore;
  service?: DeckService;
  history?: DiceHistoryStore;
}

export function createRandomSourceOracleAdapter({
  sources = randomSources,
  service = deckService,
  history = diceHistory,
}: OracleAdapterDeps = {}): RandomSourceOracleAdapter {
  /**
   * Sources cross into the Oracle worker, where a reactive proxy cannot go.
   * Snapshotting is what makes the same store usable from both sides.
   */
  const plain = (source: RandomSource | undefined) =>
    source ? ($state.snapshot(source) as RandomSource) : undefined;

  async function record(payload: RandomSourceRollPayload, dieValue?: number) {
    await history.addResult(
      {
        total: dieValue ?? payload.drawnCards?.length ?? 0,
        parts: [],
        formula: payload.kind === "deck" ? "draw" : "table roll",
        timestamp: Date.now(),
      },
      "table",
      { label: payload.sourceName, source: payload },
    );
  }

  return {
    findByName: (name) => plain(sources.findByName(name)),
    suggestNames: (name) => sources.suggestNames(name),

    async roll(source) {
      const outcome: RollOutcome = sources.roll(source);
      const payload: RandomSourceRollPayload = {
        sourceId: source.id,
        sourceName: source.name,
        kind: "table",
        finalText: outcome.finalText,
        chain: outcome.chain,
      };
      await record(payload, outcome.chain[0]?.dieValue);
      return {
        text: describe(payload, outcome.notices.length),
        record: payload,
      };
    },

    async draw(source, count) {
      const outcome: DrawOutcome = await service.draw(
        source,
        count,
        sources.resolutionContext(),
      );

      if (outcome.empty) {
        throw new Error(`"${source.name}" has no cards.`);
      }
      if (outcome.cards.length === 0 && outcome.exhausted) {
        throw new Error(
          `"${source.name}" has no cards left. Reshuffle it on the decks page.`,
        );
      }

      const payload: RandomSourceRollPayload = {
        sourceId: source.id,
        sourceName: source.name,
        kind: "deck",
        finalText: outcome.cards
          .map(
            (c) =>
              `${c.card.title}${c.reversed ? " (reversed)" : ""}: ${c.resolved.finalText}`,
          )
          .join("\n"),
        drawnCards: outcome.cards.map((c) => ({
          cardId: c.card.id,
          title: c.card.title,
          reversed: c.reversed,
        })),
      };
      await record(payload);
      return { text: describe(payload, 0), record: payload };
    },
  };
}

/** The plain-text form, which is what a transcript stores and search reads. */
function describe(payload: RandomSourceRollPayload, notices: number): string {
  const suffix =
    notices > 0 ? "\n\n(Some references could not be resolved.)" : "";
  return `${payload.finalText}${suffix}`;
}
