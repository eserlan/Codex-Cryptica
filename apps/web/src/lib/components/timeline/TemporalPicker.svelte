<script lang="ts">
  import { calendarStore } from "$lib/stores/calendar.svelte";
  import { graph } from "$lib/stores/graph.svelte";
  import type { TemporalMetadata } from "chronology-engine";
  import { calendarEngine } from "chronology-engine";
  import { computePosition, flip, shift, offset } from "@floating-ui/dom";
  import { onMount } from "svelte";
  import { fade, scale } from "svelte/transition";

  let {
    value = $bindable(),
    trigger,
    onClose,
  }: {
    value?: TemporalMetadata;
    trigger: HTMLElement;
    onClose: () => void;
  } = $props();

  let pickerElement = $state<HTMLElement>();
  let x = $state(0);
  let y = $state(0);

  let selectedYear = $state(value?.year || 0);
  let selectedMonth = $state(value?.month);
  let selectedDay = $state(value?.day);

  let precision = $state<"year" | "month" | "day">(
    (() => {
      return selectedDay !== undefined
        ? "day"
        : selectedMonth !== undefined
          ? "month"
          : "year";
    })(),
  );

  let activeTab = $state<"era" | "manual">("era");

  const updatePosition = async () => {
    if (!trigger || !pickerElement) return;
    const { x: newX, y: newY } = await computePosition(trigger, pickerElement, {
      placement: "bottom-start",
      middleware: [offset(8), flip(), shift({ padding: 10 })],
    });
    x = newX;
    y = newY;
  };

  onMount(() => {
    updatePosition();
    pickerElement?.focus();
    const handleScroll = () => updatePosition();
    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  });

  const save = () => {
    value = {
      year: selectedYear,
      month: precision !== "year" ? selectedMonth : undefined,
      day: precision === "day" ? selectedDay : undefined,
      label: value?.label, // Preserve label if it exists
    };
    onClose();
  };

  const selectEra = (era: any) => {
    selectedYear = era.start_year;
    activeTab = "manual";
  };

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    if (e.key === "Enter") save();
  };
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
  bind:this={pickerElement}
  role="dialog"
  aria-label="Date Picker"
  class="fixed z-[1000] w-72 bg-theme-surface border border-theme-border rounded-lg shadow-2xl overflow-hidden flex flex-col font-sans outline-none"
  style:left="{x}px"
  style:top="{y}px"
  tabindex="0"
  onkeydown={handleKeydown}
  transition:scale={{ start: 0.95, duration: 150 }}
>
  <!-- Header / Tabs -->
  <div class="flex border-b border-theme-border bg-theme-bg/50">
    <button
      class="flex-1 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors {activeTab ===
      'era'
        ? 'text-theme-primary bg-theme-primary/10'
        : 'text-theme-muted hover:text-theme-text'}"
      onclick={() => (activeTab = "era")}
    >
      Eras
    </button>
    <button
      class="flex-1 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors {activeTab ===
      'manual'
        ? 'text-theme-primary bg-theme-primary/10'
        : 'text-theme-muted hover:text-theme-text'}"
      onclick={() => (activeTab = "manual")}
    >
      Detail
    </button>
  </div>

  <!-- Content -->
  <div class="p-4 max-h-80 overflow-y-auto custom-scrollbar">
    {#if activeTab === "era"}
      <div class="space-y-1">
        {#each graph.eras as era}
          <button
            class="w-full text-left p-2 rounded hover:bg-theme-primary/10 border border-transparent hover:border-theme-primary/20 transition-all group"
            onclick={() => selectEra(era)}
          >
            <div class="flex items-center gap-2">
              <div
                class="w-1 h-4 rounded-full"
                style:background-color={era.color}
              ></div>
              <span
                class="text-xs font-bold text-theme-text group-hover:text-theme-primary"
                >{era.name}</span
              >
            </div>
            <div class="text-[9px] text-theme-muted ml-3 font-mono">
              Year {era.start_year}
              {era.end_year ? `→ ${era.end_year}` : "→ Present"}
            </div>
          </button>
        {:else}
          <div
            class="py-8 text-center text-theme-muted text-[10px] uppercase tracking-widest"
          >
            No Eras Defined
          </div>
        {/each}
      </div>
    {:else}
      <div class="space-y-4">
        <!-- Precision Toggle -->
        <div
          class="flex bg-theme-bg p-0.5 rounded-md border border-theme-border/30"
        >
          {#each ["year", "month", "day"] as p}
            <button
              class="flex-1 py-1 text-[9px] font-bold uppercase tracking-tighter transition-all rounded {precision ===
              p
                ? 'bg-theme-primary text-theme-bg shadow-sm'
                : 'text-theme-muted hover:text-theme-text'}"
              onclick={() => (precision = p as any)}
            >
              {p}
            </button>
          {/each}
        </div>

        <!-- Year Selection -->
        <div class="space-y-1">
          <label
            class="text-[10px] font-bold text-theme-muted uppercase tracking-wider"
            for="picker-year">Year</label
          >
          <input
            id="picker-year"
            type="number"
            bind:value={selectedYear}
            class="w-full bg-theme-bg border border-theme-border rounded px-3 py-2 text-sm text-theme-text focus:border-theme-primary outline-none font-mono"
          />
        </div>

        <!-- Month Selection -->
        {#if precision !== "year"}
          <div class="space-y-1" transition:fade>
            <label
              class="text-[10px] font-bold text-theme-muted uppercase tracking-wider"
              for="picker-month">Month</label
            >
            <select
              id="picker-month"
              bind:value={selectedMonth}
              class="w-full bg-theme-bg border border-theme-border rounded px-3 py-2 text-sm text-theme-text focus:border-theme-primary outline-none font-mono"
              data-testid="month-selector"
            >
              {#each calendarEngine.getMonths(calendarStore.config) as month, i}
                <option value={i + 1}>{month.name}</option>
              {/each}
            </select>
          </div>
        {/if}

        <!-- Day Selection -->
        {#if precision === "day" && selectedMonth}
          <div class="space-y-1" transition:fade>
            <label
              class="text-[10px] font-bold text-theme-muted uppercase tracking-wider"
              for="picker-day">Day</label
            >
            <input
              id="picker-day"
              type="number"
              min="1"
              max={calendarEngine.getMonths(calendarStore.config)[
                selectedMonth - 1
              ].days}
              bind:value={selectedDay}
              class="w-full bg-theme-bg border border-theme-border rounded px-3 py-2 text-sm text-theme-text focus:border-theme-primary outline-none font-mono"
            />
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Footer Actions -->
  <div class="p-3 border-t border-theme-border flex gap-2 bg-theme-bg/30">
    <button
      class="flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest border border-theme-border text-theme-muted hover:text-theme-text transition-colors rounded"
      onclick={onClose}
    >
      Cancel
    </button>
    <button
      class="flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest bg-theme-primary text-theme-bg hover:bg-theme-secondary transition-colors rounded"
      onclick={save}
    >
      Apply
    </button>
  </div>
</div>

<style>
  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: var(--color-accent-primary);
    border-radius: 2px;
  }
</style>
