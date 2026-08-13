import type { EncounterSession, VTTMessage } from "../../../types/vtt";
import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
import {
  browserSessionStorage,
  browserStorage,
  type StorageLike,
} from "$lib/utils/runtime-deps";

const STORAGE_PREFIX = "codex.vtt.session";
const POPOUT_STORAGE_PREFIX = "codex.vtt.popout";
const SESSION_SNAPSHOT_BROADCAST_DELAY_MS = 250;

export interface VTTPersistenceDependencies {
  createSnapshot: () => EncounterSession;
  applySnapshot: (snapshot: EncounterSession, silent: boolean) => void;
  emit: (message: VTTMessage) => void;
  getMapId: () => string | null;
  getVttEnabled: () => boolean;
  setVttEnabled: (enabled: boolean) => void;
  getMyPeerId: () => string | null;
  setMyPeerId: (peerId: string | null) => void;
  getRestoring: () => boolean;
  setRestoring: (restoring: boolean) => void;
  setHasHydratedSession: (hydrated: boolean) => void;
  sessionStorage?: StorageLike;
  localStorage?: StorageLike;
}

export class VTTPersistenceManager {
  private sessionSnapshotBroadcastTimeout: number | null = null;
  private draftPersistTimeout: number | null = null;

  constructor(private deps: VTTPersistenceDependencies) {}

  private get sessionStorage(): StorageLike {
    return this.deps.sessionStorage ?? browserSessionStorage;
  }

  private get localStorage(): StorageLike {
    return this.deps.localStorage ?? browserStorage;
  }

  clearPendingSessionSnapshotBroadcast() {
    if (this.sessionSnapshotBroadcastTimeout === null) return;
    clearTimeout(this.sessionSnapshotBroadcastTimeout);
    this.sessionSnapshotBroadcastTimeout = null;
  }

  clearPendingDraftPersist() {
    if (this.draftPersistTimeout === null) return;
    clearTimeout(this.draftPersistTimeout);
    this.draftPersistTimeout = null;
  }

  queueDraftPersist() {
    if (
      typeof window === "undefined" ||
      !this.deps.getMapId() ||
      this.deps.getRestoring()
    )
      return;

    this.clearPendingDraftPersist();
    this.draftPersistTimeout = window.setTimeout(() => {
      this.draftPersistTimeout = null;
      this.persistDraft();
    }, SESSION_SNAPSHOT_BROADCAST_DELAY_MS);
  }

  persistDraft() {
    const mapId = this.deps.getMapId();
    if (!mapId || this.deps.getRestoring()) return;

    const snapshot = this.deps.createSnapshot();
    const payload = JSON.stringify({
      vttEnabled: this.deps.getVttEnabled(),
      ...(sessionModeStore.isGuestMode
        ? { myPeerId: this.deps.getMyPeerId() }
        : {}),
      snapshot,
    });
    this.sessionStorage.setItem(this.getDraftKey(mapId), payload);
    this.localStorage.setItem(this.getPopoutKey(mapId), payload);
  }

  refreshPopoutSnapshot() {
    this.queueDraftPersist();
  }

  queueSessionSnapshotBroadcast() {
    this.clearPendingSessionSnapshotBroadcast();

    if (typeof window === "undefined") return;

    this.sessionSnapshotBroadcastTimeout = window.setTimeout(() => {
      this.sessionSnapshotBroadcastTimeout = null;
      this.deps.emit({
        type: "SESSION_SNAPSHOT",
        session: this.deps.createSnapshot(),
      });
    }, SESSION_SNAPSHOT_BROADCAST_DELAY_MS);
  }

  broadcastSessionSnapshotNow() {
    this.clearPendingSessionSnapshotBroadcast();
    this.deps.emit({
      type: "SESSION_SNAPSHOT",
      session: this.deps.createSnapshot(),
    });
  }

  getDraftKey(mapId: string) {
    return `${STORAGE_PREFIX}:${mapId}`;
  }

  getPopoutKey(mapId: string) {
    return `${POPOUT_STORAGE_PREFIX}:${mapId}`;
  }

  isInitiativePopoutWindow() {
    if (typeof window === "undefined") return false;
    return window.location.pathname.endsWith("/map/initiative");
  }

  findPopoutDraftKey() {
    const storage = this.localStorage;
    const len = storage.length ?? 0;

    for (let i = len - 1; i >= 0; i--) {
      const key = storage.key?.(i);
      if (key?.startsWith(`${POPOUT_STORAGE_PREFIX}:`)) {
        return key;
      }
    }

    return null;
  }

  restoreDraft(mapId: string): boolean {
    const raw =
      this.sessionStorage.getItem(this.getDraftKey(mapId)) ??
      this.localStorage.getItem(this.getPopoutKey(mapId));
    if (!raw) return false;

    try {
      const parsed = JSON.parse(raw) as {
        vttEnabled?: boolean;
        myPeerId?: string | null;
        snapshot?: EncounterSession;
      };
      if (!parsed.snapshot || parsed.snapshot.mapId !== mapId) return false;
      this.deps.setRestoring(true);
      this.deps.applySnapshot(parsed.snapshot, true);
      this.deps.setVttEnabled(!!parsed.vttEnabled);
      if (parsed.myPeerId !== undefined) {
        this.deps.setMyPeerId(parsed.myPeerId);
      }
      this.deps.setHasHydratedSession(true);
      return true;
    } catch {
      return false;
    } finally {
      this.deps.setRestoring(false);
    }
  }

  restoreAnyPopoutDraft(): boolean {
    const key = this.findPopoutDraftKey();
    if (!key) return false;

    const raw = this.localStorage.getItem(key);
    if (!raw) return false;

    try {
      const parsed = JSON.parse(raw) as {
        vttEnabled?: boolean;
        myPeerId?: string | null;
        snapshot?: EncounterSession;
      };
      if (!parsed.snapshot?.mapId) return false;

      const mapId = this.deps.getMapId();
      if (mapId && parsed.snapshot.mapId !== mapId) return false;

      this.deps.setRestoring(true);
      this.deps.applySnapshot(parsed.snapshot, true);
      this.deps.setVttEnabled(!!parsed.vttEnabled);
      if (parsed.myPeerId !== undefined) {
        this.deps.setMyPeerId(parsed.myPeerId);
      }
      this.deps.setHasHydratedSession(true);
      return true;
    } catch {
      return false;
    } finally {
      this.deps.setRestoring(false);
    }
  }
}
