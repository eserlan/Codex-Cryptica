<script lang="ts">
  import { fade, fly } from "svelte/transition";

  interface Props {
    onSelect: (folder: { id: string; name: string }) => void;
    onCancel: () => void;
    backend: any;
  }

  let { onSelect, onCancel, backend }: Props = $props();

  let folders = $state<Array<{ id: string; name: string }>>([]);
  let isLoading = $state(true);
  let error = $state<string | null>(null);
  let parentId = $state<string | undefined>(undefined);
  let path = $state<Array<{ id: string; name: string }>>([]);

  async function loadFolders() {
    isLoading = true;
    error = null;
    try {
      folders = await backend.listFolders(parentId);
    } catch (e: any) {
      error = e.message;
    } finally {
      isLoading = false;
    }
  }

  function navigate(id: string, name: string) {
    path.push({ id, name });
    parentId = id;
    loadFolders();
  }

  function _goBack() {
    path.pop();
    parentId = path[path.length - 1]?.id;
    loadFolders();
  }

  function goHome() {
    path = [];
    parentId = undefined;
    loadFolders();
  }

  $effect(() => {
    loadFolders();
  });
</script>

<div
  class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
  transition:fade
>
  <div
    class="bg-theme-bg border border-theme-border rounded-lg shadow-2xl w-full max-w-md flex flex-col max-h-[80vh]"
    transition:fly={{ y: 20 }}
  >
    <div
      class="p-4 border-b border-theme-border flex justify-between items-center"
    >
      <h3
        class="text-sm font-bold uppercase tracking-widest text-theme-primary"
      >
        Select GDrive Folder
      </h3>
      <button
        class="text-theme-muted hover:text-theme-primary transition-colors"
        onclick={onCancel}
        aria-label="Close folder picker"
      >
        <span class="icon-[lucide--x] w-5 h-5"></span>
      </button>
    </div>

    <div
      class="p-2 bg-theme-surface/50 border-b border-theme-border flex items-center gap-2 overflow-x-auto text-[10px] font-mono"
    >
      <button
        class="hover:text-theme-primary transition-colors"
        onclick={goHome}>ROOT</button
      >
      {#each path as step}
        <span class="opacity-30">/</span>
        <button
          class="hover:text-theme-primary transition-colors truncate max-w-[100px]"
          onclick={() => {
            const index = path.indexOf(step);
            path = path.slice(0, index + 1);
            parentId = step.id;
            loadFolders();
          }}>{step.name}</button
        >
      {/each}
    </div>

    <div class="flex-1 overflow-y-auto custom-scrollbar p-2 min-h-[300px]">
      {#if isLoading}
        <div class="h-full flex items-center justify-center">
          <div
            class="w-6 h-6 border-2 border-theme-primary border-t-transparent rounded-full animate-spin"
          ></div>
        </div>
      {:else if error}
        <div class="p-4 text-theme-accent text-xs text-center">
          {error}
        </div>
      {:else if folders.length === 0}
        <div class="p-8 text-theme-muted text-xs text-center italic">
          No subfolders found.
        </div>
      {:else}
        <div class="space-y-1">
          {#each folders as folder}
            <div class="flex items-center gap-1">
              <button
                class="flex-1 text-left p-3 hover:bg-theme-primary/10 rounded flex items-center gap-3 transition-all group"
                onclick={() => navigate(folder.id, folder.name)}
              >
                <span
                  class="icon-[lucide--folder] w-4 h-4 text-theme-muted group-hover:text-theme-primary"
                ></span>
                <span class="text-xs font-medium truncate">{folder.name}</span>
              </button>
              <button
                class="p-3 text-theme-primary font-bold uppercase text-[10px] tracking-wider hover:bg-theme-primary/20 rounded transition-all"
                onclick={() => onSelect(folder)}
              >
                Select
              </button>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <div class="p-4 border-t border-theme-border flex justify-end gap-3">
      <button
        class="px-4 py-2 text-xs font-bold uppercase text-theme-muted hover:text-theme-text transition-colors"
        onclick={onCancel}
      >
        Cancel
      </button>
    </div>
  </div>
</div>
