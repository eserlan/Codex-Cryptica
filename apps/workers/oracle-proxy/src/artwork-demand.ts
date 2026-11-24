import { getCorsHeaders, isOriginAllowed } from "./cors";
import { enforcePublishRateLimit } from "./rate-limiting";
import type { D1DatabaseLike } from "./answer-aggregates";
import type { Env } from "./env";

export const ARTWORK_DEMAND_TYPES = [
  "location",
  "npc",
  "scene",
  "atmosphere",
  "monster",
] as const;

export const ARTWORK_DEMAND_GENRES = [
  "neutral",
  "fantasy",
  "contemporary",
  "science-fiction",
  "horror",
] as const;

export type ArtworkDemandType = (typeof ARTWORK_DEMAND_TYPES)[number];
export type ArtworkDemandGenre = (typeof ARTWORK_DEMAND_GENRES)[number];

const ALLOWED_TYPES = new Set<string>(ARTWORK_DEMAND_TYPES);
const ALLOWED_GENRES = new Set<string>(ARTWORK_DEMAND_GENRES);
const KEBAB_CUE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RAW_CUE_PATTERN = /^[a-z0-9]+(?:[ -][a-z0-9]+)*$/;
const MAX_CUE_LENGTH = 32;
const MAX_ARRAY_ITEMS = 16;
const MAX_DEMOGRAPHIC_ITEMS = 8;
const MAX_ASSET_ID_LENGTH = 100;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function isWithinCueArrayLimit(raw: readonly unknown[], maxItems: number): boolean {
  return raw.length <= maxItems;
}

function isValidCueValue(normalized: string, pattern: RegExp): boolean {
  return normalized.length > 0 && normalized.length <= MAX_CUE_LENGTH && pattern.test(normalized);
}

export interface ArtworkDemandPayload {
  type: ArtworkDemandType;
  genre: ArtworkDemandGenre;
  knownCues: string[];
  unmappedCues: string[];
  demographicCues: string[];
  matchedAssetId: string | null;
}

export interface ArtworkDemandRow {
  signature: string;
  type: ArtworkDemandType;
  genre: ArtworkDemandGenre;
  known_cues: string;
  unmapped_cues: string;
  demographic_cues: string;
  matched_asset_id: string | null;
  hit_count: number;
  last_seen_at: string;
}

export interface ArtworkDemandDeps {
  now?: () => string;
}

function jsonResponse(
  request: Request,
  env: Env,
  body: unknown,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Vary: "Origin",
      ...getCorsHeaders(request.headers, env),
    },
  });
}

function sanitizeCueArray(
  raw: unknown,
  pattern: RegExp,
  maxItems: number,
): string[] | null {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) return null;
  if (!isWithinCueArrayLimit(raw, maxItems)) return null;
  const unique = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "string") return null;
    const normalized = item.trim().toLowerCase().replace(/\s+/g, " ");
    if (!isValidCueValue(normalized, pattern)) return null;
    unique.add(normalized);
    if (unique.size > maxItems) return null;
  }
  return [...unique].sort();
}

export function parseArtworkDemandPayload(
  raw: unknown,
): ArtworkDemandPayload | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;

  if (typeof record.type !== "string" || !ALLOWED_TYPES.has(record.type)) {
    return null;
  }
  if (typeof record.genre !== "string" || !ALLOWED_GENRES.has(record.genre)) {
    return null;
  }

  const knownCues = sanitizeCueArray(
    record.knownCues,
    KEBAB_CUE_PATTERN,
    MAX_ARRAY_ITEMS,
  );
  const unmappedCues = sanitizeCueArray(
    record.unmappedCues,
    RAW_CUE_PATTERN,
    MAX_ARRAY_ITEMS,
  );
  const demographicCues = sanitizeCueArray(
    record.demographicCues,
    KEBAB_CUE_PATTERN,
    MAX_DEMOGRAPHIC_ITEMS,
  );
  if (!knownCues || !unmappedCues || !demographicCues) return null;

  if (
    knownCues.length === 0 &&
    unmappedCues.length === 0 &&
    demographicCues.length === 0
  ) {
    return null;
  }

  let matchedAssetId: string | null = null;
  if (record.matchedAssetId !== undefined && record.matchedAssetId !== null) {
    if (
      typeof record.matchedAssetId !== "string" ||
      record.matchedAssetId.length === 0 ||
      record.matchedAssetId.length > MAX_ASSET_ID_LENGTH ||
      !KEBAB_CUE_PATTERN.test(record.matchedAssetId)
    ) {
      return null;
    }
    matchedAssetId = record.matchedAssetId;
  }

  return {
    type: record.type as ArtworkDemandType,
    genre: record.genre as ArtworkDemandGenre,
    knownCues,
    unmappedCues,
    demographicCues,
    matchedAssetId,
  };
}

export async function computeDemandSignature(
  payload: ArtworkDemandPayload,
): Promise<string> {
  const canonical = JSON.stringify([
    payload.type,
    payload.genre,
    payload.matchedAssetId,
    payload.knownCues,
    payload.unmappedCues,
    payload.demographicCues,
  ]);
  const bytes = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical)),
  );
  let hex = "";
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, "0");
  }
  return hex;
}

function getDb(env: Env): D1DatabaseLike | undefined {
  return (env as unknown as { ANSWER_AGGREGATES?: D1DatabaseLike })
    .ANSWER_AGGREGATES;
}

