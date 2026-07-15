import type {
  ChatMessagePayload,
  EncounterSession,
  MeasurementState,
  PingState,
  SessionMode,
  Token,
  VTTMessage,
} from "../../../types/vtt";
import { cloneMeasurement, normalizeEncounterSession } from "map-engine";

export interface VTTSessionSnapshotManagerDependencies {
  getSessionId: () => string | null;
  setSessionId: (value: string) => void;
  getEncounterName: () => string;
  setEncounterName: (value: string) => void;
  getMapId: () => string | null;
  setMapId: (value: string) => void;
  getMode: () => SessionMode;
  setMode: (value: SessionMode) => void;
  getTokens: () => Record<string, Token>;
  setTokenSnapshotData: (
    tokens: Record<string, Token>,
    selection: string | null,
    selectedTokens: Set<string>,
  ) => void;
  clearPendingTokenMoves: () => void;
  getInitiativeOrder: () => string[];
  getInitiativeValues: () => Record<string, number>;
  getRound: () => number;
  getTurnIndex: () => number;
  setInitiativeSnapshotData: (
    order: string[],
    values: Record<string, number>,
    round: number,
    turnIndex: number,
  ) => void;
  getSelection: () => string | null;
  getSessionFogMask: () => string | null;
  setSessionFogMask: (value: string | null) => void;
  getLastPing: () => PingState | null;
  getMeasurement: () => MeasurementState;
  setMeasurementSnapshotData: (
    measurement: MeasurementState,
    lastPing: PingState | null,
  ) => void;
  clearPings: () => void;
  getCreatedAt: () => number;
  setCreatedAt: (value: number) => void;
  getSavedAt: () => number | null;
  setSavedAt: (value: number | null) => void;
  getChatMessages: () => ChatMessagePayload[];
  setChatMessages: (messages: ChatMessagePayload[]) => void;
  getGridSize: () => number;
  setGridSize: (value: number) => void;
  getGridUnit: () => string;
  setGridUnit: (value: string) => void;
  getGridDistance: () => number;
  setGridDistance: (value: number) => void;
  getActiveMapId: () => string | null;
  clearPendingSessionSnapshotBroadcast: () => void;
  emit: (message: VTTMessage) => void;
}

export class VTTSessionSnapshotManager {
  constructor(private deps: VTTSessionSnapshotManagerDependencies) {}

  createSnapshot(): EncounterSession {
    const rawTokens = this.deps.getTokens();
    const clonedTokens: Record<string, Token> = {};
    for (const id of Object.keys(rawTokens)) {
      clonedTokens[id] = { ...rawTokens[id] };
    }

    return {
      id: this.deps.getSessionId() ?? crypto.randomUUID(),
      name: this.deps.getEncounterName(),
      mapId: this.deps.getMapId() ?? "",
      mode: this.deps.getMode(),
      tokens: clonedTokens,
      initiativeOrder: [...this.deps.getInitiativeOrder()],
      initiativeValues: { ...this.deps.getInitiativeValues() },
      round: this.deps.getRound(),
      turnIndex: this.deps.getTurnIndex(),
      selection: this.deps.getSelection(),
      sessionFogMask: this.deps.getSessionFogMask(),
      lastPing: this.deps.getLastPing(),
      measurement: cloneMeasurement(this.deps.getMeasurement()),
      createdAt: this.deps.getCreatedAt(),
      savedAt: this.deps.getSavedAt(),
      chatMessages: [...this.deps.getChatMessages()],
      gridSize: this.deps.getGridSize(),
      gridUnit: this.deps.getGridUnit(),
      gridDistance: this.deps.getGridDistance(),
    };
  }

  applySnapshot(snapshot: EncounterSession, silent = true) {
    const normalized = normalizeEncounterSession(snapshot);
    this.deps.clearPendingSessionSnapshotBroadcast();
    this.deps.clearPendingTokenMoves();
    this.deps.clearPings();
    this.deps.setSessionId(normalized.id);
    this.deps.setMapId(normalized.mapId);
    this.deps.setMode(normalized.mode);
    this.deps.setEncounterName(normalized.name ?? this.deps.getEncounterName());
    this.deps.setTokenSnapshotData(
      normalized.tokens,
      normalized.selection,
      new Set(normalized.selection ? [normalized.selection] : []),
    );

    this.deps.setInitiativeSnapshotData(
      normalized.initiativeOrder,
      normalized.initiativeValues,
      normalized.round,
      normalized.turnIndex,
    );
    this.deps.setSessionFogMask(normalized.sessionFogMask);
    this.deps.setMeasurementSnapshotData(
      normalized.measurement,
      normalized.lastPing ?? null,
    );
    this.deps.setCreatedAt(normalized.createdAt);
    this.deps.setSavedAt(normalized.savedAt);
    this.deps.setChatMessages(normalized.chatMessages);

    if (
      normalized.gridSize !== undefined &&
      normalized.mapId === this.deps.getActiveMapId()
    ) {
      this.deps.setGridSize(normalized.gridSize);
    }
    if (normalized.gridUnit !== undefined) {
      this.deps.setGridUnit(normalized.gridUnit);
    }
    if (normalized.gridDistance !== undefined) {
      this.deps.setGridDistance(normalized.gridDistance);
    }

    if (!silent) {
      this.deps.emit({
        type: "SESSION_SNAPSHOT",
        session: this.createSnapshot(),
      });
    }
  }
}
