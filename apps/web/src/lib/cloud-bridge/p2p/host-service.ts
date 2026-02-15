import type { SerializedGraph } from "../types";
import { vault } from "../../stores/vault.svelte";
import { vaultRegistry } from "../../stores/vault-registry.svelte";
import type { Entity } from "schema";
import Peer from "peerjs";

export class P2PHostService {
  private peer: any;
  private peerId: string | null = null;
  private connections: any[] = [];
  private _isHosting = false;
  private unsubscribe: (() => void) | null = null;

  constructor() {}

  async startHosting(): Promise<string> {
    if (this._isHosting && this.peerId) return this.peerId;

    // Subscribe to local vault updates
    vault.onEntityUpdate = (entity) => {
      this.broadcastEntityUpdate(entity);
    };
    vault.onEntityDelete = (id) => {
      this.broadcastEntityDelete(id);
    };

    return new Promise((resolve, reject) => {
      // Generate a random ID with a prefix
      // @ts-expect-error - PeerJS constructor types
      this.peer = new Peer(undefined, {
        debug: 1,
      });

      this.peer.on("open", (id: string) => {
        console.log("[P2P Host] Hosting started. ID:", id);
        this.peerId = id;
        this._isHosting = true;
        resolve(id);
      });

      this.peer.on("connection", (conn: any) => {
        this.handleConnection(conn);
      });

      this.peer.on("error", (err: any) => {
        console.error("[P2P Host] Peer error:", err);
        if (!this._isHosting) reject(err);
      });
    });
  }

  private handleConnection(conn: any) {
    if (this.connections.some((c) => c.peer === conn.peer && c.open)) {
      console.log(
        "[P2P Host] Guest already connected with an open link:",
        conn.peer,
      );
      // Optional: we could close the new one, but often PeerJS is just recovering
    }

    console.log("[P2P Host] New guest connected:", conn.peer);
    this.connections.push(conn);

    conn.on("open", async () => {
      try {
        console.log("[P2P Host] Connection open for guest:", conn.peer);
        // 1. Send Initial Graph
        const graph = await this.prepareGraphPayload();
        conn.send({ type: "GRAPH_SYNC", payload: graph });
        console.log("[P2P Host] Initial graph sent to:", conn.peer);
      } catch (err) {
        console.error(
          "[P2P Host] Failed to send initial graph to:",
          conn.peer,
          err,
        );
      }
    });

    conn.on("data", async (data: any) => {
      console.log("[P2P Host] Received data:", data);

      if (data.type === "GET_FILE") {
        await this.handleFileRequest(conn, data.path, data.requestId);
      }
    });

    conn.on("close", () => {
      console.log("[P2P Host] Guest disconnected:", conn.peer);
      this.connections = this.connections.filter((c) => c !== conn);
    });
  }

  private async prepareGraphPayload(): Promise<SerializedGraph> {
    // Serialize current vault state
    // We must sanitize entities to remove non-serializable objects like FileSystemHandles through destructuring
    const rawEntities = $state.snapshot(vault.entities);
    const entities: Record<string, Entity> = {};
    const assets: Record<string, string> = {};

    // Build a mapping for assets and sanitize entities
    for (const [id, localEntity] of Object.entries(rawEntities)) {
      // Strip _fsHandle and other runtime-only props that PeerJS can't serialize
      const { _fsHandle, ...safeEntity } = localEntity as any;
      entities[id] = safeEntity;

      // If we have an image path, map it
      if (safeEntity.image && !safeEntity.image.startsWith("http")) {
        // We'll use the path as the key
        assets[safeEntity.image] = safeEntity.image;
      }
    }

    return {
      version: 1,
      entities,
      assets,
      defaultVisibility: vault.defaultVisibility,
      sharedMode: true, // Always force shared mode for guests
    };
  }

  private async handleFileRequest(conn: any, path: string, requestId: string) {
    try {
      // Read file from Vault
      // This requires Vault to accept a path and return a blob
      // We can use the internal handles if available

      // For now, let's assume we can get it via the Vault fs helpers
      if (!vaultRegistry.rootHandle) {
        console.warn("[P2P Host] No root handle available to serve files");
        return;
      }

      // Normalize path: specific fix for ./images style paths
      const cleanPath = path.startsWith("./") ? path.slice(2) : path;
      const parts = cleanPath.split("/");

      // Try to resolve handle
      let fileHandle: FileSystemFileHandle | undefined;

      if (parts.length === 1) {
        // Root file
        fileHandle = await vaultRegistry.rootHandle
          .getFileHandle(parts[0])
          .catch(() => undefined);
      } else if (parts[0] === "images" && parts.length === 2) {
        // Image in images/ folder
        const imgDir = await vaultRegistry.rootHandle
          .getDirectoryHandle("images")
          .catch(() => undefined);
        if (imgDir)
          fileHandle = await imgDir
            .getFileHandle(parts[1])
            .catch(() => undefined);
      }

      if (fileHandle) {
        const file = await fileHandle.getFile();
        const arrayBuffer = await file.arrayBuffer();

        conn.send({
          type: "FILE_RESPONSE",
          requestId,
          found: true,
          mime: file.type,
          data: arrayBuffer,
        });
      } else {
        conn.send({ type: "FILE_RESPONSE", requestId, found: false });
      }
    } catch (err) {
      console.error("[P2P Host] Failed to serve file:", path, err);
      conn.send({ type: "FILE_RESPONSE", requestId, found: false });
    }
  }

  private broadcastEntityUpdate(entity: any) {
    if (this.connections.length === 0) return;

    // Sanitize
    const snap = $state.snapshot(entity);
    const { _fsHandle, ...safeEntity } = snap;

    console.log("[P2P Host] Broadcasting update for:", safeEntity.title);

    const message = {
      type: "ENTITY_UPDATE",
      payload: safeEntity,
    };

    this.connections.forEach((conn) => {
      if (conn.open) {
        conn.send(message);
      }
    });
  }

  private broadcastEntityDelete(id: string) {
    if (this.connections.length === 0) return;

    console.log("[P2P Host] Broadcasting delete for:", id);

    const message = {
      type: "ENTITY_DELETE",
      payload: id,
    };

    this.connections.forEach((conn) => {
      if (conn.open) {
        conn.send(message);
      }
    });
  }

  stopHosting() {
    vault.onEntityUpdate = null;
    vault.onEntityDelete = null;
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this._isHosting = false;
    this.connections = [];
  }
}

export const p2pHost = new P2PHostService();
