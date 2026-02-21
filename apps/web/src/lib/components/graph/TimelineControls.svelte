<script lang="ts">
  import { graph } from "$lib/stores/graph.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { fade } from "svelte/transition";

  let { onApply } = $props<{ onApply?: () => void }>();

  const toggle = () => {
    graph.toggleTimeline();
    if (onApply) onApply();
  };

  const setAxis = (axis: "x" | "y") => {
    graph.setTimelineAxis(axis);
    if (onApply) onApply();
  };

  let minYear = $derived.by(() => {
    const years = Object.values(vault.entities)
      .map((e) => e.date?.year ?? e.start_date?.year ?? e.end_date?.year)
      .filter((y): y is number => y !== undefined);
    return years.length ? Math.min(...years) : 0;
  });

  let maxYear = $derived.by(() => {
    const years = Object.values(vault.entities)
      .map((e) => e.date?.year ?? e.start_date?.year ?? e.end_date?.year)
      .filter((y): y is number => y !== undefined);
    return years.length ? Math.max(...years) : 3000;
  });

  let filterStart = $state<number>(0);
  let filterEnd = $state<number>(3000);

  $effect(() => {
    filterStart = graph.timelineRange.start ?? minYear;
    filterEnd = graph.timelineRange.end ?? maxYear;
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
      ? 'bg-timeline-dark/40 text-timeline-primary border border-timeline-primary/50 shadow-[0_0_15px_var(--color-timeline-primary)]'
      : 'bg-black/80 text-zinc-500 border border-green-900/30 hover:border-green-500/50 hover:text-green-500'}"
    title="Toggle Chronological Timeline Mode"
  >
    <span class="flex items-center gap-2">
      <span class="icon-[lucide--history] w-3.5 h-3.5"></span>
      TIMELINE
    </span>
  </button>

  {#if graph.timelineMode}
    <div
      class="flex items-center gap-1 bg-black/80 border border-timeline-dark/30 rounded p-0.5"
      transition:fade
    >
      <button
        onclick={() => setAxis("x")}
        class="px-3 py-1 rounded text-[9px] font-bold transition-all {graph.timelineAxis ===
        'x'
          ? 'bg-timeline-primary text-theme-bg'
          : 'text-timeline-dark hover:text-timeline-primary'}"
        title="Horizontal Axis"
      >
        X-AXIS
      </button>
      <button
        onclick={() => setAxis("y")}
        class="px-3 py-1 rounded text-[9px] font-bold transition-all {graph.timelineAxis ===
        'y'
          ? 'bg-timeline-primary text-theme-bg'
          : 'text-timeline-dark hover:text-timeline-primary'}"
        title="Vertical Axis"
      >
        Y-AXIS
      </button>
    </div>

    <div
      class="flex items-center gap-2 ml-2 bg-black/80 border border-timeline-dark/30 rounded px-3 py-1"
      transition:fade
    >
      <span
        class="text-[9px] text-timeline-dark font-bold uppercase tracking-tighter"
        >Scale</span
      >
      <input
        type="range"
        min="50"
        max="1000"
        step="50"
        bind:value={graph.timelineScale}
        onchange={onApply}
        class="w-20 h-1 bg-timeline-dark/50 rounded-lg appearance-none cursor-pointer accent-timeline-primary"
      />
    </div>

    <!-- Range Sliders -->
    <div
      class="flex items-center gap-3 ml-2 bg-black/80 border border-timeline-dark/30 rounded px-3 py-1"
      transition:fade
    >
      <div class="flex items-center gap-2">
        <span
          class="text-[9px] text-timeline-dark font-bold uppercase tracking-tighter"
          >Range</span
        >
        <input
          type="number"
          bind:value={filterStart}
          onchange={applyRange}
          class="w-12 bg-black border border-timeline-dark/30 rounded px-1 text-[10px] text-timeline-primary text-center focus:border-timeline-primary outline-none"
        />
        <span class="text-timeline-dark text-[10px]">to</span>
        <input
          type="number"
          bind:value={filterEnd}
          onchange={applyRange}
          class="w-12 bg-black border border-timeline-dark/30 rounded px-1 text-[10px] text-timeline-primary text-center focus:border-timeline-primary outline-none"
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
