<script lang="ts">
  import { categories } from "$lib/stores/categories.svelte";
  import { getIconClass } from "$lib/utils/icon";
  import { explorerUIStore } from "$lib/stores/ui/explorer-ui.svelte";

  let {
    typeFilters = $bindable(),
    typeCounts,
    allowedTypes = null,
  }: {
    typeFilters: Set<string>;
    typeCounts: Map<string, number>;
    allowedTypes?: string[] | null;
  } = $props();

  const labelFilters = $derived(explorerUIStore.labelFilters);
  const viewMode = $derived(explorerUIStore.explorerViewMode);
  const categoryGroupingDisabled = $derived(typeFilters.size === 1);
  const effectiveViewMode = $derived(
    viewMode === "category" && categoryGroupingDisabled ? "list" : viewMode,
  );

  const allowedTypeSet = $derived.by(() =>
    allowedTypes ? new Set(allowedTypes) : null,
  );

  const visibleCategories = $derived.by(() =>
    categories.list.filter(
      (cat) => !allowedTypeSet || allowedTypeSet.has(cat.id),
    ),
  );

  function toggleTypeFilter(type: string) {
    if (type === "all") {
      typeFilters = new Set();
      explorerUIStore.clearLabelFilters();
      return;
    }

    if (allowedTypeSet && !allowedTypeSet.has(type)) {
      return;
    }

    const newFilters = new Set(typeFilters);
    if (newFilters.has(type)) {
      newFilters.delete(type);
    } else {
      newFilters.add(type);
    }
    typeFilters = newFilters;
  }

  function getIconToggleClasses(active: boolean) {
    return active
      ? "rounded-lg border border-theme-primary bg-theme-primary text-theme-bg shadow-sm transition-all hover:border-theme-secondary hover:bg-theme-secondary"
      : "rounded-lg border border-theme-border bg-theme-bg/50 text-theme-muted transition-all hover:bg-theme-bg hover:text-theme-text";
  }

  function getCategoryGroupToggleClasses(active: boolean, disabled: boolean) {
    if (disabled) {
      return "rounded-lg border border-theme-border/50 bg-theme-bg/30 text-theme-muted/40 cursor-not-allowed";
    }

    return getIconToggleClasses(active);
  }
</script>

<div
  class="flex items-center gap-1 rounded-xl border border-theme-border bg-theme-surface/50 px-2 py-1.5 shadow-sm"
>
  <button
    type="button"
    onclick={() => toggleTypeFilter("all")}
    title="Show all categories"
    aria-label="Show all categories"
    aria-pressed={typeFilters.size === 0}
    class="flex items-center justify-center p-1.5 {getIconToggleClasses(
      typeFilters.size === 0,
    )}"
  >
    <span aria-hidden="true" class="icon-[lucide--layout-grid] w-3.5 h-3.5"
    ></span>
  </button>

  {#each visibleCategories as cat (cat.id)}
    {@const count = typeCounts.get(cat.id) || 0}
    {#if count > 0 || typeFilters.has(cat.id)}
      <button
        type="button"
        onclick={() => toggleTypeFilter(cat.id)}
        title={cat.label}
        aria-label={`Filter by ${cat.label}`}
        aria-pressed={typeFilters.has(cat.id)}
        class="relative flex items-center justify-center p-1.5 {getIconToggleClasses(
          typeFilters.has(cat.id),
        )}"
      >
        <span
          class="{getIconClass(cat.icon)} w-3.5 h-3.5"
          style={typeFilters.has(cat.id) ? undefined : `color: ${cat.color}`}
        ></span>
        {#if count > 0 && !typeFilters.has(cat.id)}
          <span
            class="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-theme-primary/10 text-[7px] font-bold leading-none text-theme-primary"
          >
            {count > 9 ? "9+" : count}
          </span>
        {/if}
      </button>
    {/if}
  {/each}

  <div class="w-px h-3.5 bg-theme-border mx-0.5 opacity-50"></div>

  <button
    type="button"
    onclick={() => explorerUIStore.setExplorerViewMode("list")}
    title="List View"
    aria-label="List View"
    aria-pressed={effectiveViewMode === "list"}
    class="flex items-center justify-center p-1.5 {getIconToggleClasses(
      effectiveViewMode === 'list',
    )}"
  >
    <span aria-hidden="true" class="icon-[lucide--list] w-3.5 h-3.5"></span>
  </button>

  <button
    type="button"
    onclick={() => explorerUIStore.setExplorerViewMode("label")}
    title="Group by Label"
    aria-label="Group by Label"
    aria-pressed={effectiveViewMode === "label"}
    class="flex items-center justify-center p-1.5 {getIconToggleClasses(
      effectiveViewMode === 'label',
    )}"
  >
    <span aria-hidden="true" class="icon-[lucide--tag] w-3.5 h-3.5"></span>
  </button>

  <button
    type="button"
    onclick={() => explorerUIStore.setExplorerViewMode("category")}
    title={categoryGroupingDisabled
      ? "Clear the category filter to group by category"
      : "Group by Category"}
    aria-label="Group by Category"
    aria-pressed={effectiveViewMode === "category"}
    disabled={categoryGroupingDisabled}
    class="flex items-center justify-center p-1.5 {getCategoryGroupToggleClasses(
      effectiveViewMode === 'category',
      categoryGroupingDisabled,
    )}"
  >
    <span aria-hidden="true" class="icon-[lucide--folder-tree] w-3.5 h-3.5"
    ></span>
  </button>
</div>

{#if labelFilters.size > 0}
  <div
    class="mt-3 flex flex-wrap gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200"
  >
    {#each Array.from(labelFilters).sort() as label (label)}
      <div
        class="flex items-center gap-1 px-2 py-0.5 rounded-md bg-theme-primary/10 border border-theme-primary/20 text-[9px] font-bold text-theme-primary uppercase tracking-wider"
      >
        <span>{label}</span>
        <button
          type="button"
          onclick={() => explorerUIStore.removeLabelFilter(label)}
          class="hover:text-theme-text transition-colors flex items-center justify-center"
          aria-label={`Remove ${label} filter`}
        >
          <span aria-hidden="true" class="icon-[lucide--x] w-2.5 h-2.5"></span>
        </button>
      </div>
    {/each}
    <button
      type="button"
      onclick={() => explorerUIStore.clearLabelFilters()}
      class="px-2 py-0.5 text-[9px] font-bold text-theme-muted hover:text-theme-primary uppercase tracking-wider transition-colors"
    >
      Clear All
    </button>
  </div>
{/if}
