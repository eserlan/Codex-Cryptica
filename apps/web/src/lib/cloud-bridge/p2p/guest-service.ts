import { guestRoster } from "../../stores/guest";
import { P2PDispatcher } from "./dispatcher/p2p-dispatcher";
import { MapAssetUrlCache } from "./handlers/map-asset-url-cache";
import type {
  GuestHandlerContext,
  GuestSessionState,
  GuestStatusPayload,
} from "./handlers/guest-handler-context";
import { PeerJsClientTransport } from "./transport/peerjs-client-transport";
import type { P2PClientTransport } from "./transport/client-transport";
import { GuestFileClient } from "./guest-file-client";
import { TokenMoveCoalescer } from "./token-move-coalescer";
import {
  buildGuestContext,
  buildGuestDispatcher,
} from "./guest-session-context";
import { createPeer, type PeerFactory } from "./peer-factory";

type GuestDeps = {
  peerFactory?: PeerFactory;
  transport?: P2PClientTransport;
  dispatcher?: P2PDispatcher<GuestHandlerContext>;
};

export class P2PGuestService {
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

  constructor(deps: GuestDeps = {}) {
    this.transport =
      deps.transport ??
      new PeerJsClientTransport(deps.peerFactory ?? createPeer);
    this.dispatcher = deps.dispatcher ?? buildGuestDispatcher();
    this.fileClient = new GuestFileClient(this.transport);
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

    guestRoster.set({});
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
    this.closeListener = () => this.handleTransportClose();
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

  private handleTransportClose() {
    if (!this.isConnected) return;
    this.context?.mapSession.clearSession(true);
    this.disconnect();
  }

  disconnect() {
    this.isConnected = false;
    this.currentHostId = null;
    this.session.joinAccepted = false;
    this.session.pendingStatus = null;
    guestRoster.set({});
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
    }
    this.context = null;
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
