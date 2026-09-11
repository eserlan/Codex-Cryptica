<script lang="ts">
  import CardImage from "$lib/components/random/CardImage.svelte";
  import type { ChatCardPayload } from "../../../types/vtt";

  let { cards = [] }: { cards: ChatCardPayload[] } = $props();

  const single = $derived(cards.length === 1);
</script>

<div class="flex flex-col gap-2.5 my-1" data-testid="vtt-chat-cards">
  {#each cards as card, _index}
    <div
      class="flex flex-col gap-2 rounded-xl border border-theme-border/60 bg-theme-bg/60 p-3 shadow-inner {single
        ? 'w-full max-w-xs'
        : 'w-full'}"
      data-testid="vtt-chat-card"
    >
      {#if card.position}
        <span
          class="block font-mono text-[9px] font-bold uppercase tracking-widest text-theme-primary"
          data-testid="vtt-chat-card-position"
        >
          {card.position}
        </span>
      {/if}

      {#if card.imagePath}
        <div class="flex justify-center">
          <CardImage
            path={card.imagePath}
            alt={card.title}
            title={card.title}
            zoomable
            className="aspect-[5/7] w-full max-w-[11rem] rounded-lg border border-theme-border/60 object-cover shadow-md transition-transform {card.reversed
              ? 'rotate-180'
              : ''}"
          />
        </div>
      {:else}
        <div
          class="flex items-center justify-center gap-1.5 py-1.5 text-theme-primary/70 border-b border-theme-border/30"
          data-testid="vtt-chat-card-placeholder"
        >
          <span aria-hidden="true" class="icon-[lucide--layers] h-4 w-4"></span>
          {#if card.deckName}
            <span
              class="font-header text-[9px] font-bold uppercase tracking-widest text-theme-muted"
            >
              {card.deckName}
            </span>
          {/if}
        </div>
      {/if}

      <div class="min-w-0 flex flex-col gap-1 text-center">
        <div class="flex flex-wrap items-center justify-center gap-1.5">
          <span
            class="font-header {single
              ? 'text-sm'
              : 'text-xs'} font-bold text-theme-text"
            data-testid="vtt-chat-card-title"
          >
            {card.title}
          </span>
          {#if card.reversed}
            <span
              class="rounded bg-theme-primary/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-theme-primary"
              data-testid="vtt-chat-card-reversed"
            >
              Reversed
            </span>
          {/if}
        </div>

        {#if card.body?.trim()}
          <p
            class="whitespace-pre-wrap font-body text-xs leading-relaxed text-theme-text/90 text-left mt-0.5"
            data-testid="vtt-chat-card-body"
          >
            {card.body}
          </p>
        {/if}
      </div>
    </div>
  {/each}
</div>

<style>
  @reference "../../../app.css";
</style>
