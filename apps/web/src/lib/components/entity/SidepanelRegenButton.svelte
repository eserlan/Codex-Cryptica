<script lang="ts">
  import { regenerationService } from "$lib/services/RegenerationService.svelte";
  import { vault } from "$lib/stores/vault.svelte";

  let { entityId } = $props<{ entityId: string }>();

  const isHost = $derived(!vault.isGuest);
  const isGenerating = $derived(regenerationService.isGenerating);
</script>

{#if isHost}
  <button
    onclick={() => isHost && regenerationService.regenerate(entityId)}
    disabled={isGenerating}
    class="transition flex items-center justify-center p-1 text-[color:var(--theme-icon-default)] hover:text-[color:var(--theme-icon-active)] disabled:opacity-50 disabled:cursor-not-allowed"
    aria-label="AI Regenerate Description"
    title="AI Regenerate Description (Chronicle & Lore)"
  >
    {#if isGenerating}
      <span
        class="icon-[lucide--loader-2] w-5 h-5 animate-spin text-theme-primary"
      ></span>
    {:else}
      <span class="icon-[lucide--sparkles] w-5 h-5"></span>
    {/if}
  </button>
{/if}
