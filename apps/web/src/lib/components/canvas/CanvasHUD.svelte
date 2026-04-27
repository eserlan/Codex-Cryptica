<script lang="ts">
  import CategoryFilter from "$lib/components/labels/CategoryFilter.svelte";
  import { uiStore } from "$lib/stores/ui.svelte";
  import { canvasRegistry } from "$lib/stores/canvas-registry.svelte";

  let { 
    canvasName, 
    activeCategories, 
    onToggleCategory, 
    onClearCategories 
  } = $props<{
    canvasName: string;
    activeCategories: Set<string>;
    onToggleCategory: (categoryId: string) => void;
    onClearCategories: () => void;
  }>();
</script>

<div
  class="absolute top-6 left-6 z-40 flex flex-col items-start gap-2 pointer-events-none select-none"
>
  <button
    type="button"
    onclick={() => (uiStore.showCanvasSelector = true)}
    title="Manage canvases"
    class="bg-theme-surface/80 backdrop-blur-md border border-theme-primary/30 px-5 py-2 shadow-[0_0_20px_rgba(var(--theme-primary-rgb),0.15)] pointer-events-auto transition-all hover:border-theme-primary/60 group flex items-center gap-2"
  >
    <span
      class="text-xs font-black text-theme-primary uppercase tracking-[0.4em] group-hover:text-theme-accent transition-colors"
    >
      {canvasName || "Untitled Workspace"}
    </span>
    <span
      class="icon-[lucide--layout-grid] w-3 h-3 text-theme-primary/50 group-hover:text-theme-accent transition-colors shrink-0"
    ></span>
  </button>

  <CategoryFilter
    {activeCategories}
    onToggle={onToggleCategory}
    onClear={onClearCategories}
  />

  {#if canvasRegistry.status === "saving"}
    <div
      class="flex items-center gap-2 px-3 py-1 bg-theme-primary/10 border border-theme-primary/20 backdrop-blur-sm animate-pulse"
    >
      <span class="icon-[lucide--save] w-3 h-3 text-theme-primary"></span>
      <span
        class="text-[8px] font-bold text-theme-primary tracking-[0.2em] uppercase"
      >
        Syncing...
      </span>
    </div>
  {/if}
</div>
