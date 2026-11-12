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

/** Buffered generation shares status logging and proxy error decoding. */
export async function readProxyGenerationResponse(
  response: Response,
): Promise<any> {
  console.log(
    `[OracleProxy] Response status: ${response.status} ${response.statusText}`,
  );
  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: { message: "Proxy request failed" } }));
    console.error("[OracleProxy] Request failed:", error);
    throw new Error(
      `[OracleProxy] Request failed: ${error.error?.message || "Unknown error"}${formatErrorCode(error.error?.code)}`,
    );
  }
  return response.json();
}
