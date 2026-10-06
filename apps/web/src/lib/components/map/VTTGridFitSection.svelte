<script lang="ts">
  import { mapSession } from "$lib/stores/map-session.svelte";
  import { mapStore } from "$lib/stores/map.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";

  let {
    isHex,
    hexAxis,
    close,
    onStartFit,
  }: {
    isHex: boolean;
    /** Where a hex fit is dragged: "across a row" or "down a column". */
    hexAxis: string;
    close: () => void;
    onStartFit: () => void;
  } = $props();
</script>

<div class="border-t border-theme-border pt-4 space-y-4">
  {#if mapSession.gridMoveMode}
    <div class="space-y-3">
      <p class="text-micro text-theme-muted text-center">
        Drag the map to align it with the fixed grid
      </p>
    </div>
  {:else if mapSession.gridFitMode}
    <div class="space-y-3">
      {#if isHex}
        <p class="text-micro text-theme-muted text-center">
          Drag from the outer edge of one hex to the outer edge of another,
          straight {hexAxis}, through the middle of the hexes. Spanning a few
          hexes is much easier to land accurately than just one. While dragging,
          hold <span class="font-bold">Shift</span> and scroll to change how many
          hexes the drag spans (1, 2, 3, 5, or 10).
        </p>
      {:else}
        <p class="text-micro text-theme-muted text-center">
          Drag across a few grid squares rather than just one — it's much easier
          to land accurately on, say, 3 squares than exactly 1. While dragging,
          hold <span class="font-bold">Shift</span> and scroll to change how many
          squares the drag spans (1, 2, 3, 5, or 10) to match the tile you're fitting.
        </p>
      {/if}
      <button
        type="button"
        class="w-full px-4 py-2 rounded-md border border-theme-border text-theme-muted hover:bg-theme-bg transition-all uppercase text-micro font-bold tracking-wider focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary"
        onclick={() => {
          mapSession.gridFitMode = false;
        }}
      >
        Cancel
      </button>
    </div>
  {:else}
    <button
      type="button"
      class="w-full px-4 py-2.5 rounded-md border border-dashed border-theme-border text-theme-muted text-micro font-bold uppercase tracking-wider transition-all hover:border-theme-primary hover:text-theme-primary hover:bg-theme-primary/5 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary"
      onclick={onStartFit}
    >
      <span
        class={`${isHex ? "icon-[lucide--hexagon]" : "icon-[lucide--square]"} w-3.5 h-3.5`}
        aria-hidden="true"
      ></span>
      Fit Grid from Map
    </button>
    <p class="text-nano text-theme-muted mt-1 text-center italic">
      {#if isHex}
        Drag {hexAxis} over a span of printed hexes (default 3) to match their size
        and position — Shift+Scroll while dragging changes the span
      {:else}
        Drag across a span of grid squares (default 3×3) to auto-detect cell
        size — Shift+Scroll while dragging changes the span
      {/if}
    </p>

    {#if mapStore.gridSize > 0}
      <button
        type="button"
        class="w-full px-4 py-2.5 rounded-md border border-dashed border-theme-border text-theme-muted text-micro font-bold uppercase tracking-wider transition-all hover:border-theme-primary hover:text-theme-primary hover:bg-theme-primary/5 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary"
        onclick={() => {
          mapSession.gridMoveMode = true;
          close();
          notificationStore.notify(
            "Drag the map to align it with the grid — release to apply. Esc to cancel.",
            "info",
            true,
          );
        }}
      >
        <span class="icon-[lucide--move] w-3.5 h-3.5" aria-hidden="true"></span>
        Move Map to Fine-tune
      </button>
      <p class="text-nano text-theme-muted mt-1 text-center italic">
        Drag the map under the fixed grid
      </p>
    {/if}
  {/if}
</div>
