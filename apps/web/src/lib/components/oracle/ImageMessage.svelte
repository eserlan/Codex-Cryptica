<script lang="ts">
  import type { ChatMessage } from "$lib/stores/oracle.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { fade } from "svelte/transition";
  import ZenImageLightbox from "$lib/components/zen/ZenImageLightbox.svelte";

  let { message }: { message: ChatMessage } = $props();

  let showLightbox = $state(false);
  let isArchiving = $state(false);
  let archiveError = $state<string | null>(null);

  let activeEntity = $derived(
    vault.selectedEntityId ? vault.entities[vault.selectedEntityId] : null,
  );

  const handleSave = async () => {
    if (!message.imageBlob || !activeEntity || vault.isGuest) return;

    isArchiving = true;
    archiveError = null;
    try {
      const paths = await vault.saveImageToVault(
        message.imageBlob,
        activeEntity.id,
      );
      await vault.updateEntity(activeEntity.id, {
        image: paths.image,
        thumbnail: paths.thumbnail,
      });
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
        class="w-full rounded-lg border border-theme-border shadow-lg cursor-zoom-in group-hover:border-theme-primary/50 transition-all"
        draggable="true"
        ondragstart={handleDragStart}
        onclick={() => (showLightbox = true)}
      />

      <!-- Overlay Info -->
      <div
        class="absolute bottom-2 left-2 right-2 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
      >
        <span
          class="text-[9px] bg-theme-surface/80 text-theme-muted px-1.5 py-0.5 rounded backdrop-blur-sm border border-theme-border shadow-sm"
        >
          DRAG TO ENTITY
        </span>
      </div>
    </div>

    <!-- Actions -->
    {#if activeEntity && !vault.isGuest}
      <div class="flex flex-col gap-2 items-end" transition:fade>
        <button
          onclick={handleSave}
          disabled={isArchiving}
          class="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold tracking-widest transition-all bg-theme-primary/10 text-theme-primary border border-theme-primary/30 hover:bg-theme-primary hover:text-black max-w-[250px] disabled:opacity-50"
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
      class="w-full aspect-square bg-theme-surface/30 border border-theme-border rounded-lg flex flex-col items-center justify-center gap-3 animate-pulse"
    >
      <div class="relative">
        <span class="icon-[lucide--sparkles] w-8 h-8 text-theme-primary/50"
        ></span>
        <div
          class="absolute inset-0 bg-theme-primary/20 blur-xl rounded-full"
        ></div>
      </div>
      <span class="text-[10px] font-mono text-theme-primary tracking-widest"
        >VISUALIZING...</span
      >
    </div>
  {/if}
</div>

<ZenImageLightbox
  bind:show={showLightbox}
  imageUrl={message.imageUrl ?? ""}
  title={message.content}
/>

<style>
  img {
    user-select: none;
    -webkit-user-drag: element;
  }
</style>
