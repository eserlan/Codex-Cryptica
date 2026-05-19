import { guestRoster } from "../../stores/guest";
import { P2PDispatcher } from "./dispatcher/p2p-dispatcher";
import { GuestChatHandler } from "./handlers/guest-chat-handler";
import type {
  GuestHandlerContext,
  GuestSessionCallbacks,
  GuestSessionState,
} from "./handlers/guest-handler-context";
import { GuestMapAssetHandler } from "./handlers/guest-map-asset-handler";
import { GuestPresenceHandler } from "./handlers/guest-presence-handler";
import { GuestSessionHandler } from "./handlers/guest-session-handler";
import { GuestVaultHandler } from "./handlers/guest-vault-handler";
import { GuestVttHandler } from "./handlers/guest-vtt-handler";
import { MapAssetUrlCache } from "./handlers/map-asset-url-cache";
import type { P2PClientTransport } from "./transport/client-transport";

/** Default guest dispatcher with all handlers registered. */
export function buildGuestDispatcher(): P2PDispatcher<GuestHandlerContext> {
  const d = new P2PDispatcher<GuestHandlerContext>();
  d.register(new GuestVaultHandler());
  d.register(new GuestMapAssetHandler());
  d.register(new GuestSessionHandler());
  d.register(new GuestVttHandler());
  d.register(new GuestChatHandler());
  d.register(new GuestPresenceHandler());
  return d;
}

/** Lazily imports per-session stores and assembles the handler context. */
export async function buildGuestContext(args: {
  transport: P2PClientTransport;
  assetCache: MapAssetUrlCache;
  callbacks: GuestSessionCallbacks;
  session: GuestSessionState;
}): Promise<GuestHandlerContext> {
  const [v, u, ms, m, t] = await Promise.all([
    import("../../stores/vault.svelte"),
    import("../../stores/ui.svelte"),
    import("../../stores/map-session.svelte"),
    import("../../stores/map.svelte"),
    import("../../stores/theme.svelte"),
  ]);
  return {
    vault: v.vault,
    uiStore: u.uiStore,
    mapSession: ms.mapSession,
    mapStore: m.mapStore,
    themeStore: t.themeStore,
    guestRoster,
    transport: args.transport,
    assetCache: args.assetCache,
    callbacks: args.callbacks,
    session: args.session,
  };
}
