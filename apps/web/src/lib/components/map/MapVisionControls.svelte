<script lang="ts">
  import { mapStore } from "$lib/stores/map.svelte";
  import { mapSession } from "$lib/stores/map-session.svelte";
  import SoloTravelReadout from "./SoloTravelReadout.svelte";
  import {
    SOLO_EXPLORATION_CONTEXT,
    type SoloExplorationRecorder,
  } from "./solo-exploration-recorder.svelte";
  import { getContext } from "svelte";

  const soloRecorder = getContext<SoloExplorationRecorder>(
    SOLO_EXPLORATION_CONTEXT,
  );
  const isHexGrid = $derived(
    mapStore.showGrid &&
      (mapStore.gridType === "hex-pointy" || mapStore.gridType === "hex-flat"),
  );
  const visionHexes = $derived(
    mapSession.gridDistance > 0
      ? Math.max(
          0,
          Math.min(
            10,
            Math.round(mapStore.visionRange / mapSession.gridDistance),
          ),
        )
      : 0,
  );
</script>

<div class="flex items-center gap-2 px-2 max-sm:w-full">
  <label
    for="map-vision-range"
    class="text-nano text-theme-muted font-bold tracking-tighter uppercase"
    >{isHexGrid
      ? `Vision: ${visionHexes} ${visionHexes === 1 ? "hex" : "hexes"}`
      : "Vision Range"}</label
  >
  <input
    id="map-vision-range"
    type="range"
    min={isHexGrid ? 0 : 5}
    max={isHexGrid ? 10 : 300}
    step={isHexGrid ? 1 : 5}
    value={isHexGrid ? visionHexes : mapStore.visionRange}
    oninput={(event) => {
      const value = Number(event.currentTarget.value);
      mapStore.visionRange = isHexGrid
        ? value * mapSession.gridDistance
        : value;
    }}
    class="w-24 accent-theme-primary h-1 max-sm:h-6 max-sm:min-w-0 max-sm:flex-1"
    aria-label={isHexGrid ? "Vision range in hexes" : "Vision range"}
  />
  <span class="text-nano text-theme-primary font-mono w-10 shrink-0"
    >{isHexGrid
      ? `${visionHexes} ${visionHexes === 1 ? "hex" : "hexes"}`
      : `${mapStore.visionRange}${mapSession.gridUnit}`}</span
  >
</div>

<SoloTravelReadout
  recorder={soloRecorder}
  visible={mapStore.isGMMode &&
    mapStore.soloFog &&
    mapStore.showFog &&
    (mapSession.allTokens ?? []).some((token) => token.isVisionSource === true)}
/>
