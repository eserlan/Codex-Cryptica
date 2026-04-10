<script lang="ts">
  import { mapStore } from "$lib/stores/map.svelte";
  import { mapSession } from "$lib/stores/map-session.svelte";
  import { uiStore } from "$lib/stores/ui.svelte";
  import FeatureHint from "$lib/components/help/FeatureHint.svelte";
  import EncounterManager from "$lib/components/vtt/EncounterManager.svelte";
  import VTTGridSettings from "./VTTGridSettings.svelte";
  import { getPrimaryButtonStateClass } from "./vtt-ui";

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
  class="flex items-center gap-1.5 rounded-lg border border-theme-border bg-theme-surface/90 backdrop-blur p-1.5 shadow-lg pointer-events-auto"
>
  <button
    class={`px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${getPrimaryButtonStateClass(mapSession.mode === "exploration")}`}
    onclick={() => mapSession.setMode("exploration")}
    type="button"
  >
    Explore
  </button>

  <button
    class={`px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${getPrimaryButtonStateClass(mapSession.mode === "combat")}`}
    onclick={() => mapSession.setMode("combat")}
    type="button"
  >
    Combat
  </button>

  {#if canManageVtt}
    <div class="h-6 w-px bg-theme-border/70 mx-0.5"></div>

    <button
      class={`px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${getPrimaryButtonStateClass(false)} disabled:opacity-50 disabled:cursor-not-allowed`}
      onclick={openTokenDialog}
      disabled={!mapStore.activeMap}
      type="button"
    >
      Add Token
    </button>

    <button
      class={`px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${getPrimaryButtonStateClass(false)}`}
      onclick={() => (showEncounters = true)}
      type="button"
    >
      Encounters
    </button>
  {/if}

  <div class="ml-1">
    <FeatureHint hintId="vtt-mode" />
  </div>
</div>

{#if showEncounters}
  <EncounterManager close={() => (showEncounters = false)} />
{/if}

{#if mapSession.showGridSettings}
  <VTTGridSettings close={() => (mapSession.showGridSettings = false)} />
{/if}
