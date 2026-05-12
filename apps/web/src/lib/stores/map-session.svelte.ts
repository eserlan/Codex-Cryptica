import { vault } from "./vault.svelte";
import { mapStore } from "./map.svelte";
import {
  VTTSessionService,
  createEncounterSession,
  summarizeEncounterSession,
} from "$lib/services/vtt-session";
import { VTTInitiativeManager } from "./vtt/vtt-initiative-manager.svelte";
import {
  VTTTokenManager,
  normalizeToken,
} from "./vtt/vtt-token-manager.svelte";
import { VTTGridManager } from "./vtt/vtt-grid-manager.svelte";
import { VTTMeasurementManager } from "./vtt/vtt-measurement-manager.svelte";
import type {
  ChatMessagePayload,
  DragPreview,
  EncounterSession,
  EncounterSnapshotSummary,
  SessionMode,
  Token,
  TokenCreationInput,
  TokenStateUpdateInput,
  VTTMessage,
} from "../../types/vtt";
import type { Point } from "schema";
import { type RollResult } from "dice-engine";
import { VTTChatManager } from "./vtt/vtt-chat-manager.svelte";
import { VTTMediaManager } from "./vtt/vtt-media-manager.svelte";
import { VTTPersistenceManager } from "./vtt/vtt-persistence-manager.svelte";
import { VTTNetworkManager } from "./vtt/vtt-network-manager.svelte";
import { cloneMeasurement } from "$lib/utils/vtt-helpers";

export interface MapSessionDependencies {
  mapStore: typeof mapStore;
  vault: typeof vault;
  service?: VTTSessionService;
}

export class MapSessionStore {
  vttEnabled = $state(false);
  sessionId = $state<string | null>(null);
  mapId = $state<string | null>(null);
  mode = $state<SessionMode>("exploration");
  name = $state("Encounter");

  sessionFogMask = $state<string | null>(null);
  createdAt = $state(Date.now());
  savedAt = $state<number | null>(null);
  snapshots = $state<EncounterSnapshotSummary[]>([]);
  myPeerId = $state<string | null>(null);

  chatManager: VTTChatManager;
  mediaManager: VTTMediaManager;
  initiativeManager: VTTInitiativeManager;
  tokenManager: VTTTokenManager;
  gridManager: VTTGridManager;
  measurementManager: VTTMeasurementManager;
  persistenceManager: VTTPersistenceManager;
  networkManager: VTTNetworkManager;

  get tokens() {
    return this.tokenManager.tokens;
  }
  set tokens(value) {
    this.tokenManager.tokens = value;
  }
  get selection() {
    return this.tokenManager.selection;
  }
  set selection(value) {
    this.tokenManager.selection = value;
  }
  get selectedTokens() {
    return this.tokenManager.selectedTokens;
  }
  set selectedTokens(value) {
    this.tokenManager.selectedTokens = value;
  }
  get pendingTokenCoords() {
    return this.tokenManager.pendingTokenCoords;
  }
  set pendingTokenCoords(value) {
    this.tokenManager.pendingTokenCoords = value;
  }
  get draggingTokenId() {
    return this.tokenManager.draggingTokenId;
  }
  set draggingTokenId(value) {
    this.tokenManager.draggingTokenId = value;
  }
  get dragPreview() {
    return this.tokenManager.dragPreview;
  }
  set dragPreview(value) {
    this.tokenManager.dragPreview = value;
  }

  // Measurement delegation
  get measurement() {
    return this.measurementManager.measurement;
  }
  set measurement(value) {
    this.measurementManager.measurement = value;
  }
  get activeMeasurement() {
    return this.measurementManager.activeMeasurement;
  }
  set activeMeasurement(value) {
    this.measurementManager.activeMeasurement = value;
  }
  get lastPing() {
    return this.measurementManager.lastPing;
  }
  set lastPing(value) {
    this.measurementManager.lastPing = value;
  }
  get pings() {
    return this.measurementManager.pings;
  }
  set pings(value) {
    this.measurementManager.pings = value;
  }

