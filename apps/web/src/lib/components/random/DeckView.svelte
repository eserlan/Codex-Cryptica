<script lang="ts">
  import type { Card, DrawOutcome, RandomSource } from "random-source-engine";
  import { DeckService } from "random-source-engine";
  import { deckService, randomSources } from "$lib/features/random";
  import type { RandomSourceStore } from "$lib/stores/random-source-store.svelte";
  import {
    diceHistory,
    type DiceHistoryStore,
  } from "$lib/stores/dice-history.svelte";
  import { fade } from "svelte/transition";

  /**
   * Drawing from a deck, with the discard pile in plain sight (#2247, FR-024).
   *
   * Draw state lives beside the deck in the vault rather than in the deck file,
   * so a draw never rewrites the authored definition and a reload — or a vault
   * carried to another machine — finds the pile as it was left (SC-007).
   */
  let {
    deck,
    service = deckService,
    sources = randomSources,
    history = diceHistory,
  }: {
    deck: RandomSource;
    service?: DeckService;
    sources?: RandomSourceStore;
    history?: DiceHistoryStore;
  } = $props();

  let remaining = $state<Card[]>([]);
  let outcome = $state<DrawOutcome | undefined>();
  let count = $state(1);
  let busy = $state(false);

  const cards = $derived(deck.cards ?? []);
  const withReplacement = $derived(
    deck.deckOptions?.drawMode === "with-replacement",
  );

  const discarded = $derived.by(() => {
    const left = new Set(remaining.map((c) => c.id));
    return cards.filter((c) => !left.has(c.id));
  });

  // Reloads whenever the deck changes identity or its cards change, so an
  // edited deck never shows a stale count.
  $effect(() => {
    const id = deck.id;
    const size = cards.length;
    void id;
    void size;
    void refresh();
  });

  async function refresh() {
    remaining = await service.remaining(deck);
  }

  async function draw() {
    if (busy || cards.length === 0) return;
    busy = true;
    try {
      const result = await service.draw(
        deck,
        count,
        sources.resolutionContext(),
      );
      outcome = result;
      await refresh();
      if (result.cards.length > 0) await record(result);
    } finally {
      busy = false;
    }
  }

  async function reshuffle() {
    busy = true;
    try {
      await service.reset(deck);
      outcome = undefined;
      await refresh();
    } finally {
      busy = false;
    }
  }

  /** Draws land in the shared roll history like any other result (FR-029). */
  async function record(result: DrawOutcome) {
    await history.addResult(
      {
        total: result.cards.length,
        parts: [],
        formula: `${result.cards.length} card${result.cards.length === 1 ? "" : "s"}`,
        timestamp: Date.now(),
      },
      "table",
      {
        label: deck.name,
        source: {
          sourceId: deck.id,
          sourceName: deck.name,
          kind: "deck",
          finalText: result.cards
            .map((c) => c.resolved.finalText || c.card.title)
            .join("\n"),
          drawnCards: result.cards.map((c) => ({
            cardId: c.card.id,
            title: c.card.title,
            reversed: c.reversed,
          })),
          spreadPositions: result.positions?.map((label, i) => ({
            label,
            cardId: result.cards[i]?.card.id ?? "",
          })),
        },
      },
    );
  }
</script>

<div
  class="flex flex-col gap-3 rounded-xl border border-theme-border bg-theme-surface p-4"
  data-testid="deck-view"
