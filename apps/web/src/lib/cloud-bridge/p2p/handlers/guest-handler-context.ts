import type { Writable } from "svelte/store";
import type { mapSession } from "../../../stores/map-session.svelte";
import type { mapStore } from "../../../stores/map.svelte";
import type { vault } from "../../../stores/vault.svelte";
import type { uiStore } from "../../../stores/ui.svelte";
import type { themeStore } from "../../../stores/theme.svelte";
import type { GuestPresenceStatus } from "../../../stores/guest";
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
  uiStore: typeof uiStore;
  mapSession: typeof mapSession;
  mapStore: typeof mapStore;
  themeStore: typeof themeStore;
  guestRoster: Writable<Record<string, any>>;
  transport: P2PClientTransport;
  assetCache: MapAssetUrlCache;
  callbacks: GuestSessionCallbacks;
  /** Mutable session state shared with the lifecycle facade. */
  session: GuestSessionState;
}

export interface GuestSessionState {
  joinAccepted: boolean;
  pendingStatus: {
    status: GuestPresenceStatus;
    currentEntityId: string | null;
    currentEntityTitle: string | null;
  } | null;
}
