<script lang="ts">
  import { uiStore } from "$lib/stores/ui.svelte";
  import ZenView from "../zen/ZenView.svelte";
  import { fade } from "svelte/transition";

  let { entityId } = $props<{ entityId: string }>();

  function handleClose() {
    uiStore.focusEntity(null);
  }
</script>

<div
  class="flex flex-col h-full bg-theme-bg overflow-hidden relative"
  style:background-color="var(--theme-panel-muted)"
  style:background-image="var(--bg-texture-overlay)"
  transition:fade={{ duration: 200 }}
  data-testid="embedded-entity-view"
>
  <ZenView {entityId} onClose={handleClose} onPopOut={() => {}} />
</div>
