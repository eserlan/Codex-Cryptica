import type {
  ChatMessagePayload,
  EncounterSession,
  MeasurementState,
  PingState,
  SessionMode,
  Token,
  VTTMessage,
} from "../../../types/vtt";
import { cloneMeasurement } from "$lib/utils/vtt-helpers";
import { normalizeToken } from "./vtt-token-manager.svelte";

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
    return {
      id: this.deps.getSessionId() ?? crypto.randomUUID(),
      name: this.deps.getEncounterName(),
      mapId: this.deps.getMapId() ?? "",
      mode: this.deps.getMode(),
      tokens: Object.fromEntries(
        Object.entries(this.deps.getTokens()).map(([id, token]) => [
          id,
          { ...token },
        ]),
      ),
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
    this.deps.clearPendingSessionSnapshotBroadcast();
    this.deps.clearPendingTokenMoves();
    this.deps.clearPings();
    this.deps.setSessionId(snapshot.id);
    this.deps.setMapId(snapshot.mapId);
    this.deps.setMode(snapshot.mode);
    this.deps.setEncounterName(snapshot.name ?? this.deps.getEncounterName());

    const tokens = snapshot.tokens
      ? Object.fromEntries(
          Object.entries(snapshot.tokens).map(([id, token]) => [
            id,
            normalizeToken(token as Token),
          ]),
        )
      : {};

    const selection =
      snapshot.selection && tokens[snapshot.selection]
        ? snapshot.selection
        : null;
    this.deps.setTokenSnapshotData(
      tokens,
      selection,
      new Set(selection ? [selection] : []),
    );

    this.deps.setInitiativeSnapshotData(
      snapshot.initiativeOrder,
      snapshot.initiativeValues,
      snapshot.round,
      Math.min(
        snapshot.turnIndex,
        Math.max(0, snapshot.initiativeOrder.length - 1),
      ),
    );
    this.deps.setSessionFogMask(snapshot.sessionFogMask);
    this.deps.setMeasurementSnapshotData(
      snapshot.measurement,
      snapshot.lastPing ?? null,
    );
    this.deps.setCreatedAt(snapshot.createdAt);
    this.deps.setSavedAt(snapshot.savedAt);
    this.deps.setChatMessages(
      snapshot.chatMessages ? [...snapshot.chatMessages] : [],
    );

    if (
      snapshot.gridSize !== undefined &&
      snapshot.mapId === this.deps.getActiveMapId()
    ) {
      this.deps.setGridSize(snapshot.gridSize);
    }
    if (snapshot.gridUnit !== undefined) {
      this.deps.setGridUnit(snapshot.gridUnit);
    }
    if (snapshot.gridDistance !== undefined) {
      this.deps.setGridDistance(snapshot.gridDistance);
    }

    if (!silent) {
      this.deps.emit({
        type: "SESSION_SNAPSHOT",
        session: this.createSnapshot(),
      });
    }
  }
}
