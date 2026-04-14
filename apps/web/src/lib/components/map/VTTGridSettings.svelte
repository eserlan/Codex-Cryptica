<script lang="ts">
  import { mapSession } from "$lib/stores/map-session.svelte";
  import { mapStore } from "$lib/stores/map.svelte";
  import { uiStore } from "$lib/stores/ui.svelte";
  import { fade } from "svelte/transition";

  let { close }: { close: () => void } = $props();

  let gridSize = $state(mapStore.gridSize);
  let gridUnit = $state(mapSession.gridUnit);
  let gridDistance = $state(mapSession.gridDistance);

  function save() {
    mapSession.setGridSettings({
      gridSize,
      gridUnit,
      gridDistance,
    });
    close();
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      close();
    }
    if (e.key === "Enter") {
      save();
    }
  }
</script>

<svelte:window onkeydown={onKeyDown} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4"
  onclick={close}
>
  <div
    class="bg-theme-surface border border-theme-border p-6 rounded-xl max-w-sm w-full shadow-2xl relative"
    onclick={(e) => e.stopPropagation()}
    transition:fade={{ duration: 150 }}
  >
    <h3
      class="text-lg font-bold text-theme-text mb-6 uppercase font-header tracking-wider flex items-center gap-2"
    >
      <span class="icon-[lucide--grid-3x3] w-5 h-5 text-theme-primary"></span>
      Grid Settings
    </h3>

    <div class="space-y-6">
      <div class="space-y-2">
        <label
          class="text-[10px] font-mono text-theme-muted uppercase tracking-widest"
          for="grid-size"
        >
          Grid Cell Size (Pixels)
        </label>
        <div class="flex items-center gap-4">
          <input
            id="grid-size"
            type="range"
            min="20"
            max="500"
            step="1"
            bind:value={gridSize}
            class="flex-1 accent-theme-primary h-1"
          />
          <span class="text-xs font-mono text-theme-primary w-12 text-right"
            >{gridSize}px</span
          >
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-2">
          <label
            class="text-[10px] font-mono text-theme-muted uppercase tracking-widest"
            for="grid-dist"
          >
            Distance per Cell
          </label>
          <input
            id="grid-dist"
            type="number"
            step="0.1"
            bind:value={gridDistance}
            class="w-full bg-theme-bg border border-theme-border text-theme-text px-3 py-2 rounded focus:border-theme-primary outline-none text-sm"
          />
        </div>
        <div class="space-y-2">
          <label
            class="text-[10px] font-mono text-theme-muted uppercase tracking-widest"
            for="grid-unit"
          >
            Unit Name
          </label>
          <input
            id="grid-unit"
            type="text"
            placeholder="ft, m, km..."
            bind:value={gridUnit}
            class="w-full bg-theme-bg border border-theme-border text-theme-text px-3 py-2 rounded focus:border-theme-primary outline-none text-sm"
          />
        </div>
      </div>

      <div class="border-t border-theme-border pt-4 space-y-4">
        {#if mapSession.gridMoveMode}
          <div class="space-y-3">
            <p class="text-[10px] text-theme-muted text-center">
              Drag the map to align it with the fixed grid
            </p>
          </div>
        {:else if mapSession.gridFitMode}
          <div class="space-y-3">
            <p class="text-[10px] text-theme-muted text-center">
              Draw a square around a map grid cell
            </p>
            <button
              class="w-full px-4 py-2 rounded-md border border-theme-border text-theme-muted rounded-md hover:bg-theme-bg transition-all uppercase text-[10px] font-bold tracking-wider"
              onclick={() => {
                mapSession.gridFitMode = false;
              }}
            >
              Cancel
            </button>
          </div>
        {:else}
          <button
            class="w-full px-4 py-2.5 rounded-md border border-dashed border-theme-border text-theme-muted text-[10px] font-bold uppercase tracking-wider transition-all hover:border-theme-primary hover:text-theme-primary hover:bg-theme-primary/5 flex items-center justify-center gap-2"
            onclick={() => {
              mapSession.gridFitMode = true;
              close();
            }}
          >
            <span class="icon-[lucide--square] w-3.5 h-3.5"></span>
            Fit Grid from Map
          </button>
          <p class="text-[9px] text-theme-muted mt-1 text-center italic">
            Draw a square around a grid cell to auto-detect size
          </p>

          {#if mapStore.gridSize > 0}
            <button
              class="w-full px-4 py-2.5 rounded-md border border-dashed border-theme-border text-theme-muted text-[10px] font-bold uppercase tracking-wider transition-all hover:border-theme-primary hover:text-theme-primary hover:bg-theme-primary/5 flex items-center justify-center gap-2"
              onclick={() => {
                mapSession.gridMoveMode = true;
                close();
                uiStore.notify(
                  "Drag the map to align. Enter to confirm, Esc to cancel.",
                  "info",
                  true,
                );
              }}
            >
              <span class="icon-[lucide--move] w-3.5 h-3.5"></span>
              Move Map to Fine-tune
            </button>
            <p class="text-[9px] text-theme-muted mt-1 text-center italic">
              Drag the map under the fixed grid
            </p>
          {/if}
        {/if}
      </div>

      <div class="pt-2 flex gap-3">
        <button
          class="flex-1 px-4 py-2 border border-theme-border text-theme-muted rounded-md hover:bg-theme-bg transition-all uppercase text-[10px] font-bold tracking-wider"
          onclick={close}
        >
          Close
        </button>
        <button
          class="flex-1 px-4 py-2 bg-theme-primary text-theme-bg rounded-md font-bold uppercase tracking-wider hover:bg-theme-primary/90 transition-all"
          onclick={save}
        >
          Apply to All
        </button>
      </div>
    </div>
  </div>
</div>
