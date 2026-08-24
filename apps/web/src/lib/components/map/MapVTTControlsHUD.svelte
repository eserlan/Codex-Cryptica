<script lang="ts">
  import VTTModeToggle from "$lib/components/map/VTTModeToggle.svelte";
  import LayerPanel from "$lib/components/map/LayerPanel.svelte";
  import {
    getMeasurementToolButtonClass,
    getPrimaryButtonStateClass,
  } from "$lib/components/map/vtt-ui";
  import { mapStore } from "$lib/stores/map.svelte";
  import { mapSession } from "$lib/stores/map-session.svelte";
  import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";

  let {
    chatSidebarOffset,
  }: {
    chatSidebarOffset: string;
  } = $props();

  let showLayerPanel = $state(false);
  let layerPanelContainer = $state<HTMLDivElement>();

  function handleWindowClick(event: MouseEvent) {
    if (!showLayerPanel) return;
    if (
      event.target instanceof Node &&
      layerPanelContainer?.contains(event.target)
    ) {
      return;
    }
    showLayerPanel = false;
  }

  function openGridSettings(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    mapSession.showGridSettings = true;
  }
</script>

<svelte:window onclick={handleWindowClick} />

{#if !sessionModeStore.isGuestMode && mapSession.vttEnabled}
  <div
    class="absolute z-20 pointer-events-auto"
    style="bottom: 1rem; left: calc({chatSidebarOffset} + 1rem);"
  >
    <button
      type="button"
      class={getMeasurementToolButtonClass(mapSession.measurement.active)}
      onclick={(e) => {
        e.stopPropagation();
        mapSession.setMeasurementActive(!mapSession.measurement.active);
      }}
      aria-pressed={mapSession.measurement.active}
      title={mapSession.measurement.active
        ? "Disable measurement tool"
        : "Measure: click on map to set start point, click again to set end point"}
      aria-label="Toggle measurement tool"
    >
      <span
        class={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
          mapSession.measurement.active
            ? "border-theme-bg/20 bg-theme-bg shadow-md translate-x-[calc(1.075rem+2px)]"
            : "border-theme-border bg-theme-bg/90 shadow-sm translate-x-0 group-hover:border-theme-primary/40"
        }`}
      >
        <span
          aria-hidden="true"
          class={`icon-[lucide--ruler] w-4 h-4 transition-colors ${
            mapSession.measurement.active
              ? "text-theme-primary"
              : "text-theme-muted group-hover:text-theme-primary"
          }`}
        ></span>
      </span>

      {#if mapSession.measurement.active}
        <span
          class="pointer-events-none absolute inset-0 rounded-full bg-[linear-gradient(135deg,rgba(255,255,255,0.18),transparent_48%)]"
        ></span>
      {/if}
    </button>
  </div>
{/if}

<!-- svelte-ignore a11y_no_static_element_interactions -->
{#if !sessionModeStore.isGuestMode}
  <div
    class="absolute inset-x-4 bottom-4 z-10 flex justify-center"
    role="presentation"
    onmousedown={(e) => e.stopPropagation()}
  >
    <div
      class="flex gap-1.5 bg-theme-surface/80 backdrop-blur border border-theme-border p-1.5 rounded-lg shadow-lg items-center"
    >
      <button
        type="button"
        class={`px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${getPrimaryButtonStateClass(sessionModeStore.sharedMode)}`}
        onclick={() =>
          (sessionModeStore.sharedMode = !sessionModeStore.sharedMode)}
        title={sessionModeStore.sharedMode
          ? "Exit Shared Mode (Admin View)"
          : "Enter Shared Mode (Player Preview)"}
        data-testid="shared-mode-toggle"
        aria-pressed={sessionModeStore.sharedMode}
        aria-label="Toggle player view mode"
      >
        {sessionModeStore.sharedMode ? "EXIT PLAYER VIEW" : "PLAYER VIEW"}
      </button>

      {#if mapStore.isGMMode}
        <button
          type="button"
          class={`px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${getPrimaryButtonStateClass(mapStore.showFog)}`}
          onclick={() => (mapStore.showFog = !mapStore.showFog)}
        >
          FOG: {mapStore.showFog ? "ON" : "OFF"}
        </button>

        <button
          type="button"
          class={`px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${getPrimaryButtonStateClass(mapStore.visionMode === "selected")}`}
          onclick={() =>
            (mapStore.visionMode =
              mapStore.visionMode === "party" ? "selected" : "party")}
          title="Party Vision combines all PC tokens' vision. Selected Token Vision shows only the currently selected PC's viewpoint."
        >
          VISION: {mapStore.visionMode === "selected" ? "SELECTED" : "PARTY"}
        </button>

        <div class="flex items-center gap-2 px-2">
          <span
            class="text-[9px] text-theme-muted font-bold tracking-tighter uppercase"
            >Vision Range</span
          >
          <input
            type="range"
            min="5"
            max="300"
            step="5"
            bind:value={mapStore.visionRange}
            class="w-24 accent-theme-primary h-1"
          />
          <span class="text-[9px] text-theme-primary font-mono w-8"
            >{mapStore.visionRange}{mapSession.gridUnit}</span
          >
        </div>

        <button
          type="button"
          class={`px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${getPrimaryButtonStateClass(mapStore.showLabels)}`}
          onclick={() => (mapStore.showLabels = !mapStore.showLabels)}
          title="Toggle Pin Labels"
        >
          LABELS: {mapStore.showLabels ? "ON" : "OFF"}
        </button>

        <button
          type="button"
          class={`px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${getPrimaryButtonStateClass(mapStore.showGrid)}`}
          onclick={() => (mapStore.showGrid = !mapStore.showGrid)}
          oncontextmenu={openGridSettings}
          title="Toggle Grid (Right-click for settings)"
        >
          GRID: {mapStore.showGrid ? "ON" : "OFF"}
        </button>

        <div class="relative" bind:this={layerPanelContainer}>
          <button
            type="button"
            class={`px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${getPrimaryButtonStateClass(showLayerPanel)}`}
            onclick={(e) => {
              e.stopPropagation();
              showLayerPanel = !showLayerPanel;
            }}
            aria-pressed={showLayerPanel}
            title="Choose which layer you're editing, and toggle layer visibility/lock"
          >
            LAYERS
          </button>
          {#if showLayerPanel}
            <div class="absolute bottom-full left-0 mb-2">
              <LayerPanel onClose={() => (showLayerPanel = false)} />
            </div>
          {/if}
        </div>

        <VTTModeToggle />

        {#if mapStore.showFog}
          <div class="flex items-center gap-2 px-2">
            <span
              class="text-[9px] text-theme-muted font-bold tracking-tighter uppercase"
              >Brush Size</span
            >
            <input
              type="range"
              min="10"
              max="500"
              bind:value={mapStore.brushRadius}
              class="w-24 accent-theme-primary h-1"
            />
            <span class="text-[9px] text-theme-primary font-mono w-6"
              >{mapStore.brushRadius}px</span
            >
          </div>

          <div
            class="flex flex-col justify-center px-2 text-[10px] text-theme-muted/90 font-semibold italic leading-tight"
          >
            <span>Alt+Drag to Reveal</span>
            <span>Alt+Shift+Drag to Hide</span>
          </div>
        {/if}
      {/if}
    </div>
  </div>
{/if}
