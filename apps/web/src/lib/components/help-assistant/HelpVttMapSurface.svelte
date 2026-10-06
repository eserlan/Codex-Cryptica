<script lang="ts">
  import type { VttHelpFacts } from "help-engine";
  import { p2pHost } from "$lib/cloud-bridge/p2p/host-service.svelte";
  import { mapSession } from "$lib/stores/map-session.svelte";
  import { mapStore } from "$lib/stores/map.svelte";
  import { helpSurfaces } from "$lib/stores/help-assistant/help-surface.svelte";
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

  function facts(): VttHelpFacts {
    const guest = sessionModeStore.isGuestMode;
    const isHost = mapStore.isGMMode && !guest;
    const peerId = mapSession.myPeerId;
    const vttOn = mapSession.vttEnabled;
    const token = visibleSelection(isHost, peerId);

    return {
      vttOn,
      combat: vttOn && mapSession.mode === "combat",
      guest,
      playerView: !guest && sessionModeStore.sharedMode,
      grid: gridKind(),
      fogOn: mapStore.showFog,
      tokenSelected: token !== null,
      tokenLinked: !!token?.entityId,
      tokenManageable:
        token !== null && mapSession.canMoveToken(token.id, peerId, isHost),
      layer: guest ? null : mapSession.activeLayer,
      hasInitiative: mapSession.initiativeEntries.length > 0,
      canAdvanceTurn: mapSession.canAdvanceTurn(peerId, isHost),
      hosting: !guest && p2pHost.isHosting,
      measuring: mapSession.measurement.active,
    };
  }

  $effect(() => helpSurfaces.registerVttMap({ facts }));
</script>
