<script lang="ts">
  import { mapStore } from "$lib/stores/map.svelte";
  import { mapSession } from "$lib/stores/map-session.svelte";
  import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
  import { getPrimaryButtonStateClass } from "./vtt-ui";

  /**
   * Arms note placement, so the next click on the map picks the spot.
   *
   * Shared by the VTT toolbar and the plain map HUD: a VTT map is an ordinary
   * map toggled into play, and a note annotates the map either way, so the
   * same button has to be reachable in both.
   */
  let { compact = false }: { compact?: boolean } = $props();

  const canPlace = $derived(
    !sessionModeStore.isGuestMode && Boolean(mapStore.activeMap),
  );

  function toggle() {
    if (!canPlace) return;
    // Pressing again backs out without placing anything.
    if (mapSession.notePlacementArmed) {
      mapSession.cancelNotePlacement();
      return;
    }
    mapSession.armNotePlacement();
  }
</script>

<button
  class={compact
    ? `h-9 w-9 flex items-center justify-center rounded-md transition-all ${getPrimaryButtonStateClass(mapSession.notePlacementArmed)} disabled:opacity-50 disabled:cursor-not-allowed`
    : `px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-theme-primary focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
        mapSession.notePlacementArmed
          ? "bg-theme-primary text-theme-bg border-theme-primary"
          : "bg-theme-surface border-theme-border text-theme-text hover:border-theme-primary hover:text-theme-primary"
      }`}
  onclick={toggle}
  disabled={!canPlace}
  type="button"
  aria-label="Pin Note"
  aria-pressed={mapSession.notePlacementArmed}
  title={mapSession.notePlacementArmed
    ? "Click the map to place the note, or press Escape"
    : "Pin a note to the map"}
  data-testid="vtt-add-note"
>
  <span class="icon-[lucide--sticky-note] h-4 w-4 shrink-0" aria-hidden="true"
  ></span>
  {#if !compact}
    NOTE
  {/if}
</button>
