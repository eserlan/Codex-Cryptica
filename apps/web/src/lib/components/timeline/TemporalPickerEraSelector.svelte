<script lang="ts">
  import type {
    CalendarEra,
    WorldCalendar,
    DateSelection,
  } from "chronology-engine";
  import { resolveEraForYear } from "chronology-engine";

  let {
    selection,
    config,
    onSelectEra,
  }: {
    selection: DateSelection;
    config: WorldCalendar;
    onSelectEra: (targetYear: number) => void;
  } = $props();

  let eras = $derived<CalendarEra[]>(config.eras || []);
  let resolvedCurrent = $derived(resolveEraForYear(selection.year, config));
  let currentEraId = $derived(resolvedCurrent?.era.id ?? null);
</script>

{#if eras.length > 0}
  <div
    class="px-2 py-1.5 border-b border-theme-border/20 bg-theme-surface/30 flex items-center gap-1.5 overflow-x-auto custom-scrollbar"
    data-testid="calendar-era-selector"
  >
    <span
      class="text-nano font-bold text-theme-muted uppercase font-header shrink-0 tracking-wider"
    >
      Era:
    </span>
    <div class="flex items-center gap-1">
      {#each eras as era (era.id)}
        {@const isActive = era.id === currentEraId}
        <button
          type="button"
          data-testid="era-pill-{era.id}"
          onclick={() => {
            if (!isActive) {
              onSelectEra(era.startYear);
            }
          }}
          class="px-2 py-0.5 rounded text-nano font-bold font-header transition-colors uppercase {isActive
            ? 'bg-theme-primary text-theme-bg shadow-sm'
            : 'bg-theme-surface border border-theme-border/40 text-theme-muted hover:text-theme-text hover:border-theme-primary/30'}"
        >
          {era.label || era.name}
        </button>
      {/each}
    </div>
  </div>
{/if}
