import type { ImageFocus, Point } from "schema";
import { normalizeImageFocus } from "schema";
import { normalizeSpatialImageTransform } from "@codex/spatial-engine";
import { normalizeMapLayer, type MapLayer } from "./layers";

export type SessionMode = "exploration" | "combat";
export type TokenVisibility = "all" | "gm-only";
export type LegacyTokenVisibility = TokenVisibility | "owner-only";
export type TokenBaseShape = "circle" | "square";
/** What a map element *is*: a combatant, a piece of terrain art, or a GM note
 * pinned to a spot on the map. Governs defaults and how it renders, not which
 * layer it sits on (see `MapLayer`). */
export type TokenKind = "token" | "tile" | "note";
/** Which part of the source image to keep in view when its aspect ratio doesn't match the token's shape — shared with an entity's own `imageFocus` (schema). */
export type TokenImageFocus = ImageFocus;

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
  /** Marks an image token placed from a procedural tile deck, or a pinned note. */
  kind?: TokenKind;
  tileDeckId?: string | null;
  tileDetails?: TileDetails;
  /** Freeform body text for `kind: "note"`. Undefined on every other kind. */
  noteBody?: string;
  /** Which map layer this element belongs to; governs render order,
   * visibility, and lock. Independent of `kind` — a tile-deck tile can live
   * on the object layer, not just terrain. */
  layer?: MapLayer;
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

export interface ChatCardPayload {
  deckName?: string;
  title: string;
  body?: string;
  imagePath?: string;
  reversed?: boolean;
  position?: string;
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
  cards?: ChatCardPayload[];
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

export function normalizeTokenKind(kind: unknown): TokenKind {
  return kind === "tile" || kind === "note" ? kind : "token";
}

export function normalizeTokenVisibility(
  visibility: LegacyTokenVisibility | undefined | null,
): TokenVisibility {
  return visibility === "gm-only" ? "gm-only" : "all";
}

export const normalizeTokenImageFocus = normalizeImageFocus;

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
    kind: normalizeTokenKind(token.kind),
    layer: normalizeMapLayer(token.layer, token.kind),
    tileDeckId: token.tileDeckId ?? null,
    noteBody: token.kind === "note" ? (token.noteBody ?? "") : undefined,
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

/**
 * Strips the body of a GM-only note.
 *
 * Token visibility is enforced where tokens are drawn, not where they are
 * sent — a hidden token still reaches every guest, because all a player could
 * learn from it is that something is there. A note is different: its body *is*
 * the secret, so a player could read the encounter behind the door straight
 * out of their own session state. Bodies therefore leave the host only once
 * the note is visible to players.
 */
export function redactGmOnlyNote<T extends Token>(token: T): T {
  if (token.kind !== "note" || token.visibleTo !== "gm-only") return token;
  if (!token.noteBody) return token;
  return { ...token, noteBody: "" };
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
