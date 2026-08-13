import type {
  P2PTransport,
  TransportEventType,
  P2PConnection,
} from "./transport-interface";
import type { TransportErrorPayload } from "./transport-events";
import { createPeer, type PeerFactory } from "../peer-factory";
import { type IdGenerator, systemIdGenerator } from "$lib/utils/runtime-deps";

const MAX_GUESTS = 10;

export class PeerJSTransport implements P2PTransport {
  private peer: any = null;
  private _id: string | null = null;
  private _connections: P2PConnection[] = [];
  private listeners: Record<string, ((payload: any) => void)[]> = {};
  private readonly peerFactory: PeerFactory;
  private readonly idGenerator: IdGenerator;

  constructor(
    deps: { peerFactory?: PeerFactory; idGenerator?: IdGenerator } = {},
  ) {
    this.peerFactory = deps.peerFactory ?? createPeer;
    this.idGenerator = deps.idGenerator ?? systemIdGenerator;
  }

  get id() {
    return this._id;
  }
  get connections() {
    return this._connections;
  }
  /** The underlying PeerJS Peer, used for voice media calls. */
  get rawPeer(): unknown {
    return this.peer;
  }

  async start(peerId: string = this.idGenerator.uuid()): Promise<string> {
    if (this.peer) return this._id!;

    return new Promise((resolve, reject) => {
      this.peer = this.peerFactory(peerId, { debug: 1 });

      this.peer.on("open", (id: string) => {
        this._id = id;
        resolve(id);
      });

      this.peer.on("connection", (conn: any) => {
        this.handleIncomingConnection(conn);
      });

      this.peer.on("error", (err: any) => {
        const payload: TransportErrorPayload = {
          type: this.mapPeerErrorType(err.type),
          message: err.message || "PeerJS Error",
          fatal: !this._id,
        };
        this.emit("error", payload);
        if (!this._id) reject(err);
      });

      this.peer.on("disconnected", () => {
        this.emit("disconnected", this._id);
      });

      this.peer.on("close", () => {
        this.emit("close", null);
      });
    });
  }

  stop(): void {
    if (this.peer) {
      this._connections.forEach((c) => c.close());
      this._connections = [];
      this.peer.destroy();
      this.peer = null;
      this._id = null;
    }
  }

  send(peerId: string, data: any): void {
    const conn = this._connections.find((c) => c.peer === peerId);
    if (conn) {
      conn.send(data);
    }
  }

  broadcast(data: any, excludePeerId?: string): void {
    this._connections.forEach((conn) => {
      if (conn.peer !== excludePeerId) {
        conn.send(data);
      }
    });
  }

  on(event: TransportEventType, callback: (payload: any) => void): void {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  private handleIncomingConnection(conn: any) {
    // FR-006: 10 Guest Limit
    if (this._connections.length >= MAX_GUESTS) {
      console.warn(
        `[P2P Transport] Rejecting connection from ${conn.peer}: Max guests reached (${MAX_GUESTS})`,
      );
      conn.on("open", () => {
        conn.send({
          type: "GUEST_JOIN_REJECTED",
          payload: { reason: "server-full" },
        });
        setTimeout(() => conn.close(), 1000);
      });
      return;
    }

    const wrappedConn: P2PConnection = {
      peer: conn.peer,
      send: (data) => conn.send(data),
      close: () => conn.close(),
    };

    conn.on("open", () => {
      this._connections.push(wrappedConn);
      this.emit("connection", wrappedConn);
    });

    conn.on("data", (data: any) => {
      this.emit("data", { conn: wrappedConn, data });
    });

    conn.on("close", () => {
      this._connections = this._connections.filter((c) => c.peer !== conn.peer);
      this.emit("close", conn.peer);
    });

    conn.on("error", (err: any) => {
      const payload: TransportErrorPayload = {
        type: "CONNECTION_FAILED",
        message: err.message || "Connection error",
        fatal: false,
      };
      this.emit("error", { peer: conn.peer, error: payload });
    });
  }

  private mapPeerErrorType(peerType: string): TransportErrorPayload["type"] {
    switch (peerType) {
      case "peer-unavailable":
        return "PEER_NOT_FOUND";
      case "network":
        return "HOST_DISCONNECTED";
      default:
        return "UNKNOWN";
    }
  }

  private emit(event: TransportEventType, payload: any) {
    this.listeners[event]?.forEach((cb) => cb(payload));
  }
}
