import { z } from "zod";
import { TerrainSchema, type Terrain } from "./terrain";
import {
  HexDiscoveryDraftSchema,
  type HexDiscoveryDraft,
} from "./discovery/draft";

export type { Terrain } from "./terrain";

/** Axial coordinate, as used by map-engine and MapPin.hexCoordinates. */
export interface HexCoord {
  q: number;
  r: number;
}

/** "q,r" key for a hex. Keys are the only way hex records are addressed. */
export type HexKey = string;

export const NOTES_MAX_LENGTH = 20_000;

export interface HexRecord {
  terrain?: Terrain;
  /** GM-only notes. Discovery never writes here (FR-027). */
  notes?: string;
  /** AI-drafted notes, kept separate from notes and clearly marked. */
  aiNotes?: string;
  explored?: boolean;
  exploredAt?: number;
  draft?: HexDiscoveryDraft;
  updatedAt: number;
}

export interface HexCrawlState {
  enabled: boolean;
  hexes: Record<HexKey, HexRecord>;
}

const HEX_KEY = /^(-?\d+),(-?\d+)$/;

export function toHexKey(hex: HexCoord): HexKey {
  return `${hex.q},${hex.r}`;
}

export function parseHexKey(key: string): HexCoord | null {
  const match = HEX_KEY.exec(key);
  if (!match) return null;
  return { q: Number(match[1]), r: Number(match[2]) };
}

const NotesSchema = z
  .string()
  .transform((value) => value.slice(0, NOTES_MAX_LENGTH));

export const HexRecordSchema = z.object({
  terrain: TerrainSchema.optional(),
  notes: NotesSchema.optional(),
  aiNotes: NotesSchema.optional(),
  explored: z.boolean().optional(),
  exploredAt: z.number().optional(),
  draft: HexDiscoveryDraftSchema.optional(),
  /** Missing timestamps read as 0, so older or hand-edited data is still usable. */
  updatedAt: z.number().optional(),
});

function emptyState(): HexCrawlState {
  return { enabled: false, hexes: {} };
}

/**
 * Read stored hex crawl data defensively (research D2). Never throws. Invalid
 * keys and records are dropped, and records that no longer meet the existence
 * rule are removed.
 */
export function normalizeHexCrawlState(raw: unknown): HexCrawlState {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    return emptyState();
  const input = raw as Record<string, unknown>;
  const rawHexes = input.hexes;
  const state: HexCrawlState = {
    enabled: input.enabled === true,
    hexes: {},
  };
  if (!rawHexes || typeof rawHexes !== "object" || Array.isArray(rawHexes)) {
    return state;
  }

  for (const [key, value] of Object.entries(rawHexes)) {
    const hex = parseHexKey(key);
    if (!hex) continue;
    const parsed = HexRecordSchema.safeParse(value);
    if (!parsed.success) continue;
    const pruned = pruneHexRecord({
      ...parsed.data,
      updatedAt: parsed.data.updatedAt ?? 0,
    });
    if (pruned) state.hexes[toHexKey(hex)] = pruned;
  }
  return state;
}

export function getHexRecord(
  state: HexCrawlState | undefined,
  hex: HexCoord,
): HexRecord | undefined {
  return state?.hexes[toHexKey(hex)];
}

/**
 * A record is kept only while it holds something (FR-011): terrain, notes,
 * AI notes, an explored flag or a pending draft. Returns null otherwise.
 */
export function pruneHexRecord(record: HexRecord): HexRecord | null {
  const keep =
    record.terrain !== undefined ||
    (record.notes ?? "").length > 0 ||
    (record.aiNotes ?? "").length > 0 ||
    record.explored === true ||
    record.draft !== undefined;
  return keep ? record : null;
}

/**
 * Apply a patch to one hex and return a new state. The input is not mutated.
 * `exploredAt` is set when a hex first becomes explored, and cleared when it is
 * marked unexplored (FR-016, FR-017).
 */
export function upsertHexRecord(
  state: HexCrawlState,
  hex: HexCoord,
  patch: Partial<HexRecord>,
  now: number,
): HexCrawlState {
  const key = toHexKey(hex);
  const current = state.hexes[key];
  const merged: HexRecord = { ...current, ...patch, updatedAt: now };

  if (patch.explored === true) {
    if (!current?.explored) merged.exploredAt = now;
  } else if (patch.explored === false) {
    delete merged.exploredAt;
  }

  const hexes = { ...state.hexes };
  const pruned = pruneHexRecord(merged);
  if (pruned) hexes[key] = pruned;
  else delete hexes[key];
  return { ...state, hexes };
}

export function countHexRecords(state: HexCrawlState | undefined): number {
  return Object.keys(state?.hexes ?? {}).length;
}
