import type { P2PClientTransport } from "./P2PClientTransport";

export interface GuestHandlerContext {
  vault: any;
  uiStore: any;
  mapSession: any;
  mapStore: any;
  themeStore: any;
  assetCache: any; // MapAssetUrlCache
  guestRoster: any;
  transport: P2PClientTransport;

  // Callbacks for legacy event wiring
  onGraphData: (data: any) => void;
  onEntityUpdate: (entity: any) => void;
  onEntityDelete: (id: string) => void;
  onBatchUpdate: (updates: Record<string, any>) => void;
  onThemeUpdate: (themeId: string) => void;
  onJoinRejected: (reason: string, displayName: string) => void;
}
