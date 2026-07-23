import { vault as defaultVault } from "../../stores/vault.svelte";
import { debugStore } from "../../stores/debug.svelte";
import { themeStore as defaultThemeStore } from "../../stores/theme.svelte";
import { guestStore as defaultGuestStore } from "../../stores/guest.svelte";
import { mapStore as defaultMapStore } from "../../stores/map.svelte";
import { sessionModeStore as defaultSessionModeStore } from "../../stores/ui/session-mode.svelte";
import { notificationStore as defaultNotificationStore } from "../../stores/ui/notification.svelte";
import { mapSession } from "../../stores/map-session.svelte";
import { encodeSessionSnapshot, type P2PMessage } from "./p2p-protocol";
import type {
  P2PTransport,
  P2PConnection,
} from "./transport/transport-interface";
import { P2PDispatcher } from "./dispatcher/p2p-dispatcher";
import { VTTHandler } from "./handlers/vtt-handler";
import { VoiceHandler } from "./handlers/voice-handler";
import { voiceChat } from "./voice/voice-chat.svelte";
import { VaultHandler } from "./handlers/vault-handler";
import { FileHandler } from "./handlers/file-handler";
import { HostCharChatHandler } from "./handlers/host-char-chat-handler";
import { createPeer, type PeerFactory } from "./peer-factory";
import { PeerJSTransport } from "./transport/peerjs-transport";
import {
  PeerJSConnectionManager,
  type ConnectionState,
} from "./connection-manager.svelte";
import { type IdGenerator, systemIdGenerator, systemClock } from "$lib/utils/runtime-deps";

type HostDeps = {
  vault?: typeof defaultVault;
  themeStore?: typeof defaultThemeStore;
  guestStore?: typeof defaultGuestStore;
  mapStore?: typeof defaultMapStore;
  sessionModeStore?: typeof defaultSessionModeStore;
  notificationStore?: typeof defaultNotificationStore;
  peerFactory?: PeerFactory;
  transport?: P2PTransport;
  dispatcher?: P2PDispatcher;
  connectionManager?: PeerJSConnectionManager;
  idGenerator?: IdGenerator;
};

export class P2PHostService {
  private readonly connectionManager: PeerJSConnectionManager;
  private transport: P2PTransport;
  private dispatcher: P2PDispatcher;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  connections = $state<P2PConnection[]>([]);
  _isHosting = $state(false);

  state = $state<ConnectionState>({
    status: "idle",
    latencyMs: -1,
    peerId: null,
    remotePeerId: null,
    retryCount: 0,
  });

  private readonly vault: typeof defaultVault;
  private readonly themeStore: typeof defaultThemeStore;
  private readonly guestStore: typeof defaultGuestStore;
  private readonly mapStore: typeof defaultMapStore;
  private readonly sessionModeStore: typeof defaultSessionModeStore;
  private readonly notificationStore: typeof defaultNotificationStore;
  private idGenerator: IdGenerator;

  constructor(deps: HostDeps = {}) {
    this.vault = deps.vault ?? defaultVault;
    this.themeStore = deps.themeStore ?? defaultThemeStore;
    this.guestStore = deps.guestStore ?? defaultGuestStore;
    this.mapStore = deps.mapStore ?? defaultMapStore;
    this.sessionModeStore = deps.sessionModeStore ?? defaultSessionModeStore;
    this.notificationStore = deps.notificationStore ?? defaultNotificationStore;
    this.idGenerator = deps.idGenerator ?? systemIdGenerator;

    this.connectionManager =
      deps.connectionManager ??
      new PeerJSConnectionManager(deps.peerFactory ?? createPeer);
    this.transport =
      deps.transport ?? new PeerJSTransport({
        peerFactory: deps.peerFactory,
        idGenerator: this.idGenerator,
      });
    this.dispatcher = deps.dispatcher ?? new P2PDispatcher();

    this.setupDispatcher();
    this.setupTransportListeners();
  }

