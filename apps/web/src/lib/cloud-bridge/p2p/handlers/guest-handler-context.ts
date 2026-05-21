import type { mapSession } from "../../../stores/map-session.svelte";
import type { mapStore } from "../../../stores/map.svelte";
import type { vault } from "../../../stores/vault.svelte";
import type { sessionModeStore } from "../../../stores/ui/session-mode.svelte";
import type { notificationStore } from "../../../stores/ui/notification.svelte";
import type { themeStore } from "../../../stores/theme.svelte";
import type {
  GuestPresenceStatus,
  GuestStore,
} from "../../../stores/guest.svelte";
import type { MapAssetUrlCache } from "./map-asset-url-cache";
import type { P2PClientTransport } from "../transport/client-transport";

/**
 * Lifecycle callbacks supplied by the calling code when joining a host.
 * Mirrors the legacy `connectToHost(...)` callback parameters.
 */
export interface GuestSessionCallbacks {
  onGraphData: (data: any) => void;
  onEntityUpdate: (entity: any) => void;
  onEntityDelete: (id: string) => void;
  onBatchUpdate: (updates: Record<string, any>) => void;
  onThemeUpdate: (themeId: string) => void;
  onJoinRejected: ((reason: string, displayName: string) => void) | null;
}

/**
 * Ambient dependencies injected into every guest handler. Lazy-imported store
 * references resolved once on join.
 */
export interface GuestHandlerContext {
  vault: typeof vault;
  sessionModeStore: typeof sessionModeStore;
  notificationStore: typeof notificationStore;
  mapSession: typeof mapSession;
  mapStore: typeof mapStore;
  themeStore: typeof themeStore;
  guestStore: GuestStore;
  transport: P2PClientTransport;
  assetCache: MapAssetUrlCache;
  callbacks: GuestSessionCallbacks;
  /** Mutable session state shared with the lifecycle facade. */
  session: GuestSessionState;
}

export type GuestStatusPayload = {
  status: GuestPresenceStatus;
  currentEntityId: string | null;
  currentEntityTitle: string | null;
};

export interface GuestSessionState {
  joinAccepted: boolean;
  pendingStatus: GuestStatusPayload | null;
}
