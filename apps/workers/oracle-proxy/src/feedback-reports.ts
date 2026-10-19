import {
  // The worker reaches the shared engine by workspace path, as the other worker
  // modules reach packages/schema. The engine stays framework-free.
  // fallow-ignore-next-line boundary-violation
  FEEDBACK_ERROR_MESSAGES,
  FEEDBACK_MAX_BODY_BYTES,
  FeedbackReportInputSchema,
  createReference,
  emitFeedbackMetric,
  normaliseText,
  redactSecrets,
  renderTriageIssue,
  type FeedbackErrorCode,
  type FeedbackKind,
  type FeedbackOutcome,
  type FeedbackRecord,
  type ParsedFeedbackReport,
} from "feedback-engine";
import { getCorsHeaders, isOriginAllowed, type CorsEnv } from "./cors";
import { hmacHex } from "./hmac";
import { releaseQuota, reserveQuota } from "./r2-quota";
import { readJson } from "./template-directory-shared";

/** Reports one source may send per hour and per day (FR-016). */
export const HOURLY_REPORT_LIMIT = 5;
export const DAILY_REPORT_LIMIT = 20;
/** A pending submission older than this is treated as abandoned (R5). */
const PENDING_STALE_MS = 2 * 60 * 1000;
const GITHUB_REPO = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

export interface RateLimiterLike {
  limit: (options: { key: string }) => Promise<{ success: boolean }>;
}

export interface FeedbackEnv extends CorsEnv {
  BUCKET?: any;
  FEEDBACK_GITHUB_TOKEN?: string;
  FEEDBACK_GITHUB_REPO?: string;
  FEEDBACK_HASH_KEY?: string;
  FEEDBACK_RATE_LIMITER?: RateLimiterLike;
}

export interface FeedbackDeps {
  fetch: typeof fetch;
  now: () => number;
  random: (length: number) => Uint8Array;
  log: (line: string) => void;
  timeoutMs: number;
}

export const defaultFeedbackDeps: FeedbackDeps = {
  fetch: (...args) => fetch(...args),
  now: () => Date.now(),
  random: (length) => crypto.getRandomValues(new Uint8Array(length)),
  log: (line) => console.log(line),
  timeoutMs: 8000,
};

/** Everything a request needs once its configuration is known to be present. */
interface Ctx {
  request: Request;
  env: FeedbackEnv;
  deps: FeedbackDeps;
}

interface Config {
  bucket: any;
  token: string;
  repo: string;
  hashKey: string;
}

interface Admitted {
  config: Config;
  markerKey: string;
  quotaKeys: { hour: string; day: string };
}

interface Parsed {
  input: ParsedFeedbackReport;
  description: string;
}

const STATUS: Record<FeedbackErrorCode, number> = {
  invalid: 400,
  forbidden_origin: 403,
  rate_limited: 429,
  in_progress: 409,
  unavailable: 503,
  misconfigured: 503,
};

function respond(
  ctx: Ctx,
  status: number,
  body: unknown,
  extra: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...getCorsHeaders(ctx.request.headers, ctx.env),
      ...extra,
    },
  });
}

function failure(
  ctx: Ctx,
  code: FeedbackErrorCode,
  extra: Record<string, string> = {},
) {
  return respond(
    ctx,
    STATUS[code],
    { error: { code, message: FEEDBACK_ERROR_MESSAGES[code] } },
    extra,
  );
}

function report(ctx: Ctx, outcome: FeedbackOutcome, kind?: FeedbackKind) {
  emitFeedbackMetric({ outcome, kind }, ctx.deps.log);
}

function limited(ctx: Ctx, kind: FeedbackKind, retryAfter: string) {
  report(ctx, "limited", kind);
  return failure(ctx, "rate_limited", { "Retry-After": retryAfter });
}

/** Reads no more than the configured body limit, including chunked requests. */
async function readBoundedBody(request: Request): Promise<string | null> {
  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > FEEDBACK_MAX_BODY_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const raw = new TextDecoder().decode(bytes);
  return raw;
}

