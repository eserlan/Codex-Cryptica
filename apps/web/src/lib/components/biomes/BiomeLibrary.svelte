<script lang="ts">
  import {
    BIOME_CATALOGUE,
    listFilterFacets,
    searchBiomes,
    type FilterFacet,
    type ReferenceBiome,
  } from "biome-engine";
  import BiomeCard from "./BiomeCard.svelte";

  let {
    catalogue = BIOME_CATALOGUE,
    query = $bindable(""),
    filters = $bindable<FilterFacet[]>([]),
    onOpen,
    onStartBlank,
    compareIds = [],
    onToggleCompare,
  }: {
    catalogue?: readonly ReferenceBiome[];
    query?: string;
    filters?: FilterFacet[];
    onOpen: (id: string) => void;
    onStartBlank?: () => void;
    compareIds?: readonly string[];
    onToggleCompare?: (id: string) => void;
  } = $props();

  const facets = $derived(listFilterFacets(catalogue));
  const results = $derived(searchBiomes({ text: query, filters }, catalogue));

  function toggleFilter(facet: FilterFacet) {
    filters = filters.includes(facet)
      ? filters.filter((f) => f !== facet)
      : [...filters, facet];
  }

  function clearAll() {
    query = "";
    filters = [];
  }
</script>

<section aria-labelledby="biome-library-heading" class="flex flex-col gap-4">
  <h2 id="biome-library-heading" class="sr-only">Biome library</h2>

  <div role="search" class="flex flex-col gap-3">
    <label
      for="biome-search"
      class="font-mono text-xs uppercase tracking-wide text-theme-muted"
    >
      Search biomes
    </label>
    <div class="relative">
      <span
        class="icon-[lucide--search] pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-theme-muted"
        aria-hidden="true"
      ></span>
      <input
        id="biome-search"
        type="search"
        bind:value={query}
        placeholder="Try “cold”, “dry” or “forest”"
        autocomplete="off"
        class="w-full rounded-xl border border-theme-border bg-theme-surface py-3 pl-10 pr-4 text-sm text-theme-text placeholder:text-theme-muted focus:border-theme-primary focus:outline-none"
      />
    </div>

    <div class="flex flex-wrap gap-2" role="group" aria-label="Filters">
      {#each facets as { facet, label, count } (facet)}
        <button
          type="button"
          aria-pressed={filters.includes(facet)}
          class="rounded-full border px-3 py-1 text-xs transition-colors {filters.includes(
            facet,
          )
            ? 'border-theme-primary bg-theme-primary/15 text-theme-text'
            : 'border-theme-border text-theme-muted hover:border-theme-primary/60'}"
          onclick={() => toggleFilter(facet)}
        >
          {label} <span class="text-theme-muted">({count})</span>
        </button>
      {/each}
    </div>
  </div>

  {#if onStartBlank}
    <div>
      <button
        type="button"
        class="rounded-lg border border-theme-border px-4 py-2 text-sm text-theme-text hover:border-theme-primary"
        onclick={onStartBlank}>Start from blank</button
      >
    </div>
  {/if}

  <p
    class="text-sm text-theme-muted"
    aria-live="polite"
    data-testid="biome-result-count"
  >
    {`${results.length} ${results.length === 1 ? "biome" : "biomes"} shown`}
  </p>

  {#if results.length === 0}
    <div
      class="rounded-xl border border-theme-border bg-theme-surface/40 px-6 py-10 text-center text-sm text-theme-text/70"
    >
      <p class="mb-3">No biomes match your search or filters.</p>
      <button
        type="button"
        class="rounded border border-theme-border px-3 py-1 text-theme-primary hover:border-theme-primary"
        onclick={clearAll}>Clear search</button
      >
    </div>
  {:else}
    <ul
      class="grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      {#each results as { biome } (biome.id)}
        <li>
          <BiomeCard
            {biome}
            {onOpen}
            comparing={compareIds.includes(biome.id)}
            {onToggleCompare}
          />
        </li>
      {/each}
    </ul>
  {/if}
</section>
