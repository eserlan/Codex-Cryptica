<script lang="ts">
  import type {
    Card,
    DrawOutcome,
    RandomSource,
    Spread,
  } from "random-source-engine";
  import { DeckService } from "random-source-engine";
  import { deckService, randomSources } from "$lib/features/random";
  import type { RandomSourceStore } from "$lib/stores/random-source-store.svelte";
  import {
    diceHistory,
    type DiceHistoryStore,
  } from "$lib/stores/dice-history.svelte";
  import { addToOracleChatInput } from "$lib/components/oracle/oracle-chat-input";
  import { mapSession } from "$lib/stores/map-session.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";
  import { copyTextToClipboard } from "$lib/utils/share-link";
  import { systemIdGenerator, type IdGenerator } from "$lib/utils/runtime-deps";
  import CardImage from "./CardImage.svelte";
  import { fade } from "svelte/transition";
  import { playToolsBridge } from "$lib/services/play-tools-bridge";

  /**
   * Drawing from a deck, with the discard pile in plain sight (#2247, FR-024).
   *
   * Draw state lives beside the deck in the vault rather than in the deck file,
   * so a draw never rewrites the authored definition and a reload — or a vault
   * carried to another machine — finds the pile as it was left (SC-007).
   */
  let {
    deck,
    onChange,
    service = deckService,
    sources = randomSources,
    history = diceHistory,
    idGenerator = systemIdGenerator,
    session = mapSession,
    addToChat = async (text) => {
      session.sendChatMessage(text);
      playToolsBridge.post({ type: "VTT_CHAT_MESSAGE", content: text });
      addToOracleChatInput(text);
    },
    copyText = async (text) => {
      const copied = await copyTextToClipboard(text, navigator.clipboard);
      if (!copied) throw new Error("Clipboard copy is unavailable.");
    },
  }: {
    deck: RandomSource;
    /** Present when spreads can be edited here; absent in a read-only view. */
    onChange?: (next: RandomSource) => void;
    service?: DeckService;
    sources?: RandomSourceStore;
    history?: DiceHistoryStore;
    idGenerator?: IdGenerator;
    session?: typeof mapSession;
    addToChat?: (text: string) => Promise<void>;
    copyText?: (text: string) => Promise<void>;
  } = $props();

  let remaining = $state<Card[]>([]);
  let outcome = $state<DrawOutcome | undefined>();
  let count = $state(1);
  let busy = $state(false);
  let isAddingToChat = $state(false);
  let copied = $state(false);

  const cards = $derived(deck.cards ?? []);
  const spreads = $derived(deck.spreads ?? []);
  const withReplacement = $derived(
    deck.deckOptions?.drawMode === "with-replacement",
  );
  const resultText = $derived(
    outcome?.cards
      .map((drawn, index) => {
        const position = outcome?.positions?.[index];
        const title = `${drawn.card.title}${drawn.reversed ? " (reversed)" : ""}`;
        const text = drawn.resolved.finalText || drawn.card.title;
        return `${position ? `${position}: ` : ""}${title}: ${text}`;
      })
      .join("\n") ?? "",
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
      copied = false;
      await refresh();
      if (result.cards.length > 0) await record(result);
    } finally {
      busy = false;
    }
  }

  /** Deals a named layout. Capacity is checked before anything is dealt. */
  async function drawSpread(spread: Spread) {
    if (busy || cards.length === 0) return;
    busy = true;
    try {
      const result = await service.drawSpread(
        deck,
        spread,
        sources.resolutionContext(),
      );
      outcome = result;
      copied = false;
      await refresh();
      if (result.cards.length > 0) await record(result);
    } finally {
      busy = false;
    }
  }

  function addSpread() {
    onChange?.({
      ...deck,
      spreads: [
        ...spreads,
        {
          id: idGenerator.uuid(),
          name: "New spread",
          positions: ["Past", "Present", "Future"],
        },
      ],
    });
  }

  function patchSpread(id: string, changes: Partial<Spread>) {
    onChange?.({
      ...deck,
      spreads: spreads.map((s) => (s.id === id ? { ...s, ...changes } : s)),
    });
  }

  function removeSpread(id: string) {
    onChange?.({ ...deck, spreads: spreads.filter((s) => s.id !== id) });
  }

  async function reshuffle() {
    // Guarded like draw() and drawSpread(): without it, a double-click starts
    // two resets, and whichever finishes first clears `busy` while the other is
    // still running — re-enabling Draw mid-operation.
    if (busy) return;
    busy = true;
    try {
      await service.reset(deck);
      outcome = undefined;
      copied = false;
      await refresh();
    } finally {
      busy = false;
    }
  }

  async function addResultToChat() {
    if (!resultText || isAddingToChat) return;
    isAddingToChat = true;
    try {
      await addToChat(resultText);
      notificationStore.notify("Result added to chat input.", "success");
    } catch (error) {
      console.error("[RandomSources] Could not add result to chat", error);
      notificationStore.notify(
        "That result could not be added to chat.",
        "error",
      );
    } finally {
      isAddingToChat = false;
    }
  }

  async function copyResult() {
    if (!resultText) return;
    try {
      await copyText(resultText);
      copied = true;
      notificationStore.notify("Result copied to clipboard.", "success");
    } catch (error) {
      console.error("[RandomSources] Could not copy result", error);
      notificationStore.notify("That result could not be copied.", "error");
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
          disabled={busy}
          data-testid="confirm-reshuffle"
        >
          Reshuffle
        </button>
      </div>
    </div>
  {/if}

  {#if outcome && outcome.cards.length > 0}
    <!-- A spread is a layout, not a list: each card sits in its position, with
         the position named beside it (FR-028). -->
    {@const single = !outcome.positions && outcome.cards.length === 1}
    <ul
      class="{single
        ? 'flex justify-center'
        : 'grid grid-cols-[repeat(auto-fit,minmax(13rem,1fr))]'} gap-3"
      in:fade={{ duration: 150 }}
      data-testid={outcome.positions ? "spread-layout" : "draw-results"}
    >
      {#each outcome.cards as drawn, index}
        <li
          class="rounded border border-theme-border bg-theme-bg p-3 {single
            ? 'w-full max-w-sm'
            : ''}"
          data-testid="drawn-card"
        >
          {#if outcome.positions?.[index]}
            <span
              class="mb-1 block font-mono text-[9px] uppercase tracking-widest text-theme-primary"
              data-testid="drawn-position"
            >
              {outcome.positions[index]}
            </span>
          {/if}
          <!-- A drawn card is presented as a card: the art at full width, its
               name underneath the way a name plate sits on a tarot card, and
               the meaning below that. Click the art for it full size. -->
          <div class="flex flex-col gap-2">
            <CardImage
              path={drawn.card.imagePath}
              alt="Picture on {drawn.card.title}"
              title={drawn.card.title}
              zoomable
              autoZoom={single}
              className="aspect-[5/7] w-full rounded-lg border border-theme-border/60 object-cover shadow-md {drawn.reversed
                ? 'rotate-180'
                : ''}"
            />
            <div class="min-w-0">
              <div
                class="flex flex-wrap items-center justify-center gap-2 text-center"
              >
                <span
                  class="font-header {single
                    ? 'text-base'
                    : 'text-sm'} font-bold text-theme-text"
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
              {#if drawn.resolved.finalText.trim()}
                <p
                  class="mt-1.5 whitespace-pre-wrap font-body text-xs leading-relaxed text-theme-text"
                  data-testid="drawn-body"
                >
                  {drawn.resolved.finalText}
                </p>
              {/if}
            </div>
          </div>
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

    <div class="flex flex-wrap gap-2 border-t border-theme-border/40 pt-3">
      <button
        type="button"
        class="flex items-center gap-1.5 rounded border border-theme-border px-2.5 py-1 font-header text-[9px] uppercase tracking-widest text-theme-muted transition-colors hover:border-theme-primary hover:text-theme-primary disabled:cursor-not-allowed disabled:opacity-40"
        onclick={addResultToChat}
        disabled={isAddingToChat}
        aria-busy={isAddingToChat}
        data-testid="add-draw-result-to-chat"
      >
        <span
          aria-hidden="true"
          class="icon-[lucide--message-square-plus] h-3.5 w-3.5"
        ></span>
        {isAddingToChat ? "Adding…" : "Add to chat"}
      </button>
      <button
        type="button"
        class="flex items-center gap-1.5 rounded border border-theme-border px-2.5 py-1 font-header text-[9px] uppercase tracking-widest text-theme-muted transition-colors hover:border-theme-primary hover:text-theme-primary"
        onclick={copyResult}
        data-testid="copy-draw-result"
      >
        <span aria-hidden="true" class="icon-[lucide--copy] h-3.5 w-3.5"></span>
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  {/if}

  {#if spreads.length > 0 || onChange}
    <div class="flex flex-col gap-2 border-t border-theme-border/40 pt-3">
      <div class="flex items-center justify-between">
        <h4
          class="font-header text-[9px] font-bold uppercase tracking-[0.2em] text-theme-muted"
        >
          Spreads
        </h4>
        {#if onChange}
          <button
            type="button"
            class="rounded border border-theme-border px-2 py-0.5 font-header text-[9px] uppercase tracking-widest text-theme-text transition-colors hover:border-theme-primary hover:text-theme-primary"
            onclick={addSpread}
            data-testid="add-spread"
          >
            Add spread
          </button>
        {/if}
      </div>

      {#each spreads as spread (spread.id)}
        <div class="flex flex-wrap items-center gap-2" data-testid="spread-row">
          {#if onChange}
            <input
              aria-label="Name of this spread"
              class="w-40 rounded border border-theme-border bg-theme-bg px-2 py-1 font-header text-xs text-theme-text focus:border-theme-primary focus:outline-none"
              value={spread.name}
              oninput={(e) =>
                patchSpread(spread.id, { name: e.currentTarget.value })}
              data-testid="spread-name"
            />
            <input
              aria-label="Positions in {spread.name}, separated by commas"
              placeholder="Past, Present, Future"
              class="min-w-[12rem] flex-1 rounded border border-theme-border bg-theme-bg px-2 py-1 font-body text-xs text-theme-text focus:border-theme-primary focus:outline-none"
              value={spread.positions.join(", ")}
              oninput={(e) =>
                patchSpread(spread.id, {
                  positions: e.currentTarget.value
                    .split(",")
                    .map((p) => p.trim())
                    .filter(Boolean),
                })}
              data-testid="spread-positions"
            />
          {:else}
            <span class="font-header text-xs text-theme-text"
              >{spread.name}</span
            >
            <span class="font-mono text-[10px] text-theme-muted"
              >{spread.positions.join(" · ")}</span
            >
          {/if}
          <button
            type="button"
            class="rounded border border-theme-primary/30 bg-theme-primary/10 px-2.5 py-1 font-header text-[9px] uppercase tracking-widest text-theme-primary transition-all hover:bg-theme-primary hover:text-theme-bg disabled:opacity-40"
            onclick={() => drawSpread(spread)}
            disabled={busy || spread.positions.length === 0}
            data-testid="draw-spread"
          >
            Deal {spread.positions.length}
          </button>
          {#if onChange}
            <button
              type="button"
              class="rounded p-1 text-theme-muted transition-colors hover:text-red-500"
              onclick={() => removeSpread(spread.id)}
              aria-label="Delete the {spread.name} spread"
            >
              <span
                aria-hidden="true"
                class="icon-[lucide--trash-2] h-3.5 w-3.5"
              ></span>
            </button>
          {/if}
        </div>
      {/each}
    </div>
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
            class="overflow-hidden rounded bg-theme-primary/10 text-[10px] text-theme-primary"
            data-testid="discarded-card"
          >
            <!-- The pill itself is the previewer: a thumbnail here is too small
                 to read as art, so the whole name is what opens the picture. -->
            <CardImage
              path={card.imagePath}
              alt="Picture on {card.title}"
              title={card.title}
              zoomable
            >
              <span class="block px-2 py-0.5 font-body"
                >{card.title || "Untitled card"}</span
              >
            </CardImage>
          </li>
        {/each}
      </ul>
    </details>
  {/if}
</div>

<style>
  @reference "../../../app.css";
</style>
