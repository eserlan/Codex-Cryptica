import { createPeer, type PeerFactory } from "./peer-factory";

export interface ConnectionState {
  status:
    | "idle"
    | "connecting"
    | "connected"
    | "reconnecting"
    | "disconnected"
    | "failed";
  latencyMs: number;
  peerId: string | null;
  remotePeerId: string | null;
  retryCount: number;
}

export interface PeerJSMessage<T = any> {
  type: string;
  senderId: string;
  timestamp: number;
  payload: T;
}

export class PeerJSConnectionManager {
  private peer: any = null;
  private activeConn: any = null;
  private readonly peerFactory: PeerFactory;
  private readonly heartbeatIntervalMs: number;
  private readonly heartbeatTimeoutMs: number;
  private readonly reconnectDelays: number[];

  // Reactive state using Svelte 5 Runes
  private _state = $state<ConnectionState>({
    status: "idle",
    latencyMs: -1,
    peerId: null,
    remotePeerId: null,
    retryCount: 0,
  });

  private messageCallbacks = new Map<
    string,
    Set<(msg: PeerJSMessage) => void>
  >();
  private heartbeatInterval: any = null;
  private heartbeatTimeout: any = null;
  private reconnectTimeout: any = null;
  private lastPingTime = 0;
  private isHost = false;
  private expectedRemoteId: string | null = null;

  constructor(
    peerFactory: PeerFactory = createPeer,
    heartbeatIntervalMs = 10000,
    heartbeatTimeoutMs = 15000,
    reconnectDelays = [2000, 4000, 8000],
  ) {
    this.peerFactory = peerFactory;
    this.heartbeatIntervalMs = heartbeatIntervalMs;
    this.heartbeatTimeoutMs = heartbeatTimeoutMs;
    this.reconnectDelays = reconnectDelays;
  }

  get state(): ConnectionState {
    return this._state;
  }

  /**
   * Start a Host session and wait for incoming connection
   */
  async startHost(hostPeerId?: string): Promise<string> {
    this.disconnect();
    this.isHost = true;
    this._state.status = "connecting";

    return new Promise((resolve, reject) => {
      try {
        this.peer = this.peerFactory(hostPeerId, { debug: 1 });

        this.peer.on("open", (id: string) => {
          this._state.peerId = id;
          this._state.status = "connecting"; // Still waiting for incoming connections
          resolve(id);
        });

        this.peer.on("connection", (conn: any) => {
          if (this.activeConn) {
            console.warn(
              `[P2P Connection] Closing duplicate connection from ${conn.peer}`,
            );
            this.activeConn.close();
          }
          this.setupConnection(conn);
        });

        this.peer.on("error", (err: any) => {
          console.error("[P2P Connection] Host Peer error:", err);
          this.handleError(err);
          reject(err);
        });

        this.peer.on("disconnected", () => {
          console.warn(
            "[P2P Connection] Host Peer disconnected from signaling server",
          );
          this.handleDisconnectEvent();
        });

        this.peer.on("close", () => {
          this.disconnect();
        });
      } catch (err) {
        this._state.status = "failed";
        reject(err);
      }
    });
  }

  /**
   * Connect to a remote host session by Peer ID
   */
  async connect(hostId: string): Promise<void> {
    this.disconnect();
    this.isHost = false;
    this.expectedRemoteId = hostId;
    this._state.status = "connecting";

    return new Promise((resolve, reject) => {
      try {
        this.peer = this.peerFactory(undefined, { debug: 1 });

        this.peer.on("open", (id: string) => {
          this._state.peerId = id;
          const conn = this.peer.connect(hostId);
          this.setupConnection(conn);
          resolve();
        });

        this.peer.on("error", (err: any) => {
          console.error("[P2P Connection] Client Peer error:", err);
          this.handleError(err);
          reject(err);
        });

        this.peer.on("disconnected", () => {
          this.handleDisconnectEvent();
        });

        this.peer.on("close", () => {
          this.disconnect();
        });
      } catch (err) {
        this._state.status = "failed";
        reject(err);
      }
    });
  }

  /**
   * Disconnect cleanly, destroy any active sockets, clear heartbeats and listeners
   */
  disconnect(): void {
    this.stopHeartbeat();
    this.clearTimeouts();

    if (this.activeConn) {
      try {
        this.activeConn.close();
      } catch (e) {
        _ignore(e);
      }
      this.activeConn = null;
    }

    if (this.peer) {
      try {
        this.peer.destroy();
      } catch (e) {
        _ignore(e);
      }
      this.peer = null;
    }

    this._state = {
      status: "disconnected",
      latencyMs: -1,
      peerId: null,
      remotePeerId: null,
      retryCount: 0,
    };
    this.expectedRemoteId = null;
  }

  /**
   * Send a formatted message to the active peer
   */
  send(messageType: string, payload: any): void {
    if (!this.activeConn || this._state.status !== "connected") {
      console.warn(
        "[P2P Connection] Cannot send message: No active connection established.",
      );
      return;
    }

    const msg: PeerJSMessage = {
      type: messageType,
      senderId: this._state.peerId || "",
      timestamp: Date.now(),
      payload,
    };

    try {
      this.activeConn.send(msg);
    } catch (err) {
      console.error("[P2P Connection] Send error:", err);
    }
  }

