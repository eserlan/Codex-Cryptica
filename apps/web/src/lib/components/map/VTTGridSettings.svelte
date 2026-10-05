<script lang="ts">
  import { mapSession } from "$lib/stores/map-session.svelte";
  import { mapStore, type GridType } from "$lib/stores/map.svelte";
  import { fade } from "svelte/transition";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";

  let { close }: { close: () => void } = $props();

  let gridSize = $state(mapStore.gridSize);
  let gridType = $state<GridType>(mapStore.gridType);
  let showHexCoordinates = $state(mapStore.showHexCoordinates);
  let gridUnit = $state(mapSession.gridUnit);
  let gridDistance = $state(mapSession.gridDistance);

  function save() {
    mapSession.setGridSettings({
      gridSize,
      gridType,
      showHexCoordinates,
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

<div class="fixed inset-0 flex items-center justify-center z-[200] p-4">
  <button
    type="button"
    class="absolute inset-0 w-full h-full bg-black/60 backdrop-blur-sm cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-inset"
    onclick={close}
    aria-label="Dismiss Grid Settings Backdrop"
  ></button>
  <div
    class="bg-theme-surface border border-theme-border p-6 rounded-xl max-w-sm w-full shadow-2xl relative z-10"
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.stopPropagation()}
    transition:fade={{ duration: 150 }}
    role="dialog"
    aria-modal="true"
    aria-labelledby="vtt-grid-settings-title"
    tabindex="-1"
  >
    <h3
      id="vtt-grid-settings-title"
      class="text-lg font-bold text-theme-text mb-6 uppercase font-header tracking-wider flex items-center gap-2"
    >
      <span
        class="icon-[lucide--grid-3x3] w-5 h-5 text-theme-primary"
        aria-hidden="true"
      ></span>
      Grid Settings
    </h3>

    <div class="space-y-6">
      <div class="space-y-2">
        <span
          id="grid-type-label"
          class="text-micro font-mono text-theme-muted uppercase tracking-widest"
        >
          Grid Type
        </span>
        <div
          class="grid grid-cols-3 gap-2"
          role="group"
          aria-labelledby="grid-type-label"
        >
          <button
            type="button"
            aria-pressed={gridType === "square"}
            class="px-2 py-2 rounded-md border text-xs font-medium flex flex-col items-center gap-1 transition-colors {gridType ===
            'square'
              ? 'border-theme-primary bg-theme-primary/10 text-theme-primary font-bold'
              : 'border-theme-border text-theme-muted hover:border-theme-muted hover:text-theme-text'}"
            onclick={() => {
              gridType = "square";
            }}
          >
            <span class="icon-[lucide--grid-3x3] w-4 h-4" aria-hidden="true"
            ></span>
            <span>Square</span>
          </button>
          <button
            type="button"
            aria-pressed={gridType === "hex-pointy"}
            class="px-2 py-2 rounded-md border text-xs font-medium flex flex-col items-center gap-1 transition-colors {gridType ===
            'hex-pointy'
              ? 'border-theme-primary bg-theme-primary/10 text-theme-primary font-bold'
              : 'border-theme-border text-theme-muted hover:border-theme-muted hover:text-theme-text'}"
            onclick={() => {
              gridType = "hex-pointy";
            }}
          >
            <span class="icon-[lucide--hexagon] w-4 h-4" aria-hidden="true"
            ></span>
            <span>Hex (Pointy)</span>
          </button>
          <button
            type="button"
            aria-pressed={gridType === "hex-flat"}
            class="px-2 py-2 rounded-md border text-xs font-medium flex flex-col items-center gap-1 transition-colors {gridType ===
            'hex-flat'
              ? 'border-theme-primary bg-theme-primary/10 text-theme-primary font-bold'
              : 'border-theme-border text-theme-muted hover:border-theme-muted hover:text-theme-text'}"
            onclick={() => {
              gridType = "hex-flat";
            }}
          >
            <span
              class="icon-[lucide--hexagon] w-4 h-4 rotate-90"
              aria-hidden="true"
            ></span>
            <span>Hex (Flat)</span>
          </button>
        </div>
      </div>

      {#if gridType === "hex-pointy" || gridType === "hex-flat"}
        <div
          class="flex items-center justify-between p-2 rounded-md bg-theme-bg border border-theme-border"
        >
          <div class="space-y-0.5">
            <label
              class="text-xs font-medium text-theme-text cursor-pointer"
              for="hex-coords-toggle"
            >
              Show Hex Coordinates
            </label>
            <p class="text-nano text-theme-muted">
              Display axial (q.r) labels in hex centers
            </p>
          </div>
          <input
            id="hex-coords-toggle"
            type="checkbox"
            bind:checked={showHexCoordinates}
            class="accent-theme-primary rounded w-4 h-4 cursor-pointer"
          />
        </div>
      {/if}

      <div class="space-y-2">
        <label
          class="text-micro font-mono text-theme-muted uppercase tracking-widest"
          for="grid-size"
        >
          {gridType === "square"
            ? "Grid Cell Size (Pixels)"
            : "Hex Radius (Pixels)"}
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
            class="text-micro font-mono text-theme-muted uppercase tracking-widest"
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
            class="text-micro font-mono text-theme-muted uppercase tracking-widest"
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
            <p class="text-micro text-theme-muted text-center">
              Drag the map to align it with the fixed grid
            </p>
          </div>
        {:else if mapSession.gridFitMode}
          <div class="space-y-3">
            <p class="text-micro text-theme-muted text-center">
              Drag across a few grid squares rather than just one — it's much
              easier to land accurately on, say, 3 squares than exactly 1. While
              dragging, hold <span class="font-bold">Shift</span> and scroll to change
              how many squares the drag spans (1, 2, 3, 5, or 10) to match the tile
              you're fitting.
            </p>
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
            onclick={() => {
              mapSession.gridFitMode = true;
              close();
            }}
          >
            <span class="icon-[lucide--square] w-3.5 h-3.5" aria-hidden="true"
            ></span>
            Fit Grid from Map
          </button>
          <p class="text-nano text-theme-muted mt-1 text-center italic">
            Drag across a span of grid squares (default 3×3) to auto-detect cell
            size — Shift+Scroll while dragging changes the span
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
              <span class="icon-[lucide--move] w-3.5 h-3.5" aria-hidden="true"
              ></span>
              Move Map to Fine-tune
            </button>
            <p class="text-nano text-theme-muted mt-1 text-center italic">
              Drag the map under the fixed grid
            </p>
          {/if}
        {/if}
      </div>

      <div class="pt-2 flex gap-3">
        <button
          type="button"
          class="flex-1 px-4 py-2 border border-theme-border text-theme-muted rounded-md hover:bg-theme-bg transition-all uppercase text-micro font-bold tracking-wider focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary"
          onclick={close}
        >
          Close
        </button>
        <button
          type="button"
          class="flex-1 px-4 py-2 bg-theme-primary text-theme-bg rounded-md font-bold uppercase tracking-wider hover:bg-theme-primary/90 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary focus-visible:ring-offset-2 focus-visible:ring-offset-theme-surface"
          onclick={save}
        >
          Apply to All
        </button>
      </div>
    </div>
  </div>
</div>
