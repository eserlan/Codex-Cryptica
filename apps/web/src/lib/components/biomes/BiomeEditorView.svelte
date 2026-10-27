<script lang="ts">
  import type { BiomeExplorerStore } from "#lib/stores/biome-explorer.svelte.js";
  import BiomeProfileEditor from "./BiomeProfileEditor.svelte";

  let { store }: { store: BiomeExplorerStore } = $props();
</script>

<!-- A form, not a catalogue: it keeps the width it had before the page canvas
     widened, so the controls stay balanced. -->
<div class="mx-auto w-full max-w-6xl" data-testid="biome-editor-width">
  <BiomeProfileEditor {store} />
</div>