  // Grid settings delegation
  get gridUnit() {
    return this.gridManager.gridUnit;
  }
  set gridUnit(value) {
    this.gridManager.gridUnit = value;
  }
  get gridDistance() {
    return this.gridManager.gridDistance;
  }
  set gridDistance(value) {
    this.gridManager.gridDistance = value;
  }
  get showGridSettings() {
    return this.gridManager.showGridSettings;
  }
  set showGridSettings(value) {
    this.gridManager.showGridSettings = value;
  }
  get gridFitMode() {
    return this.gridManager.gridFitMode;
  }
  set gridFitMode(value) {
    this.gridManager.gridFitMode = value;
  }
  get gridMoveMode() {
    return this.gridManager.gridMoveMode;
  }
  set gridMoveMode(value) {
    this.gridManager.gridMoveMode = value;
  }

  private readonly service: VTTSessionService;
  private restoring = false;
  private restoredMapId: string | null = null;
  private hasHydratedSession = false;

  get allTokens() {
    return this.tokenManager.allTokens;
  }
  get selectedToken() {
    return this.tokenManager.selectedToken;
  }

  get chatMessages() {
    return this.chatManager.chatMessages;
  }
  get sharedTokenImage() {
    return this.mediaManager.sharedTokenImage;
  }

  get initiativeOrder() {
    return this.initiativeManager.initiativeOrder;
  }
  get initiativeValues() {
    return this.initiativeManager.initiativeValues;
  }
  get round() {
    return this.initiativeManager.round;
  }
  get turnIndex() {
    return this.initiativeManager.turnIndex;
  }
  get activeTokenId() {
    return this.initiativeManager.activeTokenId;
  }
  get initiativeEntries() {
    return this.initiativeManager.initiativeEntries;
  }

