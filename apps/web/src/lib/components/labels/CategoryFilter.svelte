<script lang="ts">
  import { categories } from "$lib/stores/categories.svelte";
  import { getIconClass } from "$lib/utils/icon";
  import { LayoutGrid, Filter } from "lucide-svelte";

  let {
    activeCategories,
    onToggle,
    onClear,
  }: {
    activeCategories: Set<string>;
    onToggle: (categoryId: string) => void;
    onClear: () => void;
  } = $props();
</script>

<div
  class="flex items-center gap-1 px-2 py-1.5 bg-theme-surface/80 backdrop-blur border border-theme-border rounded shadow-lg"
  data-testid="category-filter"
>
  <Filter class="w-3 h-3 text-theme-muted shrink-0 mr-0.5" />

  <!-- All / Clear button -->
  <button
    onclick={onClear}
    title="Show all types"
    aria-label="Show all types"
    class="p-1.5 rounded-md flex items-center justify-center transition-all {activeCategories.size ===
    0
      ? 'bg-theme-primary text-theme-bg shadow-sm scale-110'
      : 'text-theme-muted hover:text-theme-text hover:bg-theme-primary/10'}"
    data-testid="category-filter-all"
  >
    <LayoutGrid class="w-3.5 h-3.5" />
  </button>

  <!-- Per-category icon buttons -->
  {#each categories.list as cat (cat.id)}
    <button
      onclick={() => onToggle(cat.id)}
      title={cat.label}
      aria-label={`Filter by ${cat.label}`}
      aria-pressed={activeCategories.has(cat.id)}
      class="p-1.5 rounded-md flex items-center justify-center transition-all {activeCategories.has(
        cat.id,
      )
        ? 'bg-theme-primary text-theme-bg shadow-sm scale-110'
        : 'text-theme-muted hover:text-theme-text hover:bg-theme-primary/10'}"
      data-testid="category-filter-{cat.id}"
    >
      <span
        class="{getIconClass(cat.icon)} w-3.5 h-3.5"
        style={activeCategories.has(cat.id) ? undefined : `color: ${cat.color}`}
      ></span>
    </button>
  {/each}
</div>
