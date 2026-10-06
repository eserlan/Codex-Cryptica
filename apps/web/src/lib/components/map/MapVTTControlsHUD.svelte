<script lang="ts">
  import VTTModeToggle from "$lib/components/map/VTTModeToggle.svelte";
  import MapControlsFab from "$lib/components/map/MapControlsFab.svelte";
  import MapMaximizeToggle from "$lib/components/map/MapMaximizeToggle.svelte";
  import MapCifButton from "$lib/components/map/MapCifButton.svelte";
  import LayerPanel from "$lib/components/map/LayerPanel.svelte";
  import { LAYER_OPTIONS } from "$lib/components/ui/LayerMenu.svelte";
  import {
    getMeasurementToolButtonClass,
    getPrimaryButtonStateClass,
  } from "$lib/components/map/vtt-ui";
  import { mapStore } from "$lib/stores/map.svelte";
  import { mapSession } from "$lib/stores/map-session.svelte";
  import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
  import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";
  import { mapControlsUIStore } from "$lib/stores/ui/map-controls-ui.svelte";

  let {
    chatSidebarOffset,
  }: {
    chatSidebarOffset: string;
  } = $props();

  // On phones the bar is hidden behind a button, like the graph controls.
  const barVisible = $derived(
    !layoutUIStore.isMobile || mapControlsUIStore.open,
  );

  // Never leave the app chrome hidden after the map screen is gone. This lives
  // here, not in the toggle: the toggle unmounts whenever the phone panel
  // closes, which must not undo maximizing.
  $effect(() => () => {
    mapControlsUIStore.maximized = false;
  });

  let showLayerPanel = $state(false);
  let layerPanelContainer = $state<HTMLDivElement>();
  const activeLayerOption = $derived(
    LAYER_OPTIONS.find((option) => option.value === mapSession.activeLayer) ??
      LAYER_OPTIONS[0],
  );

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
    class="absolute bottom-4 left-4 z-20 pointer-events-auto sm:left-[var(--map-hud-left)] max-sm:bottom-auto max-sm:top-16"
    style="--map-hud-left: calc({chatSidebarOffset} + 1rem);"
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
      data-help-target="vtt-ruler-toggle"
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

