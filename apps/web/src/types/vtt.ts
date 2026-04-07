import type { Point } from "schema";

export type SessionMode = "exploration" | "combat";
export type TokenVisibility = "all" | "gm-only" | "owner-only";

export interface PingState {
  x: number;
  y: number;
  peerId: string;
  color: string;
  timestamp: number;
}

export interface Token {
  id: string;
  entityId: string | null;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  ownerPeerId: string | null;
  visibleTo: TokenVisibility;
  color: string;
  imageUrl: string | null;
}

export interface MeasurementState {
  active: boolean;
  start: Point | null;
  end: Point | null;
  locked?: boolean;
}

export interface InitiativeEntry {
  tokenId: string;
  initiativeValue: number;
  hasActed: boolean;
}

export interface EncounterSession {
  id: string;
  name: string;
  mapId: string;
  mode: SessionMode;
  tokens: Record<string, Token>;
  initiativeOrder: string[];
  initiativeValues: Record<string, number>;
  round: number;
  turnIndex: number;
  selection: string | null;
  sessionFogMask: string | null;
  lastPing: PingState | null;
  measurement: MeasurementState;
  createdAt: number;
  savedAt: number | null;
  chatMessages: ChatMessagePayload[];
  gridSize?: number;
  gridUnit?: string;
  gridDistance?: number;
}

export interface EncounterSnapshotSummary {
  id: string;
  name: string;
  mapId: string;
  savedAt: number;
  tokenCount: number;
  round: number;
  mode: SessionMode;
}

export interface TokenCreationInput {
  name: string;
  x: number;
  y: number;
  entityId?: string | null;
  width?: number;
  height?: number;
  rotation?: number;
  zIndex?: number;
  ownerPeerId?: string | null;
  visibleTo?: TokenVisibility;
  color?: string;
  imageUrl?: string | null;
}

export interface TokenMoveInput {
  tokenId: string;
  x: number;
  y: number;
}

export interface TokenStateUpdateInput {
  tokenId?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  visibleTo?: TokenVisibility;
  ownerPeerId?: string | null;
  imageUrl?: string | null;
}

export interface SessionSnapshotPayload {
  type: "SESSION_SNAPSHOT";
  session: EncounterSession;
}

export interface TokenStateUpdatePayload {
  type: "TOKEN_STATE_UPDATE";
  tokenId: string;
  delta: TokenStateUpdateInput;
}

export interface TokenAddedPayload {
  type: "TOKEN_ADDED";
  token: Token;
}

export interface TokenRemovedPayload {
  type: "TOKEN_REMOVED";
  tokenId: string;
}

export interface TurnAdvancePayload {
  type: "TURN_ADVANCE";
  turnIndex: number;
  round: number;
  activeTokenId: string | null;
}

export interface FogRevealPayload {
  type: "FOG_REVEAL";
  strokes: Array<{
    x: number;
    y: number;
    radius: number;
    reveal: boolean;
  }>;
}

export interface SetModePayload {
  type: "SET_MODE";
  mode: SessionMode;
}

export interface MapPingPayload {
  type: "MAP_PING";
  mapId?: string;
  x: number;
  y: number;
  peerId: string;
  color: string;
}

export interface PingPayload {
  type: "PING";
  x: number;
  y: number;
  peerId: string;
  color: string;
}

export interface TokenAddRequestPayload {
  type: "TOKEN_ADD_REQUEST";
  name: string;
  entityId: string | null;
  x: number;
  y: number;
  color: string;
}

export interface TokenMovePayload {
  type: "TOKEN_MOVE";
  tokenId: string;
  x: number;
  y: number;
}

export interface TokenRemoveRequestPayload {
  type: "TOKEN_REMOVE";
  tokenId: string;
}

export interface TokenSelectPayload {
  type: "TOKEN_SELECT";
  tokenId: string | null;
}

export interface SessionSavePayload {
  type: "SESSION_SAVE";
  encounterId: string;
}

export interface SessionEndedPayload {
  type: "SESSION_ENDED";
}

export interface SetGridSettingsPayload {
  type: "SET_GRID_SETTINGS";
  gridSize?: number;
  gridUnit?: string;
  gridDistance?: number;
}

export interface ChatMessagePayload {
  type: "CHAT_MESSAGE";
  sender: string;
  senderId: string;
  content: string;
  timestamp: number;
  roll?: {
    formula: string;
    total: number;
    parts: Array<{
      type: "dice" | "modifier";
      value: number;
      sides?: number;
      rolls?: number[];
      dropped?: number[];
    }>;
  };
}

export type VTTMessage =
  | SessionSnapshotPayload
  | TokenStateUpdatePayload
  | TokenAddedPayload
  | TokenRemovedPayload
  | TurnAdvancePayload
  | FogRevealPayload
  | SetModePayload
  | MapPingPayload
  | PingPayload
  | TokenAddRequestPayload
  | TokenMovePayload
  | TokenRemoveRequestPayload
  | TokenSelectPayload
  | SessionSavePayload
  | SessionEndedPayload
  | SetGridSettingsPayload
  | ChatMessagePayload;