  constructor(private deps: MapSessionDependencies) {
    this.persistenceManager = new VTTPersistenceManager({
      createSnapshot: () => this.createSnapshot(),
      applySnapshot: (snapshot, silent) => this.applySnapshot(snapshot, silent),
      emit: (message) => this.networkManager.emit(message),
      getMapId: () => this.mapId,
      getVttEnabled: () => this.vttEnabled,
      setVttEnabled: (enabled) => {
        this.vttEnabled = enabled;
      },
      getMyPeerId: () => this.myPeerId,
      setMyPeerId: (peerId) => {
        this.myPeerId = peerId;
      },
      getRestoring: () => this.restoring,
      setRestoring: (restoring) => {
        this.restoring = restoring;
      },
      setHasHydratedSession: (hydrated) => {
        this.hasHydratedSession = hydrated;
      },
    });

    this.gridManager = new VTTGridManager({
      mapStore: this.deps.mapStore,
      getMapId: () => this.mapId,
      emit: (message) => this.networkManager.emit(message),
      persistDraft: () => this.persistenceManager.persistDraft(),
    });

    this.measurementManager = new VTTMeasurementManager({
      emit: (message) => this.networkManager.emit(message),
      getMyPeerId: () => this.myPeerId,
      persistDraft: () => this.persistenceManager.persistDraft(),
      getTokens: () => this.tokens,
      getMapId: () => this.mapId,
    });

    this.initiativeManager = new VTTInitiativeManager({
      emit: (message) => this.networkManager.emit(message),
      getTokens: () => this.tokens,
      getMode: () => this.mode,
      persistDraft: () => this.persistenceManager.persistDraft(),
      queueSessionSnapshotBroadcast: () =>
        this.persistenceManager.queueSessionSnapshotBroadcast(),
    });

    this.chatManager = new VTTChatManager({
      emit: (message) => this.networkManager.emit(message),
      getMyPeerId: () => this.myPeerId,
      persistDraft: () => this.persistenceManager.persistDraft(),
    });

    this.mediaManager = new VTTMediaManager({
      emit: (message) => this.networkManager.emit(message),
      getTokens: () => this.tokens,
      getVault: () => this.deps.vault,
    });

    this.tokenManager = new VTTTokenManager({
      emit: (message) => this.networkManager.emit(message),
      getMapStore: () => this.deps.mapStore,
      getVault: () => this.deps.vault,
      getMode: () => this.mode,
      persistDraft: () => this.persistenceManager.persistDraft(),
      getMyPeerId: () => this.myPeerId,
      queueSessionSnapshotBroadcast: () =>
        this.persistenceManager.queueSessionSnapshotBroadcast(),
      broadcastSessionSnapshotNow: () =>
        this.persistenceManager.broadcastSessionSnapshotNow(),
      addTokenToInitiativeState: (tokenId) =>
        this.initiativeManager.addTokenToInitiativeState(tokenId),
      removeTokenFromInitiativeState: (tokenId) =>
        this.initiativeManager.removeTokenFromInitiativeState(tokenId),
      cloneInitiativeState: (sourceId, cloneId) =>
        this.initiativeManager.cloneInitiativeState(sourceId, cloneId),
      isInitiativeOrdered: (tokenId) => this.initiativeOrder.includes(tokenId),
    });

    this.networkManager = new VTTNetworkManager({
      chatManager: this.chatManager,
      mediaManager: this.mediaManager,
      tokenManager: this.tokenManager,
      initiativeManager: this.initiativeManager,
      gridManager: this.gridManager,
      measurementManager: this.measurementManager,
      persistenceManager: this.persistenceManager,
      getMapId: () => this.mapId,
      getVttEnabled: () => this.vttEnabled,
      setVttEnabled: (enabled) => {
        this.vttEnabled = enabled;
      },
      setMode: (mode) => {
        this.mode = mode;
      },
      setSessionFogMask: (mask) => {
        this.sessionFogMask = mask;
      },
      setHasHydratedSession: (hydrated) => {
        this.hasHydratedSession = hydrated;
      },
      applySnapshot: (snapshot, silent) => this.applySnapshot(snapshot, silent),
      selectMap: (mapId) => this.deps.mapStore.selectMap(mapId),
      getActiveMapId: () => this.deps.mapStore.activeMapId,
    });

    this.service =
      deps.service ??
      new VTTSessionService({
        getActiveVaultHandle: () => this.deps.vault.getActiveVaultHandle(),
      });

    if (typeof window !== "undefined") {
      $effect.root(() => {
        const handleStorage = (event: StorageEvent) => {
          if (
            !event.key ||
            !event.key.startsWith(
              this.persistenceManager.getPopoutKey("").split(":")[0] + ":",
            ) ||
            !event.newValue
          ) {
            return;
          }

          try {
            const parsed = JSON.parse(event.newValue) as {
              vttEnabled?: boolean;
              myPeerId?: string | null;
              snapshot?: EncounterSession;
            };
            if (!parsed.snapshot?.mapId) return;
            if (this.mapId && parsed.snapshot.mapId !== this.mapId) return;
            this.networkManager.syncFromRemoteSession(
              parsed.snapshot,
              !this.persistenceManager.isInitiativePopoutWindow(),
            );
            this.vttEnabled = !!parsed.vttEnabled;
            if (parsed.myPeerId !== undefined) {
              this.myPeerId = parsed.myPeerId;
            }
          } catch {
            // Ignore malformed popout payloads.
          }
        };

        window.addEventListener("storage", handleStorage);

        $effect(() => {
          this.handleActiveMapChange(this.deps.mapStore.activeMapId);
        });

        return () => window.removeEventListener("storage", handleStorage);
      });
    }
  }

  setBroadcaster(handler: ((message: VTTMessage) => void) | null) {
    this.networkManager.setBroadcaster(handler);
  }

  refreshPopoutSnapshot() {
    this.persistenceManager.queueDraftPersist();
  }

