import type {
  ChatMessagePayload,
  EncounterSession,
  SessionMode,
  Token,
  TokenStateUpdateInput,
  VTTMessage,
} from "../../types/vtt";
import type { VTTChatManager } from "./vtt-chat-manager.svelte";
import type { VTTMediaManager } from "./vtt-media-manager.svelte";
import type { VTTTokenManager } from "./vtt-token-manager.svelte";
import type { VTTInitiativeManager } from "./vtt-initiative-manager.svelte";
import type { VTTGridManager } from "./vtt-grid-manager.svelte";
import type { VTTMeasurementManager } from "./vtt-measurement-manager.svelte";
import type { VTTPersistenceManager } from "./vtt-persistence-manager.svelte";

export interface VTTNetworkManagerDependencies {
  chatManager: VTTChatManager;
  mediaManager: VTTMediaManager;
  tokenManager: VTTTokenManager;
  initiativeManager: VTTInitiativeManager;
  gridManager: VTTGridManager;
  measurementManager: VTTMeasurementManager;
  persistenceManager: VTTPersistenceManager;

  getMapId: () => string | null;
  getVttEnabled: () => boolean;
  setVttEnabled: (enabled: boolean) => void;
  setMode: (mode: SessionMode) => void;
  setSessionFogMask: (mask: string | null) => void;
  setHasHydratedSession: (hydrated: boolean) => void;

  applySnapshot: (snapshot: EncounterSession, silent?: boolean) => void;
  selectMap: (mapId: string) => void;
  getActiveMapId: () => string | null;
}

export class VTTNetworkManager {
  private broadcaster: ((message: VTTMessage) => void) | null = null;

  constructor(private deps: VTTNetworkManagerDependencies) {}

  setBroadcaster(handler: ((message: VTTMessage) => void) | null) {
    this.broadcaster = handler;
  }

  emit(message: VTTMessage) {
    this.deps.persistenceManager.persistDraft();
    this.broadcaster?.(message);
  }

  syncFromRemoteSession(snapshot: EncounterSession, persist = true) {
    const currentMapId = this.deps.getMapId();
    if (snapshot.mapId && currentMapId && snapshot.mapId !== currentMapId) {
      return;
    }

    this.deps.applySnapshot(snapshot, true);

    if (snapshot.mapId && this.deps.getActiveMapId() !== snapshot.mapId) {
      this.deps.selectMap(snapshot.mapId);
    }

    this.deps.setVttEnabled(true);
    this.deps.setHasHydratedSession(true);
    this.deps.persistenceManager.queueDraftPersist();

    if (persist) {
      this.deps.persistenceManager.queueSessionSnapshotBroadcast();
    }
  }

  handleRemoteChatMessage(payload: ChatMessagePayload) {
    this.deps.chatManager.handleRemoteChatMessage(payload);
  }

  handleRemoteChatClear() {
    this.deps.chatManager.handleRemoteChatClear();
  }

  handleRemoteShowTokenImage(title: string, imagePath: string) {
    this.deps.mediaManager.handleRemoteShowTokenImage(title, imagePath);
  }

  handleRemoteTokenAdded(token: Token) {
    this.deps.tokenManager.handleRemoteTokenAdded(token);
  }

  handleRemoteTokenUpdate(tokenId: string, delta: TokenStateUpdateInput) {
    this.deps.tokenManager.handleRemoteTokenUpdate(tokenId, delta);
  }

  handleRemoteTokenRemoved(tokenId: string) {
    this.deps.tokenManager.handleRemoteTokenRemoved(tokenId);
  }

  handleRemoteMode(mode: SessionMode) {
    this.deps.setMode(mode);
    this.deps.persistenceManager.persistDraft();
  }

  handleRemoteTurn(turnIndex: number, round: number) {
    this.deps.initiativeManager.handleRemoteTurn(turnIndex, round);
  }

  handleRemoteFogMask(mask: string | null) {
    this.deps.setSessionFogMask(mask);
    this.deps.persistenceManager.persistDraft();
  }

  handleRemoteGridSettings(payload: {
    gridSize?: number;
    gridUnit?: string;
    gridDistance?: number;
  }) {
    this.deps.gridManager.handleRemoteGridSettings(payload);
  }

  handleRemotePing(
    x: number,
    y: number,
    peerId: string,
    color?: string,
    timestamp?: number,
  ) {
    this.deps.measurementManager.handleRemotePing(
      x,
      y,
      peerId,
      color,
      timestamp,
    );
  }

  handleRemoteMeasurement(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    peerId: string,
    active: boolean,
  ) {
    this.deps.measurementManager.handleRemoteMeasurement(
      startX,
      startY,
      endX,
      endY,
      peerId,
      active,
    );
  }
}
