/**
 * Anonymous community usefulness aggregates for public answer articles
 * (spec 164, extending #3048).
 *
 * One row per answer slug holds community `yes`/`no` counters. By design
 * there is nowhere to store voter identity, IP, user agent, or reason text:
 * writes carry only `{ slug, value, previous? }` and the `views` column is
 * reserved (always 0) until the deferred view-ping follow-up.
 *
 * Thresholds are server-side constants: only slugs with `yes >=
 * MIN_PUBLIC_YES` ever appear in a public response, so tiny samples can
 * never leak as misleading social proof.
 */

export const MIN_PUBLIC_YES = 10;
export const DEFAULT_TOP_LIMIT = 6;
export const MAX_TOP_LIMIT = 10;
export const MAX_BY_SLUGS = 10;

const PUBLIC_CACHE_CONTROL = "public, max-age=300";
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_SLUG_LENGTH = 120;

export type VoteValue = "yes" | "no";

export interface AggregateRow {
  slug: string;
  yes: number;
  no: number;
}

export interface AggregateItem {
  slug: string;
  yes: number;
}

export interface D1StatementLike {
  bind(...values: unknown[]): {
    all<T>(): Promise<{ results: T[] }>;
    run(): Promise<unknown>;
  };
}

export interface D1DatabaseLike {
  prepare(query: string): D1StatementLike;
}

export interface AnswerAggregateEnv {
  ANSWER_AGGREGATES?: D1DatabaseLike;
}

export interface AnswerAggregateDeps {
  /** Registry allowlist. Defaults to allow-all (tests/dev only) — production
   * always passes the generated answer-slug set (see answer-slugs.ts). */
  isKnownSlug?: (slug: string) => boolean;
  now?: () => string;
}

/** yes-ratio for ordering tie-breaks. */
export function helpfulnessRatio(yes: number, no: number): number {
  const total = yes + no;
  return total <= 0 ? 0 : yes / total;
}

/** Deterministic helpfulness order: yes DESC, ratio DESC, slug ASC. */
export function compareAggregates(
  left: Pick<AggregateRow, "slug" | "yes" | "no">,
  right: Pick<AggregateRow, "slug" | "yes" | "no">,
): number {
  if (left.yes !== right.yes) return right.yes - left.yes;
  const ratio =
    helpfulnessRatio(right.yes, right.no) - helpfulnessRatio(left.yes, left.no);
  if (ratio !== 0) return ratio;
  return left.slug < right.slug ? -1 : left.slug > right.slug ? 1 : 0;
}

function writeJson(request: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Access-Control-Allow-Origin": request.headers.get("Origin") || "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Content-Type": "application/json",
    },
  });
}

function readJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
      "Cache-Control": PUBLIC_CACHE_CONTROL,
    },
  });
}

function toItem(row: AggregateRow): AggregateItem {
  return { slug: row.slug, yes: row.yes };
}

function isVoteValue(value: unknown): value is VoteValue {
  return value === "yes" || value === "no";
}

function isWellFormedSlug(slug: unknown): slug is string {
  return (
    typeof slug === "string" &&
    slug.length > 0 &&
    slug.length <= MAX_SLUG_LENGTH &&
    SLUG_PATTERN.test(slug)
  );
}