{#if !sessionModeStore.isGuestMode && layoutUIStore.isMobile}
  <MapControlsFab />
{/if}

<!-- svelte-ignore a11y_no_static_element_interactions -->
{#if !sessionModeStore.isGuestMode && barVisible}
  <div
    class="pointer-events-none absolute inset-x-2 bottom-2 z-10 flex justify-center sm:inset-x-4 min-[769px]:bottom-4 max-[769px]:bottom-16"
    role="presentation"
    onmousedown={(e) => e.stopPropagation()}
  >
    <!-- Wraps on phones; only the bar itself takes touches so the map can
         still be panned and pinched around it. -->
    <div
      id="map-controls-bar"
      class="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-1.5 rounded-lg border border-theme-border bg-theme-surface/80 p-1.5 shadow-lg backdrop-blur"
      role="presentation"
      onpointerdown={(e) => e.stopPropagation()}
      ontouchstart={(e) => e.stopPropagation()}
    >
      {#if !mapSession.vttEnabled}
        <MapMaximizeToggle />
      {/if}

      <MapCifButton />

      <button
        type="button"
        class={`touch-target px-2.5 py-1.5 rounded-md text-micro font-bold uppercase tracking-wider transition-all ${getPrimaryButtonStateClass(sessionModeStore.sharedMode)}`}
        onclick={() =>
          (sessionModeStore.sharedMode = !sessionModeStore.sharedMode)}
        title={sessionModeStore.sharedMode
          ? "Exit Shared Mode (Admin View)"
          : "Enter Shared Mode (Player Preview)"}
        data-testid="shared-mode-toggle"
        data-help-target="vtt-player-view-toggle"
        aria-pressed={sessionModeStore.sharedMode}
        aria-label="Toggle player view mode"
      >
        {sessionModeStore.sharedMode ? "EXIT PLAYER VIEW" : "PLAYER VIEW"}
      </button>

      {#if mapStore.isGMMode}
        <button
          type="button"
          class={`touch-target px-2.5 py-1.5 rounded-md text-micro font-bold uppercase tracking-wider transition-all ${getPrimaryButtonStateClass(mapStore.showFog)}`}
          onclick={() => (mapStore.showFog = !mapStore.showFog)}
          data-help-target="vtt-fog-toggle"
        >
          FOG: {mapStore.showFog ? "ON" : "OFF"}
        </button>

        <button
          type="button"
          class={`touch-target px-2.5 py-1.5 rounded-md text-micro font-bold uppercase tracking-wider transition-all ${getPrimaryButtonStateClass(mapStore.visionMode === "selected")}`}
          onclick={() =>
            (mapStore.visionMode =
              mapStore.visionMode === "party" ? "selected" : "party")}
          title="Party Vision combines all PC tokens' vision. Selected Token Vision shows only the currently selected PC's viewpoint."
        >
          VISION: {mapStore.visionMode === "selected" ? "SELECTED" : "PARTY"}
        </button>

        <div class="flex items-center gap-2 px-2 max-sm:w-full">
          <span
            class="text-nano text-theme-muted font-bold tracking-tighter uppercase"
            >Vision Range</span
          >
          <input
            type="range"
            min="5"
            max="300"
            step="5"
            bind:value={mapStore.visionRange}
            class="w-24 accent-theme-primary h-1 max-sm:h-6 max-sm:min-w-0 max-sm:flex-1"
          />
          <span class="text-nano text-theme-primary font-mono w-10 shrink-0"
            >{mapStore.visionRange}{mapSession.gridUnit}</span
          >
        </div>

        <button
          type="button"
          class={`touch-target px-2.5 py-1.5 rounded-md text-micro font-bold uppercase tracking-wider transition-all ${getPrimaryButtonStateClass(mapStore.showLabels)}`}
          onclick={() => (mapStore.showLabels = !mapStore.showLabels)}
          title="Toggle Pin Labels"
        >
          LABELS: {mapStore.showLabels ? "ON" : "OFF"}
        </button>

        <button
          type="button"
          class={`touch-target px-2.5 py-1.5 rounded-md text-micro font-bold uppercase tracking-wider transition-all ${getPrimaryButtonStateClass(mapStore.showGrid)}`}
          onclick={() => (mapStore.showGrid = !mapStore.showGrid)}
          oncontextmenu={openGridSettings}
          title="Toggle Grid (Right-click for settings)"
          data-help-target="vtt-grid-button"
        >
          GRID: {mapStore.showGrid ? "ON" : "OFF"}
        </button>

        <div
          class="relative"
          bind:this={layerPanelContainer}
          data-help-target="vtt-layer-control"
        >
          <button
            type="button"
            class={`touch-target px-2.5 py-1.5 rounded-md transition-all flex items-center ${getPrimaryButtonStateClass(showLayerPanel)}`}
            onclick={(e) => {
              e.stopPropagation();
              showLayerPanel = !showLayerPanel;
            }}
            aria-pressed={showLayerPanel}
            aria-label="Layer: {activeLayerOption.label}"
            title="Layer: {activeLayerOption.label} — choose which layer you're editing, and toggle layer visibility/lock"
          >
            <span
              class="{activeLayerOption.icon} w-3.5 h-3.5"
              aria-hidden="true"
            ></span>
          </button>
          {#if showLayerPanel}
            <div
              class="absolute bottom-full left-0 mb-2 max-sm:fixed max-sm:inset-x-2 max-sm:bottom-[12rem] max-sm:mb-0 max-sm:flex max-sm:justify-center"
            >
              <LayerPanel onClose={() => (showLayerPanel = false)} />
            </div>
          {/if}
        </div>

        <VTTModeToggle />

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
      {/if}
    </div>
  </div>
{/if}
