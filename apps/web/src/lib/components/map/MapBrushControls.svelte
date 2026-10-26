<script lang="ts">
  import { mapStore } from "$lib/stores/map.svelte";
</script>

{#if mapStore.showFog}
  <div class="flex items-center gap-2 px-2 max-sm:w-full">
    <span
      class="text-nano text-theme-muted font-bold tracking-tighter uppercase"
      >Brush Size</span
    >
    <input
      type="range"
      min="10"
      max="500"
      bind:value={mapStore.brushRadius}
      class="w-24 accent-theme-primary h-1 max-sm:h-6 max-sm:min-w-0 max-sm:flex-1"
    />
    <span class="text-nano text-theme-primary font-mono w-10 shrink-0"
      >{mapStore.brushRadius}px</span
    >
  </div>

  <div
    class="hidden flex-col justify-center px-2 text-micro text-theme-muted/90 font-semibold italic leading-tight md:flex"
  >
    <span>Alt+Drag to Reveal</span>
    <span>Alt+Shift+Drag to Hide</span>
  </div>
{/if}
