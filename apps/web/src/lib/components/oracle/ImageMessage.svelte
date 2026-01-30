<script lang="ts">
  import type { ChatMessage } from "$lib/stores/oracle.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { fade, scale } from "svelte/transition";

  let { message }: { message: ChatMessage } = $props();

  let showLightbox = $state(false);
  let isArchiving = $state(false);
  let archiveError = $state<string | null>(null);

  let activeEntity = $derived(
    vault.selectedEntityId ? vault.entities[vault.selectedEntityId] : null,
  );

  const handleSave = async () => {
    if (!message.imageBlob || !activeEntity) return;

    isArchiving = true;
    archiveError = null;
    try {
      await vault.saveImageToVault(message.imageBlob, activeEntity.id);
    } catch (err: any) {
      console.error("Failed to archive image", err);
      archiveError = err.message || "Failed to save image.";
    } finally {
      isArchiving = false;
    }
  };

  const handleDragStart = (e: DragEvent) => {
    if (message.imageUrl) {
      e.dataTransfer?.setData("text/plain", message.imageUrl);
      // We also pass the ID to identify this message's blob if needed
      e.dataTransfer?.setData("application/codex-image-id", message.id);

      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = "copy";
      }
    }
  };
</script>

<svelte:window
  onkeydown={(e) => {
    if (e.key === "Escape" && showLightbox) showLightbox = false;
  }}
/>

<div class="flex flex-col gap-3 w-full max-w-sm">
  {#if message.imageUrl}
    <div class="relative group">
      <!-- Image Preview -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <img
        src={message.imageUrl}
        alt={message.content}
        class="w-full rounded-lg border border-purple-900/30 shadow-lg cursor-zoom-in group-hover:border-purple-500/50 transition-all"
        draggable="true"
        ondragstart={handleDragStart}
        onclick={() => (showLightbox = true)}
      />

      <!-- Overlay Info -->
      <div
        class="absolute bottom-2 left-2 right-2 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
      >
        <span
          class="text-[9px] bg-black/70 text-purple-300 px-1.5 py-0.5 rounded backdrop-blur-sm border border-purple-500/20"
        >
          DRAG TO ENTITY
        </span>
      </div>
    </div>

    <!-- Actions -->
    {#if activeEntity}
      <div class="flex flex-col gap-2 items-end" transition:fade>
        <button
          onclick={handleSave}
          disabled={isArchiving}
          class="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold tracking-widest transition-all bg-purple-900/20 text-purple-400 border border-purple-800/30 hover:bg-purple-600 hover:text-black hover:border-purple-600 disabled:opacity-50"
        >
          {#if isArchiving}
            <span class="icon-[lucide--loader-2] w-3 h-3 animate-spin"></span>
            ARCHIVING...
          {:else}
            <span class="icon-[lucide--save] w-3 h-3"></span>
            SAVE TO {activeEntity.title.toUpperCase()}
          {/if}
        </button>
        {#if archiveError}
          <span class="text-[9px] text-red-400 font-mono italic"
            >{archiveError}</span
          >
        {/if}
      </div>
    {/if}
  {:else}
    <!-- Loading State -->
    <div
      class="w-full aspect-square bg-purple-900/10 border border-purple-900/20 rounded-lg flex flex-col items-center justify-center gap-3 animate-pulse"
    >
      <div class="relative">
        <span class="icon-[lucide--sparkles] w-8 h-8 text-purple-500/50"></span>
        <div
          class="absolute inset-0 bg-purple-500/20 blur-xl rounded-full"
        ></div>
      </div>
      <span class="text-[10px] font-mono text-purple-400 tracking-widest"
        >VISUALIZING...</span
      >
    </div>
  {/if}
</div>

<!-- Lightbox -->
{#if showLightbox && message.imageUrl}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 cursor-zoom-out"
    onclick={() => (showLightbox = false)}
    transition:fade={{ duration: 200 }}
  >
    <div transition:scale={{ start: 0.95, duration: 200 }}>
      <img
        src={message.imageUrl}
        alt={message.content}
        class="max-w-[95vw] max-h-[95vh] rounded shadow-2xl border border-white/10"
      />
      <div class="mt-4 text-center">
        <p class="text-gray-400 text-xs font-mono">{message.content}</p>
      </div>
    </div>

    <button
      class="absolute top-6 right-6 text-white/50 hover:text-white transition-colors"
      onclick={() => (showLightbox = false)}
      aria-label="Close lightbox"
      data-testid="close-lightbox"
    >
      <span class="icon-[lucide--x] w-8 h-8"></span>
    </button>
  </div>
{/if}

<style>
  img {
    user-select: none;
    -webkit-user-drag: element;
  }
</style>
