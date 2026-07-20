<script lang="ts">
  import { revisionService } from "$lib/services/RevisionService.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";

  let { entityId } = $props<{ entityId: string }>();

  const isHost = $derived(!vault.isGuest);
  const isRevising = $derived(revisionService.isRevising);
</script>

{#if isHost}
  <button
    type="button"
    onclick={() => isHost && modalUIStore.openRevisionDialog(entityId)}
    disabled={isRevising}
    class="transition flex items-center justify-center p-1 text-[color:var(--theme-icon-default)] hover:text-[color:var(--theme-icon-active)] disabled:opacity-50 disabled:cursor-not-allowed"
    aria-label="AI Revise Description"
    title="AI Revise Description (Chronicle & Lore)"
  >
    {#if isRevising}
      <span
        aria-hidden="true"
        class="icon-[lucide--loader-2] w-5 h-5 animate-spin text-theme-primary"
      ></span>
    {:else}
      <span aria-hidden="true" class="icon-[lucide--sparkles] w-5 h-5"></span>
    {/if}
  </button>
{/if}
