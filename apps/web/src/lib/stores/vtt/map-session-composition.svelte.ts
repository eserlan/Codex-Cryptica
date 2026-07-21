import type { MapSessionStore } from "../map-session.svelte";
import { VTTChatManager } from "./vtt-chat-manager.svelte";
import { VTTEncounterManager } from "./vtt-encounter-manager.svelte";
import { VTTGridManager } from "./vtt-grid-manager.svelte";
import { VTTInitiativeManager } from "./vtt-initiative-manager.svelte";
import { VTTMeasurementManager } from "./vtt-measurement-manager.svelte";
import { VTTMediaManager } from "./vtt-media-manager.svelte";
import { VTTNetworkManager } from "./vtt-network-manager.svelte";
import { VTTPersistenceManager } from "./vtt-persistence-manager.svelte";
import { VTTSessionLifecycleManager } from "./vtt-session-lifecycle-manager.svelte";
import { VTTSessionSnapshotManager } from "./vtt-session-snapshot-manager";
import { VTTTokenManager } from "./vtt-token-manager.svelte";
import type { VTTSessionService } from "$lib/services/vtt-session";
import type { EncounterSession } from "../../../types/vtt";

function initializeStorageEffects(store: MapSessionStore) {
  if (typeof window === "undefined") return;

  $effect.root(() => {
    const handleStorage = (event: StorageEvent) => {
      if (
        !event.key ||
        !event.key.startsWith(
          store.persistenceManager.getPopoutKey("").split(":")[0] + ":",
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
        if (store.mapId && parsed.snapshot.mapId !== store.mapId) return;
        store.networkManager.syncFromRemoteSession(
          parsed.snapshot,
          !store.persistenceManager.isInitiativePopoutWindow(),
        );
        store.vttEnabled = !!parsed.vttEnabled;
        if (parsed.myPeerId !== undefined) {
          store.myPeerId = parsed.myPeerId;
        }
      } catch {
        // Ignore malformed popout payloads.
      }
    };

    $effect(() => {
      window.addEventListener("storage", handleStorage);
      return () => window.removeEventListener("storage", handleStorage);
    });

    $effect(() => {
      store.lifecycleManager.handleActiveMapChange(
        store.deps.mapStore.activeMapId,
      );
    });
  });
}

export function initializeMapSessionComposition(
  store: MapSessionStore,
  service: VTTSessionService,
) {
  store.persistenceManager = new VTTPersistenceManager({
    createSnapshot: () => store.createSnapshot(),
    applySnapshot: (snapshot, silent) => store.applySnapshot(snapshot, silent),
    emit: (message) => store.networkManager.emit(message),
    getMapId: () => store.mapId,
    getVttEnabled: () => store.vttEnabled,
    setVttEnabled: (enabled) => {
      store.vttEnabled = enabled;
    },
    getMyPeerId: () => store.myPeerId,
    setMyPeerId: (peerId) => {
      store.myPeerId = peerId;
    },
    getRestoring: () => store.lifecycleManager?.restoring ?? false,
    setRestoring: (restoring) => {
      store.lifecycleManager.setRestoring(restoring);
    },
    setHasHydratedSession: (hydrated) => {
      store.lifecycleManager.setHasHydratedSession(hydrated);
    },
    sessionStorage: store.deps.sessionStorage,
    localStorage: store.deps.localStorage,
  });

  store.gridManager = new VTTGridManager({
    mapStore: store.deps.mapStore,
    getMapId: () => store.mapId,
    emit: (message) => store.networkManager.emit(message),
    persistDraft: () => store.persistenceManager.persistDraft(),
  });

  store.measurementManager = new VTTMeasurementManager({
    emit: (message) => store.networkManager.emit(message),
    getMyPeerId: () => store.myPeerId,
    persistDraft: () => store.persistenceManager.persistDraft(),
    getTokens: () => store.tokens,
    getMapId: () => store.mapId,
  });

  store.initiativeManager = new VTTInitiativeManager({
    emit: (message) => store.networkManager.emit(message),
    getTokens: () => store.tokens,
    getMode: () => store.mode,
    persistDraft: () => store.persistenceManager.persistDraft(),
    queueSessionSnapshotBroadcast: () =>
      store.persistenceManager.queueSessionSnapshotBroadcast(),
  });

  store.chatManager = new VTTChatManager({
    emit: (message) => store.networkManager.emit(message),
    getMyPeerId: () => store.myPeerId,
    persistDraft: () => store.persistenceManager.persistDraft(),
  });

  store.mediaManager = new VTTMediaManager({
    emit: (message) => store.networkManager.emit(message),
    getTokens: () => store.tokens,
    getVault: () => store.deps.vault,
  });

  store.tokenManager = new VTTTokenManager({
    emit: (message) => store.networkManager.emit(message),
    getMapStore: () => store.deps.mapStore,
    getVault: () => store.deps.vault,
    getMode: () => store.mode,
    persistDraft: () => store.persistenceManager.persistDraft(),
    getMyPeerId: () => store.myPeerId,
    queueSessionSnapshotBroadcast: () =>
      store.persistenceManager.queueSessionSnapshotBroadcast(),
    broadcastSessionSnapshotNow: () =>
      store.persistenceManager.broadcastSessionSnapshotNow(),
    addTokenToInitiativeState: (tokenId) =>
      store.initiativeManager.addTokenToInitiativeState(tokenId),
    removeTokenFromInitiativeState: (tokenId) =>
      store.initiativeManager.removeTokenFromInitiativeState(tokenId),
    cloneInitiativeState: (sourceId, cloneId) =>
      store.initiativeManager.cloneInitiativeState(sourceId, cloneId),
    isInitiativeOrdered: (tokenId) => store.initiativeOrder.includes(tokenId),
  });

  store.encounterManager = new VTTEncounterManager({
    service,
    getMapId: () => store.mapId,
    persistDraft: () => store.persistenceManager.persistDraft(),
    createSnapshot: () => store.createSnapshot(),
    applySnapshot: (snapshot, silent) => store.applySnapshot(snapshot, silent),
    resetTokenManager: () => store.tokenManager.reset(),
    resetInitiativeManager: () => store.initiativeManager.reset(),
    resetMeasurementManager: () => store.measurementManager.reset(),
    resetChatManager: () => store.chatManager.reset(),
    clearPings: () => store.measurementManager.clearPings(),
    setMode: (mode) => {
      store.mode = mode;
    },
    setSessionFogMask: (mask) => {
      store.sessionFogMask = mask;
    },
    setMeasurement: (m) => {
      store.measurementManager.measurement = m;
    },
  });

  store.lifecycleManager = new VTTSessionLifecycleManager({
    getMapId: () => store.mapId,
    setMapId: (mapId) => {
      store.mapId = mapId;
    },
    setVttEnabled: (enabled) => {
      store.vttEnabled = enabled;
    },
    clearPendingSessionSnapshotBroadcast: () =>
      store.persistenceManager.clearPendingSessionSnapshotBroadcast(),
    restoreAnyPopoutDraft: () =>
      store.persistenceManager.restoreAnyPopoutDraft(),
    restoreDraft: (mapId) => store.persistenceManager.restoreDraft(mapId),
    getDraftKey: (mapId) => store.persistenceManager.getDraftKey(mapId),
    getPopoutKey: (mapId) => store.persistenceManager.getPopoutKey(mapId),
    loadGridMeasure: (mapId) => store.gridManager.loadGridMeasure(mapId),
    setSessionId: (sessionId) => {
      store.encounterManager.sessionId = sessionId;
    },
    setMode: (mode) => {
      store.mode = mode;
    },
    setEncounterName: (name) => {
      store.encounterManager.name = name;
    },
    resetTokenManager: () => store.tokenManager.reset(),
    resetInitiativeManager: () => store.initiativeManager.reset(),
    setSessionFogMask: (mask) => {
      store.sessionFogMask = mask;
    },
    resetMeasurementManager: () => store.measurementManager.reset(),
    resetMediaManager: () => store.mediaManager.reset(),
    setCreatedAt: (createdAt) => {
      store.encounterManager.createdAt = createdAt;
    },
    setSavedAt: (savedAt) => {
      store.encounterManager.savedAt = savedAt;
    },
    setSnapshots: (snapshots) => {
      store.encounterManager.snapshots = snapshots;
    },
    resetChatManager: () => store.chatManager.reset(),
    resetEncounterManager: () => store.encounterManager.reset(),
    sessionStorage: store.deps.sessionStorage,
    localStorage: store.deps.localStorage,
  });

  store.networkManager = new VTTNetworkManager({
    chatManager: store.chatManager,
    mediaManager: store.mediaManager,
    tokenManager: store.tokenManager,
    initiativeManager: store.initiativeManager,
    gridManager: store.gridManager,
    measurementManager: store.measurementManager,
    persistenceManager: store.persistenceManager,
    getMapId: () => store.mapId,
    getVttEnabled: () => store.vttEnabled,
    setVttEnabled: (enabled) => {
      store.vttEnabled = enabled;
    },
    setMode: (mode) => {
      store.mode = mode;
    },
    setSessionFogMask: (mask) => {
      store.sessionFogMask = mask;
    },
    setHasHydratedSession: (hydrated) => {
      store.lifecycleManager.setHasHydratedSession(hydrated);
    },
    applySnapshot: (snapshot, silent) => store.applySnapshot(snapshot, silent),
    selectMap: (mapId) => store.deps.mapStore.selectMap(mapId),
    getActiveMapId: () => store.deps.mapStore.activeMapId,
  });

  store.snapshotManager = new VTTSessionSnapshotManager({
    getSessionId: () => store.encounterManager.sessionId,
    setSessionId: (value) => {
      store.encounterManager.sessionId = value;
    },
    getEncounterName: () => store.encounterManager.name,
    setEncounterName: (value) => {
      store.encounterManager.name = value;
    },
    getMapId: () => store.mapId,
    setMapId: (value) => {
      store.mapId = value;
    },
    getMode: () => store.mode,
    setMode: (value) => {
      store.mode = value;
    },
    getTokens: () => store.tokenManager.tokens,
    setTokenSnapshotData: (tokens, selection, selectedTokens) =>
      store.tokenManager.setSnapshotData(tokens, selection, selectedTokens),
    clearPendingTokenMoves: () => store.tokenManager.clearPendingMoves(),
    getInitiativeOrder: () => store.initiativeManager.initiativeOrder,
    getInitiativeValues: () => store.initiativeManager.initiativeValues,
    getRound: () => store.initiativeManager.round,
    getTurnIndex: () => store.initiativeManager.turnIndex,
    setInitiativeSnapshotData: (order, values, round, turnIndex) =>
      store.initiativeManager.setSnapshotData(order, values, round, turnIndex),
    getSelection: () => store.tokenManager.selection,
    getSessionFogMask: () => store.sessionFogMask,
    setSessionFogMask: (value) => {
      store.sessionFogMask = value;
    },
    getLastPing: () => store.measurementManager.lastPing,
    getMeasurement: () => store.measurementManager.measurement,
    setMeasurementSnapshotData: (measurement, lastPing) =>
      store.measurementManager.setSnapshotData(measurement, lastPing),
    clearPings: () => store.measurementManager.clearPings(),
    getCreatedAt: () => store.encounterManager.createdAt,
    setCreatedAt: (value) => {
      store.encounterManager.createdAt = value;
    },
    getSavedAt: () => store.encounterManager.savedAt,
    setSavedAt: (value) => {
      store.encounterManager.savedAt = value;
    },
    getChatMessages: () => store.chatManager.chatMessages,
    setChatMessages: (messages) => store.chatManager.setMessages(messages),
    getGridSize: () => store.deps.mapStore.gridSize,
    setGridSize: (value) => {
      store.deps.mapStore.gridSize = value;
    },
    getGridUnit: () => store.gridManager.gridUnit,
    setGridUnit: (value) => {
      store.gridManager.gridUnit = value;
    },
    getGridDistance: () => store.gridManager.gridDistance,
    setGridDistance: (value) => {
      store.gridManager.gridDistance = value;
    },
    getActiveMapId: () => store.deps.mapStore.activeMapId,
    clearPendingSessionSnapshotBroadcast: () =>
      store.persistenceManager.clearPendingSessionSnapshotBroadcast(),
    emit: (message) => store.networkManager.emit(message),
  });

  initializeStorageEffects(store);
}