  private handleActiveMapChange(activeMapId: string | null) {
    if (!activeMapId) {
      if (this.hasHydratedSession) {
        return;
      }
      if (this.persistenceManager.restoreAnyPopoutDraft()) {
        return;
      }
      this.clearSession(true);
      return;
    }

    if (this.mapId !== activeMapId || this.restoredMapId !== activeMapId) {
      this.bindToMap(activeMapId);
    }
  }

  bindToMap(mapId: string) {
    this.mapId = mapId;
    this.restoredMapId = mapId;
    this.gridManager.loadGridMeasure(mapId);
    const restored = this.persistenceManager.restoreDraft(mapId);
    this.hasHydratedSession = restored;
    if (!restored) {
      this.resetSessionState(mapId);
    }
  }

  private resetSessionState(mapId: string) {
    this.persistenceManager.clearPendingSessionSnapshotBroadcast();
    const session = createEncounterSession(mapId);
    this.sessionId = session.id;
    this.mode = session.mode;
    this.name = session.name;
    this.tokenManager.reset();
    this.initiativeManager.reset();
    this.sessionFogMask = null;
    this.measurementManager.reset();
    this.mediaManager.reset();
    this.createdAt = session.createdAt;
    this.savedAt = null;
    this.snapshots = [];
    this.chatManager.reset();
  }

  clearSession(clearDraft = false) {
    this.persistenceManager.clearPendingSessionSnapshotBroadcast();
    if (clearDraft && typeof window !== "undefined" && this.mapId) {
      window.sessionStorage.removeItem(
        this.persistenceManager.getDraftKey(this.mapId),
      );
      window.localStorage.removeItem(
        this.persistenceManager.getPopoutKey(this.mapId),
      );
    }
    this.tokenManager.reset();
    this.mapId = null;
    this.sessionId = null;
    this.initiativeManager.reset();
    this.sessionFogMask = null;
    this.measurementManager.reset();
    this.mediaManager.reset();
    this.createdAt = Date.now();
    this.savedAt = null;
    this.snapshots = [];
    this.vttEnabled = false;
    this.chatManager.reset();
    this.name = "Encounter";
    this.hasHydratedSession = false;
  }

  sendChatMessage(content: string) {
    this.chatManager.sendChatMessage(content, this.vttEnabled);
  }

  sendResolvedRollMessage(
    formula: string,
    result: Pick<RollResult, "total" | "parts">,
  ) {
    this.chatManager.sendResolvedRollMessage(formula, result, this.vttEnabled);
  }

  clearChatMessages() {
    this.chatManager.clearChatMessages(this.vttEnabled);
  }

  handleRemoteChatMessage(payload: ChatMessagePayload) {
    this.networkManager.handleRemoteChatMessage(payload);
  }

  handleRemoteChatClear() {
    this.networkManager.handleRemoteChatClear();
  }

  handleRemoteShowTokenImage(title: string, imagePath: string) {
    this.networkManager.handleRemoteShowTokenImage(title, imagePath);
  }

  clearSharedTokenImage() {
    this.mediaManager.clearSharedTokenImage();
  }

  showTokenImageToPlayers(tokenId: string) {
    return this.mediaManager.showTokenImageToPlayers(tokenId);
  }

  createSnapshot(): EncounterSession {
    return {
      id: this.sessionId ?? crypto.randomUUID(),
      name: this.name,
      mapId: this.mapId ?? "",
      mode: this.mode,
      tokens: Object.fromEntries(
        Object.entries(this.tokenManager.tokens).map(([id, token]) => [
          id,
          { ...token },
        ]),
      ),
      initiativeOrder: [...this.initiativeOrder],
      initiativeValues: { ...this.initiativeValues },
      round: this.round,
      turnIndex: this.turnIndex,
      selection: this.selection,
      sessionFogMask: this.sessionFogMask,
      lastPing: this.lastPing,
      measurement: cloneMeasurement(this.measurement),
      createdAt: this.createdAt,
      savedAt: this.savedAt,
      chatMessages: [...this.chatManager.chatMessages],
      gridSize: this.deps.mapStore.gridSize,
      gridUnit: this.gridUnit,
      gridDistance: this.gridDistance,
    };
  }

