# Data Model: LLM Session Ratelimit

## Entities

### `SessionTokenPayload`

_The internal representation of the signed token payload._

- `exp` (number): Expiration timestamp in seconds since epoch.
- `ip` (string): The IP address that requested the token (for logging/anomaly detection).
- `jti` (string): A unique identifier for the token (UUID or random string).

The payload is base64url-encoded alongside its HMAC signature. It is **not** encrypted — a client can read `exp`, `ip` and `jti`. Never put anything confidential in it.

### `RateLimitKey`

_The key passed to the Cloudflare Rate Limiting bindings._

- Format: `session:<jti>`
- Applied to two bindings per request:
  - `LLM_BURST_RATE_LIMITER` — 5 / 10s
  - `LLM_GENERATION_RATE_LIMITER` — 20 / 60s
- Both are permissive and eventually consistent; treat the caps as approximate thresholds, not exact counters.

### Error Codes

- `SESSION_TOKEN_MISSING` → 401
- `SESSION_TOKEN_INVALID` → 401 (signature mismatch)
- `SESSION_TOKEN_EXPIRED` → 401 (triggers the client's one-shot refresh-and-replay)
- `RATE_LIMITED` → 429
