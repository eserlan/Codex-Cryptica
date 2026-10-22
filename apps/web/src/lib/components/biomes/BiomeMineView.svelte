<script lang="ts">
  import type { BiomeExplorerStore } from "$lib/stores/biome-explorer.svelte";
  import BiomeProfileList from "./BiomeProfileList.svelte";

  let { store }: { store: BiomeExplorerStore } = $props();
</script>

{#if store.vaultWritable}
  <BiomeProfileList {store} />
{:else}
  <div
    class="rounded-xl border border-theme-border bg-theme-surface/40 px-6 py-10 text-center text-sm text-theme-text/80"
  >
    Open a vault you can edit to see and save your own biomes.
  </div>
{/if}
