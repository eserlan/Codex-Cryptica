import type { Point } from "schema";
import { normalizeSpatialImageTransform } from "@codex/spatial-engine";

export type SessionMode = "exploration" | "combat";
export type TokenVisibility = "all" | "gm-only";
export type LegacyTokenVisibility = TokenVisibility | "owner-only";
export type TokenBaseShape = "circle" | "square";
/** Which part of the source image to keep in view when its aspect ratio doesn't match the token's shape. */
export type TokenImageFocus = "center" | "top" | "bottom" | "left" | "right";

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
  baseShape?: TokenBaseShape;
  facingIndicator?: boolean;
  zIndex: number;
  ownerPeerId: string | null;
  ownerGuestName: string | null;
  visibleTo: TokenVisibility;
  color: string;
  imageUrl: string | null;
  imageFocus?: TokenImageFocus;
  statusEffects: string[];
  locked?: boolean;
  isVisionSource?: boolean;
  /** Marks an image token placed from a procedural tile deck. */
  kind?: "token" | "tile";
  tileDeckId?: string | null;
  tileDetails?: TileDetails;
}

export interface TileDetails {
  description: string;
  encounter: string;
  notes: string;
  contents: string;
}

export interface TileDeckEntry {
  id: string;
  name: string;
  imagePath: string;
  category?: string;
}

export interface TileDeck {
  id: string;
  name: string;
  /** Identifies a catalog deck that was prefetched into this local vault. */
  starterDeckId?: string;
  /** License label for a starter deck, e.g. "CC BY 4.0". Unset for user-created decks. */
  license?: string;
  /** Upstream source URL for a starter deck's license/attribution. */
  sourceUrl?: string;
  tiles: TileDeckEntry[];
  hardEdges: boolean;
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
  tileDecks?: TileDeck[];
}

export function normalizeTokenVisibility(
  visibility: LegacyTokenVisibility | undefined | null,
): TokenVisibility {
  return visibility === "gm-only" ? "gm-only" : "all";
}

const TOKEN_IMAGE_FOCUS_VALUES: readonly TokenImageFocus[] = [
  "center",
  "top",
  "bottom",
  "left",
  "right",
];

export function normalizeTokenImageFocus(
  value: unknown,
): TokenImageFocus | undefined {
  return TOKEN_IMAGE_FOCUS_VALUES.includes(value as TokenImageFocus)
    ? (value as TokenImageFocus)
    : undefined;
}

export function normalizeToken(
  token:
    | Token
    | (Omit<Token, "visibleTo" | "baseShape" | "facingIndicator"> & {
        visibleTo?: LegacyTokenVisibility;
        baseShape?: TokenBaseShape;
        facingIndicator?: boolean;
      }),
): Token {
  const transform = normalizeSpatialImageTransform(token);
  return {
    ...token,
    ...transform,
    ownerPeerId: token.ownerPeerId ?? null,
    ownerGuestName: token.ownerGuestName ?? null,
    visibleTo: normalizeTokenVisibility(token.visibleTo),
    baseShape: token.baseShape === "square" ? "square" : "circle",
    facingIndicator: token.facingIndicator === true,
    imageFocus: normalizeTokenImageFocus(token.imageFocus),
    statusEffects: [...(token.statusEffects ?? [])],
    locked: token.locked === true,
    isVisionSource: token.isVisionSource === true,
    kind: token.kind === "tile" ? "tile" : "token",
    tileDeckId: token.tileDeckId ?? null,
    tileDetails: token.tileDetails
      ? {
          description: token.tileDetails.description ?? "",
          encounter: token.tileDetails.encounter ?? "",
          notes: token.tileDetails.notes ?? "",
          contents: token.tileDetails.contents ?? "",
        }
      : undefined,
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
    tileDecks: (session.tileDecks ?? []).map((deck) => ({
      id: deck.id,
      name: deck.name,
      starterDeckId: deck.starterDeckId,
      license: deck.license,
      sourceUrl: deck.sourceUrl,
      hardEdges: deck.hardEdges === true,
      tiles: (deck.tiles ?? []).map((tile) => ({ ...tile })),
    })),
  };
}