/** Reads the body. Returns null for any request that is not a valid, bounded v1 report. */
async function readInput(
  request: Request,
): Promise<ParsedFeedbackReport | null> {
  if (
    !request.headers
      .get("Content-Type")
      ?.toLowerCase()
      .startsWith("application/json")
  )
    return null;
  const declared = Number(request.headers.get("Content-Length"));
  if (Number.isFinite(declared) && declared > FEEDBACK_MAX_BODY_BYTES)
    return null;
  const raw = await readBoundedBody(request);
  if (raw === null) return null;
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  const parsed = FeedbackReportInputSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

/** Steps 1–3: origin, then the body, then the content. */
async function parseRequest(ctx: Ctx): Promise<Response | Parsed> {
  if (!isOriginAllowed(ctx.request.headers.get("Origin") ?? "", ctx.env)) {
    report(ctx, "rejected");
    return failure(ctx, "forbidden_origin");
  }
  const input = await readInput(ctx.request);
  if (!input) {
    report(ctx, "rejected");
    return failure(ctx, "invalid");
  }
  const description = redactSecrets(normaliseText(input.description));
  if (!description) {
    report(ctx, "rejected", input.kind);
    return failure(ctx, "invalid");
  }
  return { input, description };
}

/** Step 4: configuration. Missing settings fail closed, never as a success. */
function configOrFail(ctx: Ctx, kind: FeedbackKind): Response | Config {
  const { env } = ctx;
  const repo = env.FEEDBACK_GITHUB_REPO ?? "";
  if (
    !env.BUCKET ||
    !env.FEEDBACK_GITHUB_TOKEN ||
    !env.FEEDBACK_HASH_KEY ||
    !GITHUB_REPO.test(repo)
  ) {
    report(ctx, "misconfigured", kind);
    return failure(ctx, "misconfigured");
  }
  return {
    bucket: env.BUCKET,
    token: env.FEEDBACK_GITHUB_TOKEN,
    repo,
    hashKey: env.FEEDBACK_HASH_KEY,
  };
}

/**
 * Claims the submission marker. It holds no report content: only the state and,
 * once delivered, the reference, so a retry gets the same reference back.
 */
async function claimSubmission(
  bucket: any,
  key: string,
  now: number,
): Promise<
  | { state: "claimed" }
  | { state: "delivered"; reference: string }
  | { state: "in_progress" }
> {
  const existing = await bucket.get(key);
  const pending = JSON.stringify({ state: "pending", at: now });
  const options = { httpMetadata: { contentType: "application/json" } };
  if (!existing) {
    const created = await bucket.put(key, pending, {
      ...options,
      onlyIf: { etagDoesNotMatch: "*" },
    });
    return created === null ? { state: "in_progress" } : { state: "claimed" };
  }

  const stored = await readMarker(existing);
  if (stored.state === "delivered" && typeof stored.reference === "string") {
    return { state: "delivered", reference: stored.reference };
  }
  if (
    stored.state === "pending" &&
    Number(stored.at) > now - PENDING_STALE_MS
  ) {
    return { state: "in_progress" };
  }
  const reclaimed = await bucket.put(key, pending, {
    ...options,
    onlyIf: { etagMatches: existing.etag },
  });
  return reclaimed === null ? { state: "in_progress" } : { state: "claimed" };
}

/** An unreadable marker counts as abandoned, so it is re-claimed rather than blocking the user. */
async function readMarker(
  object: any,
): Promise<{ state?: unknown; at?: unknown; reference?: unknown }> {
  try {
    return (await readJson(object)) as {
      state?: unknown;
      at?: unknown;
      reference?: unknown;
    };
  } catch {
    return {};
  }
}

/** Hour and day buckets in UTC, so a counter resets on the hour and the day. */
function quotaKeys(source: string, now: number) {
  const iso = new Date(now).toISOString();
  return {
    hour: `feedback/quota/hour/${iso.slice(0, 13).replace(/[-T]/g, "")}/${source}`,
    day: `feedback/quota/day/${iso.slice(0, 10).replace(/-/g, "")}/${source}`,
  };
}

async function deleteMarker(bucket: any, key: string) {
  await bucket.delete(key).catch(() => undefined);
}

/** Steps 5–8: the burst limit, the submission marker, then the hour and day quotas. */
async function admit(
  ctx: Ctx,
  parsed: Parsed,
  config: Config,
): Promise<Response | Admitted> {
  const { input } = parsed;
  const source = await hmacHex(
    config.hashKey,
    ctx.request.headers.get("CF-Connecting-IP") || "anonymous",
  );
  const limiter = ctx.env.FEEDBACK_RATE_LIMITER;
  if (limiter && !(await limiter.limit({ key: source })).success) {
    return limited(ctx, input.kind, "60");
  }

  const markerKey = `feedback/submission/${await hmacHex(config.hashKey, input.submissionId)}`;
  const claim = await claimSubmission(config.bucket, markerKey, ctx.deps.now());
  if (claim.state === "delivered")
    return respond(ctx, 200, { reference: claim.reference });
  if (claim.state === "in_progress")
    return failure(ctx, "in_progress", { "Retry-After": "2" });

  const keys = quotaKeys(source, ctx.deps.now());
  const refused = await reserveQuotas(ctx, config, markerKey, keys, input.kind);
  return refused ?? { config, markerKey, quotaKeys: keys };
}

/** Reserves the hour and day slots. A refusal gives back what was taken and clears the marker. */
async function reserveQuotas(
  ctx: Ctx,
  config: Config,
  markerKey: string,
  keys: { hour: string; day: string },
  kind: FeedbackKind,
): Promise<Response | null> {
  const { bucket } = config;
  if ((await reserveQuota(bucket, keys.hour, HOURLY_REPORT_LIMIT)) === "full") {
    await deleteMarker(bucket, markerKey);
    return limited(ctx, kind, "3600");
  }
  if ((await reserveQuota(bucket, keys.day, DAILY_REPORT_LIMIT)) === "full") {
    await releaseQuota(bucket, keys.hour);
    await deleteMarker(bucket, markerKey);
    return limited(ctx, kind, "3600");
  }
  return null;
}

async function createIssue(
  ctx: Ctx,
  config: Config,
  issue: { title: string; body: string; labels: string[] },
): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ctx.deps.timeoutMs);
  try {
    const response = await ctx.deps.fetch(
      `https://api.github.com/repos/${config.repo}/issues`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
          "User-Agent": "codex-cryptica-feedback",
        },
        body: JSON.stringify(issue),
        signal: controller.signal,
      },
    );
    // The upstream status and body are deliberately not logged or returned (FR-018).
    if (!response.ok) throw new Refused();
  } catch (error) {
    // A refusal is definite. Anything else (a timeout or a dropped connection)
    // may still have created the issue, so it must not be treated as a failure.
    if (error instanceof Refused) throw error;
    throw new Ambiguous();
  } finally {
    clearTimeout(timer);
  }
}

