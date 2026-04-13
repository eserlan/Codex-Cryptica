import type { SerializedGraph } from "../types";
import { guestRoster, type GuestPresenceStatus } from "../../stores/guest";
import { upsertGuestRoster } from "./p2p-helpers";
import { createPeer, type PeerFactory } from "./peer-factory";
import type { VTTMessage } from "$types/vtt";
import { decodeSessionSnapshot, isValidP2PMessage } from "./p2p-protocol";

type GuestStatusPayload = {
  status: GuestPresenceStatus;
  currentEntityId: string | null;
  currentEntityTitle: string | null;
};

const TOKEN_MOVE_PRECISION = 2;

function roundTokenMoveValue(value: number) {
  const factor = 10 ** TOKEN_MOVE_PRECISION;
  return Math.round(value * factor) / factor;
}

export class P2PGuestService {
  private peer: any;
  private connection: any | null = null;
  private isConnecting = false;
  private dataCallback: ((graph: SerializedGraph) => void) | null = null;
  private guestDisplayName: string | null = null;
  private pendingStatus: GuestStatusPayload | null = null;
  private isConnected = false;
  private joinAccepted = false;
  private readonly peerFactory: PeerFactory;
  private mapAssetUrl: string | null = null;
  private mapFogUrl: string | null = null;
  private readonly tokenMoveThrottleMs = 50;
  private pendingTokenMoves = new Map<
    string,
    { x: number; y: number; timeoutId: number }
  >();
  private lastSentTokenMoves = new Map<string, { x: number; y: number }>();
  private onJoinRejected:
    | ((reason: string, displayName: string) => void)
    | null = null;

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

  private clearPendingTokenMove(tokenId: string) {
    const pending = this.pendingTokenMoves.get(tokenId);
    if (!pending) return;
    clearTimeout(pending.timeoutId);
    this.pendingTokenMoves.delete(tokenId);
  }

  private sendVttMessage(message: VTTMessage) {
    const connection = this.connection;
    if (!connection?.open) return;
    try {
      connection.send(message);
    } catch (err) {
      console.warn("[P2P Guest] Failed to send VTT message", err);
    }
  }

