<script lang="ts">
  import EmbeddedEntityView from "$lib/components/entity/EmbeddedEntityView.svelte";

  let { entityId }: { entityId: string | null } = $props();
</script>

<section
  class="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-theme-bg"
  style:background-color="var(--theme-panel-muted)"
  style:background-image="var(--bg-texture-overlay)"
  aria-label="Entity Explorer workspace"
  data-testid="entity-explorer-workspace-shell"
>
  {#if entityId}
    <div class="min-h-0 min-w-0 flex-1 overflow-hidden">
      <EmbeddedEntityView {entityId} />
    </div>
  {:else}
    <div
      class="flex min-h-0 min-w-0 flex-1 items-center justify-center px-6 py-10 text-center"
      data-testid="entity-explorer-workspace-empty"
    >
      <div class="max-w-2xl space-y-3">
        <div
          class="text-[10px] font-bold uppercase tracking-[0.24em] text-theme-muted"
        >
          Entity Explorer
        </div>
        <h2 class="font-header text-2xl text-theme-text">Select an entity</h2>
        <p class="text-sm leading-6 text-theme-muted">
          Keep the explorer open on the left and choose any entity to read or edit
          it here without leaving your workspace.
        </p>
      </div>
    </div>
  {/if}
</section>
