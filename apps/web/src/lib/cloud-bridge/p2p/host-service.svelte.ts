import type { SerializedGraph } from "../types";
import { vault } from "../../stores/vault.svelte";
import type { Entity } from "schema";
import Peer from "peerjs";

export class P2PHostService {
  private peer: any;
  private peerId: string | null = null;
  connections = $state<any[]>([]);
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
    vault.onBatchUpdate = (updates) => {
      this.broadcastBatchUpdate(updates);
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
        console.log("[P2P Host] Received connection attempt from:", conn.peer);
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
      console.log(`[P2P Host] Handling file request for: ${path}`);

      // Use the active vault handle
      const vaultHandle = await vault.getActiveVaultHandle();
      console.log(`[P2P Host] Active Vault ID: ${vault.activeVaultId}`);

      if (!vaultHandle) {
        console.error("[P2P Host] No active vault handle!");
        conn.send({ type: "FILE_RESPONSE", requestId, found: false });
        return;
      }

      // Normalize path by splitting and filtering empty/dot segments
      const parts = path.split("/").filter((p) => p && p !== "." && p !== "..");
      const cleanPath = parts.join("/");
      console.log(`[P2P Host] Looking for parts:`, parts);

      let fileHandle: FileSystemFileHandle | undefined;

      try {
        if (parts.length === 1) {
          // Root file
          fileHandle = await vaultHandle.getFileHandle(parts[0]);
        } else if (parts[0] === "images" && parts.length === 2) {
          // images/filename.ext
          const imgDir = await vaultHandle.getDirectoryHandle("images");
          try {
            fileHandle = await imgDir.getFileHandle(parts[1]);
          } catch {
            // 1. Quick extension swap check (avoid full scan if possible)
            const requestedName = parts[1];
            if (requestedName.match(/\.(jpg|jpeg|png)$/i)) {
              const webpName = requestedName.replace(
                /\.(jpg|jpeg|png)$/i,
                ".webp",
              );
              fileHandle = await imgDir
                .getFileHandle(webpName)
                .catch(() => undefined);
            }

            if (!fileHandle) {
              // 2. Fallback to full scan for robust fuzzy match
              const requestedBase =
                requestedName.substring(0, requestedName.lastIndexOf(".")) ||
                requestedName;

              // List contents and look for fuzzy match
              const files = [];
              for await (const [name] of imgDir.entries()) files.push(name);

              console.log(
                `[P2P Host] Image '${requestedName}' not found. scanning ${files.length} files for fuzzy match...`,
              );

              const fuzzyMatch = files.find(
                (f) =>
                  f.startsWith(requestedBase) &&
                  (f.endsWith(".webp") ||
                    f.endsWith(".png") ||
                    f.endsWith(".jpg")),
              );
              if (fuzzyMatch) {
                console.log(`[P2P Host] Found fuzzy match: ${fuzzyMatch}`);
                fileHandle = await imgDir.getFileHandle(fuzzyMatch);
              }
            }

            if (!fileHandle) {
              console.warn(`[P2P Host] File definitely not found: ${parts[1]}`);
              conn.send({ type: "FILE_RESPONSE", requestId, found: false });
              return;
            }
          }
        }
      } catch (err) {
        console.error(
          `[P2P Host] Error accessing path structure: ${parts.join("/")}`,
          err,
        );
      }

      if (fileHandle) {
        console.log(`[P2P Host] File found, reading...`);
        const file = await fileHandle.getFile();
        const arrayBuffer = await file.arrayBuffer();

        console.log(`[P2P Host] Sending file response (${file.size} bytes)`);
        conn.send({
          type: "FILE_RESPONSE",
          requestId,
          found: true,
          mime: file.type,
          data: arrayBuffer,
        });
      } else {
        console.log(`[P2P Host] File not found: ${cleanPath}`);
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

  private broadcastBatchUpdate(updates: Record<string, Partial<Entity>>) {
    if (this.connections.length === 0) return;

    // Sanitize updates
    const sanitizedUpdates: Record<string, any> = {};
    for (const [id, patch] of Object.entries(updates)) {
      const snap = $state.snapshot(patch);
      // Remove runtime-only fields
      const { _fsHandle, ...safePatch } = snap as any;
      sanitizedUpdates[id] = safePatch;
    }

    console.log(
      `[P2P Host] Broadcasting batch update for ${Object.keys(sanitizedUpdates).length} entities`,
    );

    const message = {
      type: "ENTITY_BATCH_UPDATE",
      payload: sanitizedUpdates,
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
    vault.onBatchUpdate = null;
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this._isHosting = false;
    this.connections = [];
  }
}

export const p2pHost = new P2PHostService();

if (typeof window !== "undefined") {
  (window as any).p2pHostService = p2pHost;
}
