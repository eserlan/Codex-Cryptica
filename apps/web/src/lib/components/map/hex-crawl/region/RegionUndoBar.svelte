<script lang="ts">
  import { REFUSAL_TEXT } from "./region-messages";
  import type { RegionGenerationStore } from "#lib/stores/hex-crawl/region-generation.svelte.js";

  /** The result of the last accept or undo, with Undo while it is still safe. */
  let { store }: { store: RegionGenerationStore } = $props();

  const text = $derived.by(() => {
    const message = store.message;
    if (!message) return null;
    switch (message.kind) {
      case "refused":
        return REFUSAL_TEXT[message.reason];
      case "saved":
        return message.skipped > 0
          ? `Saved ${message.applied} hexes. ${message.skipped} changed since the preview and were skipped.`
          : `Saved ${message.applied} hexes.`;
      case "failed":
        return "Could not save. Nothing was changed.";
      case "undone":
        return "Region undone.";
      case "undo-blocked":
        return "Undo is no longer safe because those hexes changed since.";
    }
  });
</script>

{#if text && !store.review}
  <div
    role="status"
    data-testid="region-message"
    class="pointer-events-auto absolute bottom-2 left-1/2 z-40 flex max-w-[calc(100%-1rem)] -translate-x-1/2 items-center gap-2 rounded-xl border border-theme-border bg-theme-surface p-2 text-sm text-theme-text shadow-xl"
  >
    <span>{text}</span>
    {#if store.undoAvailable}
      <button
        type="button"
        class="min-h-11 rounded-lg px-3 font-bold text-theme-text"
        onclick={() => store.undo()}>Undo</button
      >
    {/if}
    <button
      type="button"
      class="min-h-11 min-w-11 rounded-lg text-theme-text"
      aria-label="Dismiss"
      onclick={() => store.dismissMessage()}
    >
      <span class="icon-[lucide--x] h-4 w-4" aria-hidden="true"></span>
    </button>
  </div>
{/if}
