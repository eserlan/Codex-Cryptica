<script lang="ts">
  import { timelineStore } from "$lib/stores/timeline.svelte";
  import { graph } from "$lib/stores/graph.svelte";
  import TimelineEntryItem from "./TimelineEntryItem.svelte";
  import { fade } from "svelte/transition";

  // Group entries by year for better vertical organization
  const groupedEntries = $derived.by(() => {
    const groups: Record<number, typeof timelineStore.entries> = {};
    for (const entry of timelineStore.filteredEntries) {
      if (!groups[entry.date.year]) groups[entry.date.year] = [];
      groups[entry.date.year].push(entry);
    }
    return Object.entries(groups).sort(([a], [b]) => Number(a) - Number(b));
  });

  const getEraLabel = (year: number) => {
    const era = graph.eras.find(e => year >= e.start_year && (e.end_year === undefined || year <= e.end_year));
    return era ? era.name : null;
  };
</script>

<div 
  class="h-full overflow-y-auto custom-scrollbar p-6 space-y-12"
  transition:fade
>
  <div class="max-w-2xl mx-auto relative">
    <!-- Center Line -->
    <div class="absolute left-4 top-0 bottom-0 w-px bg-green-900/30 md:left-1/2"></div>

    {#each groupedEntries as [year, entries]}
      {@const eraName = getEraLabel(Number(year))}
      <div class="space-y-6">
        <!-- Era Marker -->
        {#if eraName}
          <div class="flex items-center gap-2 text-[9px] font-bold text-amber-500/50 uppercase tracking-[0.3em] mb-2 md:justify-center">
            <span class="h-px bg-amber-900/20 flex-1 hidden md:block"></span>
            {eraName}
            <span class="h-px bg-amber-900/20 flex-1"></span>
          </div>
        {/if}

        <!-- Year Marker -->
        <div class="relative flex items-center justify-start md:justify-center">
          <span class="bg-black border border-green-500/50 px-4 py-1 rounded text-xs font-mono font-bold text-green-400 z-10 shadow-[0_0_15px_rgba(34,197,94,0.2)]">
            {year}
          </span>
        </div>

        <!-- Entries for this year -->
        <div class="space-y-4">
          {#each entries as entry, i}
            <div class="relative flex items-center {i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} gap-8">
              <!-- Connector Dot -->
              <div class="absolute left-4 md:left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-green-500 z-10 border-4 border-black box-content"></div>

              <!-- Content (Alternate sides on desktop) -->
              <div class="pl-12 md:pl-0 md:w-1/2 flex {i % 2 === 0 ? 'md:justify-end' : 'md:justify-start'}">
                <div class="w-full max-w-sm">
                  <TimelineEntryItem {entry} />
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #000;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #15803d;
    border-radius: 2px;
  }
</style>
