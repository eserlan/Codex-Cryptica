<script lang="ts">
  import { mapControlsUIStore } from "$lib/stores/ui/map-controls-ui.svelte";
</script>

<!-- Phones only: reveals and hides the map controls, like the graph's. -->
<button
  type="button"
  onclick={() => mapControlsUIStore.toggle()}
  class="touch-target absolute right-3 bottom-3 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-theme-primary text-theme-bg shadow-lg transition-all active:scale-95"
  aria-label="Map Controls"
  aria-expanded={mapControlsUIStore.open}
  aria-controls="map-controls-bar"
  data-testid="map-controls-fab"
>
  <span
    aria-hidden="true"
    class="{mapControlsUIStore.open
      ? 'icon-[lucide--x]'
      : 'icon-[lucide--settings-2]'} h-5 w-5"
  ></span>
</button>
