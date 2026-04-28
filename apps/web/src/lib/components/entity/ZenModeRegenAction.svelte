<script lang="ts">
  import { regenerationService } from "$lib/services/RegenerationService.svelte";
  import { vault } from "$lib/stores/vault.svelte";

  const isHost = $derived(!vault.isGuest);
  const isGenerating = $derived(regenerationService.isGenerating);
  const selectedEntityId = $derived(vault.selectedEntityId);
</script>

{#if isHost && selectedEntityId}
  <button
    onclick={() => isHost && regenerationService.regenerate(selectedEntityId)}
    disabled={isGenerating}
    class="toolbar-btn {isGenerating
      ? 'active'
      : ''} disabled:opacity-50 disabled:cursor-not-allowed"
    aria-label="AI Regenerate Description"
    title="AI Regenerate Description (Chronicle & Lore)"
  >
    {#if isGenerating}
      <span
        class="icon-[lucide--loader-2] w-4 h-4 animate-spin text-theme-primary"
      ></span>
    {:else}
      <span class="icon-[lucide--sparkles] w-4 h-4"></span>
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
