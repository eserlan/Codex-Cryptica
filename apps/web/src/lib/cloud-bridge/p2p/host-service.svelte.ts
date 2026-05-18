import { vault as defaultVault } from "../../stores/vault.svelte";
import { themeStore as defaultThemeStore } from "../../stores/theme.svelte";
import { guestRoster as defaultGuestRoster } from "../../stores/guest";
import { mapStore as defaultMapStore } from "../../stores/map.svelte";
import { uiStore as defaultUIStore } from "../../stores/ui.svelte";
import type { Entity } from "schema";
import { mapSession } from "../../stores/map-session.svelte";
import { encodeSessionSnapshot, type P2PMessage } from "./p2p-protocol";
import type {
  P2PTransport,
  P2PConnection,
} from "./transport/transport-interface";
import { PeerJSTransport } from "./transport/peerjs-transport";
import { P2PDispatcher } from "./dispatcher/p2p-dispatcher";
import { VTTHandler } from "./handlers/vtt-handler";
import { VaultHandler } from "./handlers/vault-handler";
import { FileHandler } from "./handlers/file-handler";
import { createPeer, type PeerFactory } from "./peer-factory";

type HostDeps = {
  vault?: typeof defaultVault;
  themeStore?: typeof defaultThemeStore;
  guestRoster?: typeof defaultGuestRoster;
  mapStore?: typeof defaultMapStore;
  uiStore?: typeof defaultUIStore;
  peerFactory?: PeerFactory;
  transport?: P2PTransport;
  dispatcher?: P2PDispatcher;
};

export class P2PHostService {
  private transport: P2PTransport;
  private dispatcher: P2PDispatcher;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  connections = $state<P2PConnection[]>([]);
  private _isHosting = false;

  private readonly vault: typeof defaultVault;
  private readonly themeStore: typeof defaultThemeStore;
  private readonly guestRoster: typeof defaultGuestRoster;
  private readonly mapStore: typeof defaultMapStore;
  private readonly uiStore: typeof defaultUIStore;

  constructor(deps: HostDeps = {}) {
    this.vault = deps.vault ?? defaultVault;
    this.themeStore = deps.themeStore ?? defaultThemeStore;
    this.guestRoster = deps.guestRoster ?? defaultGuestRoster;
    this.mapStore = deps.mapStore ?? defaultMapStore;
    this.uiStore = deps.uiStore ?? defaultUIStore;

    this.transport =
      deps.transport ?? new PeerJSTransport(deps.peerFactory ?? createPeer);
    this.dispatcher = deps.dispatcher ?? new P2PDispatcher();

    this.setupDispatcher();
    this.setupTransportListeners();
  }

  private setupDispatcher() {
    this.dispatcher.register(new VTTHandler());
    this.dispatcher.register(new VaultHandler());
    this.dispatcher.register(new FileHandler());
  }

  private setupTransportListeners() {
    this.transport.on("connection", (conn: P2PConnection) => {
      console.log("[P2P Host] New guest connected:", conn.peer);
      this.connections.push(conn);
    });

    this.transport.on("data", async ({ conn, data }) => {
      await this.dispatcher.dispatch(data, conn, this.getHandlerContext());
    });

    this.transport.on("error", (err) =>
      console.error("[P2P Host] Transport error:", err),
    );

    this.transport.on("close", (peerId) => {
      if (peerId) {
        this.connections = this.connections.filter((c) => c.peer !== peerId);
      }
    });
  }

  private getHandlerContext() {
    return {
      vault: this.vault,
      uiStore: this.uiStore,
      mapSession: mapSession,
      mapStore: this.mapStore,
      themeStore: this.themeStore,
      guestRoster: this.guestRoster,
      transport: this.transport,
    };
  }

  get isHosting() {
    return this._isHosting;
  }
  get activePeerId() {
    return this.transport.id;
  }

  async startHosting(onPeerId?: (peerId: string) => void): Promise<string> {
    if (this._isHosting && this.transport.id) {
      onPeerId?.(this.transport.id);
      return this.transport.id;
    }

    const peerId = crypto.randomUUID();
    onPeerId?.(peerId);

    const id = await this.transport.start(peerId);
    console.log("[P2P Host] Hosting started. ID:", id);

    this._isHosting = true;
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
    this.guestRoster.set({});
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
          type: "MAP_PING",
          mapId: mapSession.mapId || this.mapStore.activeMapId || "",
          ...message,
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

  private broadcastEntityUpdate(entity: any) {
    this.transport.broadcast({ type: "ENTITY_UPDATE", payload: entity });
  }

  private broadcastEntityDelete(id: string) {
    this.transport.broadcast({ type: "ENTITY_DELETE", payload: id });
  }

  private broadcastBatchUpdate(updates: Record<string, Partial<Entity>>) {
    this.transport.broadcast({ type: "ENTITY_BATCH_UPDATE", payload: updates });
  }

  private broadcastThemeUpdate(themeId: string) {
    this.transport.broadcast({ type: "THEME_UPDATE", payload: themeId });
  }

  stopHosting() {
    clearInterval(this.heartbeatInterval);
    this.vault.onEntityUpdate = undefined;
    this.vault.onEntityDelete = undefined;
    this.vault.onBatchUpdate = undefined;
    this.themeStore.onThemeUpdate = undefined;
    this.guestRoster.set({});
    mapSession.setBroadcaster(null);
    this.transport.stop();
    this._isHosting = false;
    this.connections = [];
  }
}

export const p2pHost = new P2PHostService();

if (typeof window !== "undefined") {
  (window as any).p2pHostService = p2pHost;
}
