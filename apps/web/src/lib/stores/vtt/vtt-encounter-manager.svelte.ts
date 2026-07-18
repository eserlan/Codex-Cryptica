import {
  createEncounterSession,
  type VTTSessionService,
} from "$lib/services/vtt-session";
import type {
  EncounterSession,
  EncounterSnapshotSummary,
  SessionMode,
  MeasurementState,
} from "../../../types/vtt";
import { cloneMeasurement } from "$lib/utils/vtt-helpers";
import { systemClock } from "$lib/utils/runtime-deps";

export interface VTTEncounterManagerDependencies {
  service: VTTSessionService;
  getMapId: () => string | null;
  persistDraft: () => void;
  createSnapshot: () => EncounterSession;
  applySnapshot: (snapshot: EncounterSession, silent?: boolean) => void;

  // Resetters and State Updaters
  resetTokenManager: () => void;
  resetInitiativeManager: () => void;
  resetMeasurementManager: () => void;
  resetChatManager: () => void;
  clearPings: () => void;
  setMode: (mode: SessionMode) => void;
  setSessionFogMask: (mask: string | null) => void;
  setMeasurement: (measurement: MeasurementState) => void;
}

export class VTTEncounterManager {
  sessionId = $state<string | null>(null);
  name = $state("Encounter");
  createdAt = $state(systemClock.now());
  savedAt = $state<number | null>(null);
  snapshots = $state<EncounterSnapshotSummary[]>([]);

  constructor(private deps: VTTEncounterManagerDependencies) {}

  startNewEncounter(name = this.name) {
    const mapId = this.deps.getMapId();
    if (!mapId) return null;

    const session = createEncounterSession(
      mapId,
      crypto.randomUUID(),
      name.trim() || this.name || "Encounter",
    );

    this.deps.resetTokenManager();
    this.deps.clearPings();

    this.sessionId = session.id;
    this.deps.setMode(session.mode);
    this.name = session.name;
    this.deps.resetInitiativeManager();
    this.deps.setSessionFogMask(null);
    this.deps.setMeasurement(cloneMeasurement(session.measurement));
    this.createdAt = session.createdAt;
    this.savedAt = null;
    this.deps.resetChatManager();
    this.deps.persistDraft();
    return session;
  }

  async refreshEncounterSnapshots() {
    const mapId = this.deps.getMapId();
    if (!mapId) {
      this.snapshots = [];
      return [];
    }
    this.snapshots = await this.deps.service.listEncounterSnapshots(mapId);
    return this.snapshots;
  }

  async loadEncounterSnapshot(encounterId: string) {
    const mapId = this.deps.getMapId();
    if (!mapId) return null;
    const snapshot = await this.deps.service.loadEncounterSnapshot(
      mapId,
      encounterId,
    );
    this.deps.applySnapshot(snapshot, true);
    this.deps.persistDraft();
    return snapshot;
  }

  async saveEncounterSnapshot(
    encounterId = this.sessionId ?? crypto.randomUUID(),
  ) {
    const mapId = this.deps.getMapId();
    if (!mapId) return null;
    const result = await this.deps.service.saveEncounterSnapshot(
      this.deps.createSnapshot(),
      encounterId,
    );
    this.savedAt = systemClock.now();
    this.snapshots = [
      result.summary,
      ...this.snapshots.filter((s) => s.id !== encounterId),
    ];
    this.deps.persistDraft();
    return result;
  }

  async deleteEncounterSnapshot(encounterId: string) {
    const mapId = this.deps.getMapId();
    if (!mapId) return null;
    await this.deps.service.deleteEncounterSnapshot(mapId, encounterId);
    this.snapshots = this.snapshots.filter(
      (snapshot) => snapshot.id !== encounterId,
    );
    return true;
  }

  reset() {
    this.sessionId = null;
    this.name = "Encounter";
    this.createdAt = systemClock.now();
    this.savedAt = null;
    this.snapshots = [];
  }
}
