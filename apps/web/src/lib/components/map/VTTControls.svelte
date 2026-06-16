<script lang="ts">
  import { mapStore } from "$lib/stores/map.svelte";
  import { mapSession } from "$lib/stores/map-session.svelte";
  import FeatureHint from "$lib/components/help/FeatureHint.svelte";
  import EncounterManager from "$lib/components/vtt/EncounterManager.svelte";
  import VTTGridSettings from "./VTTGridSettings.svelte";
  import { getPrimaryButtonStateClass } from "./vtt-ui";
  import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";

  let showEncounters = $state(false);
  let canManageVtt = $derived(!sessionModeStore.isGuestMode);

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

<div class="flex flex-col gap-2 pointer-events-auto">
  <div class="min-w-0 w-full">
    <FeatureHint hintId="vtt-mode" />
  </div>

  <div
    class="flex flex-wrap items-center gap-1.5 rounded-lg border border-theme-border bg-theme-surface/90 p-1.5 shadow-lg backdrop-blur min-w-0"
  >
    <button
      class={`h-9 w-9 flex items-center justify-center rounded-md transition-all ${getPrimaryButtonStateClass(mapSession.mode === "exploration")}`}
      onclick={() => mapSession.setMode("exploration")}
      type="button"
      aria-label="Explore"
      title="Explore"
      aria-pressed={mapSession.mode === "exploration"}
    >
      <span class="icon-[lucide--compass] h-4 w-4" aria-hidden="true"></span>
    </button>

    <button
      class={`h-9 w-9 flex items-center justify-center rounded-md transition-all ${getPrimaryButtonStateClass(mapSession.mode === "combat")}`}
      onclick={() => mapSession.setMode("combat")}
      type="button"
      aria-label="Combat"
      title="Combat"
      aria-pressed={mapSession.mode === "combat"}
    >
      <span class="icon-[lucide--swords] h-4 w-4" aria-hidden="true"></span>
    </button>

    {#if canManageVtt}
      <div class="h-6 w-px bg-theme-border/70 mx-0.5 shrink-0"></div>

      <button
        class={`h-9 w-9 flex items-center justify-center rounded-md transition-all ${getPrimaryButtonStateClass(false)} disabled:opacity-50 disabled:cursor-not-allowed`}
        onclick={openTokenDialog}
        disabled={!mapStore.activeMap}
        type="button"
        aria-label="Add Token"
        title="Add Token"
        aria-haspopup="dialog"
        aria-expanded={!!mapSession.pendingTokenCoords}
      >
        <span class="icon-[lucide--user-plus] h-4 w-4" aria-hidden="true"
        ></span>
      </button>

      <button
        class={`h-9 w-9 flex items-center justify-center rounded-md transition-all ${getPrimaryButtonStateClass(false)}`}
        onclick={() => (showEncounters = true)}
        type="button"
        aria-label="Encounters"
        title="Encounters"
        aria-haspopup="dialog"
        aria-expanded={showEncounters}
      >
        <span class="icon-[lucide--scroll-text] h-4 w-4" aria-hidden="true"
        ></span>
      </button>
    {/if}
  </div>
</div>

{#if showEncounters}
  <EncounterManager close={() => (showEncounters = false)} />
{/if}

{#if mapSession.showGridSettings}
  <VTTGridSettings close={() => (mapSession.showGridSettings = false)} />
{/if}
