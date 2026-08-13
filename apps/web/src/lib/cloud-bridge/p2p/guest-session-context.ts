import { guestStore } from "../../stores/guest.svelte";
import type { PeerFactory } from "./peer-factory";
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
import { GuestSoundBiteHandler } from "./handlers/guest-sound-bite-handler";
import { GuestCharChatResponseHandler } from "./handlers/guest-char-chat-response-handler";
import { GuestVoiceHandler } from "./handlers/guest-voice-handler";
import { MapAssetUrlCache } from "./handlers/map-asset-url-cache";
import type { P2PClientTransport } from "./transport/client-transport";

export type GuestDeps = {
  peerFactory?: PeerFactory;
  transport?: P2PClientTransport;
  dispatcher?: P2PDispatcher<GuestHandlerContext>;
};

/** Default guest dispatcher with all handlers registered. */
export function buildGuestDispatcher(): P2PDispatcher<GuestHandlerContext> {
  const d = new P2PDispatcher<GuestHandlerContext>();
  d.register(new GuestVaultHandler());
  d.register(new GuestMapAssetHandler());
  d.register(new GuestSessionHandler());
  d.register(new GuestVttHandler());
  d.register(new GuestChatHandler());
  d.register(new GuestPresenceHandler());
  d.register(new GuestSoundBiteHandler());
  d.register(new GuestCharChatResponseHandler());
  d.register(new GuestVoiceHandler());
  return d;
}

/** Lazily imports per-session stores and assembles the handler context. */
export async function buildGuestContext(args: {
  transport: P2PClientTransport;
  assetCache: MapAssetUrlCache;
  callbacks: GuestSessionCallbacks;
  session: GuestSessionState;
}): Promise<GuestHandlerContext> {
  const [v, u, n, ms, m, t, ui] = await Promise.all([
    import("../../stores/vault.svelte"),
    import("../../stores/ui/session-mode.svelte"),
    import("../../stores/ui/notification.svelte"),
    import("../../stores/map-session.svelte"),
    import("../../stores/map.svelte"),
    import("../../stores/theme.svelte"),
    import("../../stores/ui/modal-ui.svelte"),
  ]);
  return {
    vault: v.vault,
    sessionModeStore: u.sessionModeStore,
    notificationStore: n.notificationStore,
    modalUIStore: ui.modalUIStore,
    mapSession: ms.mapSession,
    mapStore: m.mapStore,
    themeStore: t.themeStore,
    guestStore,
    transport: args.transport,
    assetCache: args.assetCache,
    callbacks: args.callbacks,
    session: args.session,
  };
}
