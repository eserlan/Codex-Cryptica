/**
 * Where the Oracle proxy worker lives.
 *
 * The public site is static Cloudflare Pages, so there is no same-origin
 * `/api`; a request built against an empty base URL 405s. This resolution
 * order is the one already inlined across the publishing, guest-vault and
 * session-bootstrap call sites — kept here so new callers get it right by
 * default instead of re-deriving it (and occasionally omitting the fallback).
 */
const DEPLOYED_PROXY_URL = "https://oracle-proxy.espen-erlandsen.workers.dev";
const LOCAL_PROXY_URL = "http://localhost:8787";

export function resolveOracleProxyUrl(override?: string): string {
  if (override) return override;

  const env = typeof import.meta !== "undefined" ? import.meta.env : undefined;
  if (env?.VITE_ORACLE_PROXY_URL) return env.VITE_ORACLE_PROXY_URL;

  // `wrangler dev` serves the worker on :8787 alongside `bun dev`. Vitest runs
  // with DEV set but has no worker, so it must get the deployed URL and stub
  // fetch rather than silently pointing tests at a dead localhost port.
  return env?.DEV && !env?.VITEST ? LOCAL_PROXY_URL : DEPLOYED_PROXY_URL;
}
