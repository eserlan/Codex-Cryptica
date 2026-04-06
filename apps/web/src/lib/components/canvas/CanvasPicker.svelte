<script lang="ts">
  import { canvasRegistry } from "$lib/stores/canvas-registry.svelte";

  let {
    onSelect,
    onCreateNew,
    onChooseFull,
  }: {
    onSelect: (canvasId: string) => void;
    onCreateNew: () => void;
    onChooseFull?: () => void;
  } = $props();

  let recentCanvases = $derived(canvasRegistry.allCanvases.slice(0, 5));
  let hasMoreCanvases = $derived(canvasRegistry.allCanvases.length > 5);
  let noCanvases = $derived(canvasRegistry.allCanvases.length === 0);
</script>

<div
  role="menu"
  aria-label="Add to canvas"
  data-testid="canvas-picker"
  class="bg-theme-surface border border-theme-border shadow-2xl rounded overflow-hidden w-max flex flex-col"
>
  {#if noCanvases}
    <button
      role="menuitem"
      data-testid="canvas-picker-create"
      class="w-full text-left px-4 py-2 text-sm text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary transition whitespace-nowrap"
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
        class="w-full text-left px-4 py-2 text-sm text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary transition border-t border-theme-border first:border-t-0 whitespace-nowrap"
        onclick={() => canvas.id && onSelect(canvas.id)}
        aria-label="Add to {canvas.name || 'Canvas'}"
      >
        {canvas.name || "Untitled Canvas"}
      </button>
    {/each}

    {#if hasMoreCanvases}
      <button
        role="menuitem"
        class="w-full text-left px-4 py-2 text-sm text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary transition border-t border-theme-border whitespace-nowrap"
        onclick={onChooseFull}
        aria-label="Choose Canvas"
      >
        Choose Canvas...
      </button>
    {/if}

    <button
      role="menuitem"
      data-testid="canvas-picker-create"
      class="w-full text-left px-4 py-2 text-sm text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary transition border-t border-theme-border whitespace-nowrap"
      onclick={onCreateNew}
      aria-label="Create New Canvas"
    >
      + New Canvas
    </button>
  {/if}
</div>
