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
    onDataReceived: (graph: SerializedGraph) => void,
    onEntityUpdate: (entity: any) => void,
    onEntityDelete: (id: string) => void,
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
    this.dataCallback = onDataReceived;

    return new Promise((resolve, reject) => {
      console.log("[P2P Guest] Initiating connection to:", hostId);
      this.connection = this.peer.connect(hostId);

      this.connection.on("open", () => {
        console.log(`[P2P Guest] Connected to host: ${hostId}`);
        this.isConnecting = false;
        resolve();
      });

      this.connection.on("data", (data: any) => {
        if (data.type === "GRAPH_SYNC" && this.dataCallback) {
          this.dataCallback(data.payload);
        } else if (data.type === "ENTITY_UPDATE") {
          onEntityUpdate(data.payload);
        } else if (data.type === "ENTITY_DELETE") {
          onEntityDelete(data.payload);
        }
        // TODO: Handle other data types like incremental updates or file requests
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

      this.peer.on("error", (err: any) => {
        console.error("[P2P Guest] Peer error:", err);
        this.isConnecting = false;
        reject(err);
      });
    });
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

  // TODO: Add methods to request specific files/assets from host
}

export const p2pGuestService = new P2PGuestService();
