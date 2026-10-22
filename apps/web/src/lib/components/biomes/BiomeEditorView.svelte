<script lang="ts">
  import type { BiomeExplorerStore } from "$lib/stores/biome-explorer.svelte";
  import BiomeProfileEditor from "./BiomeProfileEditor.svelte";

  let { store }: { store: BiomeExplorerStore } = $props();
</script>

<BiomeProfileEditor {store} />
{#if !store.vaultWritable}
  <p class="text-sm text-theme-muted">
    Open a vault you can edit to save this biome. You can still copy it as
    Markdown.
  </p>
{/if}
