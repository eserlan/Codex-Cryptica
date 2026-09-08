<script lang="ts">
  import { fade } from "svelte/transition";
  import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";
  import { focusEntity } from "$lib/stores/ui/navigation";

  let { entityId } = $props<{ entityId: string }>();

  function handleClose() {
    if (layoutUIStore.isEntityExplorerWorkspace) {
      layoutUIStore.clearEntityExplorerWorkspaceFocus();
      return;
    }
    focusEntity(null);
  }
</script>

<div
  class="flex flex-col h-full bg-theme-bg overflow-hidden relative"
  style:background-color="var(--theme-panel-muted)"
  style:background-image="var(--bg-texture-overlay)"
  transition:fade={{ duration: 200 }}
  data-testid="embedded-entity-view"
>
  {#await import("../zen/ZenView.svelte") then { default: ZenView }}
    <ZenView {entityId} onClose={handleClose} />
  {/await}
</div>
