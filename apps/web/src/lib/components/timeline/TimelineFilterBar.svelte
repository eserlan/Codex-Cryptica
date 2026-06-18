<script lang="ts">
  import { timelineStore } from "$lib/stores/timeline.svelte";
  import { categories } from "$lib/stores/categories.svelte";
  import { getIconClass } from "$lib/utils/icons";

  const typeCounts = $derived.by(() => {
    const counts = new Map<string, number>();
    for (const entry of timelineStore.calendarEntries) {
      counts.set(entry.entityType, (counts.get(entry.entityType) ?? 0) + 1);
    }
    return counts;
  });

  function toggleType(typeId: string) {
    if (typeId === "all") {
      timelineStore.typeFilters = new Set();
      return;
    }
    const next = new Set(timelineStore.typeFilters);
    if (next.has(typeId)) {
      next.delete(typeId);
    } else {
      next.add(typeId);
    }
    timelineStore.typeFilters = next;
  }

  function toggleLabel(label: string) {
    const next = new Set(timelineStore.labelFilters);
    if (next.has(label)) {
      next.delete(label);
    } else {
      next.add(label);
    }
    timelineStore.labelFilters = next;
  }

  function iconToggleClass(active: boolean) {
    return active
      ? "rounded-lg border border-theme-primary bg-theme-primary text-theme-bg shadow-sm transition-all hover:border-theme-secondary hover:bg-theme-secondary"
      : "rounded-lg border border-theme-border bg-theme-bg/50 text-theme-muted transition-all hover:bg-theme-bg hover:text-theme-text";
  }
</script>

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
    {#if timelineStore.hasActiveFilters && timelineStore.filterBarCollapsed}
      <span
        class="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-theme-primary shadow-sm"
        aria-label="Active filters"
        data-testid="active-filter-indicator"
      ></span>
    {/if}
  </button>
</div>

<!-- Filter body -->
<div
  id="timeline-filter-bar-body"
  data-testid="filter-bar-body"
  class={[
    "flex flex-col gap-2",
    timelineStore.filterBarCollapsed ? "hidden md:flex" : "flex",
  ]}
>
  <!-- Type icon toggles (same pattern as EntityListFilterBar) -->
  <div
    class="flex items-center gap-1 rounded-xl border border-theme-border bg-theme-surface/50 px-2 py-1.5 shadow-sm"
  >
    <!-- All -->
    <button
      type="button"
      onclick={() => toggleType("all")}
      title="Show all types"
      aria-label="Show all types"
      aria-pressed={timelineStore.typeFilters.size === 0}
      class="flex items-center justify-center p-1.5 {iconToggleClass(
        timelineStore.typeFilters.size === 0,
      )}"
    >
      <span class="icon-[lucide--layout-grid] w-3.5 h-3.5"></span>
    </button>

    {#each categories.list as cat (cat.id)}
      {@const count = typeCounts.get(cat.id) ?? 0}
      {#if count > 0 || timelineStore.typeFilters.has(cat.id)}
        <button
          type="button"
          onclick={() => toggleType(cat.id)}
          title={cat.label}
          aria-label={`Filter by ${cat.label}`}
          aria-pressed={timelineStore.typeFilters.has(cat.id)}
          class="relative flex items-center justify-center p-1.5 {iconToggleClass(
            timelineStore.typeFilters.has(cat.id),
          )}"
        >
          <span
            class="{getIconClass(cat.icon)} w-3.5 h-3.5"
            style={timelineStore.typeFilters.has(cat.id)
              ? undefined
              : `color: ${cat.color}`}
          ></span>
          {#if count > 0 && !timelineStore.typeFilters.has(cat.id)}
            <span
              class="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-theme-primary/10 text-[7px] font-bold leading-none text-theme-primary"
            >
              {count > 9 ? "9+" : count}
            </span>
          {/if}
        </button>
      {/if}
    {/each}

    {#if timelineStore.availableLabels.length > 0}
      <div class="w-px h-3.5 bg-theme-border mx-0.5 opacity-50"></div>

      <!-- Undated toggle -->
      <button
        type="button"
        onclick={() =>
          (timelineStore.includeUndated = !timelineStore.includeUndated)}
        title="Include undated entries"
        aria-label="Include undated entries"
        aria-pressed={timelineStore.includeUndated}
        class="flex items-center justify-center p-1.5 {iconToggleClass(
          timelineStore.includeUndated,
        )}"
      >
        <span class="icon-[lucide--calendar-x-2] w-3.5 h-3.5"></span>
      </button>
    {/if}
  </div>

  <!-- Label pills (shown when labels exist) -->
  {#if timelineStore.availableLabels.length > 0}
    <div class="flex flex-wrap gap-1">
      {#each timelineStore.availableLabels as label (label)}
        <button
          type="button"
          onclick={() => toggleLabel(label)}
          aria-pressed={timelineStore.labelFilters.has(label)}
          class={[
            "px-2 py-0.5 rounded-md border text-[9px] font-bold uppercase tracking-wider transition-colors",
            timelineStore.labelFilters.has(label)
              ? "bg-theme-primary/10 border-theme-primary/20 text-theme-primary"
              : "border-theme-border/60 text-theme-muted hover:border-theme-primary/30 hover:text-theme-text",
          ]}
        >
          {label}
        </button>
      {/each}
    </div>
  {/if}

  {#if timelineStore.hasActiveFilters}
    <button
      type="button"
      onclick={() => timelineStore.clearFilters()}
      class="self-start text-[9px] font-bold uppercase tracking-wider text-theme-muted hover:text-theme-primary transition-colors"
    >
      Clear filters
    </button>
  {/if}
</div>
