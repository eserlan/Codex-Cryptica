<script lang="ts">
  import type { Snippet } from "svelte";
  import type { DraftPart } from "hex-crawl-engine";

  let {
    label,
    part,
    busy,
    onRegenerate,
    onDiscard,
    children,
  }: {
    label: string;
    part: DraftPart;
    busy: boolean;
    onRegenerate: () => void;
    onDiscard: () => void;
    children?: Snippet;
  } = $props();
</script>

<article
  aria-label={label}
  class="space-y-2 rounded-lg border border-theme-border bg-theme-bg p-3"
>
  <header class="flex items-center justify-between gap-2">
    <h4 class="text-micro uppercase tracking-widest font-bold text-theme-text">
      {label}
    </h4>
    <span
      class="rounded-full border border-theme-border px-2 py-0.5 text-micro font-bold text-theme-muted"
    >
      {part.source === "ai" ? "AI-drafted" : "Rolled"}
    </span>
  </header>

  <p class="text-sm text-theme-text">{part.text}</p>

  {#if part.status === "pending"}
    <div class="flex flex-wrap items-center gap-2">
      {@render children?.()}
      <button
        type="button"
        aria-label="Regenerate {label}"
        disabled={busy}
        onclick={onRegenerate}
        class="rounded-lg border border-theme-border px-2.5 py-1 text-micro font-bold uppercase tracking-widest text-theme-muted hover:text-theme-text disabled:opacity-50"
      >
        Regenerate
      </button>
      <button
        type="button"
        aria-label="Discard {label}"
        disabled={busy}
        onclick={onDiscard}
        class="rounded-lg border border-theme-border px-2.5 py-1 text-micro font-bold uppercase tracking-widest text-theme-muted hover:text-theme-text disabled:opacity-50"
      >
        Discard
      </button>
    </div>
  {:else}
    <p class="text-micro text-theme-muted">
      {part.status === "saved" ? "Saved" : "Discarded"}
    </p>
  {/if}
</article>