  applySnapshot(snapshot: EncounterSession, silent = true) {
    this.persistenceManager.clearPendingSessionSnapshotBroadcast();
    this.tokenManager.clearPendingMoves();
    this.measurementManager.clearPings();
    this.sessionId = snapshot.id;
    this.mapId = snapshot.mapId;
    this.mode = snapshot.mode;
    this.name = snapshot.name ?? this.name;

    const tokens = snapshot.tokens
      ? Object.fromEntries(
          Object.entries(snapshot.tokens).map(([id, token]) => [
            id,
            normalizeToken(token as Token),
          ]),
        )
      : {};

    this.tokenManager.setSnapshotData(
      tokens,
      snapshot.selection && tokens[snapshot.selection]
        ? snapshot.selection
        : null,
      new Set(
        snapshot.selection && tokens[snapshot.selection]
          ? [snapshot.selection]
          : [],
      ),
    );

    this.initiativeManager.setSnapshotData(
      snapshot.initiativeOrder,
      snapshot.initiativeValues,
      snapshot.round,
      Math.min(
        snapshot.turnIndex,
        Math.max(0, snapshot.initiativeOrder.length - 1),
      ),
    );
    this.sessionFogMask = snapshot.sessionFogMask;
    this.measurementManager.setSnapshotData(
      snapshot.measurement,
      snapshot.lastPing ?? null,
    );
    this.createdAt = snapshot.createdAt;
    this.savedAt = snapshot.savedAt;
    this.chatManager.setMessages(
      snapshot.chatMessages ? [...snapshot.chatMessages] : [],
    );

    if (
      snapshot.gridSize !== undefined &&
      snapshot.mapId === this.deps.mapStore.activeMapId
    ) {
      this.deps.mapStore.gridSize = snapshot.gridSize;
    }
    if (snapshot.gridUnit !== undefined) {
      this.gridUnit = snapshot.gridUnit;
    }
    if (snapshot.gridDistance !== undefined) {
      this.gridDistance = snapshot.gridDistance;
    }

    if (!silent) {
      this.networkManager.emit({
        type: "SESSION_SNAPSHOT",
        session: this.createSnapshot(),
      });
    }
  }

  setVttEnabled(enabled: boolean) {
    this.vttEnabled = enabled;
    this.persistenceManager.persistDraft();
  }

  setMode(mode: SessionMode) {
    if (this.mode === mode) return;
    this.mode = mode;
    this.networkManager.emit({ type: "SET_MODE", mode });
  }

  setSelection(tokenId: string | null) {
    this.tokenManager.setSelection(tokenId);
  }

  setMultiSelection(tokenIds: string[]) {
    this.tokenManager.setMultiSelection(tokenIds);
  }

  addToSelection(tokenId: string) {
    this.tokenManager.addToSelection(tokenId);
  }

  removeFromSelection(tokenId: string) {
    this.tokenManager.removeFromSelection(tokenId);
  }

  clearSelection() {
    this.tokenManager.clearSelection();
  }

  toggleTokenVisibility(tokenId: string) {
    return this.tokenManager.toggleTokenVisibility(tokenId);
  }

  isTokenVisible(
    tokenId: string,
    peerId: string | null,
    isHost: boolean,
  ): boolean {
    return this.tokenManager.isTokenVisible(tokenId, peerId, isHost);
  }

  setSessionFogMask(mask: string | null) {
    this.sessionFogMask = mask;
    this.persistenceManager.persistDraft();
  }

  setMeasurementActive(active: boolean) {
    this.measurementManager.setMeasurementActive(active);
  }

  setMeasurementStart(start: Point | null) {
    this.measurementManager.setMeasurementStart(start);
  }

