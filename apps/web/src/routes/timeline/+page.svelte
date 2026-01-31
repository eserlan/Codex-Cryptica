<script lang="ts">
  import { timelineStore } from "$lib/stores/timeline.svelte";
  import VerticalTimeline from "$lib/components/timeline/VerticalTimeline.svelte";
  import HorizontalTimeline from "$lib/components/timeline/HorizontalTimeline.svelte";
  import TimelineLayoutToggle from "$lib/components/timeline/TimelineLayoutToggle.svelte";
  import TimelineFilterBar from "$lib/components/timeline/TimelineFilterBar.svelte";
  import { onMount } from "svelte";

  onMount(() => {
    document.title = "World Timeline | Codex Cryptica";
  });
</script>

<div class="h-full flex flex-col bg-black overflow-hidden">
  <!-- Header / Controls -->
  <div class="p-4 border-b border-green-900/30 bg-[#0c0c0c] flex flex-wrap items-center justify-between gap-4">
    <div class="flex items-center gap-3">
      <span class="icon-[lucide--calendar] text-green-500 w-6 h-6"></span>
      <h2 class="text-xl font-bold text-gray-100 font-mono tracking-wider uppercase">World Timeline</h2>
    </div>

    <div class="flex items-center gap-4">
      <TimelineFilterBar />
      <div class="h-6 w-px bg-green-900/30 mx-2"></div>
      <TimelineLayoutToggle />
    </div>
  </div>

  <!-- Main View -->
  <div class="flex-1 overflow-hidden relative">
    {#if timelineStore.isLoading}
      <div class="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-10">
        <div class="flex flex-col items-center gap-3">
          <span class="icon-[lucide--loader-2] w-10 h-10 text-green-500 animate-spin"></span>
          <span class="text-xs font-mono text-green-700 uppercase tracking-[0.2em]">Synchronizing Timeline...</span>
        </div>
      </div>
    {/if}

    {#if timelineStore.entries.length === 0 && !timelineStore.isLoading}
      <div class="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
        <span class="icon-[lucide--history] w-16 h-16 text-zinc-800"></span>
        <h3 class="text-zinc-500 font-bold uppercase tracking-widest">No Chronological Data</h3>
        <p class="text-xs text-zinc-600 max-w-sm leading-relaxed">
          The archives are currently undated. Add "Date" or "Start/End Date" metadata to your nodes to see them appear here.
        </p>
      </div>
    {:else}
      <div class="h-full">
        {#if timelineStore.viewMode === 'vertical'}
          <VerticalTimeline />
        {:else}
          <HorizontalTimeline />
        {/if}
      </div>
    {/if}
  </div>
</div>
