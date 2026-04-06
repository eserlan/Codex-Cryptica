import type { SerializedGraph } from "../types";
import type { GuestPresenceStatus } from "../../stores/guest";
import { createPeer, type PeerFactory } from "./peer-factory";
import type { VTTMessage } from "$types/vtt";

type GuestStatusPayload = {
  status: GuestPresenceStatus;
  currentEntityId: string | null;
  currentEntityTitle: string | null;
};

export class P2PGuestService {
  private peer: any;
  private connection: any | null = null;
  private isConnecting = false;
  private dataCallback: ((graph: SerializedGraph) => void) | null = null;
  private guestDisplayName: string | null = null;
  private pendingStatus: GuestStatusPayload | null = null;
  private isConnected = false;
  private readonly peerFactory: PeerFactory;
  private mapAssetUrl: string | null = null;
  private mapFogUrl: string | null = null;

  constructor(deps: { peerFactory?: PeerFactory } = {}) {
    this.peerFactory = deps.peerFactory ?? createPeer;
  }

  private async getMapSession() {
    const module = await import("../../stores/map-session.svelte");
    return module.mapSession;
  }

  private async getMapStore() {
    const module = await import("../../stores/map.svelte");
    return module.mapStore;
  }

  private async getVault() {
    const module = await import("../../stores/vault.svelte");
    return module.vault;
  }

  private revokeMapUrls() {
    if (this.mapAssetUrl) {
      URL.revokeObjectURL(this.mapAssetUrl);
      this.mapAssetUrl = null;
    }
    this.revokeFogUrl();
  }

  private revokeFogUrl() {
    if (this.mapFogUrl) {
      URL.revokeObjectURL(this.mapFogUrl);
      this.mapFogUrl = null;
    }
  }

  private sendVttMessage(message: VTTMessage) {
    if (!this.connection?.open) return;
    this.connection.send(message);
  }

