<script lang="ts">
  import { mapStore } from "$lib/stores/map.svelte";
  import { getPrimaryButtonStateClass } from "$lib/components/map/vtt-ui";
</script>

<button
  type="button"
  class={`touch-target px-2.5 py-1.5 rounded-md text-micro font-bold uppercase tracking-wider transition-all ${getPrimaryButtonStateClass(mapStore.showFog)}`}
  onclick={() => (mapStore.showFog = !mapStore.showFog)}
  data-help-target="vtt-fog-toggle"
>
  FOG: {mapStore.showFog ? "ON" : "OFF"}
</button>

{#if mapStore.showFog}
  <button
    type="button"
    class={`touch-target px-2.5 py-1.5 rounded-md text-micro font-bold uppercase tracking-wider transition-all ${getPrimaryButtonStateClass(mapStore.soloFog)}`}
    onclick={() => (mapStore.soloFog = !mapStore.soloFog)}
    aria-pressed={mapStore.soloFog}
    aria-describedby="solo-fog-description"
    aria-label="SOLO: {mapStore.soloFog ? 'ON' : 'OFF'}"
    title="Show fog as players see it, for solo play. Fogged areas stay completely hidden while every GM control keeps working."
    data-help-target="vtt-solo-fog-toggle"
  >
    SOLO: {mapStore.soloFog ? "ON" : "OFF"}
    <span id="solo-fog-description" class="sr-only">
      Fogged areas stay hidden while you explore in GM view. Turn fog on first.
    </span>
  </button>
{/if}
