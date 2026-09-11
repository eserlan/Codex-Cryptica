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
  /** If attached to a parent token (e.g. a note attached to a room tile). */
  parentTokenId?: string;
  /**
   * The size a collapsed note should spring back to. Its presence *is* the
   * collapsed state — a note is collapsed exactly when it has a size to
   * restore, so the two can never disagree. Undefined on every other kind,
   * and on an expanded note.
   */
  noteCollapsedFrom?: { width: number; height: number };
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
  searchTerms?: string[];
}

/**
 * What a deck pins on a drawn tile as it lands on the map.
 *
 * Three states rather than two: most draws — corridors, doors, junctions —
 * want nothing at all, so "none" has to stay the default and cannot be the
 * absence of a choice between the other two.
 */
export type TileDeckStockingMode = "none" | "table" | "encounter";

export interface TileDeckStocking {
  mode: TileDeckStockingMode;
  /** Id of the random table rolled when the mode is "table". */
  tableId?: string;
  /**
   * One drawn tile in `frequency` gets a note; 1 means every one of them.
   * A dungeon where every room holds something is a dungeon with no pacing,
   * so this is how a GM says "roughly a third of these rooms".
   */
  frequency?: number;
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
  /** Unset on decks saved before stocking existed, which read as "none". */
  stocking?: TileDeckStocking;
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

/** How much of the grid a collapsed note takes up, so it reads as a marker. */
export const NOTE_COLLAPSED_SCALE = 0.5;

function isNoteSize(
  value: unknown,
): value is { width: number; height: number } {
  if (!value || typeof value !== "object") return false;
  const size = value as { width?: unknown; height?: unknown };
  return (
    typeof size.width === "number" &&
    typeof size.height === "number" &&
    size.width > 0 &&
    size.height > 0
  );
}

/** True when a note is showing as a marker rather than as a page of text. */
export function isNoteCollapsed(token: Token): boolean {
  return token.kind === "note" && isNoteSize(token.noteCollapsedFrom);
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
    parentTokenId:
      typeof token.parentTokenId === "string" ? token.parentTokenId : undefined,
    noteBody: token.kind === "note" ? (token.noteBody ?? "") : undefined,
    noteCollapsedFrom:
      token.kind === "note" && isNoteSize(token.noteCollapsedFrom)
        ? { ...token.noteCollapsedFrom }
        : undefined,
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
 * Drops a stocking whose mode is unrecognised or is plainly "none", so a
 * round-tripped deck carries a setting only when there is one to carry, and a
 * table mode always keeps the table it rolls.
 */
function normalizeTileDeckStocking(
  stocking: TileDeckStocking | undefined,
): TileDeckStocking | undefined {
  const mode = stocking?.mode;
  if (mode !== "table" && mode !== "encounter") return undefined;
  return {
    mode,
    ...(mode === "table" ? { tableId: stocking?.tableId ?? undefined } : {}),
    frequency: normalizeStockingFrequency(stocking?.frequency),
  };
}

/** A frequency below 1 would stock nothing at all, which is what "none" is for. */
function normalizeStockingFrequency(frequency: number | undefined): number {
  if (typeof frequency !== "number" || !Number.isFinite(frequency)) return 1;
  return Math.max(1, Math.round(frequency));
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
      stocking: normalizeTileDeckStocking(deck.stocking),
      tiles: (deck.tiles ?? []).map((tile) => ({ ...tile })),
    })),
  };
}