  async connectToHost(
    hostId: string,
    onGraphData: (data: any) => void,
    onEntityUpdate: (entity: any) => void,
    onEntityDelete: (id: string) => void,
    onBatchUpdate: (updates: Record<string, any>) => void,
    onThemeUpdate: (themeId: string) => void,
    guestName?: string,
  ): Promise<void> {
    if (this.connection?.open && this.connection?.peer === hostId) {
      console.log("[P2P Guest] Already connected to host:", hostId);
      return;
    }

    if (this.isConnecting) {
      console.log("[P2P Guest] Connection already in progress...");
      return;
    }

    if (!this.peer) {
      this.peer = this.peerFactory(undefined, { debug: 1 });
    }

    this.isConnecting = true;
    this.dataCallback = onGraphData;
    this.guestDisplayName = guestName?.trim() || null;

    let timeoutHandle: any = null;
    const connectionPromise = new Promise<void>((resolve, reject) => {
      const startConnection = () => {
        console.log("[P2P Guest] Initiating connection to:", hostId);
        this.connection = this.peer.connect(hostId);
        setupConnectionHandlers();
      };

      const setupConnectionHandlers = () => {
        if (!this.connection) return;

        this.connection.on("open", () => {
          console.log(`[P2P Guest] Connected to host: ${hostId}`);
          this.isConnecting = false;
          this.isConnected = true;
          if (timeoutHandle) clearTimeout(timeoutHandle);
          if (this.guestDisplayName) {
            this.connection.send({
              type: "GUEST_JOIN",
              payload: { displayName: this.guestDisplayName },
            });
          }
          if (this.pendingStatus) {
            this.connection.send({
              type: "GUEST_STATUS",
              payload: this.pendingStatus,
            });
            this.pendingStatus = null;
          }
          void this.getMapSession().then((mapSession) => {
            mapSession.setBroadcaster((message) =>
              this.sendVttMessage(message),
            );
          });
          resolve();
        });

        this.connection.on("data", (data: any) => {
          console.log("[P2P Guest] Received data:", data.type);
          if (data.type === "GRAPH_SYNC") {
            console.log(
              "[P2P Guest] Processing GRAPH_SYNC. Callback exists?",
              !!this.dataCallback,
            );
            if (this.dataCallback) {
              this.dataCallback(data.payload);
            }
          } else if (data.type === "ENTITY_UPDATE") {
            onEntityUpdate(data.payload);
          } else if (data.type === "ENTITY_BATCH_UPDATE") {
            onBatchUpdate(data.payload);
          } else if (data.type === "ENTITY_DELETE") {
            onEntityDelete(data.payload);
          } else if (data.type === "THEME_UPDATE") {
            onThemeUpdate(data.payload);
          } else if (data.type === "MAP_SYNC") {
            void Promise.all([this.getVault(), this.getMapStore()]).then(
              ([vault, mapStore]) => {
                const map = data.payload?.map;
                if (!map || typeof map.id !== "string") return;

                this.revokeMapUrls();

                const image = data.payload?.image;
                if (image?.data) {
                  const blob = new Blob([image.data], {
                    type: image.mime || "image/webp",
                  });
                  this.mapAssetUrl = URL.createObjectURL(blob);
                  map.assetPath = this.mapAssetUrl;
                }

                const fog = data.payload?.fog;
                if (fog?.data) {
                  const blob = new Blob([fog.data], {
                    type: fog.mime || "image/png",
                  });
                  this.mapFogUrl = URL.createObjectURL(blob);
                  if (map.fogOfWar) {
                    map.fogOfWar.maskPath = this.mapFogUrl;
                  } else {
                    map.fogOfWar = { maskPath: this.mapFogUrl };
                  }
                }

                vault.maps[map.id] = map;

                if (mapStore.activeMapId !== map.id) {
                  mapStore.selectMap(map.id);
                }
              },
            );
          } else if (data.type === "MAP_FOG_SYNC") {
            void Promise.all([this.getVault(), this.getMapStore()]).then(
              ([vault]) => {
                const mapId = data.payload?.mapId;
                const fog = data.payload?.fog;
                const currentMap = mapId ? vault.maps[mapId] : null;
                if (!mapId || !currentMap || !fog?.data) return;

                this.revokeFogUrl();

                const blob = new Blob([fog.data], {
                  type: fog.mime || "image/png",
                });
                const fogUrl = URL.createObjectURL(blob);
                const nextMap = {
                  ...currentMap,
                  fogOfWar: {
                    ...(currentMap.fogOfWar ?? { maskPath: fogUrl }),
                    maskPath: fogUrl,
                  },
                };

                vault.maps[mapId] = nextMap;
              },
            );
          } else if (data.type === "SESSION_SNAPSHOT") {
            void this.getMapSession().then((mapSession) =>
              mapSession.syncFromRemoteSession(data.session),
            );
          } else if (data.type === "TOKEN_ADDED") {
            void this.getMapSession().then((mapSession) =>
              mapSession.handleRemoteTokenAdded(data.token),
            );
          } else if (data.type === "TOKEN_STATE_UPDATE") {
            void this.getMapSession().then((mapSession) =>
              mapSession.handleRemoteTokenUpdate(data.tokenId, data.delta),
            );
          } else if (data.type === "TOKEN_REMOVED") {
            void this.getMapSession().then((mapSession) =>
              mapSession.handleRemoteTokenRemoved(data.tokenId),
            );
          } else if (data.type === "TURN_ADVANCE") {
            void this.getMapSession().then((mapSession) =>
              mapSession.handleRemoteTurn(data.turnIndex, data.round),
            );
          } else if (data.type === "SET_MODE") {
            void this.getMapSession().then((mapSession) =>
              mapSession.handleRemoteMode(data.mode),
            );
          } else if (data.type === "SET_GRID_SETTINGS") {
            void this.getMapSession().then((mapSession) =>
              mapSession.handleRemoteGridSettings(data),
            );
          } else if (data.type === "MAP_PING") {
            void this.getMapSession().then((mapSession) =>
              mapSession.handleRemotePing(
                data.x,
                data.y,
                data.peerId,
                data.color,
              ),
            );
          } else if (data.type === "CHAT_MESSAGE") {
            void this.getMapSession().then((mapSession) =>
              mapSession.handleRemoteChatMessage(data),
            );
          } else if (data.type === "FOG_REVEAL") {
            void this.getMapSession().then((mapSession) =>
              mapSession.handleRemoteFogMask(
                JSON.stringify(data.strokes ?? []),
              ),
            );
          } else if (data.type === "SESSION_ENDED") {
            void this.getMapSession().then((mapSession) =>
              mapSession.clearSession(true),
            );
          }
        });

        this.connection.on("close", () => {
          console.log("[P2P Guest] Connection closed");
          this.isConnecting = false;
          this.isConnected = false;
          void this.getMapSession().then((mapSession) => {
            mapSession.setBroadcaster(null);
            mapSession.clearSession(true);
            mapSession.myPeerId = null;
          });
          this.disconnect();
        });

        this.connection.on("error", (err: any) => {
          console.error("[P2P Guest] Connection error:", err);
          this.isConnecting = false;
          this.disconnect();
          if (timeoutHandle) clearTimeout(timeoutHandle);
          reject(err);
        });
      };

      if (this.peer.open) {
        void this.getMapSession().then((mapSession) => {
          const peerId = this.peer?.id;
          if (peerId) {
            mapSession.myPeerId = peerId;
          }
        });
        startConnection();
      } else {
        this.peer.on("open", () => {
          console.log("[P2P Guest] My Peer ID is:", this.peer.id);
          void this.getMapSession().then((mapSession) => {
            const peerId = this.peer?.id;
            if (peerId) {
              mapSession.myPeerId = peerId;
            }
          });
          startConnection();
        });
        this.peer.on("error", (err: any) => {
          console.error("[P2P Guest] Peer initialization error:", err);
          if (timeoutHandle) clearTimeout(timeoutHandle);
          reject(err);
        });
      }
    });

    const timeoutPromise = new Promise<void>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        if (this.isConnecting) {
          console.error("[P2P Guest] Connection timed out after 15s");
          this.disconnect();
          reject(new Error("Connection timed out"));
        }
      }, 15000);
    });

    return Promise.race([connectionPromise, timeoutPromise]);
  }

  disconnect() {
    this.isConnecting = false;
    this.isConnected = false;
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.revokeMapUrls();
    this.pendingStatus = null;
    void this.getMapSession().then((mapSession) => {
      mapSession.setBroadcaster(null);
      mapSession.myPeerId = null;
    });
    this.guestDisplayName = null;
  }

  async getFile(path: string): Promise<Blob> {
    if (!this.connection || !this.connection.open) {
      throw new Error("Not connected to host");
    }

    const requestId = crypto.randomUUID();

    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.connection.off("data", handler);
        reject(new Error("File request timed out"));
      }, 15000);

      const handler = (data: any) => {
        if (data.type === "FILE_RESPONSE" && data.requestId === requestId) {
          clearTimeout(timeoutHandle);
          this.connection.off("data", handler);
          if (data.found) {
            resolve(new Blob([data.data], { type: data.mime }));
          } else {
            reject(new Error("File not found on host"));
          }
        }
      };

      this.connection.on("data", handler);

      this.connection.send({
        type: "GET_FILE",
        path,
        requestId,
      });
    });
  }

  updateGuestStatus(status: GuestStatusPayload) {
    this.pendingStatus = status;
    if (this.connection?.open) {
      this.connection.send({
        type: "GUEST_STATUS",
        payload: status,
      });
      this.pendingStatus = null;
    }
  }

  get connected() {
    return this.isConnected;
  }

  get peerId() {
    return this.peer?.id ?? null;
  }

  requestTokenMove(tokenId: string, x: number, y: number) {
    if (!this.connection?.open) return false;
    this.connection.send({
      type: "TOKEN_MOVE",
      tokenId,
      x,
      y,
    });
    return true;
  }

  requestTokenRemove(tokenId: string) {
    if (!this.connection?.open) return false;
    this.connection.send({
      type: "TOKEN_REMOVE",
      tokenId,
    });
    return true;
  }
}

export const p2pGuestService = new P2PGuestService();

if (typeof window !== "undefined") {
  (window as any).p2pGuestService = p2pGuestService;
}
