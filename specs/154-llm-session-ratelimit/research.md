# Phase 0: Research

## Decisions

- **Token Format**: HMAC-signed capability token (payload + signature) using the Web Crypto API, giving <5ms validation with no network overhead. Deliberately **not** opaque: the client holds the whole signed payload, so expiry/id/IP are readable. The security property is unforgeability, not secrecy.

- **Rate Limiting**: Cloudflare's Workers Rate Limiting binding, keyed by the token's `jti`.

  **Constraint discovered**: the binding supports only `period = 10` or `period = 60` seconds, and is a permissive, eventually-consistent limiter rather than an exact counter. The original "100 requests per 10 minutes sliding window" therefore **cannot be implemented as written** with this binding.

  **Options considered**:
  1. Simplify to native caps (burst + per-minute) — chosen.
  2. Implement a true 10-minute sliding window in a Durable Object — rejected.

  **Rationale**: The goal is suppressing abuse, not billing-grade quota accounting. A Durable Object adds a stateful hop, cost, and latency on the hot path of every generation for accounting precision nobody consumes. The spec now describes the intended protection rather than promising an exact long-window quota.

  **Chosen values** (tunable without a spec change):
  - `LLM_BURST_RATE_LIMITER`: 5 requests / 10s — stops tight loops immediately.
  - `LLM_GENERATION_RATE_LIMITER`: 20 requests / 60s — bounds sustained volume.

  `apps/workers/oracle-proxy/wrangler.toml` already declares `[[ratelimits]]` bindings (`PUBLISH_CREATE_RATE_LIMITER`, `PUBLISH_WRITE_RATE_LIMITER`), so this extends an established pattern rather than introducing one.

- **Turnstile Verification**: Reuse the existing `verifyTurnstile()` in `apps/workers/oracle-proxy/src/turnstile.ts`. It already verifies the challenge server-side and checks hostname plus optional action; `publish.ts` and `reports.ts` consume it today. No changes needed beyond calling it from the session route.

- **Client Integration Point**: `packages/ai-engine/src/client-manager.ts` (`DefaultAIClientManager`), which already owns every proxy call including the provider-neutral generation pipeline and the interactions path. Token acquisition/attachment/refresh hooks in there, giving a single choke point. A separate manager under `apps/web/src/lib/services/ai/` was rejected — it would create a parallel AI transport layer and silently miss calls that go through the engine.

- **Auth Header**: `Authorization: Bearer <token>`. Chosen over a custom `X-Codex-Session` header so the OpenAPI contract can use the standard `bearerAuth` security scheme and standard tooling understands it.

- **Expiry Handling**: Generation endpoints reject expired tokens with `401` and `error.code = "SESSION_TOKEN_EXPIRED"`. The client manager discards the token, re-runs the handshake, and replays the request **once**. A single retry only — no loops on a persistently failing handshake.

- **Queueing Strategy**: Generation requests made before the initial handshake finishes are queued as promises inside the session manager and flushed when the token arrives.
