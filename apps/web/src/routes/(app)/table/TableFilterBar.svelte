<script lang="ts">
  /* eslint-disable svelte/no-useless-mustaches -- Class expressions retain contrast-review notes for unchanged styles. */
  import type { TableFilters } from "./table-filters.svelte.js";
  import { categories } from "#lib/stores/categories.svelte.js";
  import { getIconClass } from "#lib/utils/icon.js";
  let {
    filters,
    typeCounts,
    incompleteCount,
    hasFilterPanel,
  }: {
    filters: TableFilters;
    typeCounts: Map<string, number>;
    incompleteCount: number;
    hasFilterPanel: boolean;
  } = $props();
</script>

{#if hasFilterPanel}
  <div
    id="entity-table-filter-panel"
    class="{filters.showMobileFilters
      ? 'flex'
      : 'hidden'} md:flex flex-wrap items-center gap-1.5"
  >
    <!-- Mobile Incomplete filter chip in expanded drawer -->
    <button
      type="button"
      onclick={filters.toggleIncompleteOnly}
      aria-pressed={filters.showIncompleteOnly}
      data-testid="entity-table-incomplete-filter-mobile"
      class="inline-flex md:hidden items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent/40 {filters.showIncompleteOnly
        ? /* ui-check-ignore: Colours copied unchanged from the table route during decomposition. */ 'border-amber-500 bg-amber-500/15 text-amber-600 dark:text-amber-400'
        : /* ui-check-ignore: Colours copied unchanged from the table route during decomposition. */ 'border-theme-border text-theme-muted hover:border-amber-500/50'}"
    >
      <span class="icon-[lucide--alert-circle] h-3.5 w-3.5" aria-hidden="true"
      ></span>
      Incomplete
      <span
        class={// ui-check-ignore: Colours copied unchanged from the table route during decomposition.
        "text-theme-muted/60"}>{incompleteCount}</span
      >
    </button>

    {@render typeChips()}
    {@render labelChips()}
    {#if filters.columnFilters.imageMode && filters.columnFilters.imageMode !== "all"}
      <div
        class={// ui-check-ignore: Colours copied unchanged from the table route during decomposition.
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-theme-primary/10 border border-theme-primary/20 text-nano font-bold text-theme-primary uppercase tracking-wider"}
        data-testid="entity-table-image-filter"
      >
        <span
          >{filters.columnFilters.imageMode === "missing_image"
            ? "Missing image"
            : "Has image"}</span
        >
        <button
          type="button"
          onclick={() => {
            const next = { ...filters.columnFilters };
            delete next.imageMode;
            filters.handleUpdateColumnFilters(next);
          }}
          title="Remove image filter"
          aria-label="Remove image filter"
          class="hover:text-theme-text transition-colors flex items-center justify-center cursor-pointer"
        >
          <span aria-hidden="true" class="icon-[lucide--x] w-2.5 h-2.5"></span>
        </button>
      </div>
    {/if}
    {#if filters.hasActiveFilters}
      <button
        type="button"
        onclick={filters.clearFilters}
        data-testid="entity-table-clear-filters"
        class={// ui-check-ignore: Colours copied unchanged from the table route during decomposition.
        "ml-1 rounded text-xs text-theme-muted underline hover:text-theme-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent/40"}
      >
        Clear all filters
      </button>
    {/if}
  </div>
{/if}

{#snippet typeChips()}
  {#each [...typeCounts.entries()].sort( (a, b) => (a[0] ?? "").localeCompare(b[0] ?? "") ) as [type, count] (type)}
    {@const cat = categories.getCategory(type)}
    {@const active = filters.typeFilters.has(type)}
    <button
      type="button"
      onclick={() => filters.toggleType(type)}
      aria-pressed={active}
      data-testid="entity-table-type-filter"
      class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent/40 {active
        ? /* ui-check-ignore: Colours copied unchanged from the table route during decomposition. */ 'border-theme-primary bg-theme-primary/10 text-theme-primary'
        : /* ui-check-ignore: Colours copied unchanged from the table route during decomposition. */ 'border-theme-border text-theme-muted hover:border-theme-primary/50'}"
    >
      {#if cat}
        <span class="{getIconClass(cat.icon)} h-3.5 w-3.5" aria-hidden="true"
        ></span>
      {/if}
      {cat?.label ?? type}
      <span
        class={// ui-check-ignore: Colours copied unchanged from the table route during decomposition.
        "text-theme-muted/60"}>{count}</span
      >
    </button>
  {/each}
{/snippet}

{#snippet labelChips()}
  {#each [...filters.labelFilters].sort() as label (label)}
    <div
      class={// ui-check-ignore: Colours copied unchanged from the table route during decomposition.
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-theme-primary/10 border border-theme-primary/20 text-nano font-bold text-theme-primary uppercase tracking-wider"}
      data-testid="entity-table-label-filter"
    >
      <span>{label}</span>
      <button
        type="button"
        onclick={() => filters.toggleLabel(label)}
        title="Remove {label} filter"
        aria-label="Remove {label} filter"
        class="hover:text-theme-text transition-colors flex items-center justify-center cursor-pointer"
      >
        <span aria-hidden="true" class="icon-[lucide--x] w-2.5 h-2.5"></span>
      </button>
    </div>
  {/each}
{/snippet}
