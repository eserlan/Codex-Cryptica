<script lang="ts">
  import { fade, fly } from "svelte/transition";
  import { vault } from "$lib/stores/vault.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import DetailSoundBite from "$lib/components/entity-detail/DetailSoundBite.svelte";

  const entityId = $derived(modalUIStore.soundBite?.entityId);
  const entity = $derived(entityId ? vault.entities[entityId] : null);

  // Close if the entity is deleted while the modal is open
  $effect(() => {
    if (modalUIStore.soundBite?.show && entityId && !entity) {
      modalUIStore.closeSoundBite();
    }
  });

  function handleClose() {
    modalUIStore.closeSoundBite();
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) handleClose();
  }
</script>

{#if modalUIStore.soundBite?.show && entity}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-[110] flex items-end md:items-center justify-center"
    role="dialog"
    aria-modal="true"
    aria-label="Sound Bite"
    transition:fade={{ duration: 150 }}
    onclick={handleBackdropClick}
  >
    <!-- Modal card — explicit background so theme alpha vars don't bleed through -->
    <div
      class="relative z-10 w-full max-w-md mx-0 md:mx-4 rounded-t-2xl md:rounded-2xl overflow-hidden shadow-2xl"
      style:background-color="var(--theme-panel-fill)"
      style:background-image="var(--bg-theme-surface)"
      in:fly={{ y: 40, duration: 250 }}
      out:fly={{ y: 40, duration: 180 }}
    >
      <!--
        {#key entityId} forces DetailSoundBite to be fully destroyed and
        remounted whenever the entity changes while the modal is open.
        Without this, internal state (voiceMode, audioObjectUrl, etc.)
        would carry over from the previous entity.
      -->
      {#key entityId}
        <DetailSoundBite {entity} onClose={handleClose} />
      {/key}
    </div>
  </div>
{/if}
