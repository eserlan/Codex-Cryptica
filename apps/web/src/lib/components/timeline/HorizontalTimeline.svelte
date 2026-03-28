<script lang="ts">
  import { timelineStore } from "$lib/stores/timeline.svelte";
  import TimelineEntryItem from "./TimelineEntryItem.svelte";
  import { fade } from "svelte/transition";

  let container = $state<HTMLDivElement>();

  const handleWheel = (e: WheelEvent) => {
    if (container && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    }
  };

  const handleKeydown = (e: KeyboardEvent) => {
    if (!container) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      container.scrollBy({ left: 300, behavior: "smooth" });
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      container.scrollBy({ left: -300, behavior: "smooth" });
    }
  };
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
  bind:this={container}
  onwheel={handleWheel}
  onkeydown={handleKeydown}
  role="region"
  aria-label="Horizontal Timeline"
  tabindex="0"
  class="h-full flex items-center overflow-x-auto overflow-y-hidden custom-scrollbar bg-[radial-gradient(circle_at_center,_#0a0a0a_0%,_#000_100%)] p-8 gap-12 select-none focus-visible:ring-2 focus-visible:ring-theme-primary focus-visible:outline-none focus-visible:ring-inset"
  transition:fade
>
  {#each timelineStore.filteredEntries as entry, i}
    <div class="relative flex flex-col items-center min-w-[280px] group">
      <!-- Connecting Line -->
      {#if i < timelineStore.filteredEntries.length - 1}
        <div
          class="absolute top-[50%] left-1/2 w-[calc(100%+48px)] h-px bg-gradient-to-r from-green-900/50 via-green-500/20 to-green-900/50 z-0"
        ></div>
      {/if}

      <!-- Node Marker -->
      <div
        class="w-4 h-4 rounded-full bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)] z-10 mb-8 group-hover:scale-125 transition-transform"
      ></div>

      <!-- Content Card -->
      <div class="w-full z-10">
        <TimelineEntryItem {entry} />
      </div>
    </div>
  {/each}
</div>

<style>
  .custom-scrollbar::-webkit-scrollbar {
    height: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #000;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #15803d;
    border-radius: 3px;
  }
</style>
