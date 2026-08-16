export function isCodexHostname(hostname: string | undefined): boolean {
  return (
    hostname === "codexcryptica.com" ||
    hostname === "codex-cryptica.com" ||
    hostname === "staging.codexcryptica.com" ||
    hostname === "staging.codex-cryptica.com" ||
    hostname === "codex-cryptica.pages.dev" ||
    hostname?.endsWith(".codex-cryptica.pages.dev") === true ||
    hostname?.endsWith(".pages.dev") === true ||
    hostname === "localhost"
  );
}

/**
 * A privacy-safe outcome for a Turnstile siteverify call. These values are
 * suitable for Worker logs: they deliberately exclude challenge tokens, IP
 * addresses, and request content.
 */
export interface TurnstileVerificationResult {
  valid: boolean;
  reason?: string;
  errorCodes?: string[];
}

/**
 * Verify a Turnstile response while retaining only safe diagnostic metadata.
 *
 * The caller may log `reason` and `errorCodes` to distinguish a client-side
 * challenge failure from Cloudflare's siteverify response without exposing
 * the one-time challenge token.
 */
export async function verifyTurnstileWithDiagnostics(
  request: Request,
  secretKey?: string,
  expectedAction?: string,
  tokenOverride?: string,
): Promise<TurnstileVerificationResult> {
  const token = tokenOverride || request.headers.get("X-Turnstile-Token");

  if (!secretKey) {
    return token === "dev-turnstile-token"
      ? { valid: true }
      : { valid: false, reason: "development_token_rejected" };
  }

  if (!token) return { valid: false, reason: "missing_token" };
  if (token.length > 2_048) {
    return { valid: false, reason: "token_too_large" };
  }

  const form = new FormData();
  form.set("secret", secretKey);
  form.set("response", token);
  form.set("remoteip", request.headers.get("CF-Connecting-IP") || "");

  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: form,
      },
    );
    if (!response.ok) {
      return { valid: false, reason: `siteverify_http_${response.status}` };
    }
    const result = (await response.json()) as {
      success?: boolean;
      hostname?: string;
      action?: string;
      "error-codes"?: string[];
    };
    const errorCodes = Array.isArray(result["error-codes"])
      ? result["error-codes"].filter(
          (code): code is string => typeof code === "string",
        )
      : undefined;
    if (expectedAction && result.action !== expectedAction) {
      return { valid: false, reason: "unexpected_action", errorCodes };
    }
    if (!isCodexHostname(result.hostname)) {
      return { valid: false, reason: "untrusted_hostname", errorCodes };
    }
    if (!result.success) {
      return { valid: false, reason: "verification_rejected", errorCodes };
    }
    return { valid: true };
  } catch {
    return { valid: false, reason: "siteverify_network_error" };
  }
}

export async function verifyTurnstile(
  request: Request,
  secretKey?: string,
  expectedAction?: string,
  tokenOverride?: string,
): Promise<boolean> {
  return (
    await verifyTurnstileWithDiagnostics(
      request,
      secretKey,
      expectedAction,
      tokenOverride,
    )
  ).valid;
}
