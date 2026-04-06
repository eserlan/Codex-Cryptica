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
  class="flex items-center gap-2 rounded-xl border border-theme-border bg-theme-surface/90 backdrop-blur px-3 py-2 shadow-2xl pointer-events-auto"
>
  <div class="flex items-center gap-1 border-r border-theme-border pr-2">
    <button
      class="px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors {mapSession.mode ===
      'exploration'
        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
        : 'text-theme-muted hover:text-theme-text'}"
      onclick={() => mapSession.setMode("exploration")}
    >
      Explore
    </button>
    <button
      class="px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors {mapSession.mode ===
      'combat'
        ? 'bg-red-500/20 text-red-300 border border-red-500/40'
        : 'text-theme-muted hover:text-theme-text'}"
      onclick={() => mapSession.setMode("combat")}
    >
      Combat
    </button>
  </div>

  <button
    class="px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors {mapSession
      .measurement.active
      ? 'bg-theme-primary/20 text-theme-primary border border-theme-primary/40'
      : 'text-theme-muted hover:text-theme-text'}"
    onclick={() =>
      mapSession.setMeasurementActive(!mapSession.measurement.active)}
  >
    Measure
  </button>

  {#if canManageVtt}
    <button
      class="px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest text-theme-muted hover:text-theme-text"
      onclick={() => (mapSession.showGridSettings = true)}
      oncontextmenu={(e) => {
        e.preventDefault();
        mapSession.showGridSettings = true;
      }}
      title="Grid Settings"
    >
      Grid
    </button>

    <button
      class="px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest text-theme-muted hover:text-theme-text"
      onclick={openTokenDialog}
      disabled={!mapStore.activeMap}
    >
      Add Token
    </button>

    <button
      class="px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest text-theme-muted hover:text-theme-text"
      onclick={() => (showEncounters = true)}
    >
      Encounters
    </button>
  {/if}

  <div class="ml-2">
    <FeatureHint hintId="vtt-mode" />
  </div>
</div>

{#if showEncounters}
  <EncounterManager close={() => (showEncounters = false)} />
{/if}

{#if mapSession.showGridSettings}
  <VTTGridSettings close={() => (mapSession.showGridSettings = false)} />
{/if}
