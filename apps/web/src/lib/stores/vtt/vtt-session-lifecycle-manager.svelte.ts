import { createEncounterSession } from "$lib/services/vtt-session";
import type { EncounterSnapshotSummary, SessionMode } from "../../../types/vtt";
import {
  browserSessionStorage,
  browserStorage,
  type StorageLike,
} from "$lib/utils/runtime-deps";

export interface VTTSessionLifecycleManagerDependencies {
  getMapId: () => string | null;
  setMapId: (mapId: string | null) => void;
  setVttEnabled: (enabled: boolean) => void;
  clearPendingSessionSnapshotBroadcast: () => void;
  restoreAnyPopoutDraft: () => boolean;
  restoreDraft: (mapId: string) => boolean;
  getDraftKey: (mapId: string) => string;
  getPopoutKey: (mapId: string) => string;
  loadGridMeasure: (mapId: string) => void;
  setSessionId: (sessionId: string | null) => void;
  setMode: (mode: SessionMode) => void;
  setEncounterName: (name: string) => void;
  resetTokenManager: () => void;
  resetInitiativeManager: () => void;
  setSessionFogMask: (mask: string | null) => void;
  resetMeasurementManager: () => void;
  resetMediaManager: () => void;
  setCreatedAt: (createdAt: number) => void;
  setSavedAt: (savedAt: number | null) => void;
  setSnapshots: (snapshots: EncounterSnapshotSummary[]) => void;
  resetChatManager: () => void;
  resetEncounterManager: () => void;
  sessionStorage?: StorageLike;
  localStorage?: StorageLike;
}

export class VTTSessionLifecycleManager {
  restoring = $state(false);
  restoredMapId = $state<string | null>(null);
  hasHydratedSession = $state(false);

  constructor(private deps: VTTSessionLifecycleManagerDependencies) {}

  private get sessionStorage(): StorageLike {
    return this.deps.sessionStorage ?? browserSessionStorage;
  }

  private get localStorage(): StorageLike {
    return this.deps.localStorage ?? browserStorage;
  }

  setRestoring(restoring: boolean) {
    this.restoring = restoring;
  }

  setHasHydratedSession(hydrated: boolean) {
    this.hasHydratedSession = hydrated;
  }

  handleActiveMapChange(activeMapId: string | null) {
    if (!activeMapId) {
      if (this.hasHydratedSession) {
        return;
      }
      if (this.deps.restoreAnyPopoutDraft()) {
        return;
      }
      this.clearSession(true);
      return;
    }

    if (
      this.deps.getMapId() !== activeMapId ||
      this.restoredMapId !== activeMapId
    ) {
      this.bindToMap(activeMapId);
    }
  }

  bindToMap(mapId: string) {
    this.deps.setMapId(mapId);
    this.restoredMapId = mapId;
    this.deps.loadGridMeasure(mapId);
    const restored = this.deps.restoreDraft(mapId);
    this.hasHydratedSession = restored;
    if (!restored) {
      this.resetSessionState(mapId);
    }
  }

  resetSessionState(mapId: string) {
    this.deps.clearPendingSessionSnapshotBroadcast();
    const session = createEncounterSession(mapId);
    this.deps.setSessionId(session.id);
    this.deps.setMode(session.mode);
    this.deps.setEncounterName(session.name);
    this.deps.resetTokenManager();
    this.deps.resetInitiativeManager();
    this.deps.setSessionFogMask(null);
    this.deps.resetMeasurementManager();
    this.deps.resetMediaManager();
    this.deps.setCreatedAt(session.createdAt);
    this.deps.setSavedAt(null);
    this.deps.setSnapshots([]);
    this.deps.resetChatManager();
  }

  clearSession(clearDraft = false) {
    this.deps.clearPendingSessionSnapshotBroadcast();
    const mapId = this.deps.getMapId();
    if (clearDraft && mapId) {
      this.sessionStorage.removeItem(this.deps.getDraftKey(mapId));
      this.localStorage.removeItem(this.deps.getPopoutKey(mapId));
    }
    this.deps.resetTokenManager();
    this.deps.setMapId(null);
    this.deps.resetInitiativeManager();
    this.deps.setSessionFogMask(null);
    this.deps.resetMeasurementManager();
    this.deps.resetMediaManager();
    this.deps.setVttEnabled(false);
    this.deps.resetChatManager();
    this.deps.resetEncounterManager();
    this.hasHydratedSession = false;
  }
}
