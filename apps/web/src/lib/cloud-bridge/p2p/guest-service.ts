import { guestStore } from "../../stores/guest.svelte";
import { P2PDispatcher } from "./dispatcher/p2p-dispatcher";
import { MapAssetUrlCache } from "./handlers/map-asset-url-cache";
import type {
  GuestHandlerContext,
  GuestSessionState,
  GuestStatusPayload,
} from "./handlers/guest-handler-context";
import type {
  P2PClientTransport,
  ClientTransportEventType,
} from "./transport/client-transport";
import { GuestFileClient } from "./guest-file-client";
import { TokenMoveCoalescer } from "./token-move-coalescer";
import {
  buildGuestContext,
  buildGuestDispatcher,
  type GuestDeps,
} from "./guest-session-context";
import { createPeer } from "./peer-factory";
import {
  PeerJSConnectionManager,
  type ConnectionState,
} from "./connection-manager.svelte";

export interface ExtendedGuestDeps extends GuestDeps {
  connectionManager?: PeerJSConnectionManager;
}

class ConnectionManagerClientTransportAdapter implements P2PClientTransport {
  private listeners: Record<string, ((payload?: any) => void)[]> = {};
  private unsubscribeWildcard: (() => void) | null = null;
  private unsubscribeStatus: (() => void) | null = null;

  constructor(private readonly manager: PeerJSConnectionManager) {
    this.unsubscribeWildcard = this.manager.onMessage("*", (msg) => {
      const originalMessage = msg.payload;
      if (
        originalMessage &&
        typeof originalMessage === "object" &&
        "type" in originalMessage
      ) {
        this.emit("data", originalMessage);
      }
    });

    this.unsubscribeStatus = this.manager.onStatusChange((status) => {
      if (status === "connected") {
        this.emit("open");
      } else if (status === "disconnected") {
        this.emit("close");
      } else if (status === "failed") {
        this.emit("error", new Error("P2P Connection failed permanently"));
        this.emit("close");
      }
    });
  }

  get id(): string | null {
    return this.manager.state.peerId;
  }

  get connected(): boolean {
    return this.manager.state.status === "connected";
  }

  async connect(hostId: string): Promise<void> {
    await this.manager.connect(hostId);
  }

  send(message: any): void {
    this.manager.send(message.type, message);
  }

  disconnect(): void {
    this.manager.disconnect();
  }

  on(event: ClientTransportEventType, callback: (payload?: any) => void): void {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  off(
    event: ClientTransportEventType,
    callback: (payload?: any) => void,
  ): void {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(
      (cb) => cb !== callback,
    );
  }

  private emit(event: ClientTransportEventType, payload?: any) {
    this.listeners[event]?.forEach((cb) => cb(payload));
  }

  destroy() {
    if (this.unsubscribeWildcard) {
      this.unsubscribeWildcard();
      this.unsubscribeWildcard = null;
    }
    if (this.unsubscribeStatus) {
      this.unsubscribeStatus();
      this.unsubscribeStatus = null;
    }
  }
}

export class P2PGuestService {
  private readonly connectionManager: PeerJSConnectionManager;
  private readonly transport: P2PClientTransport;
  private readonly dispatcher: P2PDispatcher<GuestHandlerContext>;
  private assetCache = new MapAssetUrlCache();
  private readonly fileClient: GuestFileClient;
  private readonly tokenMoves = new TokenMoveCoalescer((id, x, y) =>
    this.transport.send({ type: "TOKEN_MOVE", tokenId: id, x, y }),
  );

  private context: GuestHandlerContext | null = null;
  private readonly session: GuestSessionState = {
    joinAccepted: false,
    pendingStatus: null,
  };
  private guestDisplayName: string | null = null;
  private currentHostId: string | null = null;
  private isConnected = false;
  private dataListener: ((data: any) => void) | null = null;
  private closeListener: (() => void) | null = null;

  constructor(deps: ExtendedGuestDeps = {}) {
    this.connectionManager =
      deps.connectionManager ??
      new PeerJSConnectionManager(deps.peerFactory ?? createPeer);
    this.transport =
      deps.transport ??
      new ConnectionManagerClientTransportAdapter(this.connectionManager);
    this.dispatcher = deps.dispatcher ?? buildGuestDispatcher();
    this.fileClient = new GuestFileClient(this.transport);
  }

