<script lang="ts">
  import { mapStore } from "$lib/stores/map.svelte";
  import { mapSession } from "$lib/stores/map-session.svelte";
  import { themeStore } from "$lib/stores/theme.svelte";
  import { isFogHex } from "$lib/utils/color";
  import { getPrimaryButtonStateClass } from "$lib/components/map/vtt-ui";

  const pickerValue = $derived(
    isFogHex(mapStore.fogColor)
      ? mapStore.fogColor
      : isFogHex(themeStore.activeTheme.tokens.secondary)
        ? themeStore.activeTheme.tokens.secondary
        : "#000000",
  );

  // Dragging previews locally; committing shares the colour with players.
  function setFogColor(color: string | null) {
    mapSession.setGridSettings({ fogColor: color });
  }
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
  <label
    class="touch-target inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-theme-border text-micro font-bold uppercase tracking-wider text-theme-muted"
    title="Fog colour for this map. Players see the colour you pick."
  >
    <span class="icon-[lucide--palette] h-3.5 w-3.5" aria-hidden="true"></span>
    Fog colour
    <input
      type="color"
      class="h-5 w-6 cursor-pointer rounded border border-theme-border bg-transparent p-0"
      value={pickerValue}
      oninput={(event) => (mapStore.fogColor = event.currentTarget.value)}
      onchange={(event) => setFogColor(event.currentTarget.value)}
      data-testid="vtt-fog-color"
    />
  </label>
  {#if mapStore.fogColor}
    <button
      type="button"
      class="touch-target px-2.5 py-1.5 rounded-md text-micro font-bold uppercase tracking-wider text-theme-muted hover:text-theme-primary"
      onclick={() => setFogColor(null)}
      data-testid="vtt-fog-color-reset"
    >
      Theme colour
    </button>
  {/if}
{/if}