  /**
   * Register a custom callback handler for specific message types
   */
  onMessage<T = any>(
    type: string,
    callback: (message: PeerJSMessage<T>) => void,
  ): () => void {
    if (!this.messageCallbacks.has(type)) {
      this.messageCallbacks.set(type, new Set());
    }
    const set = this.messageCallbacks.get(type)!;
    set.add(callback as any);

    return () => {
      set.delete(callback as any);
      if (set.size === 0) {
        this.messageCallbacks.delete(type);
      }
    };
  }

  private setupConnection(conn: any) {
    this.activeConn = conn;

    conn.on("open", () => {
      this.clearTimeouts();
      this._state.status = "connected";
      this._state.remotePeerId = conn.peer;
      this._state.retryCount = 0;
      this.startHeartbeat();
    });

    conn.on("data", (data: any) => {
      if (
        data &&
        typeof data === "object" &&
        "type" in data &&
        "senderId" in data
      ) {
        const msg = data as PeerJSMessage;
        this.handleMessage(msg);
      } else {
        console.warn(
          "[P2P Connection] Received malformed non-JSON schema message:",
          data,
        );
      }
    });

    conn.on("close", () => {
      console.warn("[P2P Connection] Connection closed by remote peer");
      this.handleDisconnectEvent();
    });

    conn.on("error", (err: any) => {
      console.error("[P2P Connection] Connection error:", err);
      this.handleDisconnectEvent();
    });
  }

  private handleMessage(msg: PeerJSMessage) {
    if (msg.type === "ping") {
      const pong: PeerJSMessage = {
        type: "pong",
        senderId: this._state.peerId || "",
        timestamp: msg.timestamp,
        payload: null,
      };
      this.activeConn?.send(pong);
      return;
    }

    if (msg.type === "pong") {
      this.clearHeartbeatTimeout();
      const RTT = Date.now() - msg.timestamp;
      this._state.latencyMs = RTT;
      return;
    }

    const set = this.messageCallbacks.get(msg.type);
    if (set) {
      set.forEach((cb) => {
        try {
          cb(msg);
        } catch (err) {
          console.error(
            `[P2P Connection] Error in message callback for '${msg.type}':`,
            err,
          );
        }
      });
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.activeConn && this._state.status === "connected") {
        this.lastPingTime = Date.now();
        const ping: PeerJSMessage = {
          type: "ping",
          senderId: this._state.peerId || "",
          timestamp: this.lastPingTime,
          payload: null,
        };
        try {
          this.activeConn.send(ping);
          this.startHeartbeatTimeout();
        } catch (err) {
          console.error("[P2P Connection] Heartbeat send failed:", err);
          this.handleDisconnectEvent();
        }
      }
    }, this.heartbeatIntervalMs);
  }

  private startHeartbeatTimeout() {
    this.clearHeartbeatTimeout();
    this.heartbeatTimeout = setTimeout(() => {
      console.warn(
        "[P2P Connection] Heartbeat timed out. Transitioning to reconnecting.",
      );
      this.handleDisconnectEvent();
    }, this.heartbeatTimeoutMs);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.clearHeartbeatTimeout();
  }

  private clearHeartbeatTimeout() {
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  private clearTimeouts() {
    this.clearHeartbeatTimeout();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  private handleDisconnectEvent() {
    this.stopHeartbeat();

    // Hosts do not reconnect to guests; if connection drops, they wait for guest to reconnect
    if (this.isHost) {
      if (this.activeConn) {
        this.activeConn.close();
        this.activeConn = null;
      }
      this._state.status = "connecting"; // Await new incoming connection
      this._state.remotePeerId = null;
      this._state.latencyMs = -1;
      return;
    }

    // Clients attempt exponential reconnection retry loop
    if (
      this._state.status === "connected" ||
      this._state.status === "reconnecting"
    ) {
      if (this._state.retryCount < this.reconnectDelays.length) {
        this._state.status = "reconnecting";
        const delay = this.reconnectDelays[this._state.retryCount];
        this._state.retryCount++;
        console.log(
          `[P2P Connection] Reconnecting in ${delay}ms (Attempt ${this._state.retryCount}/3)...`,
        );

        if (this.activeConn) {
          try {
            this.activeConn.close();
          } catch (e) {
            _ignore(e);
          }
          this.activeConn = null;
        }

        this.reconnectTimeout = setTimeout(() => {
          if (this.expectedRemoteId) {
            const conn = this.peer?.connect(this.expectedRemoteId);
            if (conn) {
              this.setupConnection(conn);
            } else {
              this.handleDisconnectEvent();
            }
          }
        }, delay);
      } else {
        console.error("[P2P Connection] All reconnect retries exhausted.");
        this._state.status = "failed";
        this._state.latencyMs = -1;
        this.clearTimeouts();
      }
    }
  }

  private handleError(err: any) {
    if (
      err.type === "peer-unavailable" ||
      err.type === "network" ||
      err.type === "webrtc"
    ) {
      this.handleDisconnectEvent();
    } else {
      this._state.status = "failed";
      this.stopHeartbeat();
      this.clearTimeouts();
    }
  }
}

function _ignore(_any: any) {}