  setMeasurementEnd(end: Point | null, silent = false) {
    this.measurementManager.setMeasurementEnd(end, silent);
  }

  setMeasurementLocked(locked: boolean) {
    this.measurementManager.setMeasurementLocked(locked);
  }

  clearMeasurement() {
    this.measurementManager.clearMeasurement();
  }

  addToken(input: TokenCreationInput, silent = false) {
    return this.tokenManager.addToken(input, silent);
  }

  requestTokenAdd(input: TokenCreationInput) {
    return this.tokenManager.requestTokenAdd(input);
  }

  updateToken(tokenId: string, updates: TokenStateUpdateInput, silent = false) {
    return this.tokenManager.updateToken(tokenId, updates, silent);
  }

  moveToken(tokenId: string, x: number, y: number, silent = false) {
    return this.tokenManager.moveToken(tokenId, x, y, silent);
  }

  requestTokenMove(tokenId: string, x: number, y: number, persistent = false) {
    return this.tokenManager.requestTokenMove(tokenId, x, y, persistent);
  }

  confirmTokenMove(tokenId: string) {
    this.tokenManager.confirmTokenMove(tokenId);
  }

  removeToken(tokenId: string, silent = false) {
    return this.tokenManager.removeToken(tokenId, silent);
  }

  cloneToken(tokenId: string, silent = false) {
    return this.tokenManager.cloneToken(tokenId, silent);
  }

  setTokenOwner(
    tokenId: string,
    ownerPeerId: string | null,
    ownerGuestName: string | null = null,
  ) {
    return this.tokenManager.setTokenOwner(
      tokenId,
      ownerPeerId,
      ownerGuestName,
    );
  }

  rebindGuestOwnership(peerId: string, guestName: string) {
    return this.tokenManager.rebindGuestOwnership(peerId, guestName);
  }

  clearGuestOwnership(peerId: string) {
    return this.tokenManager.clearGuestOwnership(peerId);
  }

  setInitiativeValue(tokenId: string, initiativeValue: number) {
    this.initiativeManager.setInitiativeValue(tokenId, initiativeValue);
  }

  addToInitiative(tokenId: string) {
    this.initiativeManager.addToInitiative(tokenId);
  }

  removeFromInitiative(tokenId: string) {
    this.initiativeManager.removeFromInitiative(tokenId);
  }

  reorderInitiative(fromIndex: number, toIndex: number) {
    this.initiativeManager.reorderInitiative(fromIndex, toIndex);
  }

  private sortInitiativeOrder() {
    return this.initiativeManager.sortInitiativeOrder();
  }

  private sortAndPersist() {
    this.initiativeManager.sortAndPersist();
  }

  advanceTurn() {
    return this.initiativeManager.advanceTurn();
  }

  canMoveToken(tokenId: string, peerId: string | null, isHost = false) {
    return this.tokenManager.canMoveToken(tokenId, peerId, isHost);
  }

  canViewToken(tokenId: string, peerId: string | null, isHost = false) {
    return this.tokenManager.canViewToken(tokenId, peerId, isHost);
  }

  canAdvanceTurn(peerId: string | null, isHost = false) {
    return this.initiativeManager.canAdvanceTurn(peerId, isHost);
  }

  async saveEncounterSnapshot(
    encounterId = this.sessionId ?? crypto.randomUUID(),
  ) {
    if (!this.mapId) return null;
    const result = await this.service.saveEncounterSnapshot(
      this.createSnapshot(),
      encounterId,
    );
    this.savedAt = Date.now();
    this.snapshots = [
      result.summary,
      ...this.snapshots.filter((s) => s.id !== encounterId),
    ];
    this.persistenceManager.persistDraft();
    return result;
  }

