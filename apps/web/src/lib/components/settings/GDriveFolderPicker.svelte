<script lang="ts">
  import { gdriveAdapter } from "$lib/stores/gdrive.svelte";
  import type { RemoteFileMeta } from "$lib/cloud-bridge";
  import { slide } from "svelte/transition";

  let { onSelect, onCancel } = $props<{
    onSelect: (folder: RemoteFileMeta) => void;
    onCancel: () => void;
  }>();

  let folders = $state<RemoteFileMeta[]>([]);
  let isLoading = $state(true);
  let error = $state<string | null>(null);

  const fetchFolders = async () => {
    isLoading = true;
    error = null;
    try {
      folders = await gdriveAdapter.listFolders();
    } catch (e: any) {
      console.error("Failed to fetch folders:", e);
      error = e.message;
    } finally {
      isLoading = false;
    }
  };

  $effect(() => {
    fetchFolders();
  });

  const handleSelect = (folder: RemoteFileMeta) => {
    onSelect(folder);
  };
</script>

<div
  class="flex flex-col gap-3 p-4 bg-theme-surface/50 border border-theme-border rounded-lg"
  transition:slide
>
  <div class="flex justify-between items-center mb-2">
    <h3 class="text-sm font-bold text-theme-primary uppercase tracking-wider">
      Link to Existing Folder
    </h3>
    <button
      class="text-xs text-theme-muted hover:text-theme-text transition-colors"
      onclick={onCancel}
    >
      CANCEL
    </button>
  </div>

  {#if isLoading}
    <div class="flex items-center justify-center py-8">
      <span
        class="icon-[lucide--loader-2] w-6 h-6 animate-spin text-theme-primary"
      ></span>
    </div>
  {:else if error}
    <div
      class="p-3 bg-red-500/10 border border-red-500/20 rounded text-red-500 text-xs flex flex-col gap-2"
    >
      <p>{error}</p>
      <button class="underline text-left" onclick={fetchFolders}>Retry</button>
    </div>
  {:else if folders.length === 0}
    <div class="py-8 text-center text-xs text-theme-muted italic">
      No folders found in CodexCryptica root.
    </div>
  {:else}
    <div
      class="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar"
    >
      {#each folders as folder}
        <button
          class="w-full text-left p-3 rounded bg-theme-bg border border-theme-border hover:border-theme-primary transition-all group"
          onclick={() => handleSelect(folder)}
        >
          <div class="flex justify-between items-center">
            <div class="flex items-center gap-3">
              <span class="icon-[lucide--folder] w-4 h-4 text-theme-primary"
              ></span>
              <span
                class="text-sm font-medium text-theme-text group-hover:text-theme-primary transition-colors"
              >
                {folder.name}
              </span>
            </div>
            <span
              class="icon-[lucide--chevron-right] w-4 h-4 text-theme-muted group-hover:translate-x-1 transition-all"
            ></span>
          </div>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: var(--color-accent-primary);
    border-radius: 10px;
  }
</style>