  private setupDispatcher() {
    this.dispatcher.register(new VTTHandler());
    this.dispatcher.register(new VaultHandler());
    this.dispatcher.register(new FileHandler());
    this.dispatcher.register(new HostCharChatHandler());
    this.dispatcher.register(new VoiceHandler());
  }

  private setupTransportListeners() {
    this.transport.on("connection", (conn: P2PConnection) => {
      debugStore.log("[P2P Host] New guest connected:", conn.peer);
      this.connections.push(conn);
    });

    this.transport.on("data", async ({ conn, data }) => {
      if (data && typeof data === "object") {
        if (data.type === "handshake") {
          debugStore.log("[P2P Host] Received handshake from:", conn.peer);
          const ack = {
            type: "handshake_ack",
            senderId: this.transport.id || "",
            timestamp: systemClock.now(),
            payload: null,
          };
          conn.send(ack);
          return;
        }
        if (data.type === "ping") {
          const pong = {
            type: "pong",
            senderId: this.transport.id || "",
            timestamp: (data as any).timestamp ?? systemClock.now(),
            payload: null,
          };
          conn.send(pong);
          return;
        }
      }
      // Unwrap PeerJSMessage envelope if present (e.g. from connection manager)
      let messageToDispatch = data;
      if (
        data &&
        typeof data === "object" &&
        "senderId" in data &&
        "payload" in data
      ) {
        messageToDispatch = (data as any).payload;
      }
      await this.dispatcher.dispatch(
        messageToDispatch,
        conn,
        this.getHandlerContext(),
      );
    });

    this.transport.on("error", (err) => {
      console.error("[P2P Host] Transport error:", err);
      this.state.status = "failed";
    });

    this.transport.on("close", (peerId) => {
      if (peerId) {
        this.connections = this.connections.filter((c) => c.peer !== peerId);
        // Restore cleanup on disconnect
        mapSession.clearGuestOwnership(peerId);
        const { [peerId]: _, ...rest } = this.guestStore.guestRoster;
        this.guestStore.guestRoster = rest;
      }
    });
  }

  private getHandlerContext() {
    // Lazy singleton reference — avoids circular import, resolved at runtime
    const oracle = (globalThis as any).__codex_oracle_instance__;
    return {
      vault: this.vault,
      sessionModeStore: this.sessionModeStore,
      notificationStore: this.notificationStore,
      mapSession: mapSession,
      mapStore: this.mapStore,
      themeStore: this.themeStore,
      guestStore: this.guestStore,
      transport: this.transport,
      oracle,
    };
  }

  get isHosting() {
    return this._isHosting;
  }
  get activePeerId() {
    return this.transport.id;
  }
  /** Underlying media-capable peer for the voice channel, if the transport has one. */
  get rawPeer(): unknown {
    return this.transport.rawPeer ?? null;
  }

  async startHosting(onPeerId?: (peerId: string) => void): Promise<string> {
    if (this._isHosting && this.transport.id) {
      onPeerId?.(this.transport.id);
      return this.transport.id;
    }

    const peerId = this.idGenerator.uuid();
    onPeerId?.(peerId);

    this.state.status = "connecting";
    const id = await this.transport.start(peerId);
    debugStore.log("[P2P Host] Hosting started. ID:", id);

    this._isHosting = true;
    this.state.status = "connected";
    this.state.peerId = id;
    mapSession.setBroadcaster((message) => this.broadcastVttMessage(message));
    mapSession.myPeerId = id;

    this.setupVaultSubscribers();
    this.startHeartbeat();

    return id;
  }

  private setupVaultSubscribers() {
    this.vault.onEntityUpdate = (entity) => this.broadcastEntityUpdate(entity);
    this.vault.onEntityDelete = (delId) => this.broadcastEntityDelete(delId);
    this.vault.onBatchUpdate = (updates) => this.broadcastBatchUpdate(updates);
    this.themeStore.onThemeUpdate = (themeId) =>
      this.broadcastThemeUpdate(themeId);
    this.guestStore.guestRoster = {};
  }

