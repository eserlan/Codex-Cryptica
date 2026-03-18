<script lang="ts">
  import { timelineStore } from "$lib/stores/timeline.svelte";
  import { categories } from "$lib/stores/categories.svelte";

  let startYear = $state<number | null>(null);
  let endYear = $state<number | null>(null);

  const applyRange = () => {
    timelineStore.filterYearStart = startYear;
    timelineStore.filterYearEnd = endYear;
  };

  const clearFilters = () => {
    timelineStore.filterType = null;
    startYear = null;
    endYear = null;
    applyRange();
  };
</script>

<div class="flex flex-wrap items-center gap-4 text-[10px] font-mono">
  <!-- Type Filter -->
  <div class="flex items-center gap-2">
    <span class="text-theme-muted uppercase tracking-widest">Filter:</span>
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

  <!-- Date Range -->
  <div class="flex items-center gap-2">
    <span class="text-theme-muted uppercase tracking-widest">Years:</span>
    <input
      type="number"
      aria-label="Timeline Filter Start Year"
      bind:value={startYear}
      onchange={applyRange}
      placeholder="Start"
      class="w-16 bg-theme-bg border border-theme-border rounded px-2 py-1 text-theme-text outline-none focus:border-theme-primary transition-colors placeholder:text-theme-muted/50"
    />
    <span class="text-theme-muted">→</span>
    <input
      type="number"
      aria-label="Timeline Filter End Year"
      bind:value={endYear}
      onchange={applyRange}
      placeholder="End"
      class="w-16 bg-theme-bg border border-theme-border rounded px-2 py-1 text-theme-text outline-none focus:border-theme-primary transition-colors placeholder:text-theme-muted/50"
    />
  </div>

  <!-- Undated Toggle -->
  <label class="flex items-center gap-2 cursor-pointer group">
    <input
      type="checkbox"
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

  <!-- Clear -->
  {#if timelineStore.filterType || startYear !== null || endYear !== null || timelineStore.includeUndated}
    <button
      onclick={clearFilters}
      class="text-red-700 hover:text-red-500 uppercase tracking-widest transition-colors font-bold font-header"
    >
      Clear All
    </button>
  {/if}
</div>
