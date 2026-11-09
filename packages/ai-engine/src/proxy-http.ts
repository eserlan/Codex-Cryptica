/**
 * Appends `(code: X)` to a thrown error message when the proxy supplied a
 * machine-readable error code, so `classifyApiError` can pattern-match on
 * it instead of the free-text message (which is prose meant for a human,
 * not a stable identifier).
 */
export function formatErrorCode(code: unknown): string {
  return typeof code === "string" && code ? ` (code: ${code})` : "";
}

/** Send a JSON body without changing the caller's abort signal. */
export function postProxyJson(
  doFetch: typeof fetch,
  proxyUrl: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<Response> {
  return doFetch(proxyUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
}