  private startHeartbeat() {
    // FR-008: 30s Heartbeat Sync
    this.heartbeatInterval = setInterval(() => {
      if (this._isHosting && mapSession.vttEnabled) {
        this.broadcastSessionSnapshot();
      }
    }, 30000);
  }

  public async broadcastActiveMapSync() {
    if (!this.mapStore.activeMap) return;
    const { prepareMapPayload } = await import("./p2p-helpers");
    const payload = await prepareMapPayload(
      this.mapStore.activeMap,
      this.mapStore,
      this.vault,
    );
    this.transport.broadcast({ type: "MAP_SYNC", payload });
  }

  public async broadcastActiveMapFogSync() {
    if (!this.mapStore.activeMap) return;
    const { prepareFogPayload } = await import("./p2p-helpers");
    const payload = await prepareFogPayload(
      this.mapStore.activeMap,
      this.mapStore,
    );
    this.transport.broadcast({ type: "MAP_FOG_SYNC", payload });
  }

  broadcastVttMessage(message: P2PMessage, excludePeer?: string) {
    if (message.type === "SESSION_SNAPSHOT") {
      void this.broadcastSessionSnapshot(message.session);
      return;
    }

    // Standard mappings for pings/measurements to use mapSession context
    if (message.type === "PING") {
      this.transport.broadcast(
        {
          ...message,
          type: "MAP_PING",
          mapId: mapSession.mapId || this.mapStore.activeMapId || "",
        },
        excludePeer,
      );
      return;
    }

    if (message.type === "MEASUREMENT") {
      this.transport.broadcast(
        {
          ...message,
          type: "MAP_MEASUREMENT",
          mapId: mapSession.mapId || "",
        },
        excludePeer,
      );
      return;
    }

    this.transport.broadcast(message, excludePeer);
  }

  private async broadcastSessionSnapshot(
    session = mapSession.createSnapshot(),
  ) {
    const payload = await encodeSessionSnapshot(session);
    this.transport.broadcast(payload);
  }

  private async broadcastEntityUpdate(entity: any) {
    const { sanitizeEntityForGuestTransport } = await import("./p2p-helpers");
    this.transport.broadcast({
      type: "ENTITY_UPDATE",
      payload: sanitizeEntityForGuestTransport(entity),
    });
  }

  private broadcastEntityDelete(id: string) {
    this.transport.broadcast({ type: "ENTITY_DELETE", payload: id });
  }

  private async broadcastBatchUpdate(updates: Record<string, any>) {
    const { sanitizeEntityForGuestTransport } = await import("./p2p-helpers");
    const sanitized: Record<string, any> = {};
    for (const [id, entity] of Object.entries(updates)) {
      sanitized[id] = sanitizeEntityForGuestTransport(entity);
    }
    this.transport.broadcast({
      type: "ENTITY_BATCH_UPDATE",
      payload: sanitized,
    });
  }

  private broadcastThemeUpdate(themeId: string) {
    this.transport.broadcast({ type: "THEME_UPDATE", payload: themeId });
  }

  public broadcastSoundBitePlay(entityId: string) {
    this.transport.broadcast({
      type: "SOUND_BITE_PLAY",
      entityId,
    });
  }

  stopHosting() {
    voiceChat.reset();
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.vault.onEntityUpdate = undefined;
    this.vault.onEntityDelete = undefined;
    this.vault.onBatchUpdate = undefined;
    this.themeStore.onThemeUpdate = undefined;
    this.guestStore.guestRoster = {};
    mapSession.setBroadcaster(null);
    mapSession.myPeerId = null;
    this.transport.stop();
    this._isHosting = false;
    this.state.status = "disconnected";
    this.state.peerId = null;
    this.connections = [];
  }
}

export const p2pHost = new P2PHostService();

if (typeof window !== "undefined") {
  (window as any).p2pHostService = p2pHost;
}
