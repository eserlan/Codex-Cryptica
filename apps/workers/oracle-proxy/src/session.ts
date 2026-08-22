/**
 * Signed capability tokens for LLM generation endpoints.
 *
 * A client solves an invisible Turnstile challenge once, exchanges it at
 * `/api/session` for a short-lived token, and presents that token as
 * `Authorization: Bearer <token>` on every generation request. The proxy
 * verifies the signature with Web Crypto — no database, no network hop, so
 * validation stays well under the 5ms budget.
 *
 * The token is **signed, not encrypted**. Whoever holds it can read the
 * payload. Its security property is unforgeability, not secrecy — never put
 * anything confidential in it.
 */

export interface SessionTokenPayload {
  /** Expiration, seconds since epoch. */
  exp: number;
  /** Unique token id. Doubles as the rate limit key. */
  jti: string;
  /** IP the token was issued to. Logged on mismatch, never enforced. */
  ip: string;
}

export type SessionTokenErrorCode =
  "SESSION_TOKEN_MISSING" | "SESSION_TOKEN_INVALID" | "SESSION_TOKEN_EXPIRED";

export type SessionTokenResult =
  | { valid: true; payload: SessionTokenPayload }
  | { valid: false; code: SessionTokenErrorCode };

/** Token lifetime. Long enough to span a working session, short enough that a leaked token ages out. */
export const SESSION_TOKEN_TTL_SECONDS = 30 * 60;

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(value: string): Uint8Array | null {
  try {
    const padded = value
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(value.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/**
 * Mint a signed capability token.
 *
 * `nowSeconds` is injectable so tests can drive expiry without faking timers.
 */
export async function mintSessionToken(
  secret: string,
  ip: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
  ttlSeconds: number = SESSION_TOKEN_TTL_SECONDS,
): Promise<{ token: string; expiresAt: number }> {
  const expiresAt = nowSeconds + ttlSeconds;
  const payload: SessionTokenPayload = {
    exp: expiresAt,
    jti: crypto.randomUUID(),
    ip,
  };

  const encodedPayload = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    await importKey(secret),
    new TextEncoder().encode(encodedPayload),
  );

  return {
    token: `${encodedPayload}.${base64UrlEncode(new Uint8Array(signature))}`,
    expiresAt,
  };
}

/**
 * Verify a capability token's signature and expiry.
 *
 * Distinguishes expired from invalid because the client reacts differently:
 * an expired token triggers one silent re-handshake and replay, whereas an
 * invalid one is a hard error (and, in bulk, a signal of tampering).
 */
export async function verifySessionToken(
  secret: string,
  token: string | null | undefined,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): Promise<SessionTokenResult> {
  if (!token) return { valid: false, code: "SESSION_TOKEN_MISSING" };

  // Bounded before any crypto work so an oversized body can't be used to
  // burn CPU on the verification path.
  if (token.length > 4_096)
    return { valid: false, code: "SESSION_TOKEN_INVALID" };

  const separator = token.indexOf(".");
  if (separator <= 0) return { valid: false, code: "SESSION_TOKEN_INVALID" };

  const encodedPayload = token.slice(0, separator);
  const encodedSignature = token.slice(separator + 1);
  const signatureBytes = base64UrlDecode(encodedSignature);
  if (!signatureBytes) return { valid: false, code: "SESSION_TOKEN_INVALID" };

  // crypto.subtle.verify is constant-time, so this comparison doesn't leak
  // signature bytes the way a manual string compare would.
  const signatureOk = await crypto.subtle.verify(
    "HMAC",
    await importKey(secret),
    signatureBytes as BufferSource,
    new TextEncoder().encode(encodedPayload),
  );
  if (!signatureOk) return { valid: false, code: "SESSION_TOKEN_INVALID" };

  const payloadBytes = base64UrlDecode(encodedPayload);
  if (!payloadBytes) return { valid: false, code: "SESSION_TOKEN_INVALID" };

  let payload: SessionTokenPayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(payloadBytes));
  } catch {
    return { valid: false, code: "SESSION_TOKEN_INVALID" };
  }

  if (typeof payload?.exp !== "number" || typeof payload?.jti !== "string") {
    return { valid: false, code: "SESSION_TOKEN_INVALID" };
  }
  if (payload.exp <= nowSeconds) {
    return { valid: false, code: "SESSION_TOKEN_EXPIRED" };
  }

  return { valid: true, payload };
}

/** Pull the bearer token out of an Authorization header. */
export function extractBearerToken(request: Request): string | null {
  const header = request.headers.get("Authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1] : null;
}
