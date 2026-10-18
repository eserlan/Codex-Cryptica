/** Shared by the stat sheet and entity template directory services. */

const PRODUCTION_URL = "https://oracle-proxy.espen-erlandsen.workers.dev";
const DEV_URL = "http://localhost:8787";

export function getTemplateDirectoryBaseUrl(override?: string): string {
  if (override) return override;
  const env = typeof import.meta !== "undefined" ? import.meta.env : undefined;
  if (env?.VITE_ORACLE_PROXY_URL) return env.VITE_ORACLE_PROXY_URL;
  return env?.DEV && !env?.VITEST ? DEV_URL : PRODUCTION_URL;
}

/** Throws a plain-language error when a directory request did not succeed. */
export function assertOk(response: Response, message: string): void {
  if (!response.ok) throw new Error(message);
}