>
  <div class="flex flex-wrap items-center justify-between gap-3">
    <h3
      class="font-header text-[10px] font-bold uppercase tracking-[0.2em] text-theme-muted"
    >
      Draw
    </h3>
    <div class="flex items-center gap-2">
      <label class="flex items-center gap-1">
        <span class="font-mono text-[9px] uppercase text-theme-muted"
          >How many</span
        >
        <input
          type="number"
          min="1"
          class="w-16 rounded border border-theme-border bg-theme-bg px-2 py-1 text-center font-mono text-xs text-theme-text focus:border-theme-primary focus:outline-none"
          bind:value={count}
          data-testid="draw-count"
        />
      </label>
      <button
        type="button"
        class="flex items-center gap-2 rounded-lg border border-theme-primary/30 bg-theme-primary/10 px-3 py-1.5 font-header text-[10px] font-bold uppercase tracking-widest text-theme-primary transition-all hover:bg-theme-primary hover:text-theme-bg active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        onclick={draw}
        disabled={busy || cards.length === 0}
        data-testid="draw-cards"
      >
        <span aria-hidden="true" class="icon-[lucide--layers] h-3.5 w-3.5"
        ></span>
        Draw
      </button>
      <button
        type="button"
        class="rounded-lg border border-theme-border px-3 py-1.5 font-header text-[10px] uppercase tracking-widest text-theme-muted transition-colors hover:border-theme-primary hover:text-theme-primary disabled:opacity-40"
        onclick={reshuffle}
        disabled={busy || discarded.length === 0}
        title="Put every discarded card back and shuffle"
        data-testid="reshuffle-deck"
      >
        Reshuffle
      </button>
    </div>
  </div>

  {#if cards.length === 0}
    <p class="font-body text-xs italic text-theme-muted/70">
      Add a card and this deck can be drawn from.
    </p>
  {:else}
    <p class="font-mono text-[10px] uppercase tracking-widest text-theme-muted">
      {#if withReplacement}
        <span data-testid="deck-remaining">{cards.length}</span> cards, drawn with
        the whole deck available every time
      {:else}
        <span data-testid="deck-remaining">{remaining.length}</span> left ·
        <span data-testid="deck-discarded">{discarded.length}</span> in the discard
        pile
      {/if}
    </p>
  {/if}

  {#if outcome?.exhausted}
    <div
      class="flex flex-col gap-2 rounded border border-amber-500/40 bg-amber-500/10 p-3"
      data-testid="deck-exhausted"
    >
      <p class="font-body text-xs text-amber-600 dark:text-amber-400">
        There are not enough cards left to draw that many. Reshuffle the discard
        pile back in?
      </p>
      <div>
        <button
          type="button"
          class="rounded bg-amber-500 px-2.5 py-1 font-header text-[10px] uppercase tracking-widest text-white"
          onclick={reshuffle}
          data-testid="confirm-reshuffle"
        >
          Reshuffle
        </button>
      </div>
    </div>
  {/if}

  {#if outcome && outcome.cards.length > 0}
    <ul class="flex flex-col gap-2" in:fade={{ duration: 150 }}>
      {#each outcome.cards as drawn, index}
        <li
          class="rounded border border-theme-border bg-theme-bg p-3"
          data-testid="drawn-card"
        >
          <div class="mb-1 flex items-center gap-2">
            {#if outcome.positions?.[index]}
              <span
                class="font-mono text-[9px] uppercase tracking-widest text-theme-primary"
                data-testid="drawn-position"
              >
                {outcome.positions[index]}
              </span>
            {/if}
            <span
              class="font-header text-sm font-bold text-theme-text"
              data-testid="drawn-title"
            >
              {drawn.card.title}
            </span>
            {#if drawn.reversed}
              <span
                class="rounded bg-theme-primary/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-theme-primary"
                data-testid="drawn-reversed"
              >
                Reversed
              </span>
            {/if}
          </div>
          <p
            class="whitespace-pre-wrap font-body text-xs leading-relaxed text-theme-text"
            data-testid="drawn-body"
          >
            {drawn.resolved.finalText}
          </p>
        </li>
      {/each}
    </ul>

    {#each outcome.cards.flatMap((c) => c.resolved.notices) as notice}
      <p
        class="rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 font-body text-xs text-amber-600 dark:text-amber-400"
        data-testid="draw-notice"
      >
        {notice.message}
      </p>
    {/each}
  {/if}

  {#if discarded.length > 0 && !withReplacement}
    <details class="rounded border border-theme-border/60 p-2">
      <summary
        class="cursor-pointer font-header text-[9px] uppercase tracking-[0.2em] text-theme-muted"
      >
        Discard pile ({discarded.length})
      </summary>
      <ul class="mt-2 flex flex-wrap gap-1.5">
        {#each discarded as card}
          <li
            class="rounded bg-theme-primary/10 px-2 py-0.5 font-body text-[10px] text-theme-primary"
            data-testid="discarded-card"
          >
            {card.title || "Untitled card"}
          </li>
        {/each}
      </ul>
    </details>
  {/if}
</div>

<style>
  @reference "../../../app.css";
</style>