  startNewEncounter(name = this.name) {
    if (!this.mapId) return null;

    const session = createEncounterSession(
      this.mapId,
      crypto.randomUUID(),
      name.trim() || this.name || "Encounter",
    );

    this.tokenManager.reset();
    this.measurementManager.clearPings();

    this.sessionId = session.id;
    this.mode = session.mode;
    this.name = session.name;
    this.initiativeManager.reset();
    this.sessionFogMask = null;
    this.measurementManager.measurement = cloneMeasurement(session.measurement);
    this.createdAt = session.createdAt;
    this.savedAt = null;
    this.chatManager.reset();
    this.persistenceManager.persistDraft();
    return session;
  }

  async refreshEncounterSnapshots() {
    if (!this.mapId) {
      this.snapshots = [];
      return [];
    }
    this.snapshots = await this.service.listEncounterSnapshots(this.mapId);
    return this.snapshots;
  }

  async loadEncounterSnapshot(encounterId: string) {
    if (!this.mapId) return null;
    const snapshot = await this.service.loadEncounterSnapshot(
      this.mapId,
      encounterId,
    );
    this.applySnapshot(snapshot, true);
    this.persistenceManager.persistDraft();
    return snapshot;
  }

  async deleteEncounterSnapshot(encounterId: string) {
    if (!this.mapId) return null;
    await this.service.deleteEncounterSnapshot(this.mapId, encounterId);
    this.snapshots = this.snapshots.filter(
      (snapshot) => snapshot.id !== encounterId,
    );
    return true;
  }

  syncFromRemoteSession(snapshot: EncounterSession, persist = true) {
    this.networkManager.syncFromRemoteSession(snapshot, persist);
  }

  handleRemoteTokenAdded(token: Token) {
    this.networkManager.handleRemoteTokenAdded(token);
  }

  handleRemoteTokenUpdate(tokenId: string, delta: TokenStateUpdateInput) {
    this.networkManager.handleRemoteTokenUpdate(tokenId, delta);
  }

  handleRemoteTokenRemoved(tokenId: string) {
    this.networkManager.handleRemoteTokenRemoved(tokenId);
  }

  handleRemoteMode(mode: SessionMode) {
    this.networkManager.handleRemoteMode(mode);
  }

  handleRemoteTurn(turnIndex: number, round: number) {
    this.networkManager.handleRemoteTurn(turnIndex, round);
  }

  handleRemoteFogMask(mask: string | null) {
    this.networkManager.handleRemoteFogMask(mask);
  }

  handleRemoteGridSettings(payload: {
    gridSize?: number;
    gridUnit?: string;
    gridDistance?: number;
  }) {
    this.networkManager.handleRemoteGridSettings(payload);
  }

  setGridSettings(settings: {
    gridSize?: number;
    gridUnit?: string;
    gridDistance?: number;
  }) {
    this.gridManager.setGridSettings(settings);
  }

  handleRemotePing(
    x: number,
    y: number,
    peerId: string,
    color?: string,
    timestamp?: number,
  ) {
    this.networkManager.handleRemotePing(x, y, peerId, color, timestamp);
  }

  handleRemoteMeasurement(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    peerId: string,
    active: boolean,
  ) {
    this.networkManager.handleRemoteMeasurement(
      startX,
      startY,
      endX,
      endY,
      peerId,
      active,
    );
  }

  ping(x: number, y: number) {
    this.measurementManager.ping(x, y);
  }

  pingToken(tokenId: string) {
    this.measurementManager.pingToken(tokenId);
  }

  setDragPreview(preview: DragPreview | null) {
    this.dragPreview = preview;
  }

  clearDragPreview() {
    this.dragPreview = null;
  }

  getSnapshotSummary() {
    return summarizeEncounterSession(this.createSnapshot());
  }
}

const MAP_SESSION_KEY = "__codex_map_session_instance__";
export const mapSession: MapSessionStore =
  (globalThis as any)[MAP_SESSION_KEY] ??
  ((globalThis as any)[MAP_SESSION_KEY] = new MapSessionStore({
    mapStore,
    vault,
  }));

if (typeof window !== "undefined") {
  (window as any).mapSession = mapSession;
}
