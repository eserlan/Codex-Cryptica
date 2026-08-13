<script lang="ts">
  import { revisionService } from "$lib/services/RevisionService.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";

  const isHost = $derived(!vault.isGuest);
  const isRevising = $derived(revisionService.isRevising);
  const selectedEntityId = $derived(vault.selectedEntityId);
</script>

{#if isHost && selectedEntityId}
  <button
    type="button"
    onclick={() => isHost && modalUIStore.openRevisionDialog(selectedEntityId)}
    disabled={isRevising}
    aria-busy={isRevising}
    class="toolbar-btn {isRevising
      ? 'active'
      : ''} disabled:opacity-50 disabled:cursor-not-allowed"
    aria-label="AI Revise Description"
    title="AI Revise Description (Chronicle & Lore)"
  >
    {#if isRevising}
      <span
        aria-hidden="true"
        class="icon-[lucide--loader-2] w-4 h-4 animate-spin text-theme-primary"
      ></span>
    {:else}
      <span aria-hidden="true" class="icon-[lucide--sparkles] w-4 h-4"></span>
    {/if}
  </button>
{/if}

<style>
  .toolbar-btn {
    padding: 0.375rem;
    border-radius: 0.25rem;
    color: color-mix(in srgb, var(--color-theme-text) 70%, transparent);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .toolbar-btn:hover {
    color: var(--color-theme-primary);
    background-color: color-mix(
      in srgb,
      var(--color-theme-primary) 20%,
      transparent
    );
  }

  .toolbar-btn.active {
    color: var(--color-theme-primary);
    background-color: color-mix(
      in srgb,
      var(--color-theme-primary) 40%,
      transparent
    );
  }
</style>
