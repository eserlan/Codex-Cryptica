# Quickstart: LLM Session Ratelimit

## Workflow

1. **Client Initialization**: On web app load, the session manager in `packages/ai-engine` mounts an invisible Cloudflare Turnstile widget.
2. **Token Fetch**: Once the widget solves, the manager POSTs the challenge token to `oracle-proxy` at `/api/session`.
3. **Token Issuance**: `oracle-proxy` validates it with the existing `verifyTurnstile()`, then mints an HMAC-signed capability token containing an expiry (~30 minutes), a `jti`, and the client IP, and returns it.
4. **Queueing**: Generation requests made _before_ the token arrives are queued as promises by the session manager and flushed once it lands.
5. **Attachment**: `DefaultAIClientManager` (`packages/ai-engine/src/client-manager.ts`) attaches `Authorization: Bearer <token>` to every proxy call — generation pipeline and interactions path alike. This is the single choke point; nothing in `apps/web` attaches tokens itself.
6. **Generation & Rate Limiting**: The proxy verifies the HMAC signature via Web Crypto. If valid, it consults both rate limiting bindings keyed by `session:<jti>` — 5/10s burst and 20/60s sustained. Over either cap → 429. Otherwise the request is forwarded to the LLM provider.
7. **Expiry**: An expired token yields 401 `SESSION_TOKEN_EXPIRED`. The client manager drops the token, re-runs the handshake, and replays the request once. A second 401 surfaces as an error.

## Note on limiter precision

The Cloudflare Rate Limiting binding is permissive and eventually consistent, and supports only 10s/60s periods. It bounds abuse; it does not produce exact quota accounting. Do not write tests asserting an exact request-number cutoff.
