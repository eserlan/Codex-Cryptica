<script lang="ts">
  import PinLinker from "./PinLinker.svelte";
  import MapPinPopover from "./MapPinPopover.svelte";
  import TokenHealthBarPopover from "./TokenHealthBarPopover.svelte";
  import { mapStore } from "../../stores/map.svelte";
  import { mapSession } from "../../stores/map-session.svelte";
  import { vault } from "../../stores/vault.svelte";
  import type { MapInteractionManager } from "./map-interactions.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { computeAdjustedCounterValue } from "$lib/utils/stat-sheet-field-actions";
  import type { MapPin } from "schema";

  let { interactions }: { interactions: MapInteractionManager } = $props();

  let selectedPin = $derived(
    mapStore.pins.find((p: MapPin) => p.id === interactions.selectedPinId),
  );
  let subMapForSelected = $derived(
    selectedPin?.entityId
      ? mapStore.getEntitySubMap(selectedPin.entityId)
      : null,
  );

  let healthBarToken = $derived(
    interactions.healthBarPopoverTokenId
      ? mapSession.tokens[interactions.healthBarPopoverTokenId]
      : null,
  );
  let healthBarEntity = $derived(
    healthBarToken?.entityId ? vault.entities[healthBarToken.entityId] : null,
  );
  let healthBarField = $derived(
    healthBarEntity?.statSheet?.fields?.find(
      (f) => f.type === "counter" && f.barField,
    ) ?? null,
  );
</script>

{#if mapSession.armedTile}
  <div
    class="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-full border border-theme-primary/40 bg-theme-surface/95 px-4 py-1.5 shadow-xl backdrop-blur select-none"
    data-testid="map-armed-tile-banner"
  >
    <span
      class="h-2 w-2 rounded-full bg-theme-primary animate-pulse"
      aria-hidden="true"
    ></span>
    <span class="text-xs font-medium text-theme-text">
      Click map to place <strong>{mapSession.armedTile.name}</strong>
    </span>
    <span class="text-[10px] text-theme-muted">· [Esc] to cancel</span>
    <button
      type="button"
      onclick={() => mapSession.clearArmedTile()}
      class="ml-1 rounded-full p-0.5 text-theme-muted hover:text-theme-text transition-colors"
      aria-label="Cancel tile placement"
      title="Cancel tile placement (Esc)"
    >
      <span class="icon-[lucide--x] h-3.5 w-3.5" aria-hidden="true"></span>
    </button>
  </div>
{/if}

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
    onOpenEntity={(entityId) => modalUIStore.openZenMode(entityId)}
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

{#if healthBarToken && healthBarEntity && healthBarField}
  {@const pos = mapStore.project({
    x: healthBarToken.x + healthBarToken.width / 2,
    y: healthBarToken.y,
  })}
  {@const barValue =
    typeof healthBarField.value === "number" ? healthBarField.value : 0}
  {@const barMax = healthBarField.max ?? 1}
  <TokenHealthBarPopover
    x={pos.x}
    y={pos.y}
    label={healthBarField.label}
    value={barValue}
    max={barMax}
    readOnly={vault.isGuest}
    onAdjust={(direction) => {
      if (vault.isGuest || !healthBarEntity || !healthBarField) return;
      const next = computeAdjustedCounterValue(healthBarField, direction);
      vault.updateEntity(healthBarEntity.id, {
        statSheet: {
          templateId: healthBarEntity.statSheet?.templateId ?? null,
          fields: (healthBarEntity.statSheet?.fields ?? []).map((f) =>
            f.id === healthBarField.id ? { ...f, value: next } : f,
          ),
        },
      });
    }}
    onClose={() => (interactions.healthBarPopoverTokenId = null)}
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
    <div
      class="absolute rounded bg-theme-bg/90 px-2 py-1 text-[11px] font-bold text-theme-primary shadow"
      style:left={`${Math.min(interactions.gridFitStart.x, interactions.gridFitEnd.x)}px`}
      style:top={`${Math.min(interactions.gridFitStart.y, interactions.gridFitEnd.y) - 28}px`}
    >
      {interactions.gridFitSpan}×{interactions.gridFitSpan} squares · Shift+Scroll
      to change
    </div>
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

{#each mapStore.pins as pin (pin.id)}
  {@const pos = mapStore.project(pin.coordinates)}
  {#if pos.x >= -100 && pos.x <= mapStore.canvasSize.width + 100 && pos.y >= -100 && pos.y <= mapStore.canvasSize.height + 100}
    {@const entity =
      pin.entityId && vault.entities ? vault.entities[pin.entityId] : null}
    {@const labelText = entity ? entity.title : "Unlinked Pin"}
    <div
      class="absolute pointer-events-none -translate-x-1/2 -translate-y-[34px] z-30 transition-all duration-300 ease-out"
      style:left={`${pos.x}px`}
      style:top={`${pos.y}px`}
      class:opacity-100={mapStore.showLabels &&
        pin.id !== interactions.selectedPinId}
      class:opacity-0={!mapStore.showLabels ||
        pin.id === interactions.selectedPinId}
      class:scale-95={!mapStore.showLabels ||
        pin.id === interactions.selectedPinId}
      aria-hidden={!mapStore.showLabels ||
        pin.id === interactions.selectedPinId}
    >
      <div
        class="px-2 py-0.5 bg-theme-surface/90 border border-theme-border/80 rounded-md text-[10px] font-bold text-theme-text shadow-md whitespace-nowrap select-none backdrop-blur-sm flex items-center"
      >
        {labelText}
      </div>
    </div>
  {/if}
{/each}