/** POST /api/answer-aggregates/vote — records one anonymous vote. */
export async function handleVote(
  request: Request,
  env: AnswerAggregateEnv,
  deps: AnswerAggregateDeps = {},
): Promise<Response> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return writeJson(request, { error: "invalid_request" }, 400);
  }
  const { slug, value, previous } = payload as {
    slug?: unknown;
    value?: unknown;
    previous?: unknown;
  };
  if (!isWellFormedSlug(slug) || !isVoteValue(value)) {
    return writeJson(request, { error: "invalid_request" }, 400);
  }
  const isKnownSlug = deps.isKnownSlug ?? (() => true);
  if (!isKnownSlug(slug)) {
    return writeJson(request, { error: "unknown_slug" }, 404);
  }
  const db = env.ANSWER_AGGREGATES;
  if (!db) {
    return writeJson(
      request,
      { error: { message: "Aggregate storage is not configured" } },
      500,
    );
  }

  // A repeat of the current value is a no-op (retry-safe, never double-counts).
  if (previous === value) {
    return writeJson(request, { ok: true, moved: false });
  }
  const moveFrom: VoteValue | null = isVoteValue(previous) ? previous : null;

  const incYes = value === "yes" ? 1 : 0;
  const incNo = value === "no" ? 1 : 0;
  const decYes = moveFrom === "yes" ? 1 : 0;
  const decNo = moveFrom === "no" ? 1 : 0;
  const updatedAt = deps.now?.() ?? new Date().toISOString();

  try {
    await db
      .prepare(
        `INSERT INTO answer_aggregates (slug, yes, no, views, updated_at)
         VALUES (?1, ?2, ?3, 0, ?4)
         ON CONFLICT(slug) DO UPDATE SET
           yes = max(answer_aggregates.yes + ?2 - ?5, 0),
           no = max(answer_aggregates.no + ?3 - ?6, 0),
           updated_at = ?4`,
      )
      .bind(slug, incYes, incNo, updatedAt, decYes, decNo)
      .run();
  } catch {
    return writeJson(
      request,
      { error: { message: "Aggregate storage is unavailable" } },
      500,
    );
  }

  return writeJson(request, { ok: true, moved: moveFrom !== null });
}

/** GET /api/answer-aggregates/top — public above-threshold ranking. */
export async function handleTop(
  request: Request,
  env: AnswerAggregateEnv,
): Promise<Response> {
  const db = env.ANSWER_AGGREGATES;
  if (!db) {
    return readJson(
      { error: { message: "Aggregate storage is not configured" } },
      500,
    );
  }
  const raw = new URL(request.url).searchParams.get("limit");
  const parsed = raw === null ? DEFAULT_TOP_LIMIT : Number.parseInt(raw, 10);
  const limit = Number.isFinite(parsed)
    ? Math.min(Math.max(Math.floor(parsed), 1), MAX_TOP_LIMIT)
    : DEFAULT_TOP_LIMIT;

  let results: AggregateRow[];
  try {
    const query = await db
      .prepare("SELECT slug, yes, no FROM answer_aggregates WHERE yes >= ?1")
      .bind(MIN_PUBLIC_YES)
      .all<AggregateRow>();
    results = query.results;
  } catch {
    return readJson(
      { error: { message: "Aggregate storage is unavailable" } },
      500,
    );
  }

  return readJson({
    items: [...results].sort(compareAggregates).slice(0, limit).map(toItem),
  });
}

/** GET /api/answer-aggregates/by-slugs — batched per-article counts. */
export async function handleBySlugs(
  request: Request,
  env: AnswerAggregateEnv,
): Promise<Response> {
  const raw = new URL(request.url).searchParams.get("slugs") ?? "";
  const slugs = [
    ...new Set(
      raw
        .split(",")
        .map((slug) => slug.trim())
        .filter((slug) => slug.length > 0 && isWellFormedSlug(slug)),
    ),
  ].slice(0, MAX_BY_SLUGS);
  if (slugs.length === 0) return readJson({ items: [] });

  const db = env.ANSWER_AGGREGATES;
  if (!db) {
    return readJson(
      { error: { message: "Aggregate storage is not configured" } },
      500,
    );
  }
  const placeholders = slugs.map(() => "?").join(",");
  let results: AggregateRow[];
  try {
    const query = await db
      .prepare(
        `SELECT slug, yes FROM answer_aggregates WHERE slug IN (${placeholders}) AND yes >= ?`,
      )
      .bind(...slugs, MIN_PUBLIC_YES)
      .all<AggregateRow>();
    results = query.results;
  } catch {
    return readJson(
      { error: { message: "Aggregate storage is unavailable" } },
      500,
    );
  }

  return readJson({ items: results.map(toItem) });
}