/** GitHub answered and refused the report: nothing was created. */
class Refused extends Error {}
/** No answer from GitHub: the issue may exist, so the submission is kept as pending. */
class Ambiguous extends Error {}

/** Step 9: deliver to the private repository. A failure gives back the quota and clears the marker. */
async function deliver(
  ctx: Ctx,
  parsed: Parsed,
  admitted: Admitted,
): Promise<Response> {
  const { input, description } = parsed;
  const { config, markerKey, quotaKeys: keys } = admitted;
  const record: FeedbackRecord = {
    reference: createReference(ctx.deps.random),
    kind: input.kind,
    receivedAt: new Date(ctx.deps.now()).toISOString(),
    description,
    contactEmail: input.contactEmail,
    meta: input.meta,
  };

  try {
    await createIssue(ctx, config, renderTriageIssue(record));
  } catch (error) {
    // A definite refusal gives back the quota and clears the marker, so the user
    // can retry at once. An ambiguous outcome keeps both: the marker stays pending
    // for the stale window, so a quick retry gets "in progress" rather than a
    // second issue. See docs/feedback-triage.md.
    if (error instanceof Refused) {
      await releaseQuota(config.bucket, keys.day);
      await releaseQuota(config.bucket, keys.hour);
      await deleteMarker(config.bucket, markerKey);
    }
    report(ctx, "unavailable", input.kind);
    return failure(ctx, "unavailable");
  }

  // The issue exists, so the reference is true even if this write fails. The
  // marker only guards against a duplicate retry; its failure is logged without
  // any content, and the user still gets the reference.
  await config.bucket
    .put(
      markerKey,
      JSON.stringify({ state: "delivered", reference: record.reference }),
      {
        httpMetadata: { contentType: "application/json" },
      },
    )
    .catch(() =>
      ctx.deps.log(
        JSON.stringify({
          event: "feedback.report",
          outcome: "marker-write-failed",
        }),
      ),
    );
  report(ctx, "accepted", input.kind);
  return respond(ctx, 201, { reference: record.reference });
}

/**
 * POST /api/feedback/reports. Each step stops the request on failure, and the
 * order is part of the contract (contracts/feedback-report-api.md).
 */
export async function handleFeedbackReport(
  request: Request,
  env: FeedbackEnv,
  deps: FeedbackDeps = defaultFeedbackDeps,
): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: getCorsHeaders(request.headers, env),
    });
  }
  const ctx: Ctx = { request, env, deps };

  const parsed = await parseRequest(ctx);
  if (parsed instanceof Response) return parsed;

  const config = configOrFail(ctx, parsed.input.kind);
  if (config instanceof Response) return config;

  const admitted = await admit(ctx, parsed, config);
  if (admitted instanceof Response) return admitted;

  return deliver(ctx, parsed, admitted);
}
