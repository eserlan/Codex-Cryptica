<script lang="ts">
  import { canvasRegistry } from "$lib/stores/canvas-registry.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { Search, Plus, Trash2, Edit2, Layout } from "lucide-svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";

  let searchQuery = $state("");
  const activeCanvasId = $derived(page.params.id);

  const filteredCanvases = $derived(
    canvasRegistry.canvases.filter((c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()),
    ),
  );

  async function createNew() {
    const name = prompt(
      "Canvas Name",
      `New Canvas ${canvasRegistry.canvases.length + 1}`,
    );
    if (name) {
      const id = await canvasRegistry.create(name);
      if (id) goto(`/canvas/${id}`);
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

  $effect(() => {
    if (vault.activeVaultId) {
      canvasRegistry.loadForVault(vault.activeVaultId);
    }
  });
</script>

<div
  class="w-64 h-full bg-theme-surface border-r border-theme-border flex flex-col"
>
  <div class="p-4 border-b border-theme-border">
    <div class="flex items-center justify-between mb-4">
      <h2
        class="text-xs font-bold text-theme-primary uppercase tracking-[0.2em]"
      >
        Canvases
      </h2>
      <button
        onclick={createNew}
        class="p-1.5 rounded-md bg-theme-primary/10 text-theme-primary hover:bg-theme-primary hover:text-theme-bg transition-all"
        title="New Canvas"
        aria-label="Create new canvas"
      >
        <Plus class="w-3.5 h-3.5" />
      </button>
    </div>

    <div class="relative">
      <Search
        class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-theme-muted"
      />
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Filter canvases..."
        aria-label="Filter canvases"
        class="w-full bg-theme-bg border border-theme-border rounded-md pl-9 pr-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary transition-colors"
      />
    </div>
  </div>

  <div class="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
    {#each filteredCanvases as canvas}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        onclick={() => goto(`/canvas/${canvas.id}`)}
        onkeydown={(e) => e.key === "Enter" && goto(`/canvas/${canvas.id}`)}
        role="button"
        tabindex="0"
        aria-label="Open canvas {canvas.name}"
        class="w-full text-left p-3 rounded-lg border transition-all group flex items-center gap-3 cursor-pointer
          {activeCanvasId === canvas.id
          ? 'bg-theme-primary/10 border-theme-primary'
          : 'bg-theme-bg border-theme-border hover:border-theme-primary/50'}"
      >
        <Layout
          class="w-4 h-4 shrink-0 {activeCanvasId === canvas.id
            ? 'text-theme-primary'
            : 'text-theme-muted'}"
        />
        <div class="flex-1 min-w-0">
          <div
            class="text-xs font-bold text-theme-text truncate group-hover:text-theme-primary transition-colors"
          >
            {canvas.name}
          </div>
          <div class="text-[9px] text-theme-muted">
            {new Date(canvas.lastModified).toLocaleDateString()}
          </div>
        </div>

        <div
          class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        >
          <button
            onclick={(e) => renameCanvas(canvas.id, canvas.name, e)}
            class="p-1 rounded hover:bg-theme-surface text-theme-muted hover:text-theme-text"
            aria-label={`Rename ${canvas.name}`}
          >
            <Edit2 class="w-3 h-3" />
          </button>
          <button
            onclick={(e) => deleteCanvas(canvas.id, e)}
            class="p-1 rounded hover:bg-red-500/10 text-theme-muted hover:text-red-500"
            aria-label={`Delete ${canvas.name}`}
          >
            <Trash2 class="w-3 h-3" />
          </button>
        </div>
      </div>
    {:else}
      <div class="text-center py-10 px-4">
        <p class="text-xs text-theme-muted">No canvases found</p>
      </div>
    {/each}
  </div>
</div>