  async connectToHost(
    hostId: string,
    onGraphData: (data: any) => void,
    onEntityUpdate: (entity: any) => void,
    onEntityDelete: (id: string) => void,
    onBatchUpdate: (updates: Record<string, any>) => void,
    onThemeUpdate: (themeId: string) => void,
    guestName?: string,
    onJoinRejectedCallback?: (reason: string, displayName: string) => void,
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
    guestRoster.set({});
    this.guestDisplayName = guestName?.trim() || null;
    this.onJoinRejected = onJoinRejectedCallback || null;

    let timeoutHandle: any = null;
    const connectionPromise = new Promise<void>((resolve, reject) => {
      const startConnection = () => {
        console.log("[P2P Guest] Initiating connection to:", hostId);
        const connection = this.peer.connect(hostId);
        this.connection = connection;
        setupConnectionHandlers();
      };

      const setupConnectionHandlers = () => {
        const connection = this.connection;
        if (!connection) return;

        connection.on("open", () => {
          if (this.connection !== connection) return;
          console.log(`[P2P Guest] Connected to host: ${hostId}`);
          this.isConnecting = false;
          this.isConnected = true;
          this.joinAccepted = false;
          if (timeoutHandle) clearTimeout(timeoutHandle);
          if (this.guestDisplayName) {
            connection.send({
              type: "GUEST_JOIN",
              payload: { displayName: this.guestDisplayName },
            });
          }
          if (this.pendingStatus && !this.guestDisplayName) {
            connection.send({
              type: "GUEST_STATUS",
              payload: this.pendingStatus,
            });
            this.pendingStatus = null;
          }
          void this.getMapSession().then((mapSession) => {
            if (this.connection === connection && connection.open) {
              mapSession.setBroadcaster((message) =>
                this.sendVttMessage(message),
              );
            }
          });
          resolve();
        });

        connection.on("data", (data: any) => {
          if (!isValidP2PMessage(data)) return;
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
          } else if (data.type === "GUEST_JOIN_REJECTED") {
            console.warn("[P2P Guest] Guest join rejected", data.payload);
            const reason = data.payload?.reason ?? "unknown";
            const displayName = data.payload?.displayName ?? "Guest";

            if (this.onJoinRejected) {
              this.onJoinRejected(reason, displayName);
            }

            void Promise.all([
              import("../../stores/ui.svelte"),
              this.getVault(),
              this.getMapSession(),
            ]).then(([{ uiStore }, vault, mapSession]) => {
              mapSession.setBroadcaster(null);
              mapSession.myPeerId = null;
              this.pendingStatus = null;
              guestRoster.set({});
              uiStore.guestUsername = null;
              uiStore.isGuestMode = true;
              vault.status = "idle";
              vault.errorMessage = null;
            });
            this.disconnect();
          } else if (data.type === "GUEST_STATUS") {
            this.joinAccepted = true;
            // Update roster with info about other guests (broadcast by host)
            const p = data.payload || data;
            guestRoster.update((current) =>
              upsertGuestRoster(current, p.peerId, {
                displayName: p.displayName,
                status: p.status,
                currentEntityId: p.currentEntityId ?? null,
                currentEntityTitle: p.currentEntityTitle ?? null,
              }),
            );
            if (
              this.pendingStatus &&
              this.connection === connection &&
              connection.open
            ) {
              connection.send({
                type: "GUEST_STATUS",
                payload: this.pendingStatus,
              });
              this.pendingStatus = null;
            }
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
                this.mapFogUrl = URL.createObjectURL(blob);
                const nextMap = {
                  ...currentMap,
                  fogOfWar: {
                    ...(currentMap.fogOfWar ?? { maskPath: this.mapFogUrl }),
                    maskPath: this.mapFogUrl,
                  },
                };

                vault.maps[mapId] = nextMap;
              },
            );
          } else if (
            data.type === "SESSION_SNAPSHOT" ||
            data.type === "SESSION_SNAPSHOT_GZIP"
          ) {
            void Promise.all([
              this.getMapSession(),
              decodeSessionSnapshot(data as any),
            ]).then(([mapSession, session]) => {
              mapSession.syncFromRemoteSession(session, false);
            });
          } else if (data.type === "TOKEN_ADDED") {
            void this.getMapSession().then((mapSession) =>
              mapSession.handleRemoteTokenAdded(data.token),
            );
          } else if (data.type === "TOKEN_STATE_UPDATE") {
            if (typeof data.tokenId !== "string") return;
            console.log("[P2P Guest] TOKEN_STATE_UPDATE payload", {
              tokenId: data.tokenId,
              delta: data.delta,
            });
            void this.getMapSession().then((mapSession) =>
              mapSession.handleRemoteTokenUpdate(data.tokenId, data.delta),
            );
          } else if (data.type === "SHOW_TOKEN_IMAGE") {
            if (typeof data.title !== "string") return;
            console.log("[P2P Guest] SHOW_TOKEN_IMAGE payload", {
              title: data.title,
              imagePath: data.imagePath,
            });
            void this.getMapSession().then((mapSession) =>
              mapSession.handleRemoteShowTokenImage(data.title, data.imagePath),
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
              mapSession.handleRemoteGridSettings(data as any),
            );
          } else if (data.type === "MAP_PING") {
            void this.getMapSession().then((mapSession) =>
              mapSession.handleRemotePing(
                data.x,
                data.y,
                data.peerId,
                data.color,
                data.timestamp,
              ),
            );
          } else if (data.type === "MAP_MEASUREMENT") {
            void this.getMapSession().then((mapSession) =>
              mapSession.handleRemoteMeasurement(
                data.startX,
                data.startY,
                data.endX,
                data.endY,
                data.peerId,
                data.active,
              ),
            );
          } else if (data.type === "CHAT_MESSAGE") {
            void this.getMapSession().then((mapSession) =>
              mapSession.handleRemoteChatMessage(
                data as import("$types/vtt").ChatMessagePayload,
              ),
            );
          } else if (data.type === "CHAT_CLEAR") {
            void this.getMapSession().then((mapSession) =>
              mapSession.handleRemoteChatClear(),
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

        connection.on("close", () => {
          if (this.connection !== connection) return;
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

        connection.on("error", (err: any) => {
          if (this.connection !== connection) return;
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
    this.joinAccepted = false;
    guestRoster.set({});
    for (const tokenId of this.pendingTokenMoves.keys()) {
      this.clearPendingTokenMove(tokenId);
    }
    this.lastSentTokenMoves.clear();
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

  async leaveSession() {
    const connection = this.connection;
    const displayName = this.guestDisplayName;

    if (connection?.open && displayName) {
      try {
        connection.send({
          type: "GUEST_LEAVE",
          payload: { displayName },
        });
      } catch (err) {
        console.warn("[P2P Guest] Failed to send GUEST_LEAVE message", err);
      }
    }

    this.disconnect();
  }

  async getFile(path: string): Promise<Blob> {
    const connection = this.connection;
    if (!connection || !connection.open) {
      throw new Error("Not connected to host");
    }

    const requestId = crypto.randomUUID();

    return new Promise((resolve, reject) => {
      const cleanup = () => {
        connection.off("data", handler);
        connection.off("close", cleanup);
        connection.off("error", cleanup);
      };

      const timeoutHandle = setTimeout(() => {
        cleanup();
        reject(new Error("File request timed out"));
      }, 15000);

      const handler = (data: any) => {
        if (data.type === "FILE_RESPONSE" && data.requestId === requestId) {
          clearTimeout(timeoutHandle);
          cleanup();
          if (data.found) {
            resolve(new Blob([data.data], { type: data.mime }));
          } else {
            reject(new Error("File not found on host"));
          }
        }
      };

      connection.on("data", handler);
      connection.on("close", cleanup);
      connection.on("error", cleanup);

      connection.send({
        type: "GET_FILE",
        path,
        requestId,
      });
    });
  }

  updateGuestStatus(status: GuestStatusPayload) {
    this.pendingStatus = status;
    const connection = this.connection;
    if (connection?.open && this.joinAccepted) {
      connection.send({
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
    const connection = this.connection;
    if (!connection?.open) return false;
    const roundedX = roundTokenMoveValue(x);
    const roundedY = roundTokenMoveValue(y);

    const pending = this.pendingTokenMoves.get(tokenId);
    if (pending) {
      if (pending.x === roundedX && pending.y === roundedY) {
        return true;
      }
      pending.x = roundedX;
      pending.y = roundedY;
      return true;
    }

    const lastSent = this.lastSentTokenMoves.get(tokenId);
    if (lastSent?.x === roundedX && lastSent?.y === roundedY) {
      return true;
    }

    const timeoutId = window.setTimeout(() => {
      const latest = this.pendingTokenMoves.get(tokenId);
      this.pendingTokenMoves.delete(tokenId);
      if (!latest || !this.connection?.open) return;
      const sent = this.lastSentTokenMoves.get(tokenId);
      if (sent?.x === latest.x && sent?.y === latest.y) return;
      this.sendVttMessage({
        type: "TOKEN_MOVE",
        tokenId,
        x: latest.x,
        y: latest.y,
      });
      this.lastSentTokenMoves.set(tokenId, { x: latest.x, y: latest.y });
    }, this.tokenMoveThrottleMs);

    this.pendingTokenMoves.set(tokenId, {
      x: roundedX,
      y: roundedY,
      timeoutId,
    });
    return true;
  }

  requestTokenRemove(tokenId: string) {
    const connection = this.connection;
    if (!connection?.open) return false;
    connection.send({
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
