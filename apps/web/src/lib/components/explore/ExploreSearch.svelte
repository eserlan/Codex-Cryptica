<script lang="ts">
  import { getAllPublicContent } from "$lib/content/labels/aggregate";
  import {
    buildExploreSearchIndex,
    searchExplore,
  } from "$lib/content/explore-search";
  import ExploreLabelResults from "./ExploreLabelResults.svelte";

  let {
    cleanBase,
    query = $bindable(""),
  }: { cleanBase: string; query?: string } = $props();

  // `/explore`'s loader already bundles the content registries, so building
  // the index here adds no payload; it is only built once a visitor types.
  let index: ReturnType<typeof buildExploreSearchIndex> | null = null;

  const trimmed = $derived(query.trim());
  const results = $derived.by(() => {
    if (!trimmed) return [];
    index ??= buildExploreSearchIndex(getAllPublicContent());
    return searchExplore(index, trimmed);
  });
</script>

<div class="mb-10" role="search">
  <label
    for="explore-search"
    class="mb-2 block font-mono text-xs uppercase tracking-wide text-theme-muted"
  >
    Search Codex Cryptica
  </label>
  <div class="relative">
    <span
      class="icon-[lucide--search] pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-theme-muted"
      aria-hidden="true"
    ></span>
    <input
      id="explore-search"
      type="search"
      bind:value={query}
      placeholder="Try “pirate”, “heist”, or “D&D”"
      autocomplete="off"
      class="w-full rounded-xl border border-theme-border bg-theme-surface py-3 pl-10 pr-4 text-sm text-theme-text placeholder:text-theme-muted focus:border-theme-primary focus:outline-none"
    />
  </div>
  <p class="sr-only" aria-live="polite">
    {#if trimmed}{results.length} results{/if}
  </p>
</div>

{#if trimmed}
  {#if results.length === 0}
    <div
      class="mb-14 rounded border border-theme-border bg-theme-surface/40 px-6 py-10 text-center text-sm text-theme-text/70"
    >
      Nothing matched <strong>{trimmed}</strong>. Try
      <a href="{cleanBase}/for" class="text-theme-primary hover:underline"
        >campaign guides</a
      >
      or
      <a
        href="{cleanBase}/generators"
        class="text-theme-primary hover:underline">generators</a
      >.
    </div>
  {:else}
    <ExploreLabelResults label={trimmed} {results} {cleanBase} />
  {/if}
{/if}
