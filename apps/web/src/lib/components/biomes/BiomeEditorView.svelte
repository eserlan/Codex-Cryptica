<script lang="ts">
  import type { BiomeExplorerStore } from "$lib/stores/biome-explorer.svelte";
  import BiomeProfileEditor from "./BiomeProfileEditor.svelte";

  let { store }: { store: BiomeExplorerStore } = $props();
</script>

<BiomeProfileEditor {store} />
