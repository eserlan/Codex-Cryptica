<script lang="ts">
  import { mapSession } from "$lib/stores/map-session.svelte";
  import { mapStore } from "$lib/stores/map.svelte";
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
            max="200"
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

      <div class="pt-4 flex gap-3">
        <button
          class="flex-1 px-4 py-2 border border-theme-border text-theme-muted rounded-lg hover:bg-theme-bg transition-colors uppercase text-[10px] font-bold font-header tracking-widest"
          onclick={close}
        >
          Cancel
        </button>
        <button
          class="flex-1 px-4 py-2 bg-theme-primary text-theme-bg rounded-lg font-bold uppercase font-header text-[10px] tracking-widest hover:bg-theme-primary/90 transition-all"
          onclick={save}
        >
          Apply to All
        </button>
      </div>
    </div>
  </div>
</div>
