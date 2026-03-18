<script lang="ts">
  import { canvasRegistry } from "$lib/stores/canvas-registry.svelte";
  import { uiStore } from "$lib/stores/ui.svelte";
  import { Search, Plus, Trash2, Edit2, Layout, X, Check } from "lucide-svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { fade, scale, slide } from "svelte/transition";
  import { tick } from "svelte";

  let searchQuery = $state("");
  const activeCanvasId = $derived(page.params.slug);

  // UI State for inline actions
  let isCreating = $state(false);
  let newCanvasName = $state("");
  let renamingId = $state<string | null>(null);
  let renamingName = $state("");

  const filteredCanvases = $derived(
    canvasRegistry.allCanvases.filter((c) =>
      (c.name ?? "").toLowerCase().includes(searchQuery.toLowerCase()),
    ),
  );

  function close() {
    uiStore.showCanvasSelector = false;
    isCreating = false;
    renamingId = null;
  }

  async function startCreate() {
    isCreating = true;
    newCanvasName = `New Workspace ${canvasRegistry.allCanvases.length + 1}`;
    await tick();
    const input = document.getElementById(
      "new-canvas-input",
    ) as HTMLInputElement;
    input?.select();
  }

  async function confirmCreate() {
    if (!newCanvasName.trim()) return;
    const slug = await canvasRegistry.create(newCanvasName.trim());
    await tick();
    if (slug) {
      isCreating = false;
      goto(`/canvas/${slug}`);
      close();
    }
  }

  async function startRename(id: string, currentName: string, e: MouseEvent) {
    e.stopPropagation();
    renamingId = id;
    renamingName = currentName;
    await tick();
    const input = document.getElementById(
      `rename-input-${id}`,
    ) as HTMLInputElement;
    input?.select();
  }

  async function confirmRename(id: string) {
    if (!renamingName.trim()) {
      renamingId = null;
      return;
    }
    const oldCanvas = canvasRegistry.allCanvases.find((c) => c.id === id);
    const wasActive =
      activeCanvasId === oldCanvas?.slug || activeCanvasId === id;

    const newSlug = await canvasRegistry.rename(id, renamingName.trim());

    if (wasActive && newSlug && activeCanvasId !== newSlug) {
      goto(`/canvas/${newSlug}`, { replaceState: true });
    }
    renamingId = null;
  }

  async function deleteCanvas(id: string, e: MouseEvent) {
    e.stopPropagation();
    const canvas = canvasRegistry.allCanvases.find((c) => c.id === id);
    const slug = canvas?.slug;

    await canvasRegistry.delete(id);

    // If we deleted the current canvas, go back to root
    if (activeCanvasId === slug || activeCanvasId === id) {
      goto("/canvas");
    }
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      close();
    }
  }
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
      class="w-full max-w-xl bg-theme-surface border border-theme-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] font-body"
      transition:scale={{ duration: 200, start: 0.95 }}
    >
      <!-- Header -->
      <div
        class="p-6 border-b border-theme-border flex items-center justify-between bg-theme-bg/50"
      >
        <div>
          <h2
            class="text-lg font-bold text-theme-text font-header uppercase tracking-widest flex items-center gap-2"
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
      <div
        class="p-4 bg-theme-surface border-b border-theme-border flex flex-col gap-3"
      >
        <div class="flex gap-2">
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
            onclick={startCreate}
            disabled={isCreating}
            class="px-4 py-2 rounded-lg bg-theme-primary text-theme-bg font-bold text-xs uppercase font-header tracking-widest hover:brightness-110 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            <Plus class="w-4 h-4" />
            Create New
          </button>
        </div>

        {#if isCreating}
          <div
            transition:slide
            class="flex gap-2 p-3 bg-theme-primary/5 border border-theme-primary/20 rounded-xl items-center"
          >
            <div
              class="w-8 h-8 rounded-lg bg-theme-primary/20 flex items-center justify-center shrink-0"
            >
              <Plus class="w-4 h-4 text-theme-primary" />
            </div>
            <input
              id="new-canvas-input"
              type="text"
              bind:value={newCanvasName}
              placeholder="Workspace Name..."
              class="flex-1 bg-theme-bg border border-theme-border rounded-lg px-3 py-1.5 text-sm text-theme-text focus:outline-none focus:border-theme-primary"
              onkeydown={(e) => e.key === "Enter" && confirmCreate()}
            />
            <button
              onclick={confirmCreate}
              class="p-2 bg-theme-primary text-theme-bg rounded-lg hover:brightness-110"
              title="Confirm Creation"
            >
              <Check class="w-4 h-4" />
            </button>
            <button
              onclick={() => (isCreating = false)}
              class="p-2 text-theme-muted hover:text-theme-text"
              title="Cancel"
            >
              <X class="w-4 h-4" />
            </button>
          </div>
        {/if}
      </div>

      <!-- List -->
      <div
        class="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-theme-bg/20"
      >
        {#each filteredCanvases as canvas}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            onclick={() => {
              if (renamingId === canvas.id) return;
              goto(`/canvas/${canvas.slug}`);
              close();
            }}
            onkeydown={(e) =>
              e.key === "Enter" &&
              renamingId !== canvas.id &&
              (goto(`/canvas/${canvas.slug}`), close())}
            role="button"
            tabindex="0"
            aria-label="Open canvas {canvas.name}"
            class="w-full text-left p-4 rounded-xl border transition-all group flex items-center gap-4 cursor-pointer
              {activeCanvasId === canvas.slug
              ? 'bg-theme-primary/10 border-theme-primary shadow-[0_0_15px_rgba(var(--theme-primary-rgb),0.1)]'
              : 'bg-theme-surface border-theme-border hover:border-theme-primary/50 hover:bg-theme-bg/50 shadow-sm'}"
          >
            <div
              class="w-10 h-10 rounded-lg bg-theme-bg flex items-center justify-center shrink-0 border border-theme-border group-hover:border-theme-primary/30 transition-colors"
            >
              <Layout
                class="w-5 h-5 {activeCanvasId === canvas.slug
                  ? 'text-theme-primary'
                  : 'text-theme-muted'}"
              />
            </div>

            <div class="flex-1 min-w-0">
              {#if renamingId === canvas.id}
                <div
                  class="flex gap-2 items-center"
                  onclick={(e) => e.stopPropagation()}
                  onkeydown={(e) => e.stopPropagation()}
                  role="none"
                >
                  <input
                    id={`rename-input-${canvas.id}`}
                    type="text"
                    bind:value={renamingName}
                    class="flex-1 bg-theme-bg border border-theme-border rounded-lg px-2 py-1 text-sm text-theme-text focus:outline-none focus:border-theme-primary"
                    onkeydown={(e) => {
                      if (e.key === "Enter") confirmRename(canvas.id);
                      if (e.key === "Escape") renamingId = null;
                    }}
                  />
                  <button
                    onclick={() => confirmRename(canvas.id)}
                    class="p-1.5 bg-theme-primary text-theme-bg rounded-lg hover:brightness-110"
                  >
                    <Check class="w-3 h-3" />
                  </button>
                </div>
              {:else}
                <div class="flex items-center gap-2">
                  <span
                    class="text-sm font-bold text-theme-text truncate group-hover:text-theme-primary transition-colors"
                  >
                    {canvas.name}
                  </span>
                  {#if activeCanvasId === canvas.slug}
                    <span
                      class="px-1.5 py-0.5 rounded bg-theme-primary text-[8px] text-theme-bg font-bold uppercase font-header tracking-widest"
                      >Active</span
                    >
                  {/if}
                </div>
                <div class="text-[10px] text-theme-muted font-mono mt-0.5">
                  Last updated: {new Date(
                    canvas.lastModified || Date.now(),
                  ).toLocaleString()}
                </div>
              {/if}
            </div>

            <div
              class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            >
              {#if renamingId !== canvas.id}
                <button
                  onclick={(e) => startRename(canvas.id, canvas.name, e)}
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
              {/if}
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
