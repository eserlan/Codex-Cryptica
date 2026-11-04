<script lang="ts">
  import { fade, fly } from "svelte/transition";
  import { vault } from "#lib/stores/vault.svelte.js";
  import { modalUIStore } from "#lib/stores/ui/modal-ui.svelte.js";
  import DetailSoundBite from "#lib/components/entity-detail/DetailSoundBite.svelte";

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

  function handleKeydown(e: KeyboardEvent) {
    if (modalUIStore.soundBite?.show && e.key === "Escape") {
      handleClose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if modalUIStore.soundBite?.show && entity}
  <div
    class="fixed inset-0 z-[110] flex items-end md:items-center justify-center"
    transition:fade={{ duration: 150 }}
  >
    <!-- Backdrop -->
    <button
      type="button"
      class="absolute inset-0 w-full h-full bg-black/60 backdrop-blur-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-theme-primary cursor-default"
      aria-label="Close dialog"
      onclick={handleBackdropClick}
      onpointerdown={(e) => e.preventDefault()}
      tabindex="-1"
    ></button>
    <!-- Modal card — explicit background so theme alpha vars don't bleed through -->
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sound Bite"
      tabindex="-1"
      class="relative z-10 w-full max-w-lg mx-0 md:mx-4 rounded-t-2xl md:rounded-2xl overflow-hidden shadow-2xl"
      style:background-color="var(--theme-panel-fill)"
      style:background-image="var(--bg-theme-surface)"
      in:fly={{ y: 40, duration: 250 }}
      out:fly={{ y: 40, duration: 180 }}
      onclick={(e) => e.stopPropagation()}
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
