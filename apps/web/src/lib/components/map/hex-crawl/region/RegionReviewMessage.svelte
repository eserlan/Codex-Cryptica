<script lang="ts">
  import type { RegionGenerationStore } from "#lib/stores/hex-crawl/region-generation.svelte.js";
  import { REFUSAL_TEXT } from "./region-messages";

  /** Why the last change could not be made, shown inside the review. */
  let { store }: { store: RegionGenerationStore } = $props();

  const text = $derived.by(() => {
    const message = store.message;
    if (message?.kind === "refused")
      return `${REFUSAL_TEXT[message.reason]} Nothing was changed.`;
    if (message?.kind === "failed")
      return "Could not save. Nothing was changed.";
    return null;
  });
</script>

{#if text}
  <p role="alert" class="mt-1 text-xs text-theme-danger">{text}</p>
{/if}
