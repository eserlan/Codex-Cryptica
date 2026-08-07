# Data Model: LLM Session Ratelimit

## Entities

### `SessionTokenPayload`

_The internal representation of the signed token payload._

- `exp` (number): Expiration timestamp in seconds since epoch.
- `ip` (string): The IP address that requested the token (for logging/anomaly detection).
- `jti` (string): A unique identifier for the token (UUID or random string).

### `RateLimitKey`

_The key used to identify a token in the Cloudflare Rate Limiting binding._

- Format: `ratelimit:session:<jti>`
