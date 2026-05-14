<script lang="ts">
  import PinLinker from "./PinLinker.svelte";
  import MapPinPopover from "./MapPinPopover.svelte";
  import { mapStore } from "../../stores/map.svelte";
  import { uiStore } from "../../stores/ui.svelte";
  import { vault } from "../../stores/vault.svelte";
  import type { MapInteractionManager } from "./map-interactions.svelte";

  let { interactions }: { interactions: MapInteractionManager } = $props();

  let selectedPin = $derived(
    mapStore.pins.find((p) => p.id === interactions.selectedPinId),
  );
  let subMapForSelected = $derived(
    selectedPin?.entityId
      ? mapStore.getEntitySubMap(selectedPin.entityId)
      : null,
  );
</script>

{#if mapStore.pendingPinCoords}
  <PinLinker
    onSelect={(id) => {
      mapStore.addPin(id, mapStore.pendingPinCoords!);
      mapStore.pendingPinCoords = null;
    }}
    onCancel={() => {
      mapStore.addPin(undefined, mapStore.pendingPinCoords!);
      mapStore.pendingPinCoords = null;
    }}
  />
{/if}

{#if selectedPin}
  {@const pos = mapStore.project(selectedPin.coordinates)}
  <MapPinPopover
    x={pos.x}
    y={pos.y}
    entity={selectedPin.entityId ? vault.entities[selectedPin.entityId] : null}
    subMap={subMapForSelected}
    onOpenEntity={(entityId) => uiStore.openZenMode(entityId)}
    onEnterSubmap={(mapId) => mapStore.selectMap(mapId, true)}
    onDelete={() => {
      if (interactions.selectedPinId) {
        mapStore.removePin(interactions.selectedPinId);
        interactions.selectedPinId = null;
      }
    }}
    onClose={() => (interactions.selectedPinId = null)}
  />
{/if}

{#if interactions.gridFitStart && interactions.gridFitEnd}
  <div
    class="absolute inset-0 z-[60] pointer-events-none"
    style:cursor="crosshair"
  >
    <div
      class="absolute border-2 border-dashed"
      style:border-color="var(--color-theme-primary, #78350f)"
      style:left={`${Math.min(interactions.gridFitStart.x, interactions.gridFitEnd.x)}px`}
      style:top={`${Math.min(interactions.gridFitStart.y, interactions.gridFitEnd.y)}px`}
      style:width={`${Math.abs(interactions.gridFitEnd.x - interactions.gridFitStart.x)}px`}
      style:height={`${Math.abs(interactions.gridFitEnd.y - interactions.gridFitStart.y)}px`}
    ></div>
  </div>
{/if}

{#if interactions.boxSelectStart && interactions.boxSelectEnd}
  <div
    class="absolute inset-0 z-[60] pointer-events-none"
    style:cursor="crosshair"
  >
    <div
      class="absolute border-2 border-dashed bg-theme-primary/10"
      style:border-color="var(--color-theme-primary, #78350f)"
      style:left={`${Math.min(interactions.boxSelectStart.x, interactions.boxSelectEnd.x)}px`}
      style:top={`${Math.min(interactions.boxSelectStart.y, interactions.boxSelectEnd.y)}px`}
      style:width={`${Math.abs(interactions.boxSelectEnd.x - interactions.boxSelectStart.x)}px`}
      style:height={`${Math.abs(interactions.boxSelectEnd.y - interactions.boxSelectStart.y)}px`}
    ></div>
  </div>
{/if}
