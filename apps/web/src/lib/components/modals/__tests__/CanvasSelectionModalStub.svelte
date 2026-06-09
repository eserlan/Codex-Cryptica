<script lang="ts">
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
</script>

{#if modalUIStore.showCanvasSelector}
  <div data-testid="canvas-selection-modal-stub">Canvas Selection Modal</div>
{/if}
