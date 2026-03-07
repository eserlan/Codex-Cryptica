<script lang="ts">
  import { graph } from "$lib/stores/graph.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { fade } from "svelte/transition";

  interface LayoutTrigger {
    (isInitial?: boolean, isForced?: boolean, caller?: string): void;
  }
  let { onApply } = $props<{ onApply?: LayoutTrigger }>();

  const toggle = () => {
    graph.toggleTimeline();
    if (onApply) onApply(false, true, "Timeline Toggle"); // Force layout override
  };

  const setAxis = (axis: "x" | "y") => {
    graph.setTimelineAxis(axis);
    if (onApply) onApply(false, true, "Timeline Axis Switch"); // Force layout override
  };

  // ⚡ Bolt Optimization: Calculate min and max in a single pass over the entities.
  let yearRange = $derived.by(() => {
    const allEntities = Object.values(vault.entities);
    const count = allEntities.length;
    let min = Infinity;
    let max = -Infinity;
    let found = false;

    for (let i = 0; i < count; i++) {
      const e = allEntities[i];
      const year = e.date?.year ?? e.start_date?.year ?? e.end_date?.year;
      if (year !== undefined) {
        if (year < min) min = year;
        if (year > max) max = year;
        found = true;
      }
    }
    return {
      min: found ? min : 0,
      max: found ? max : 3000,
    };
  });

  let minYear = $derived(yearRange.min);
  let maxYear = $derived(yearRange.max);

  let filterStart = $state<number>(0);
  let filterEnd = $state<number>(3000);

  $effect(() => {
    filterStart = graph.timelineRange.start ?? yearRange.min;
    filterEnd = graph.timelineRange.end ?? yearRange.max;
  });

  const applyRange = () => {
    graph.timelineRange = { start: filterStart, end: filterEnd };
  };
</script>

<div class="flex items-center gap-2 pointer-events-auto">
  <button
    onclick={toggle}
    class="px-3 py-1.5 rounded text-[10px] font-bold tracking-widest transition-all
    {graph.timelineMode
      ? 'bg-timeline-primary/20 text-timeline-primary border border-timeline-primary/50 shadow-[0_0_15px_rgba(var(--color-theme-accent-rgb),0.3)]'
      : 'bg-theme-surface/90 text-theme-muted border border-theme-border hover:border-theme-primary hover:text-theme-primary'}"
    title="Toggle Chronological Timeline Mode"
    aria-label="Toggle Chronological Timeline Mode"
  >
    <span class="flex items-center gap-2">
      <span class="icon-[lucide--history] w-3.5 h-3.5"></span>
      TIMELINE
    </span>
  </button>

  {#if graph.timelineMode}
    <div
      class="flex items-center gap-1 bg-theme-surface/95 border border-theme-border rounded p-0.5 backdrop-blur-sm"
      transition:fade
    >
      <button
        onclick={() => setAxis("x")}
        class="px-3 py-1 rounded text-[9px] font-bold transition-all {graph.timelineAxis ===
        'x'
          ? 'bg-timeline-primary text-theme-bg'
          : 'text-theme-muted hover:text-timeline-primary'}"
        title="Horizontal Axis"
        aria-label="Horizontal Axis"
      >
        X-AXIS
      </button>
      <button
        onclick={() => setAxis("y")}
        class="px-3 py-1 rounded text-[9px] font-bold transition-all {graph.timelineAxis ===
        'y'
          ? 'bg-timeline-primary text-theme-bg'
          : 'text-theme-muted hover:text-timeline-primary'}"
        title="Vertical Axis"
        aria-label="Vertical Axis"
      >
        Y-AXIS
      </button>
    </div>

    <div
      class="flex items-center gap-2 ml-2 bg-theme-surface/95 border border-theme-border rounded px-3 py-1 backdrop-blur-sm"
      transition:fade
    >
      <span
        class="text-[9px] text-theme-muted font-bold uppercase font-header tracking-tighter"
        >Scale</span
      >
      <input
        type="range"
        min="50"
        max="1000"
        step="50"
        bind:value={graph.timelineScale}
        onchange={onApply}
        aria-label="Timeline Scale"
        class="w-20 h-1 bg-theme-border rounded-lg appearance-none cursor-pointer accent-timeline-primary focus:outline-none focus:ring-2 focus:ring-theme-primary focus:ring-offset-1 focus:ring-offset-theme-surface"
      />
    </div>

    <!-- Range Sliders -->
    <div
      class="flex items-center gap-3 ml-2 bg-theme-surface/95 border border-theme-border rounded px-3 py-1 backdrop-blur-sm"
      transition:fade
    >
      <div class="flex items-center gap-2">
        <span
          class="text-[9px] text-theme-muted font-bold uppercase font-header tracking-tighter"
          >Range</span
        >
        <input
          type="number"
          bind:value={filterStart}
          onchange={applyRange}
          aria-label="Filter Start Year"
          class="w-12 bg-theme-surface border border-theme-border rounded px-1 text-[10px] text-timeline-primary text-center focus:border-theme-primary outline-none"
        />
        <span class="text-theme-muted text-[10px]">to</span>
        <input
          type="number"
          bind:value={filterEnd}
          onchange={applyRange}
          aria-label="Filter End Year"
          class="w-12 bg-theme-surface border border-theme-border rounded px-1 text-[10px] text-timeline-primary text-center focus:border-theme-primary outline-none"
        />
      </div>
    </div>
  {/if}
</div>

<style>
  input[type="range"]::-webkit-slider-thumb {
    appearance: none;
    width: 10px;
    height: 10px;
    background: var(--color-timeline-primary);
    border-radius: 50%;
    cursor: pointer;
  }
</style>
