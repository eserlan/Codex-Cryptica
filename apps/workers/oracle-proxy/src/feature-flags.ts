import { getCorsHeaders } from "./cors";
import type { Env } from "./env";

export interface KVNamespaceLike {
  get(key: string): Promise<string | null>;
}

export const DEFAULT_FEATURE_FLAGS = {
  adventureArtwork: false,
} as const;

export type FeatureFlagName = keyof typeof DEFAULT_FEATURE_FLAGS;
export type FeatureFlags = Record<FeatureFlagName, boolean>;
export type FeatureFlagEnvironment = "prod" | "staging";

const ALLOWED_ENVIRONMENTS = new Set<FeatureFlagEnvironment>([
  "prod",
  "staging",
]);
const KNOWN_FLAG_KEYS = Object.keys(DEFAULT_FEATURE_FLAGS) as FeatureFlagName[];

function parseEnvironment(
  raw: string | null,
): FeatureFlagEnvironment | undefined {
  if (!raw) return "prod";
  return ALLOWED_ENVIRONMENTS.has(raw as FeatureFlagEnvironment)
    ? (raw as FeatureFlagEnvironment)
    : undefined;
}

function sanitiseFlags(raw: unknown): FeatureFlags | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  const flags: FeatureFlags = { ...DEFAULT_FEATURE_FLAGS };
  for (const key of KNOWN_FLAG_KEYS) {
    if (typeof record[key] === "boolean") {
      flags[key] = record[key];
    }
  }
  return flags;
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  request: Request,
  env: Env,
  cacheControl?: string,
): Response {
  const headers: Record<string, string> = {
    "Content-Type": "application/json; charset=utf-8",
    Vary: "Origin",
    ...getCorsHeaders(request.headers, env),
  };
  if (cacheControl) {
    headers["Cache-Control"] = cacheControl;
  }
  return new Response(JSON.stringify(body), { status, headers });
}

/**
 * Serves runtime feature flags from Cloudflare Workers KV (`FEATURE_FLAGS`)
 * under `flags:prod` and `flags:staging`, failing open to safe defaults when
 * KV is unbound, empty, unavailable, or contains malformed JSON.
 */
export async function handleFeatureFlagsRequest(
  request: Request,
  env: Env,
): Promise<Response> {
  if (request.method !== "GET") {
    return jsonResponse(
      { error: "Method not allowed" },
      405,
      request,
      env,
      "no-store",
    );
  }

  const url = new URL(request.url);
  const envName = parseEnvironment(url.searchParams.get("env"));
  if (!envName) {
    return jsonResponse(
      { error: "Invalid env parameter; expected 'prod' or 'staging'" },
      400,
      request,
      env,
      "no-store",
    );
  }

  let flags: FeatureFlags = { ...DEFAULT_FEATURE_FLAGS };
  let source: "kv" | "defaults" = "defaults";

  if (env.FEATURE_FLAGS) {
    try {
      const rawText = await env.FEATURE_FLAGS.get(`flags:${envName}`);
      if (rawText !== null) {
        const parsed = sanitiseFlags(JSON.parse(rawText));
        if (parsed) {
          flags = parsed;
          source = "kv";
        }
      }
    } catch {
      // Fail open to safe in-code defaults if KV is unavailable or corrupt.
    }
  }

  return jsonResponse(
    { env: envName, flags, source },
    200,
    request,
    env,
    "public, max-age=60",
  );
}
