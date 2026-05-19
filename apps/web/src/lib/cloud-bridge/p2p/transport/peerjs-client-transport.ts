import { createPeer, type PeerFactory } from "../peer-factory";
import { isValidP2PMessage } from "../p2p-protocol";
import type {
  ClientTransportEventType,
  P2PClientTransport,
} from "./client-transport";

const CONNECTION_TIMEOUT_MS = 15_000;

/**
 * PeerJS-backed client transport. Owns the PeerJS peer and a single outbound
 * connection. Uses an internal epoch counter so callbacks from prior
 * connections cannot mutate state belonging to a newer connection.
 */
export class PeerJsClientTransport implements P2PClientTransport {
  private peer: any = null;
  private connection: any = null;
  private activeEpoch = 0;
  private isConnecting = false;
  private listeners: Record<string, ((payload?: any) => void)[]> = {};
  private readonly peerFactory: PeerFactory;

  constructor(peerFactory: PeerFactory = createPeer) {
    this.peerFactory = peerFactory;
  }

  get id(): string | null {
    return this.peer?.id ?? null;
  }

  get connected(): boolean {
    return Boolean(this.connection?.open);
  }

  async connect(hostId: string): Promise<void> {
    if (this.connection?.open && this.connection?.peer === hostId) {
      return;
    }

    if (this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    const epoch = ++this.activeEpoch;

    if (!this.peer) {
      this.peer = this.peerFactory(undefined, { debug: 1 });
    }

    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

    const connectionPromise = new Promise<void>((resolve, reject) => {
      const startConnection = () => {
        if (epoch !== this.activeEpoch) return;
        console.log(
          `[P2P Guest Transport] Initiating connection to: ${hostId}`,
        );
        const connection = this.peer.connect(hostId);
        this.connection = connection;

        connection.on("open", () => {
          if (epoch !== this.activeEpoch) return;
          this.isConnecting = false;
          if (timeoutHandle) clearTimeout(timeoutHandle);
          console.log(`[P2P Guest Transport] Connected to host: ${hostId}`);
          this.emit("open");
          resolve();
        });

        connection.on("data", (data: any) => {
          if (epoch !== this.activeEpoch) return;
          if (!isValidP2PMessage(data)) return;
          this.emit("data", data);
        });

        connection.on("close", () => {
          if (epoch !== this.activeEpoch) return;
          this.isConnecting = false;
          if (this.connection === connection) this.connection = null;
          this.emit("close");
        });

        connection.on("error", (err: any) => {
          if (epoch !== this.activeEpoch) return;
          this.isConnecting = false;
          this.emit("error", err);
          if (timeoutHandle) clearTimeout(timeoutHandle);
          reject(err);
        });
      };

      if (this.peer.open) {
        startConnection();
      } else {
        this.peer.on("open", () => {
          if (epoch !== this.activeEpoch) return;
          startConnection();
        });
        this.peer.on("error", (err: any) => {
          if (epoch !== this.activeEpoch) return;
          if (timeoutHandle) clearTimeout(timeoutHandle);
          // Reset state so a retry can rebuild the peer.
          this.isConnecting = false;
          this.activeEpoch++;
          try {
            this.peer?.destroy();
          } catch {
            /* ignore */
          }
          this.peer = null;
          this.emit("error", err);
          reject(err);
        });
      }
    });

    const timeoutPromise = new Promise<void>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        if (epoch !== this.activeEpoch) return;
        if (this.isConnecting) {
          this.disconnect();
          reject(new Error("Connection timed out"));
        }
      }, CONNECTION_TIMEOUT_MS);
    });

    return Promise.race([connectionPromise, timeoutPromise]);
  }

  send(message: any): void {
    const connection = this.connection;
    if (!connection?.open) return;
    try {
      connection.send(message);
    } catch (err) {
      console.warn("[P2P Client Transport] Failed to send message", err);
    }
  }

  disconnect(): void {
    const wasConnected = this.connection !== null;
    this.activeEpoch++;
    this.isConnecting = false;
    if (this.connection) {
      try {
        this.connection.close();
      } catch {
        /* ignore */
      }
      this.connection = null;
    }
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {
        /* ignore */
      }
      this.peer = null;
    }
    // Surface the transition so service-level listeners can run cleanup,
    // even when disconnect was triggered out-of-band (e.g., by a handler).
    if (wasConnected) this.emit("close");
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
}