export async function handleArtworkDemandPost(
  request: Request,
  env: Env,
  deps: ArtworkDemandDeps = {},
): Promise<Response> {
  const db = getDb(env);
  if (!db) {
    return jsonResponse(request, env, { error: "Database unavailable" }, 500);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(request, env, { error: "Invalid JSON body" }, 400);
  }

  const payload = parseArtworkDemandPayload(body);
  if (!payload) {
    return jsonResponse(
      request,
      env,
      { error: "Invalid artwork demand payload" },
      400,
    );
  }

  const signature = await computeDemandSignature(payload);
  const now = (deps.now ?? (() => new Date().toISOString()))();

  await db
    .prepare(
      `INSERT INTO artwork_cue_demand (
         signature, type, genre, known_cues, unmapped_cues, demographic_cues,
         matched_asset_id, hit_count, last_seen_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
       ON CONFLICT(signature) DO UPDATE SET
         hit_count = hit_count + 1,
         last_seen_at = excluded.last_seen_at`,
    )
    .bind(
      signature,
      payload.type,
      payload.genre,
      JSON.stringify(payload.knownCues),
      JSON.stringify(payload.unmappedCues),
      JSON.stringify(payload.demographicCues),
      payload.matchedAssetId,
      now,
    )
    .run();

  return jsonResponse(request, env, { ok: true, signature }, 200);
}

function parseLimit(raw: string | null): number {
  if (!raw) return DEFAULT_LIMIT;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

function parseJsonArray(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

export async function handleArtworkDemandGet(
  request: Request,
  env: Env,
): Promise<Response> {
  const db = getDb(env);
  if (!db) {
    return jsonResponse(request, env, { error: "Database unavailable" }, 500);
  }

  const url = new URL(request.url);
  const typeParam = url.searchParams.get("type");
  const genreParam = url.searchParams.get("genre");
  const statusParam = url.searchParams.get("status") ?? "missing";
  const limit = parseLimit(url.searchParams.get("limit"));

  if (typeParam && !ALLOWED_TYPES.has(typeParam)) {
    return jsonResponse(request, env, { error: "Invalid type filter" }, 400);
  }
  if (genreParam && !ALLOWED_GENRES.has(genreParam)) {
    return jsonResponse(request, env, { error: "Invalid genre filter" }, 400);
  }
  if (!["missing", "matched", "all"].includes(statusParam)) {
    return jsonResponse(request, env, { error: "Invalid status filter" }, 400);
  }

  const conditions: string[] = [];
  const bindings: unknown[] = [];

  if (statusParam === "missing") {
    conditions.push("matched_asset_id IS NULL");
  } else if (statusParam === "matched") {
    conditions.push("matched_asset_id IS NOT NULL");
  }
  if (typeParam) {
    conditions.push("type = ?");
    bindings.push(typeParam);
  }
  if (genreParam) {
    conditions.push("genre = ?");
    bindings.push(genreParam);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const sql = `SELECT signature, type, genre, known_cues, unmapped_cues, demographic_cues, matched_asset_id, hit_count, last_seen_at
    FROM artwork_cue_demand
    ${whereClause}
    ORDER BY hit_count DESC, last_seen_at DESC
    LIMIT ?`;

  const { results } = await db
    .prepare(sql)
    .bind(...bindings, limit)
    .all<ArtworkDemandRow>();

  const unmappedCounts = new Map<string, number>();
  const items = results.map((row) => {
    const knownCues = parseJsonArray(row.known_cues);
    const unmappedCues = parseJsonArray(row.unmapped_cues);
    const demographicCues = parseJsonArray(row.demographic_cues);
    for (const cue of unmappedCues) {
      unmappedCounts.set(cue, (unmappedCounts.get(cue) ?? 0) + row.hit_count);
    }
    return {
      signature: row.signature,
      type: row.type,
      genre: row.genre,
      knownCues,
      unmappedCues,
      demographicCues,
      matchedAssetId: row.matched_asset_id,
      hitCount: row.hit_count,
      lastSeenAt: row.last_seen_at,
    };
  });

  const unmappedSummary = [...unmappedCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 30)
    .map(([cue, hitCount]) => ({ cue, hitCount }));

  return jsonResponse(
    request,
    env,
    {
      items,
      unmappedSummary,
    },
    200,
  );
}

function checkOriginAllowed(request: Request, env: Env): Response | null {
  const origin = request.headers.get("Origin");
  if (!origin || isOriginAllowed(origin, env)) return null;
  return new Response("Forbidden", {
    status: 403,
    headers: getCorsHeaders(request.headers, env),
  });
}

export async function handleArtworkDemandRoute(
  request: Request,
  env: Env,
  pathname: string,
  deps: ArtworkDemandDeps = {},
): Promise<Response | undefined> {
  if (pathname !== "/api/artwork-demand") return undefined;

  const forbidden = checkOriginAllowed(request, env);
  if (forbidden) return forbidden;

  if (request.method === "GET") {
    return handleArtworkDemandGet(request, env);
  }

  if (request.method === "POST") {
    const rateLimitResponse = await enforcePublishRateLimit(
      request,
      env,
      pathname,
    );
    if (rateLimitResponse) return rateLimitResponse;
    return handleArtworkDemandPost(request, env, deps);
  }

  return new Response("Method not allowed", {
    status: 405,
    headers: getCorsHeaders(request.headers, env),
  });
}
