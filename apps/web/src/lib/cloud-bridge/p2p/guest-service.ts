import Peer from "peerjs";
import type { SerializedGraph } from "../types";

export class P2PGuestService {
  private peer: any;
  private connection: any | null = null;
  private dataCallback: ((graph: SerializedGraph) => void) | null = null;

  constructor() {}

  async connectToHost(
    hostId: string,
    onDataReceived: (graph: SerializedGraph) => void,
    onEntityUpdate: (entity: any) => void,
    onEntityDelete: (id: string) => void,
  ): Promise<void> {
    if (!this.peer) {
      const PeerClass = (window as any).Peer || Peer;
      this.peer = new PeerClass(undefined, { debug: 1 });
    }
    this.dataCallback = onDataReceived;
    return new Promise((resolve, reject) => {
      this.connection = this.peer.connect(hostId);

      this.connection.on("open", () => {
        console.log(`[P2P Guest] Connected to host: ${hostId}`);
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
        this.disconnect();
      });

      this.connection.on("error", (err: any) => {
        console.error("[P2P Guest] Connection error:", err);
        this.disconnect();
        reject(err);
      });

      this.peer.on("error", (err: any) => {
        console.error("[P2P Guest] Peer error:", err);
        reject(err);
      });
    });
  }

  disconnect() {
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
