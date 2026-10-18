export interface CorsEnv {
  ALLOWED_ORIGINS?: string;
  ALLOW_CLOUDFLARE_PAGES_PREVIEW_ORIGINS?: string;
}

/**
 * Allowed origins for CORS — the single source of truth.
 *
 * One `oracle-proxy` Worker serves every environment (no `--env`, no
 * `[env.*]` in wrangler.toml), so this list must cover them all. Setting
 * `ALLOWED_ORIGINS` per deploy is what broke staging on 2026-08-11: the
 * variable is authoritative when present, so a deploy carrying only the
 * production origins cut staging off until the next deploy. Keeping the list
 * here means every deploy is identical no matter who runs it or which
 * environment they thought they were deploying.
 *
 * `ALLOWED_ORIGINS` still overrides this if set, as an escape hatch for
 * locking the Worker down without a code change — it just isn't set normally.
 *
 * Only origins actually served belong here: an entry for a domain nobody owns
 * would hand CORS access to whoever registers it next.
 */
const DEFAULT_ALLOWED_ORIGINS = [
  "https://codexcryptica.com",
  "https://www.codexcryptica.com",
  "https://staging.codexcryptica.com",
  "https://codex-cryptica.pages.dev",
  "http://localhost",
  "http://127.0.0.1",
];

export function handleCorsPreflight(request: Request, env: CorsEnv): Response {
  const headers = new Headers();
  const origin = request.headers.get("Origin") || "";
  if (isOriginAllowed(origin, env)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }

  headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, X-Turnstile-Token, X-Filename, X-Codex-Automation-Key",
  );
  headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  headers.set("Access-Control-Max-Age", "86400");

  return new Response(null, { status: 204, headers });
}

export function getCorsHeaders(
  requestHeaders: Headers,
  env: CorsEnv,
): Record<string, string> {
  const origin = requestHeaders.get("Origin") || "";
  return isOriginAllowed(origin, env)
    ? { "Access-Control-Allow-Origin": origin }
    : {};
}

export function withCorsHeaders(
  request: Request,
  env: CorsEnv,
  response: Response,
): Response {
  for (const [name, value] of Object.entries(
    getCorsHeaders(request.headers, env),
  )) {
    response.headers.set(name, value);
  }
  response.headers.append("Vary", "Origin");
  return response;
}

export function isOriginAllowed(origin: string, env: CorsEnv): boolean {
  if (!origin) return false;

  if (env.ALLOWED_ORIGINS?.trim()) {
    const explicitlyAllowedOrigins = env.ALLOWED_ORIGINS.split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    if (explicitlyAllowedOrigins.includes(origin)) return true;

    if (
      isEnabled(env.ALLOW_CLOUDFLARE_PAGES_PREVIEW_ORIGINS) &&
      isCloudflarePagesPreviewOrigin(origin)
    ) {
      return true;
    }
    return false;
  }

  if (DEFAULT_ALLOWED_ORIGINS.includes(origin)) return true;
  if (isCloudflarePagesPreviewOrigin(origin)) return true;
  return isLoopbackOrigin(origin);
}

function isEnabled(value: string | undefined): boolean {
  return value?.toLowerCase() === "true" || value === "1";
}

function isCloudflarePagesPreviewOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    if (url.protocol !== "https:") return false;
    const hostname = url.hostname.toLowerCase();
    return (
      hostname === "codex-cryptica.pages.dev" ||
      hostname.endsWith(".codex-cryptica.pages.dev")
    );
  } catch {
    return false;
  }
}

function isLoopbackOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    const hostname = url.hostname.toLowerCase();
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}
