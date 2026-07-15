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

export function normalizeTokenVisibility(
  visibility: LegacyTokenVisibility | undefined | null,
): TokenVisibility {
  return visibility === "gm-only" ? "gm-only" : "all";
}

export function normalizeToken(
  token:
    Token | (Omit<Token, "visibleTo"> & { visibleTo?: LegacyTokenVisibility }),
): Token {
  return {
    ...token,
    ownerPeerId: token.ownerPeerId ?? null,
    ownerGuestName: token.ownerGuestName ?? null,
    visibleTo: normalizeTokenVisibility(token.visibleTo),
    statusEffects: [...(token.statusEffects ?? [])],
  };
}

export function cloneMeasurement(
  measurement: MeasurementState,
): MeasurementState {
  return {
    ...measurement,
    start: measurement.start ? { ...measurement.start } : null,
    end: measurement.end ? { ...measurement.end } : null,
  };
}

/**
 * Returns an independent, internally consistent VTT session without mutating the
 * persisted input. Browser state and transport concerns remain outside this API.
 */
export function normalizeEncounterSession(
  session: EncounterSession,
): EncounterSession {
  const tokens: Record<string, Token> = {};
  for (const [id, token] of Object.entries(session.tokens ?? {})) {
    tokens[id] = normalizeToken(token);
  }

  const initiativeOrder = [...(session.initiativeOrder ?? [])];
  const maxTurnIndex = Math.max(0, initiativeOrder.length - 1);
  const selection =
    session.selection && tokens[session.selection] ? session.selection : null;

  return {
    ...session,
    tokens,
    initiativeOrder,
    initiativeValues: { ...(session.initiativeValues ?? {}) },
    turnIndex: Math.min(Math.max(0, session.turnIndex), maxTurnIndex),
    selection,
    lastPing: session.lastPing ? { ...session.lastPing } : null,
    measurement: cloneMeasurement(session.measurement),
    chatMessages: (session.chatMessages ?? []).map((message) => ({
      ...message,
      ...(message.roll
        ? {
            roll: {
              ...message.roll,
              parts: message.roll.parts.map((part) => ({
                ...part,
                ...(part.rolls ? { rolls: [...part.rolls] } : {}),
                ...(part.dropped ? { dropped: [...part.dropped] } : {}),
              })),
            },
          }
        : {}),
    })),
  };
}
