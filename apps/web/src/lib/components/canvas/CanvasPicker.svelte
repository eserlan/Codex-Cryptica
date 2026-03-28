<script lang="ts">
  import { canvasRegistry } from "$lib/stores/canvas-registry.svelte";

  let {
    onSelect,
    onCreateNew,
  }: {
    onSelect: (canvasId: string) => void;
    onCreateNew: () => void;
  } = $props();

  let recentCanvases = $derived(canvasRegistry.allCanvases.slice(0, 5));
  let hasMoreCanvases = $derived(canvasRegistry.allCanvases.length > 5);
  let noCanvases = $derived(canvasRegistry.allCanvases.length === 0);
</script>

<div
  role="menu"
  aria-label="Add to canvas"
  data-testid="canvas-picker"
  class="fixed z-[110] bg-theme-surface border border-theme-border shadow-2xl rounded overflow-hidden min-w-[200px]"
>
  {#if noCanvases}
    <button
      role="menuitem"
      data-testid="canvas-picker-create"
      class="w-full text-left px-4 py-2 text-sm text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary transition"
      onclick={onCreateNew}
      aria-label="Create New Canvas"
    >
      + Create New Canvas
    </button>
  {:else}
    {#each recentCanvases as canvas (canvas.id)}
      <button
        role="menuitem"
        data-testid="canvas-picker-item"
        data-canvas-id={canvas.id}
        class="w-full text-left px-4 py-2 text-sm text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary transition border-t border-theme-border first:border-t-0"
        onclick={() => onSelect(canvas.id)}
        aria-label="Add to {canvas.name}"
      >
        {canvas.name}
      </button>
    {/each}

    {#if hasMoreCanvases}
      <div
        class="w-full text-left px-4 py-2 text-sm text-theme-text/50 border-t border-theme-border"
      >
        {canvasRegistry.allCanvases.length} canvases total
      </div>
    {/if}

    <button
      role="menuitem"
      data-testid="canvas-picker-create"
      class="w-full text-left px-4 py-2 text-sm text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary transition border-t border-theme-border"
      onclick={onCreateNew}
      aria-label="Create New Canvas"
    >
      + New Canvas
    </button>
  {/if}
</div>
