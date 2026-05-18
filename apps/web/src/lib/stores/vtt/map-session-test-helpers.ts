import { vi } from "vitest";
import type {
  ChatMessagePayload,
  EncounterSession,
  MeasurementState,
  SessionMode,
  Token,
  VTTMessage,
} from "../../../types/vtt";
import { createFullEncounterSessionFixture } from "./map-session-test-fixtures";
import type { VTTSessionSnapshotManagerDependencies } from "./vtt-session-snapshot-manager";

export function createSnapshotManagerHarness() {
  const state = {
    sessionId: "enc-1" as string | null,
    name: "Encounter",
    mapId: "map-1" as string | null,
    mode: "exploration" as SessionMode,
    tokens: {} as Record<string, Token>,
    initiativeOrder: [] as string[],
    initiativeValues: {} as Record<string, number>,
    round: 1,
    turnIndex: 0,
    selection: null as string | null,
    selectedTokens: new Set<string>(),
    sessionFogMask: null as string | null,
    lastPing: null as EncounterSession["lastPing"],
    measurement: {
      active: false,
      start: null,
      end: null,
    } as MeasurementState,
    createdAt: 1,
    savedAt: null as number | null,
    chatMessages: [] as ChatMessagePayload[],
    gridSize: 50,
    gridUnit: "ft",
    gridDistance: 5,
    activeMapId: "map-1" as string | null,
    emitted: [] as VTTMessage[],
  };

  const deps: VTTSessionSnapshotManagerDependencies = {
    getSessionId: () => state.sessionId,
    setSessionId: (value) => {
      state.sessionId = value;
    },
    getEncounterName: () => state.name,
    setEncounterName: (value) => {
      state.name = value;
    },
    getMapId: () => state.mapId,
    setMapId: (value) => {
      state.mapId = value;
    },
    getMode: () => state.mode,
    setMode: (value) => {
      state.mode = value;
    },
    getTokens: () => state.tokens,
    setTokenSnapshotData: (tokens, selection, selectedTokens) => {
      state.tokens = tokens;
      state.selection = selection;
      state.selectedTokens = selectedTokens;
    },
    clearPendingTokenMoves: vi.fn(),
    getInitiativeOrder: () => state.initiativeOrder,
    getInitiativeValues: () => state.initiativeValues,
    getRound: () => state.round,
    getTurnIndex: () => state.turnIndex,
    setInitiativeSnapshotData: (order, values, round, turnIndex) => {
      state.initiativeOrder = order;
      state.initiativeValues = values;
      state.round = round;
      state.turnIndex = turnIndex;
    },
    getSelection: () => state.selection,
    getSessionFogMask: () => state.sessionFogMask,
    setSessionFogMask: (value) => {
      state.sessionFogMask = value;
    },
    getLastPing: () => state.lastPing,
    getMeasurement: () => state.measurement,
    setMeasurementSnapshotData: (measurement, lastPing) => {
      state.measurement = measurement;
      state.lastPing = lastPing;
    },
    clearPings: vi.fn(),
    getCreatedAt: () => state.createdAt,
    setCreatedAt: (value) => {
      state.createdAt = value;
    },
    getSavedAt: () => state.savedAt,
    setSavedAt: (value) => {
      state.savedAt = value;
    },
    getChatMessages: () => state.chatMessages,
    setChatMessages: (messages) => {
      state.chatMessages = messages;
    },
    getGridSize: () => state.gridSize,
    setGridSize: (value) => {
      state.gridSize = value;
    },
    getGridUnit: () => state.gridUnit,
    setGridUnit: (value) => {
      state.gridUnit = value;
    },
    getGridDistance: () => state.gridDistance,
    setGridDistance: (value) => {
      state.gridDistance = value;
    },
    getActiveMapId: () => state.activeMapId,
    clearPendingSessionSnapshotBroadcast: vi.fn(),
    emit: (message) => {
      state.emitted.push(message);
    },
  };

  return {
    state,
    deps,
    loadFullFixture() {
      const fixture = createFullEncounterSessionFixture();
      state.sessionId = fixture.id;
      state.name = fixture.name;
      state.mapId = fixture.mapId;
      state.mode = fixture.mode;
      state.tokens = fixture.tokens;
      state.initiativeOrder = fixture.initiativeOrder;
      state.initiativeValues = fixture.initiativeValues;
      state.round = fixture.round;
      state.turnIndex = fixture.turnIndex;
      state.selection = fixture.selection;
      state.sessionFogMask = fixture.sessionFogMask;
      state.lastPing = fixture.lastPing;
      state.measurement = fixture.measurement;
      state.createdAt = fixture.createdAt;
      state.savedAt = fixture.savedAt;
      state.chatMessages = fixture.chatMessages;
      state.gridSize = fixture.gridSize ?? 50;
      state.gridUnit = fixture.gridUnit ?? "ft";
      state.gridDistance = fixture.gridDistance ?? 5;
      return fixture;
    },
  };
}
