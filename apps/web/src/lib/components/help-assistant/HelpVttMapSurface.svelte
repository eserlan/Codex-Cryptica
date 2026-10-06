<script lang="ts">
  import type { VttHelpFacts, VttPanelId } from "help-engine";
  import { p2pHost } from "$lib/cloud-bridge/p2p/host-service.svelte";
  import { mapSession } from "$lib/stores/map-session.svelte";
  import { mapStore } from "$lib/stores/map.svelte";
  import { reachableVttActions } from "$lib/services/help-assistant/vtt-help-actions";
  import { helpSurfaces } from "$lib/stores/help-assistant/help-surface.svelte";
  import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";
  import { mapControlsUIStore } from "$lib/stores/ui/map-controls-ui.svelte";
  import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";

  /**
   * Renderless. Tells the help assistant a few yes/no facts about the user's
   * own VTT state. Facts a player is not entitled to (the GM's layer, tokens
   * hidden from them) are never reported, and nothing carries a name, an ID
   * or text: the screen description has nowhere to put them.
   */
  function gridKind(): VttHelpFacts["grid"] {
    if (!mapStore.showGrid) return "none";
    return mapStore.gridType === "square" ? "square" : "hex";
  }

  /** The selected token, only if this user is allowed to see it. */
  function visibleSelection(isHost: boolean, peerId: string | null) {
    const id = mapSession.vttEnabled ? mapSession.selection : null;
    const token = id ? mapSession.tokens[id] : undefined;
    if (!token || !mapSession.canViewToken(token.id, peerId, isHost)) {
      return null;
    }
    return token;
  }

  function reportSoloFog(isHost: boolean, playerView: boolean): boolean {
    return isHost && !playerView && mapStore.showFog && mapStore.soloFog;
  }

  function facts(): VttHelpFacts {
    const guest = sessionModeStore.isGuestMode;
    const playerView = !guest && sessionModeStore.sharedMode;
    const isHost = mapStore.isGMMode && !guest;
    const peerId = mapSession.myPeerId;
    const vttOn = mapSession.vttEnabled;
    const token = visibleSelection(isHost, peerId);

    return {
      vttOn,
      combat: vttOn && mapSession.mode === "combat",
      guest,
      playerView,
      grid: gridKind(),
      fogOn: mapStore.showFog,
      soloFog: reportSoloFog(isHost, playerView),
      tokenSelected: token !== null,
      tokenLinked: !!token?.entityId,
      tokenManageable:
        token !== null && mapSession.canMoveToken(token.id, peerId, isHost),
      layer: guest || playerView ? null : mapSession.activeLayer,
      hasInitiative: mapSession.initiativeEntries.length > 0,
      canAdvanceTurn: mapSession.canAdvanceTurn(peerId, isHost),
      hosting: !guest && p2pHost.isHosting,
      measuring: mapSession.measurement.active,
    };
  }

  function actions(): string[] {
    // The map route also renders an empty state with this surface mounted;
    // none of the VTT panels or controls exist until a map is active.
    if (!mapStore.activeMap) return [];

    const guest = sessionModeStore.isGuestMode;
    return reachableVttActions({
      guest,
      gm: mapStore.isGMMode && !guest,
      vttOn: mapSession.vttEnabled,
      combat: mapSession.mode === "combat",
      soloFog: mapStore.soloFog && mapStore.showFog,
    });
  }

  /** Shows a panel. Only what is on screen changes; the session is left alone. */
  function openPanel(panel: VttPanelId): boolean {
    if (!actions().includes(panel)) return false;
    switch (panel) {
      case "vtt-sidebar":
        layoutUIStore.toggleVttSidebar(false);
        return true;
      case "vtt-map-controls":
        mapControlsUIStore.open = true;
        return true;
      case "vtt-grid-settings":
        mapSession.showGridSettings = true;
        return true;
      case "vtt-encounters":
        mapControlsUIStore.showEncounters = true;
        return true;
    }
  }

  $effect(() => helpSurfaces.registerVttMap({ facts, actions, openPanel }));
</script>
