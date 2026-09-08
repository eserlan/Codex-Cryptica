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

  // Bumped to force the {#await} below to re-run on Retry — the dynamic
  // import can fail offline or on a transient CDN error, and must fail
  // closed with a retryable message rather than crash the render tree.
  let loadAttempt = $state(0);

  async function loadZenView() {
    try {
      const module = await import("../zen/ZenView.svelte");
      return module.default;
    } catch (err) {
      console.error("[EmbeddedEntityView] Failed to load ZenView:", err);
      return null;
    }
  }

  function retry() {
    loadAttempt += 1;
  }
</script>

<div
  class="flex flex-col h-full bg-theme-bg overflow-hidden relative"
  style:background-color="var(--theme-panel-muted)"
  style:background-image="var(--bg-texture-overlay)"
  transition:fade={{ duration: 200 }}
  data-testid="embedded-entity-view"
>
  {#key loadAttempt}
    {#await loadZenView() then ZenView}
      {#if ZenView}
        <ZenView {entityId} onClose={handleClose} />
      {:else}
        <div
          class="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center"
          data-testid="embedded-entity-view-error"
        >
          <div class="text-theme-text/70 text-xs">
            Failed to load the editor.
          </div>
          <button
            type="button"
            class="cursor-pointer rounded border border-theme-border bg-theme-surface px-3 py-1 text-xs text-theme-text hover:bg-theme-bg"
            onclick={retry}
            data-testid="embedded-entity-view-retry"
          >
            Retry
          </button>
        </div>
      {/if}
    {/await}
  {/key}
</div>
