<script lang="ts">
  import type { BiomeExplorerStore } from "$lib/stores/biome-explorer.svelte";

  let {
    store,
    alterationId,
  }: { store: BiomeExplorerStore; alterationId: string } = $props();

  const state = $derived(store.suggestions[alterationId]);
  const loading = $derived(state?.status === "loading");
</script>

{#if !store.aiNoticeSeen}
  <div
    class="flex flex-wrap items-center gap-2 rounded border border-theme-border p-2 text-xs text-theme-muted"
  >
    <span
      >The AI helper sends this change and a short summary of your biome to the
      AI service you've set up. It only suggests; nothing is added until you
      choose it.</span
    >
    <button
      type="button"
      class="rounded border border-theme-border px-2 py-1 text-theme-text"
      onclick={() => store.dismissAiNotice()}>Got it</button
    >
  </div>
{/if}

<div class="flex flex-wrap items-center gap-2">
  <button
    type="button"
    class="inline-flex items-center gap-1 rounded border border-theme-border px-3 py-1 text-sm text-theme-text hover:border-theme-primary"
    disabled={loading}
    onclick={() => store.requestSuggestions(alterationId)}
  >
    <span class="icon-[lucide--sparkles] h-4 w-4" aria-hidden="true"></span>
    Suggest effects
  </button>
  {#if loading}
    <button
      type="button"
      class="rounded border border-theme-border px-3 py-1 text-sm text-theme-muted"
      onclick={() => store.cancelSuggestions(alterationId)}>Cancel</button
    >
  {/if}
</div>

{#if state?.status === "error"}
  <p class="text-sm text-theme-muted">{state.message}</p>
{:else if state?.status === "done"}
  <ul class="m-0 flex list-none flex-col gap-2 p-0">
    {#each state.items as item, index (item.effect)}
      <li class="rounded border border-dashed border-theme-border p-2 text-sm">
        <p class="m-0 text-theme-text">{item.effect}</p>
        <p class="m-0 text-xs text-theme-muted">{item.plausibilityNote}</p>
        <div class="mt-2 flex gap-2">
          <button
            type="button"
            class="rounded border border-theme-border px-2 py-1 text-xs text-theme-text hover:border-theme-primary"
            aria-label="Add suggestion: {item.effect}"
            onclick={() => store.acceptSuggestion(alterationId, index)}
            >Add</button
          >
          <button
            type="button"
            class="rounded border border-theme-border px-2 py-1 text-xs text-theme-muted"
            aria-label="Dismiss suggestion: {item.effect}"
            onclick={() => store.dismissSuggestion(alterationId, index)}
            >Dismiss</button
          >
        </div>
      </li>
    {/each}
  </ul>
{/if}
