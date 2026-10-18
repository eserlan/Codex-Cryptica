<script lang="ts">
  import { getPrimaryButtonStateClass } from "$lib/components/map/vtt-ui";
  import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";
  import { mapControlsUIStore } from "$lib/stores/ui/map-controls-ui.svelte";

  const maximized = $derived(mapControlsUIStore.maximized);

  function toggle() {
    mapControlsUIStore.toggleMaximized();
    // On phones, tuck the panel away so the freed space shows the map.
    if (layoutUIStore.isMobile) mapControlsUIStore.close();
  }
</script>

<button
  type="button"
  class={`touch-target flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-micro font-bold uppercase tracking-wider transition-all ${getPrimaryButtonStateClass(maximized)}`}
  onclick={toggle}
  aria-pressed={maximized}
  title={maximized
    ? "Show the app header and navigation again"
    : "Hide the app header and navigation to give the map all the space"}
  data-testid="map-maximize-toggle"
>
  <span
    aria-hidden="true"
    class="{maximized
      ? 'icon-[lucide--minimize-2]'
      : 'icon-[lucide--maximize-2]'} h-3.5 w-3.5"
  ></span>
  {maximized ? "MINIMIZE" : "MAXIMIZE"}
</button>
