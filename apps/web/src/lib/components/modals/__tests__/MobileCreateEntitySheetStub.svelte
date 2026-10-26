<script lang="ts">
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
</script>

{#if modalUIStore.showMobileCreateSheet}
  <div data-testid="mobile-create-entity-sheet-stub">
    Mobile Create Entity Sheet
  </div>
{/if}
