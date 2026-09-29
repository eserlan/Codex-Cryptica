import {
  EntityTemplateReportInputSchema,
  EntityTemplateReportRecordSchema,
} from "../../../../packages/schema/src/entity-template-listing";
import { readEntityListing } from "./entity-template-directory";
import { readSuspensionMarker } from "./suspension";
import {
  bucketMissing,
  fail,
  json,
  operatorAuthError,
  readJson,
  type TemplateDirectoryEnv,
} from "./template-directory-shared";

interface ReportEnv extends TemplateDirectoryEnv {
  /** Keys the hash of a reporter's address. Reporting is off without it. */
  TEMPLATE_REPORT_HASH_KEY?: string;
  /** Per-minute cap by address hash. The daily quota below always applies. */
  TEMPLATE_REPORT_RATE_LIMITER?: {
    limit: (options: { key: string }) => Promise<{ success: boolean }>;
  };
}

/** Reports one address may send in a day, across all listings. */
export const DAILY_REPORT_LIMIT = 20;

const REPORTS = "moderation/template-reports/";
const DEDUPE = "moderation/template-report-index/";
const QUOTA = "moderation/template-report-quota/";

async function hashAddress(key: string, address: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    new TextEncoder().encode(address),
  );
  return [...new Uint8Array(signature)]
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const rateLimited = (request: Request) =>
  fail(
    request,
    "Too many reports. Please try again later.",
    429,
    "rate_limited",
  );

const alreadyReported = (request: Request) =>
  fail(request, "You've already reported this.", 409, "already_reported");

/** Reports this address has sent today. An unreadable counter counts as zero. */
async function reportsSentToday(env: ReportEnv, quotaKey: string) {
  const object = await env.BUCKET.get(quotaKey);
  if (!object) return 0;
  try {
    const stored = (await readJson(object)) as { count?: unknown };
    return Number(stored.count) || 0;
  } catch {
    return 0;
  }
}

/** Stores the report, its de-duplication marker and the day's count. */
async function recordReport(
  env: ReportEnv,
  input: { listingId: string; reason: string; details?: string },
  keys: { dedupe: string; quota: string; used: number },
): Promise<"stored" | "duplicate"> {
  // Claim the marker first so two simultaneous reports cannot both count.
  const claimed = await env.BUCKET.put(keys.dedupe, "", {
    httpMetadata: { contentType: "text/plain" },
    onlyIf: { etagDoesNotMatch: "*" },
  });
  if (claimed === null) return "duplicate";

  const reportId = crypto.randomUUID();
  const record = EntityTemplateReportRecordSchema.parse({
    schemaVersion: 1,
    reportId,
    listingId: input.listingId,
    reason: input.reason,
    ...(input.details ? { details: input.details } : {}),
    receivedAt: new Date().toISOString(),
  });
  const jsonMeta = { httpMetadata: { contentType: "application/json" } };
  await env.BUCKET.put(
    `${REPORTS}${input.listingId}/${reportId}.json`,
    JSON.stringify(record),
    jsonMeta,
  );
  await env.BUCKET.put(
    keys.quota,
    JSON.stringify({ count: keys.used + 1 }),
    jsonMeta,
  );
  return "stored";
}

/** `null` when the id is not an entity listing (fall through). */
export async function handleReportEntityTemplateListing(
  request: Request,
  env: ReportEnv,
  listingId: string,
): Promise<Response | null> {
  if (!env.BUCKET) return bucketMissing(request);
  const listing = await readEntityListing(env, listingId);
  if (listing === undefined) return null;
  if (
    !listing ||
    listing.status !== "active" ||
    (await readSuspensionMarker(env, listingId))
  ) {
    return fail(request, "Template listing not found", 404);
  }
  if (!env.TEMPLATE_REPORT_HASH_KEY) {
    return fail(
      request,
      "Reporting isn't available right now.",
      503,
      "reporting_unavailable",
    );
  }

  const parsed = EntityTemplateReportInputSchema.safeParse(
    await request.json().catch(() => undefined),
  );
  if (!parsed.success) {
    return fail(request, "Choose a reason for the report.", 400, "validation");
  }

  const reporter = await hashAddress(
    env.TEMPLATE_REPORT_HASH_KEY,
    request.headers.get("CF-Connecting-IP") || "anonymous",
  );
  const dedupe = `${DEDUPE}${listingId}/${reporter}`;
  if (await env.BUCKET.head(dedupe)) return alreadyReported(request);

  const limited = await env.TEMPLATE_REPORT_RATE_LIMITER?.limit({
    key: reporter,
  });
  if (limited && !limited.success) return rateLimited(request);

  const quota = `${QUOTA}${reporter}/${new Date().toISOString().slice(0, 10)}`;
  const used = await reportsSentToday(env, quota);
  if (used >= DAILY_REPORT_LIMIT) return rateLimited(request);

  const outcome = await recordReport(
    env,
    { listingId, ...parsed.data },
    { dedupe, quota, used },
  );
  return outcome === "duplicate"
    ? alreadyReported(request)
    : json(request, { success: true }, 201);
}

type ReportSummary = {
  reportId: string;
  reason: string;
  details?: string;
  receivedAt: string;
};

/** One stored report without anything that identifies the reporter. */
async function readReport(
  env: ReportEnv,
  key: string,
): Promise<ReportSummary | null> {
  const stored = await env.BUCKET.get(key);
  if (!stored) return null;
  try {
    const parsed = EntityTemplateReportRecordSchema.safeParse(
      await readJson(stored),
    );
    if (!parsed.success) return null;
    const { reportId, reason, details, receivedAt } = parsed.data;
    return { reportId, reason, ...(details ? { details } : {}), receivedAt };
  } catch {
    return null;
  }
}

async function readReports(env: ReportEnv, listingId: string) {
  const reports: ReportSummary[] = [];
  let cursor: string | undefined;
  do {
    const page = await env.BUCKET.list({
      prefix: `${REPORTS}${listingId}/`,
      ...(cursor ? { cursor } : {}),
    });
    for (const object of page.objects as { key: string }[]) {
      const report = await readReport(env, object.key);
      if (report) reports.push(report);
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  return reports.sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));
}

/** Operator-only: every report for one listing, without reporter hashes. */
export async function handleAdminEntityTemplateReports(
  request: Request,
  env: ReportEnv,
): Promise<Response> {
  if (!env.BUCKET) return bucketMissing(request);
  const denied = operatorAuthError(request, env);
  if (denied) return denied;
  const listingId = new URL(request.url).searchParams.get("listingId")?.trim();
  if (!listingId) return fail(request, "A listing id is required", 400);
  const reports = await readReports(env, listingId);
  return json(request, { listingId, count: reports.length, reports });
}