  get state(): ConnectionState {
    return this.connectionManager.state;
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
    if (this.transport.connected && this.currentHostId === hostId) return;
    if (this.isConnected) this.disconnect();

    guestStore.guestRoster = {};
    this.guestDisplayName = guestName?.trim() || null;
    this.session.joinAccepted = false;
    this.session.pendingStatus = null;
    this.assetCache = new MapAssetUrlCache();

    this.context = await buildGuestContext({
      transport: this.transport,
      assetCache: this.assetCache,
      session: this.session,
      callbacks: {
        onGraphData,
        onEntityUpdate,
        onEntityDelete,
        onBatchUpdate,
        onThemeUpdate,
        onJoinRejected: onJoinRejectedCallback ?? null,
      },
    });

    const ctx = this.context;
    const hostConnection = {
      peer: hostId,
      send: (m: any) => this.transport.send(m),
      close: () => this.transport.disconnect(),
    };
    this.dataListener = (data: any) =>
      void this.dispatcher.dispatch(data, hostConnection, ctx);
    this.closeListener = () => {
      if (!this.isConnected) return;
      this.context?.mapSession.clearSession(true);
      this.disconnect();
    };
    this.transport.on("data", this.dataListener);
    this.transport.on("close", this.closeListener);
    this.transport.on("error", this.closeListener);

    try {
      await this.transport.connect(hostId);
    } catch (err) {
      this.disconnect();
      throw err;
    }
    this.isConnected = true;
    this.currentHostId = hostId;

    if (this.transport.id) ctx.mapSession.myPeerId = this.transport.id;

    if (this.guestDisplayName) {
      this.transport.send({
        type: "GUEST_JOIN",
        payload: { displayName: this.guestDisplayName },
      });
    } else if (this.session.pendingStatus) {
      this.transport.send({
        type: "GUEST_STATUS",
        payload: this.session.pendingStatus,
      });
      this.session.pendingStatus = null;
    }
    ctx.mapSession.setBroadcaster((message) => this.transport.send(message));
  }

  disconnect() {
    this.isConnected = false;
    this.currentHostId = null;
    this.session.joinAccepted = false;
    this.session.pendingStatus = null;
    guestStore.guestRoster = {};
    this.tokenMoves.clear();

    if (this.dataListener) this.transport.off("data", this.dataListener);
    if (this.closeListener) {
      this.transport.off("close", this.closeListener);
      this.transport.off("error", this.closeListener);
    }
    this.dataListener = null;
    this.closeListener = null;

    this.transport.disconnect();
    this.assetCache.revokeAll();

    if (this.context) {
      this.context.mapSession.setBroadcaster(null);
      this.context.mapSession.myPeerId = null;
      this.context = null;
    }
    this.guestDisplayName = null;
  }

  async leaveSession() {
    if (this.transport.connected && this.guestDisplayName) {
      this.transport.send({
        type: "GUEST_LEAVE",
        payload: { displayName: this.guestDisplayName },
      });
    }
    this.disconnect();
  }

  async getFile(path: string): Promise<Blob> {
    return this.fileClient.getFile(path);
  }

  updateGuestStatus(status: GuestStatusPayload) {
    this.session.pendingStatus = status;
    if (this.transport.connected && this.session.joinAccepted) {
      this.transport.send({ type: "GUEST_STATUS", payload: status });
      this.session.pendingStatus = null;
    }
  }

  requestTokenMove(tokenId: string, x: number, y: number): boolean {
    if (!this.transport.connected) return false;
    this.tokenMoves.request(tokenId, x, y);
    return true;
  }

  requestTokenRemove(tokenId: string): boolean {
    if (!this.transport.connected) return false;
    this.transport.send({ type: "TOKEN_REMOVE", tokenId });
    return true;
  }

  get connected() {
    return this.isConnected;
  }
  get peerId() {
    return this.transport.id;
  }
}

export const p2pGuestService = new P2PGuestService();

if (typeof window !== "undefined") {
  (window as any).p2pGuestService = p2pGuestService;
}
