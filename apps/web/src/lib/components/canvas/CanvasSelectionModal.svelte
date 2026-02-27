<script lang="ts">
  import { canvasRegistry } from "$lib/stores/canvas-registry.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { uiStore } from "$lib/stores/ui.svelte";
  import { Search, Plus, Trash2, Edit2, Layout, X } from "lucide-svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { fade, scale } from "svelte/transition";

  let searchQuery = $state("");
  const activeCanvasId = $derived(page.params.id);

  const filteredCanvases = $derived(
    canvasRegistry.canvases.filter((c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()),
    ),
  );

  function close() {
    uiStore.showCanvasSelector = false;
  }

  async function createNew() {
    const name = prompt(
      "Canvas Name",
      `New Canvas ${canvasRegistry.canvases.length + 1}`,
    );
    if (name) {
      const id = await canvasRegistry.create(name);
      if (id) {
        goto(`/canvas/${id}`);
        close();
      }
    }
  }

  async function deleteCanvas(id: string, e: MouseEvent) {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this canvas?")) {
      await canvasRegistry.delete(id);
      if (activeCanvasId === id) goto("/canvas");
    }
  }

  async function renameCanvas(id: string, currentName: string, e: MouseEvent) {
    e.stopPropagation();
    const newName = prompt("Rename Canvas", currentName);
    if (newName && newName !== currentName) {
      await canvasRegistry.rename(id, newName);
    }
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      close();
    }
  }

  $effect(() => {
    if (vault.activeVaultId && uiStore.showCanvasSelector) {
      canvasRegistry.loadForVault(vault.activeVaultId);
    }
  });
</script>

{#if uiStore.showCanvasSelector}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
    onclick={handleBackdropClick}
    onkeydown={(e) => e.key === "Escape" && close()}
    transition:fade={{ duration: 200 }}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div
      class="w-full max-w-xl bg-theme-surface border border-theme-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
      transition:scale={{ duration: 200, start: 0.95 }}
    >
      <!-- Header -->
      <div
        class="p-6 border-b border-theme-border flex items-center justify-between bg-theme-bg/50"
      >
        <div>
          <h2
            class="text-lg font-bold text-theme-text font-mono uppercase tracking-widest flex items-center gap-2"
          >
            <Layout class="w-5 h-5 text-theme-primary" />
            Canvas Registry
          </h2>
          <p
            class="text-[10px] text-theme-muted uppercase tracking-tighter mt-1"
          >
            Manage and switch between your spatial workspaces
          </p>
        </div>
        <button
          onclick={close}
          class="p-2 rounded-lg hover:bg-theme-bg text-theme-muted hover:text-theme-text transition-colors"
          aria-label="Close modal"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Search & Controls -->
      <div class="p-4 bg-theme-surface border-b border-theme-border flex gap-2">
        <div class="relative flex-1">
          <Search
            class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-muted"
          />
          <input
            type="text"
            bind:value={searchQuery}
            placeholder="Filter workspaces..."
            aria-label="Filter canvases"
            class="w-full bg-theme-bg border border-theme-border rounded-lg pl-10 pr-4 py-2 text-sm text-theme-text focus:outline-none focus:border-theme-primary transition-all shadow-inner"
          />
        </div>
        <button
          onclick={createNew}
          class="px-4 py-2 rounded-lg bg-theme-primary text-theme-bg font-bold text-xs uppercase tracking-widest hover:brightness-110 transition-all flex items-center gap-2"
        >
          <Plus class="w-4 h-4" />
          Create New
        </button>
      </div>

      <!-- List -->
      <div
        class="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-theme-bg/20"
      >
        {#each filteredCanvases as canvas}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            onclick={() => {
              goto(`/canvas/${canvas.id}`);
              close();
            }}
            onkeydown={(e) =>
              e.key === "Enter" && (goto(`/canvas/${canvas.id}`), close())}
            role="button"
            tabindex="0"
            aria-label="Open canvas {canvas.name}"
            class="w-full text-left p-4 rounded-xl border transition-all group flex items-center gap-4 cursor-pointer
              {activeCanvasId === canvas.id
              ? 'bg-theme-primary/10 border-theme-primary shadow-[0_0_15px_rgba(var(--theme-primary-rgb),0.1)]'
              : 'bg-theme-surface border-theme-border hover:border-theme-primary/50 hover:bg-theme-bg/50 shadow-sm'}"
          >
            <div
              class="w-10 h-10 rounded-lg bg-theme-bg flex items-center justify-center shrink-0 border border-theme-border group-hover:border-theme-primary/30 transition-colors"
            >
              <Layout
                class="w-5 h-5 {activeCanvasId === canvas.id
                  ? 'text-theme-primary'
                  : 'text-theme-muted'}"
              />
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span
                  class="text-sm font-bold text-theme-text truncate group-hover:text-theme-primary transition-colors"
                >
                  {canvas.name}
                </span>
                {#if activeCanvasId === canvas.id}
                  <span
                    class="px-1.5 py-0.5 rounded bg-theme-primary text-[8px] text-theme-bg font-bold uppercase tracking-widest"
                    >Active</span
                  >
                {/if}
              </div>
              <div class="text-[10px] text-theme-muted font-mono mt-0.5">
                Last updated: {new Date(canvas.lastModified).toLocaleString()}
              </div>
            </div>

            <div
              class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            >
              <button
                onclick={(e) => renameCanvas(canvas.id, canvas.name, e)}
                class="p-2 rounded-lg hover:bg-theme-bg text-theme-muted hover:text-theme-text transition-colors"
                title="Rename Workspace"
                aria-label={`Rename ${canvas.name}`}
              >
                <Edit2 class="w-4 h-4" />
              </button>
              <button
                onclick={(e) => deleteCanvas(canvas.id, e)}
                class="p-2 rounded-lg hover:bg-red-500/10 text-theme-muted hover:text-red-500 transition-colors"
                title="Delete Workspace"
                aria-label={`Delete ${canvas.name}`}
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
        {:else}
          <div class="text-center py-16 px-4">
            <div
              class="w-16 h-16 rounded-full bg-theme-surface border border-theme-border flex items-center justify-center mx-auto mb-4 text-theme-muted opacity-20"
            >
              <Layout class="w-8 h-8" />
            </div>
            <p
              class="text-sm text-theme-muted font-mono uppercase tracking-widest"
            >
              No workspaces found
            </p>
            {#if searchQuery}
              <button
                onclick={() => (searchQuery = "")}
                class="text-[10px] text-theme-primary mt-2 uppercase tracking-widest hover:underline"
                >Clear filter</button
              >
            {/if}
          </div>
        {/each}
      </div>

      <!-- Footer -->
      <div
        class="p-4 bg-theme-bg/50 border-t border-theme-border text-[9px] text-theme-muted font-mono uppercase tracking-[0.2em] flex justify-between"
      >
        <span>{filteredCanvases.length} Workspaces Available</span>
        <span>Codex Spatial Protocol v1.0</span>
      </div>
    </div>
  </div>
{/if}

<style>
  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: var(--theme-border);
    border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: var(--theme-primary);
  }
</style>
