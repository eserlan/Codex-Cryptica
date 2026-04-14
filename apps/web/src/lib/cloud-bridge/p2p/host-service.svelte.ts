import { vault as defaultVault } from "../../stores/vault.svelte";
import { themeStore as defaultThemeStore } from "../../stores/theme.svelte";
import { guestRoster as defaultGuestRoster } from "../../stores/guest";
import { mapStore as defaultMapStore } from "../../stores/map.svelte";
import type { Entity, Map } from "schema";
import { get } from "svelte/store";
import {
  buildSharedGraphPayload,
  deriveGuestPresenceStatus,
  normalizeGuestName,
  removeGuestFromRoster,
  upsertGuestRoster,
} from "./p2p-helpers";
import { createPeer, type PeerFactory } from "./peer-factory";
import { mapSession } from "../../stores/map-session.svelte";
import {
  encodeSessionSnapshot,
  isValidP2PMessage,
  type P2PMessage,
} from "./p2p-protocol";

type HostDeps = {
  vault?: typeof defaultVault;
  themeStore?: typeof defaultThemeStore;
  guestRoster?: typeof defaultGuestRoster;
  mapStore?: typeof defaultMapStore;
  peerFactory?: PeerFactory;
};

export class P2PHostService {
  private peer: any;
  private peerId: string | null = null;
  connections = $state<any[]>([]);
  private _isHosting = false;
  private unsubscribe: (() => void) | null = null;
  private readonly vault: typeof defaultVault;
  private readonly themeStore: typeof defaultThemeStore;
  private readonly guestRoster: typeof defaultGuestRoster;
  private readonly mapStore: typeof defaultMapStore;
  private readonly peerFactory: PeerFactory;

  constructor(deps: HostDeps = {}) {
    this.vault = deps.vault ?? defaultVault;
    this.themeStore = deps.themeStore ?? defaultThemeStore;
    this.guestRoster = deps.guestRoster ?? defaultGuestRoster;
    this.mapStore = deps.mapStore ?? defaultMapStore;
    this.peerFactory = deps.peerFactory ?? createPeer;
  }

  get isHosting() {
    return this._isHosting;
  }

  get activePeerId() {
    return this.peerId;
  }

