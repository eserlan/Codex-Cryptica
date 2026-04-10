import type { Point } from "schema";

export type SessionMode = "exploration" | "combat";
export type TokenVisibility = "all" | "gm-only";
export type LegacyTokenVisibility = TokenVisibility | "owner-only";

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
  ownerGuestName: string | null;
  visibleTo: TokenVisibility;
  color: string;
  imageUrl: string | null;
  statusEffects: string[];
}

export interface MeasurementState {
  active: boolean;
  start: Point | null;
  end: Point | null;
  locked?: boolean;
}

export interface SharedTokenImageState {
  title: string;
  imagePath: string;
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
  ownerGuestName?: string | null;
  visibleTo?: LegacyTokenVisibility;
  color?: string;
  imageUrl?: string | null;
}

export const TOKEN_STATUS_EFFECTS = [
  { id: "dead", label: "Dead", icon: "icon-[lucide--skull]", color: "#6b7280" },
  {
    id: "stunned",
    label: "Stunned",
    icon: "icon-[lucide--zap]",
    color: "#facc15",
  },
  {
    id: "prone",
    label: "Prone",
    icon: "icon-[lucide--arrow-down]",
    color: "#a855f7",
  },
  {
    id: "poisoned",
    label: "Poisoned",
    icon: "icon-[lucide--flask-conical]",
    color: "#22c55e",
  },
  {
    id: "invisible",
    label: "Invisible",
    icon: "icon-[lucide--eye-off]",
    color: "#94a3b8",
  },
] as const;

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
  visibleTo?: LegacyTokenVisibility;
  ownerPeerId?: string | null;
  ownerGuestName?: string | null;
  imageUrl?: string | null;
  statusEffects?: string[];
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
  timestamp: number;
}

export interface PingPayload {
  type: "PING";
  x: number;
  y: number;
  peerId: string;
  color: string;
  timestamp: number;
}

export interface MeasurementPayload {
  type: "MEASUREMENT";
  active: boolean;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  peerId: string;
}

export interface MapMeasurementPayload {
  type: "MAP_MEASUREMENT";
  mapId: string;
  active: boolean;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  peerId: string;
}

export interface ShowTokenImagePayload {
  type: "SHOW_TOKEN_IMAGE";
  title: string;
  imagePath: string;
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

export interface ChatClearPayload {
  type: "CHAT_CLEAR";
  timestamp: number;
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
  | MeasurementPayload
  | MapMeasurementPayload
  | TokenAddRequestPayload
  | TokenMovePayload
  | TokenRemoveRequestPayload
  | TokenSelectPayload
  | SessionSavePayload
  | SessionEndedPayload
  | SetGridSettingsPayload
  | ChatClearPayload
  | ChatMessagePayload
  | ShowTokenImagePayload;
