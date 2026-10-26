<script lang="ts">
  import type { BiomeExplorerStore } from "#lib/stores/biome-explorer.svelte.js";
  import BiomeCompareTable from "./BiomeCompareTable.svelte";

  let { store, onBrowse }: { store: BiomeExplorerStore; onBrowse: () => void } =
    $props();

  const result = $derived(store.comparison);
</script>

<section aria-labelledby="biome-compare-heading" class="flex flex-col gap-4">
  <h2 id="biome-compare-heading" class="font-header text-xl text-theme-text">
    Compare biomes
  </h2>

  {#if result.ok}
    <div class="flex flex-wrap gap-2">
      {#each result.biomes as biome (biome.id)}
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-full border border-theme-border px-3 py-1 text-xs text-theme-text hover:border-theme-primary"
          aria-label="Remove {biome.name} from comparison"
          onclick={() => store.toggleCompare(biome.id)}
        >
          {biome.name}
          <span class="icon-[lucide--x] h-3 w-3" aria-hidden="true"></span>
        </button>
      {/each}
    </div>
    <BiomeCompareTable biomes={result.biomes} rows={result.rows} />
  {:else}
    <div
      class="rounded-xl border border-theme-border bg-theme-surface/40 px-6 py-10 text-center text-sm text-theme-text/80"
    >
      <p class="mb-3">
        Choose at least two biomes to compare. You can pick up to three.
      </p>
      <button
        type="button"
        class="rounded border border-theme-border px-3 py-1 text-theme-primary hover:border-theme-primary"
        onclick={onBrowse}>Browse biomes</button
      >
    </div>
  {/if}
</section>