  async startHosting(onPeerId?: (peerId: string) => void): Promise<string> {
    if (this._isHosting && this.peerId) {
      onPeerId?.(this.peerId);
      return this.peerId;
    }

    const peerId = crypto.randomUUID();
    onPeerId?.(peerId);

    return new Promise((resolve, reject) => {
      // Generate a random ID with a prefix
      this.peer = this.peerFactory(peerId, {
        debug: 1,
      });

      this.peer.on("open", (id: string) => {
        console.log("[P2P Host] Hosting started. ID:", id);
        this.peerId = id;
        this._isHosting = true;
        mapSession.setBroadcaster((message) =>
          this.broadcastVttMessage(message),
        );
        mapSession.myPeerId = id;

        // Subscribe to local vault updates
        this.vault.onEntityUpdate = (entity) => {
          this.broadcastEntityUpdate(entity);
        };
        this.vault.onEntityDelete = (delId) => {
          this.broadcastEntityDelete(delId);
        };
        this.vault.onBatchUpdate = (updates) => {
          this.broadcastBatchUpdate(updates);
        };
        this.themeStore.onThemeUpdate = (themeId) => {
          this.broadcastThemeUpdate(themeId);
        };
        this.guestRoster.set({});

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

    conn.on("open", () => {
      console.log("[P2P Host] Connection open for guest:", conn.peer);
    });

    conn.on("data", async (data: any) => {
      if (!isValidP2PMessage(data)) return;
      console.log("[P2P Host] Received data:", data);

      if (data.type === "GET_FILE") {
        await this.handleFileRequest(conn, data.path, data.requestId);
      } else if (data.type === "GUEST_JOIN") {
        this.handleGuestJoin(conn, data.payload);
      } else if (data.type === "GUEST_LEAVE") {
        this.handleGuestLeave(conn, data.payload);
      } else if (data.type === "GUEST_STATUS") {
        this.handleGuestStatus(conn.peer, data.payload);
      } else if (data.type === "TOKEN_ADD_REQUEST") {
        if (typeof data.name !== "string") return;
        if (typeof data.x !== "number" || typeof data.y !== "number") return;
        const entity =
          data.entityId && typeof data.entityId === "string"
            ? this.vault.entities[data.entityId]
            : null;
        const guest = get(this.guestRoster)[conn.peer];
        mapSession.addToken({
          name: data.name,
          entityId: data.entityId,
          x: data.x,
          y: data.y,
          color: data.color,
          imageUrl: entity?.image ? entity.image : null,
          ownerPeerId: conn.peer,
          ownerGuestName: guest?.displayName ?? null,
        });
      } else if (data.type === "TOKEN_MOVE") {
        if (
          typeof data.tokenId !== "string" ||
          typeof data.x !== "number" ||
          typeof data.y !== "number"
        )
          return;
        if (mapSession.canMoveToken(data.tokenId, conn.peer, false)) {
          mapSession.moveToken(data.tokenId, data.x, data.y, true);
          this.broadcastVttMessage(
            {
              type: "TOKEN_STATE_UPDATE",
              tokenId: data.tokenId,
              delta: { x: data.x, y: data.y },
            },
            conn.peer,
          );
        }
      } else if (
        data.type === "TOKEN_REMOVE" ||
        data.type === "TOKEN_REMOVED"
      ) {
        if (typeof data.tokenId !== "string") return;
        if (mapSession.canMoveToken(data.tokenId, conn.peer, false)) {
          mapSession.removeToken(data.tokenId);
        }
      } else if (data.type === "TOKEN_SELECT") {
        if (typeof data.tokenId !== "string") return;
        mapSession.setSelection(data.tokenId);
      } else if (data.type === "SET_MODE") {
        // Host only action
        return;
      } else if (data.type === "SESSION_SNAPSHOT") {
        // Guests cannot push snapshots to the host
        return;
      } else if (data.type === "TURN_ADVANCE") {
        if (mapSession.canAdvanceTurn(conn.peer, false)) {
          mapSession.advanceTurn();
        }
      } else if (data.type === "CHAT_MESSAGE") {
        if (typeof data.sender !== "string" || typeof data.content !== "string")
          return;
        mapSession.handleRemoteChatMessage(
          data as import("../../../types/vtt").ChatMessagePayload,
        );
        this.broadcastVttMessage(data as P2PMessage, conn.peer);
      } else if (data.type === "PING") {
        if (
          typeof data.x !== "number" ||
          typeof data.y !== "number" ||
          typeof data.color !== "string"
        )
          return;
        mapSession.handleRemotePing(
          data.x,
          data.y,
          data.peerId ?? conn.peer,
          data.color,
          data.timestamp,
        );
        const payload = {
          type: "MAP_PING",
          mapId: mapSession.mapId ?? this.mapStore.activeMapId ?? "",
          x: data.x,
          y: data.y,
          peerId: data.peerId ?? conn.peer,
          color: data.color,
          timestamp: data.timestamp ?? Date.now(),
        } as const;
        this.connections.forEach((guestConn) => {
          if (guestConn !== conn && guestConn.open) {
            guestConn.send(payload);
          }
        });
      } else if (data.type === "MEASUREMENT") {
        if (
          typeof data.startX !== "number" ||
          typeof data.startY !== "number" ||
          typeof data.endX !== "number" ||
          typeof data.endY !== "number"
        )
          return;
        mapSession.handleRemoteMeasurement(
          data.startX,
          data.startY,
          data.endX,
          data.endY,
          data.peerId ?? conn.peer,
          data.active,
        );
        this.broadcastVttMessage(
          {
            type: "MAP_MEASUREMENT",
            mapId: mapSession.mapId ?? this.mapStore.activeMapId ?? "",
            startX: data.startX,
            startY: data.startY,
            endX: data.endX,
            endY: data.endY,
            peerId: data.peerId ?? conn.peer,
            active: data.active,
          },
          conn.peer,
        );
      } else if (data.type === "SET_GRID_SETTINGS") {
        // Host only action
        return;
      } else if (data.type === "MAP_SYNC") {
        this.broadcastMapSync(data.payload);
      }
    });

    conn.on("close", () => {
      console.log("[P2P Host] Guest disconnected:", conn.peer);
      const departingGuest = get(this.guestRoster)[conn.peer];
      if (departingGuest) {
        mapSession.clearGuestOwnership(conn.peer);
      }
      this.connections = this.connections.filter((c) => c !== conn);
      this.guestRoster.update((current) =>
        removeGuestFromRoster(current, conn.peer),
      );
    });
  }

  private safeSend(conn: any, message: any) {
    if (!conn?.open) return false;
    try {
      conn.send(message);
      return true;
    } catch (err) {
      console.warn("[P2P Host] Failed to send to guest", conn?.peer, err);
      return false;
    }
  }

  private sendGuestRosterSnapshot(conn: any) {
    const roster = Object.values(get(this.guestRoster));
    for (const guest of roster) {
      this.safeSend(conn, {
        type: "GUEST_STATUS",
        payload: {
          peerId: guest.peerId,
          displayName: guest.displayName,
          status: guest.status,
          currentEntityId: guest.currentEntityId,
          currentEntityTitle: guest.currentEntityTitle,
        },
      });
    }
  }

  private handleGuestLeave(conn: any, _payload: any) {
    const peerId = conn.peer;
    const departingGuest = get(this.guestRoster)[peerId];

    if (departingGuest) {
      console.log("[P2P Host] Guest leaving:", departingGuest.displayName);
      mapSession.clearGuestOwnership(peerId);
      this.guestRoster.update((current) =>
        removeGuestFromRoster(current, peerId),
      );

      // Broadcast the guest leaving to all other guests
      this.broadcastVttMessage({
        type: "GUEST_STATUS",
        payload: {
          peerId,
          displayName: departingGuest.displayName,
          status: "disconnected" as const,
          currentEntityId: null,
          currentEntityTitle: null,
        },
      });
    }

    conn.close();
  }

  private handleGuestJoin(conn: any, payload: any) {
    const peerId = conn.peer;
    const displayName = normalizeGuestName(payload?.displayName, peerId);
    const hasDuplicateName = Object.values(get(this.guestRoster)).some(
      (guest) =>
        guest.peerId !== peerId &&
        guest.displayName.localeCompare(displayName, undefined, {
          sensitivity: "base",
        }) === 0,
    );
    if (hasDuplicateName) {
      this.safeSend(conn, {
        type: "GUEST_JOIN_REJECTED",
        payload: {
          reason: "duplicate-display-name",
          displayName,
        },
      });
      conn.close();
      return;
    }
    this.guestRoster.update((current) =>
      upsertGuestRoster(current, peerId, {
        displayName,
        status: "connected",
        currentEntityId: null,
        currentEntityTitle: null,
      }),
    );
    mapSession.rebindGuestOwnership(peerId, displayName);
    this.sendGuestRosterSnapshot(conn);
    // Broadcast the new guest's info to all other connected guests
    const guest = get(this.guestRoster)[peerId];
    if (guest) {
      void this.sendInitialState(conn);
      this.broadcastVttMessage({
        type: "GUEST_STATUS",
        payload: {
          peerId: guest.peerId,
          displayName: guest.displayName,
          status: guest.status,
          currentEntityId: guest.currentEntityId,
          currentEntityTitle: guest.currentEntityTitle,
        },
      });
    }
  }

  private async sendInitialState(conn: any) {
    try {
      const graph = await this.prepareGraphPayload();
      this.safeSend(conn, { type: "GRAPH_SYNC", payload: graph });
      console.log("[P2P Host] Initial graph sent to:", conn.peer);
      if (this.mapStore.activeMap) {
        const mapPayload = await this.prepareMapPayload(
          this.mapStore.activeMap,
        );
        this.safeSend(conn, {
          type: "MAP_SYNC",
          payload: mapPayload,
        });
      }
      if (mapSession.mapId && mapSession.vttEnabled) {
        await this.sendSessionSnapshot(conn, mapSession.createSnapshot());
      }
    } catch (err) {
      console.error(
        "[P2P Host] Failed to send initial graph to:",
        conn.peer,
        err,
      );
    }
  }

  private handleGuestStatus(peerId: string, payload: any) {
    const existingGuest = get(this.guestRoster)[peerId];
    if (!existingGuest) {
      console.warn(
        "[P2P Host] Ignoring GUEST_STATUS for peer without accepted join:",
        peerId,
      );
      return;
    }
    const currentEntityId =
      typeof payload?.currentEntityId === "string" && payload.currentEntityId
        ? payload.currentEntityId
        : null;
    const currentEntityTitle =
      typeof payload?.currentEntityTitle === "string" &&
      payload.currentEntityTitle
        ? payload.currentEntityTitle
        : currentEntityId
          ? this.vault.entities[currentEntityId]?.title || currentEntityId
          : null;
    const displayName = normalizeGuestName(
      payload?.displayName,
      existingGuest.displayName || peerId,
    );
    this.guestRoster.update((current) =>
      upsertGuestRoster(current, peerId, {
        displayName,
        status: deriveGuestPresenceStatus(payload?.status, currentEntityId),
        currentEntityId,
        currentEntityTitle,
      }),
    );
    mapSession.rebindGuestOwnership(peerId, displayName);
    // Broadcast updated guest info to all other connected guests
    const guest = get(this.guestRoster)[peerId];
    if (guest) {
      this.broadcastVttMessage({
        type: "GUEST_STATUS",
        payload: {
          peerId: guest.peerId,
          displayName: guest.displayName,
          status: guest.status,
          currentEntityId: guest.currentEntityId,
          currentEntityTitle: guest.currentEntityTitle,
        },
      });
    }
  }

  private async prepareGraphPayload() {
    const rawEntities = $state.snapshot(this.vault.entities);
    return buildSharedGraphPayload(
      rawEntities,
      this.vault.defaultVisibility,
      this.themeStore.currentThemeId,
    );
  }

  private async prepareMapPayload(map: Map): Promise<{
    map: Map;
    image?: { mime: string; data: ArrayBuffer };
    fog?: { mime: string; data: ArrayBuffer };
  }> {
    const payload: {
      map: Map;
      image?: { mime: string; data: ArrayBuffer };
      fog?: { mime: string; data: ArrayBuffer };
    } = {
      map: $state.snapshot(map),
    };

    if (map.fogOfWar) {
      try {
        const maskCanvas = await this.mapStore.loadMask(
          Math.max(map.dimensions.width, 1),
          Math.max(map.dimensions.height, 1),
        );
        const blob = await new Promise<Blob>((resolve, reject) => {
          maskCanvas.toBlob(
            (b) =>
              b
                ? resolve(b)
                : reject(new Error("Failed to create fog blob from canvas")),
            "image/png",
          );
        });
        payload.fog = {
          mime: blob.type || "image/png",
          data: await blob.arrayBuffer(),
        };
      } catch (err) {
        console.warn("[P2P Host] Failed to prepare fog payload", err);
      }
    }

    if (!map.assetPath) {
      return payload;
    }

    try {
      const url = await this.vault.resolveImageUrl(map.assetPath);
      if (!url) return payload;

      const response = await fetch(url);
      if (!response.ok) return payload;

      const blob = await response.blob();
      payload.image = {
        mime: blob.type || "image/webp",
        data: await blob.arrayBuffer(),
      };
    } catch (err) {
      console.warn("[P2P Host] Failed to prepare map image payload", err);
    }

    return payload;
  }

  private async prepareFogPayload(map: Map): Promise<{
    mapId: string;
    fog?: { mime: string; data: ArrayBuffer };
  }> {
    const payload: {
      mapId: string;
      fog?: { mime: string; data: ArrayBuffer };
    } = {
      mapId: map.id,
    };

    if (!map.fogOfWar) {
      return payload;
    }

    try {
      const maskCanvas = await this.mapStore.loadMask(
        Math.max(map.dimensions.width, 1),
        Math.max(map.dimensions.height, 1),
      );
      const blob = await new Promise<Blob>((resolve, reject) => {
        maskCanvas.toBlob(
          (b) =>
            b
              ? resolve(b)
              : reject(new Error("Failed to create fog blob from canvas")),
          "image/png",
        );
      });
      payload.fog = {
        mime: blob.type || "image/png",
        data: await blob.arrayBuffer(),
      };
    } catch (err) {
      console.warn("[P2P Host] Failed to prepare fog payload", err);
    }

    return payload;
  }

  private async sendSessionSnapshot(
    conn: any,
    session = mapSession.createSnapshot(),
  ) {
    const payload = await encodeSessionSnapshot(session);
    this.safeSend(conn, payload);
  }

  private async handleFileRequest(conn: any, path: string, requestId: string) {
    try {
      console.log(`[P2P Host] Handling file request for: ${path}`);

      // Use the active vault handle
      const vaultHandle = await this.vault.getActiveVaultHandle();
      console.log(`[P2P Host] Active Vault ID: ${this.vault.activeVaultId}`);

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
          let imgDir: FileSystemDirectoryHandle | undefined;
          try {
            imgDir = await vaultHandle.getDirectoryHandle("images");
            fileHandle = await imgDir.getFileHandle(parts[1]);
          } catch (err: any) {
            const isNotFound =
              err &&
              typeof err === "object" &&
              (err.name === "NotFoundError" || err.code === "NotFoundError");

            if (!isNotFound) {
              console.error(
                "[P2P Host] Unexpected error while accessing images directory or file",
                err,
              );
              conn.send({ type: "FILE_RESPONSE", requestId, found: false });
              return;
            }

            if (!imgDir) {
              console.warn(`[P2P Host] Images directory not found`);
              conn.send({ type: "FILE_RESPONSE", requestId, found: false });
              return;
            }
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

  private broadcastThemeUpdate(themeId: string) {
    if (this.connections.length === 0) return;

    console.log("[P2P Host] Broadcasting theme update:", themeId);

    const message = {
      type: "THEME_UPDATE",
      payload: themeId,
    };

    this.connections.forEach((conn) => {
      if (conn.open) {
        conn.send(message);
      }
    });
  }

  public async broadcastActiveMapSync() {
    if (!this.mapStore.activeMap) return;
    const payload = await this.prepareMapPayload(this.mapStore.activeMap);
    this.broadcastMapSync(payload);
  }

  public async broadcastActiveMapFogSync() {
    if (!this.mapStore.activeMap) return;
    const payload = await this.prepareFogPayload(this.mapStore.activeMap);
    this.broadcastMapFogSync(payload);
  }

  private broadcastMapSync(payload: {
    map: Map;
    image?: { mime: string; data: ArrayBuffer };
    fog?: { mime: string; data: ArrayBuffer };
  }) {
    if (!payload?.map || this.connections.length === 0) return;

    this.connections.forEach((conn) => {
      if (conn.open) {
        conn.send({ type: "MAP_SYNC", payload });
      }
    });
  }

  private broadcastMapFogSync(payload: {
    mapId: string;
    fog?: { mime: string; data: ArrayBuffer };
  }) {
    if (!payload?.mapId || this.connections.length === 0) return;

    this.connections.forEach((conn) => {
      if (conn.open) {
        conn.send({ type: "MAP_FOG_SYNC", payload });
      }
    });
  }

  private broadcastVttMessage(message: P2PMessage, excludePeer?: string) {
    if (this.connections.length === 0) return;

    if (message.type === "SHOW_TOKEN_IMAGE") {
      console.log("[P2P Host] Broadcasting SHOW_TOKEN_IMAGE", {
        title: message.title,
        imagePath: message.imagePath,
        recipients: this.connections
          .filter((conn) => conn.open)
          .map((conn) => conn.peer),
      });
    }

    if (message.type === "SESSION_SNAPSHOT") {
      void this.broadcastSessionSnapshot(message.session);
      return;
    }

    if (message.type === "PING") {
      const payload = {
        type: "MAP_PING" as const,
        mapId: mapSession.mapId ?? this.mapStore.activeMapId ?? "",
        x: message.x,
        y: message.y,
        peerId: message.peerId,
        color: message.color,
        timestamp: message.timestamp,
      };
      this.connections.forEach((conn) => {
        if (conn.open && conn.peer !== excludePeer) {
          conn.send(payload);
        }
      });
      return;
    }

    if (message.type === "MEASUREMENT") {
      const payload = {
        type: "MAP_MEASUREMENT" as const,
        mapId: mapSession.mapId ?? this.mapStore.activeMapId ?? "",
        startX: message.startX,
        startY: message.startY,
        endX: message.endX,
        endY: message.endY,
        peerId: message.peerId,
        active: message.active,
      };
      this.connections.forEach((conn) => {
        if (conn.open && conn.peer !== excludePeer) {
          conn.send(payload);
        }
      });
      return;
    }

    this.connections.forEach((conn) => {
      if (conn.open && conn.peer !== excludePeer) {
        conn.send(message);
      }
    });
  }

  private async broadcastSessionSnapshot(
    session = mapSession.createSnapshot(),
  ) {
    if (this.connections.length === 0) return;
    const payload = await encodeSessionSnapshot(session);
    this.connections.forEach((conn) => {
      if (conn.open) {
        conn.send(payload);
      }
    });
  }

  stopHosting() {
    this.vault.onEntityUpdate = undefined;
    this.vault.onEntityDelete = undefined;
    this.vault.onBatchUpdate = undefined;
    this.themeStore.onThemeUpdate = undefined;
    this.guestRoster.set({});
    mapSession.setBroadcaster(null);
    mapSession.myPeerId = null;
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
