<script lang="ts">
  import { timelineStore } from "$lib/stores/timeline.svelte";
  import { categories } from "$lib/stores/categories.svelte";
</script>

<!--
  FR-013: On mobile the filter bar is collapsed by default.
  The toggle button is rendered only on small screens (md:hidden).
  On desktop (md+) the filters are always visible.
-->

<!-- Mobile toggle row -->
<div
  class="flex items-center gap-2 md:hidden mb-2"
  data-testid="filter-bar-toggle-row"
>
  <button
    type="button"
    aria-label={timelineStore.filterBarCollapsed
      ? "Expand filters"
      : "Collapse filters"}
    aria-expanded={!timelineStore.filterBarCollapsed}
    aria-controls="timeline-filter-bar-body"
    data-testid="filter-bar-toggle"
    onclick={() => timelineStore.toggleFilterBar()}
    class="relative flex items-center gap-1.5 rounded-md border border-theme-border px-2 py-1 text-[10px] font-mono uppercase tracking-widest text-theme-muted transition-colors hover:border-theme-primary/40 hover:text-theme-text"
  >
    <span class="icon-[lucide--sliders-horizontal] h-3 w-3" aria-hidden="true"
    ></span>
    Filters
    <!-- Active-filter indicator dot (FR-013) -->
    {#if timelineStore.hasActiveFilters && timelineStore.filterBarCollapsed}
      <span
        class="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-theme-primary shadow-sm"
        aria-label="Active filters"
        data-testid="active-filter-indicator"
      ></span>
    {/if}
  </button>

  {#if timelineStore.hasActiveFilters && !timelineStore.filterBarCollapsed}
    <button
      type="button"
      onclick={() => timelineStore.clearFilters()}
      class="text-red-700 hover:text-red-500 uppercase tracking-widest transition-colors font-bold font-header text-[10px]"
    >
      Clear All
    </button>
  {/if}
</div>

<!-- Filter body: always visible on desktop, toggled on mobile -->
<div
  id="timeline-filter-bar-body"
  data-testid="filter-bar-body"
  class={[
    "flex flex-wrap items-center gap-4 text-[10px] font-mono",
    // Mobile: show/hide based on collapsed state
    timelineStore.filterBarCollapsed ? "hidden md:flex" : "flex",
  ]}
>
  <!-- Type Filter -->
  <div class="flex items-center gap-2">
    <span class="text-theme-muted uppercase tracking-widest">Type:</span>
    <select
      aria-label="Filter Timeline by Type"
      bind:value={timelineStore.filterType}
      class="bg-theme-bg border border-theme-border rounded px-2 py-1 text-theme-text outline-none focus:border-theme-primary transition-colors"
    >
      <option value={null}>ALL TYPES</option>
      {#each categories.list as cat}
        <option value={cat.id}>{cat.label.toUpperCase()}</option>
      {/each}
    </select>
  </div>

  <div class="flex items-center gap-2">
    <span class="text-theme-muted uppercase tracking-widest">Label:</span>
    <select
      aria-label="Filter timeline by label"
      bind:value={timelineStore.selectedLabel}
      class="bg-theme-bg border border-theme-border rounded px-2 py-1 text-theme-text outline-none focus:border-theme-primary transition-colors"
    >
      <option value={null}>ALL LABELS</option>
      {#each timelineStore.availableLabels as label (label)}
        <option value={label}>{label.toUpperCase()}</option>
      {/each}
    </select>
  </div>

  <div class="flex items-center gap-2">
    <span class="text-theme-muted uppercase tracking-widest">Related:</span>
    <select
      aria-label="Filter timeline by related entity"
      bind:value={timelineStore.selectedRelatedEntityId}
      class="max-w-44 bg-theme-bg border border-theme-border rounded px-2 py-1 text-theme-text outline-none focus:border-theme-primary transition-colors"
    >
      <option value={null}>ALL LINKS</option>
      {#each timelineStore.availableRelatedEntities as entity (entity.id)}
        <option value={entity.id}>{entity.title}</option>
      {/each}
    </select>
  </div>

  <!-- Undated Toggle -->
  <label class="flex items-center gap-2 cursor-pointer group">
    <input
      type="checkbox"
      aria-label="Include Undated Entries"
      bind:checked={timelineStore.includeUndated}
      class="sr-only"
    />
    <div
      class="w-8 h-4 bg-theme-surface border border-theme-border rounded-full relative transition-colors {timelineStore.includeUndated
        ? 'bg-theme-primary/20 border-theme-primary/50'
        : ''}"
    >
      <div
        class="absolute top-0.5 left-0.5 w-2.5 h-2.5 rounded-full bg-theme-muted transition-all {timelineStore.includeUndated
          ? 'translate-x-4 bg-theme-primary'
          : ''}"
        style:box-shadow={timelineStore.includeUndated
          ? "var(--theme-glow)"
          : undefined}
      ></div>
    </div>
    <span
      class="uppercase tracking-widest text-theme-muted group-hover:text-theme-text transition-colors"
      >Undated</span
    >
  </label>

  <!-- Clear (desktop inline / mobile expanded state) -->
  {#if timelineStore.hasActiveFilters}
    <button
      onclick={() => timelineStore.clearFilters()}
      class="text-red-700 hover:text-red-500 uppercase tracking-widest transition-colors font-bold font-header"
    >
      Clear All
    </button>
  {/if}
</div>
