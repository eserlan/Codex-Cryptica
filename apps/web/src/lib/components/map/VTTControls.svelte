<script lang="ts">
  import { mapStore } from "$lib/stores/map.svelte";
  import { mapSession } from "$lib/stores/map-session.svelte";
  import { uiStore } from "$lib/stores/ui.svelte";
  import FeatureHint from "$lib/components/help/FeatureHint.svelte";
  import EncounterManager from "$lib/components/vtt/EncounterManager.svelte";
  import VTTGridSettings from "./VTTGridSettings.svelte";

  let showEncounters = $state(false);
  let canManageVtt = $derived(!uiStore.isGuestMode);

  function openTokenDialog() {
    if (!canManageVtt) return;
    const activeMap = mapStore.activeMap;
    if (!activeMap) return;
    mapSession.pendingTokenCoords = {
      x: activeMap.dimensions.width / 2,
      y: activeMap.dimensions.height / 2,
    };
  }
</script>

<div
  class="flex items-center gap-1.5 rounded-lg border border-theme-border bg-theme-surface/90 backdrop-blur px-2 py-1.5 shadow-lg pointer-events-auto"
>
  <button
    class="px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all {mapSession.mode ===
    'exploration'
      ? 'bg-theme-primary/20 text-theme-primary ring-1 ring-theme-primary/50 hover:bg-theme-primary/30'
      : 'text-theme-muted hover:text-theme-text hover:bg-theme-primary/10'}"
    onclick={() => mapSession.setMode("exploration")}
  >
    Explore
  </button>
  <button
    class="px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all {mapSession.mode ===
    'combat'
      ? 'bg-theme-primary/20 text-theme-primary ring-1 ring-theme-primary/50 hover:bg-theme-primary/30'
      : 'text-theme-muted hover:text-theme-text hover:bg-theme-primary/10'}"
    onclick={() => mapSession.setMode("combat")}
  >
    Combat
  </button>

  <button
    class="px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all {mapSession
      .measurement.active
      ? 'bg-theme-primary/20 text-theme-primary ring-1 ring-theme-primary/50 hover:bg-theme-primary/30'
      : 'text-theme-muted hover:text-theme-text hover:bg-theme-primary/10'}"
    onclick={() =>
      mapSession.setMeasurementActive(!mapSession.measurement.active)}
  >
    Measure
  </button>

  {#if canManageVtt}
    <button
      class="px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider text-theme-muted hover:text-theme-text transition-all hover:bg-theme-primary/10 disabled:opacity-50 disabled:cursor-not-allowed"
      onclick={openTokenDialog}
      disabled={!mapStore.activeMap}
    >
      Add Token
    </button>

    <button
      class="px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider text-theme-muted hover:text-theme-text transition-all hover:bg-theme-primary/10"
      onclick={() => (showEncounters = true)}
    >
      Encounters
    </button>
  {/if}

  <div class="ml-0.5">
    <FeatureHint hintId="vtt-mode" />
  </div>
</div>

{#if showEncounters}
  <EncounterManager close={() => (showEncounters = false)} />
{/if}

{#if mapSession.showGridSettings}
  <VTTGridSettings close={() => (mapSession.showGridSettings = false)} />
{/if}
