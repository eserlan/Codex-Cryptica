import Peer from "peerjs";
import type { SerializedGraph } from "../types";

export class P2PGuestService {
  private peer: any;
  private connection: any | null = null;
  private isConnecting = false;
  private dataCallback: ((graph: SerializedGraph) => void) | null = null;

  constructor() {}

  async connectToHost(
    hostId: string,
    onGraphData: (data: any) => void,
    onEntityUpdate: (entity: any) => void,
    onEntityDelete: (id: string) => void,
    onBatchUpdate: (updates: Record<string, any>) => void,
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
      const PeerClass = (window as any).Peer || Peer;
      this.peer = new PeerClass(undefined, { debug: 1 });
    }

    this.isConnecting = true;
    this.dataCallback = onGraphData;

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
          }
        });

        this.connection.on("close", () => {
          console.log("[P2P Guest] Connection closed");
          this.isConnecting = false;
          this.disconnect();
        });

        this.connection.on("error", (err: any) => {
          console.error("[P2P Guest] Connection error:", err);
          this.isConnecting = false;
          this.disconnect();
          reject(err);
        });
      };

      if (this.peer.open) {
        startConnection();
      } else {
        this.peer.on("open", () => {
          console.log("[P2P Guest] My Peer ID is:", this.peer.id);
          startConnection();
        });
        this.peer.on("error", (err: any) => {
          console.error("[P2P Guest] Peer initialization error:", err);
          reject(err);
        });
      }
    });

    const timeoutPromise = new Promise<void>((_, reject) => {
      setTimeout(() => {
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
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
  }

  async getFile(path: string): Promise<Blob> {
    if (!this.connection || !this.connection.open) {
      throw new Error("Not connected to host");
    }

    const requestId = crypto.randomUUID();

    return new Promise((resolve, reject) => {
      const handler = (data: any) => {
        if (data.type === "FILE_RESPONSE" && data.requestId === requestId) {
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

      // Timeout after 30s
      setTimeout(() => {
        this.connection.off("data", handler);
        reject(new Error("File request timed out"));
      }, 30000);
    });
  }
}

export const p2pGuestService = new P2PGuestService();

if (typeof window !== "undefined") {
  (window as any).p2pGuestService = p2pGuestService;
}
