import {
  CopyrightReportSchema,
  CopyrightReport,
} from "../../../../packages/schema/src/publishing";
import { verifyTurnstile } from "./turnstile";

interface ReportsEnv {
  BUCKET?: any; // R2Bucket
  TURNSTILE_SECRET_KEY?: string;
  PUBLISH_CREATE_RATE_LIMITER?: any;
  PUBLISH_WRITE_RATE_LIMITER?: any;
}

function getHeaders(
  requestHeaders: Headers,
  _env: ReportsEnv,
): Record<string, string> {
  const origin = requestHeaders.get("Origin") || "";
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Turnstile-Token",
    "Content-Type": "application/json",
  };
}

export async function handleCopyrightReport(
  request: Request,
  env: ReportsEnv,
): Promise<Response> {
  const headers = getHeaders(request.headers, env);

  // Check rate limit if limiter exists in env
  const limiter =
    env.PUBLISH_CREATE_RATE_LIMITER || env.PUBLISH_WRITE_RATE_LIMITER;
  if (limiter) {
    const ip = request.headers.get("CF-Connecting-IP") || "anonymous";
    const { success } = await limiter.limit({ key: `report:${ip}` });
    if (!success) {
      return new Response(
        JSON.stringify({
          error: {
            message: "Too many report submissions. Please try again later.",
          },
        }),
        { status: 429, headers },
      );
    }
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: { message: "Invalid JSON payload" } }),
      { status: 400, headers },
    );
  }

  if (!body || typeof body !== "object") {
    return new Response(
      JSON.stringify({
        error: { message: "Request body must be a JSON object" },
      }),
      { status: 400, headers },
    );
  }

  // Check required fields
  const missing: string[] = [];
  if (
    !body.vaultUrl ||
    typeof body.vaultUrl !== "string" ||
    !body.vaultUrl.trim()
  ) {
    missing.push("vaultUrl");
  }
  if (
    !body.reporterContact ||
    typeof body.reporterContact !== "string" ||
    !body.reporterContact.trim()
  ) {
    missing.push("reporterContact");
  }
  if (missing.length > 0) {
    return new Response(
      JSON.stringify({
        error: {
          message: `Required fields missing: ${missing.join(", ")}`,
        },
      }),
      { status: 400, headers },
    );
  }

  // Verify Turnstile
  const turnstileToken =
    body.turnstileToken || request.headers.get("X-Turnstile-Token");
  const isVerified = await verifyTurnstile(
    request,
    env.TURNSTILE_SECRET_KEY,
    "copyright_report",
    turnstileToken,
  );
  if (!isVerified) {
    return new Response(
      JSON.stringify({ error: { message: "Turnstile verification failed" } }),
      { status: 403, headers },
    );
  }

  const reportId = crypto.randomUUID();
  const receivedAt = new Date().toISOString();
  const vaultUrl: string = body.vaultUrl.trim();

  // Extract publishId from vaultUrl
  let publishId: string | undefined;
  const match = vaultUrl.match(/\/guest\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    publishId = match[1];
  }

  // Determine vaultState
  let vaultState: "listed" | "published-unlisted" | "not-found" = "not-found";
  if (publishId && env.BUCKET) {
    const listing = await env.BUCKET.head(
      `directory/listings/${publishId}.json`,
    ).catch(() => null);
    if (listing) {
      vaultState = "listed";
    } else {
      const bundle = await env.BUCKET.head(
        `published/${publishId}/bundle.json`,
      ).catch(() => null);
      if (bundle) {
        vaultState = "published-unlisted";
      }
    }
  }

  const reportPayload: CopyrightReport = {
    schemaVersion: 1,
    reportId,
    vaultUrl,
    publishId,
    rightsHolder:
      typeof body.rightsHolder === "string" && body.rightsHolder.trim()
        ? body.rightsHolder.trim()
        : undefined,
    material:
      typeof body.material === "string" && body.material.trim()
        ? body.material.trim()
        : undefined,
    reporterContact: body.reporterContact.trim(),
    details:
      typeof body.details === "string" && body.details.trim()
        ? body.details.trim()
        : undefined,
    receivedAt,
    vaultState,
  };

  // Validate strict schema
  const parsed = CopyrightReportSchema.safeParse(reportPayload);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({
        error: {
          message: `Validation error: ${parsed.error.message}`,
        },
      }),
      { status: 400, headers },
    );
  }

  if (env.BUCKET) {
    await env.BUCKET.put(
      `moderation/reports/${reportId}.json`,
      JSON.stringify(parsed.data),
      {
        customMetadata: {
          reportId,
          publishId: publishId || "unknown",
          receivedAt,
        },
      },
    );
  }

  return new Response(
    JSON.stringify({
      reportId,
      receivedAt,
    }),
    { status: 200, headers },
  );
}
