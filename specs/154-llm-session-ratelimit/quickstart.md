# Quickstart: LLM Session Ratelimit

## Workflow

1. **Client Initialization**: On web app load, the session manager in `packages/ai-engine` mounts an invisible Cloudflare Turnstile widget.
2. **Token Fetch**: Once the widget solves, the manager POSTs the challenge token to `oracle-proxy` at `/api/session`.
3. **Token Issuance**: `oracle-proxy` validates it with the existing `verifyTurnstile()`, then mints an HMAC-signed capability token containing an expiry (~30 minutes), a `jti`, and the client IP, and returns it.
4. **Queueing**: Generation requests made _before_ the token arrives are queued as promises by the session manager and flushed once it lands.
5. **Attachment**: `DefaultAIClientManager` (`packages/ai-engine/src/client-manager.ts`) attaches `Authorization: Bearer <token>` to every proxy call — generation pipeline and interactions path alike, on whichever JS thread it's running on (see step 5a — it is not actually a single instance app-wide).
6. **Generation & Rate Limiting**: The proxy verifies the HMAC signature via Web Crypto. If valid, it consults both rate limiting bindings keyed by `session:<jti>` — 5/10s burst and 20/60s sustained. Over either cap → 429. Otherwise the request is forwarded to the LLM provider.
7. **Expiry**: An expired token yields 401 `SESSION_TOKEN_EXPIRED`. The client manager drops the token, re-runs the handshake, and replays the request once. A second 401 surfaces as an error.

### 5a. Relaying the token into the AI Web Workers (post-launch fix, 2026-08-07)

`oracle.worker.ts` and `proposer.worker.ts` each run in their own Web Worker thread. A Worker gets its own isolated module graph — it does **not** share the main thread's `aiClientManager` singleton instance, even though both import the same module source. Neither Worker has a `document`, so neither can mount a Turnstile widget or POST `/api/session` itself.

The original launch (T021) verified the success path from the main thread only and missed this: every AI call originating from either Worker went out with no `Authorization` header at all, and started 401ing with `SESSION_TOKEN_MISSING` as soon as `SESSION_TOKEN_SECRET` was actually set in production.

Fix: `AiSessionManager` (main thread, the only real one) takes an `onTokenChange` callback, fired on every mint/refresh/clear. `session-bootstrap.ts` wires this to push the token into both Workers:

- `OracleBridge.setSessionToken()` → Comlink RPC → `OracleWorker.setSessionToken()`
- `ProposerBridge.setSessionToken()` → `postMessage({type: "SESSION_TOKEN", ...})` → the worker's `onmessage` handler

Each Worker holds a `RelayedSessionToken` (also in `packages/ai-engine/src/session-manager.ts`) — a pure local cache implementing the same `{getToken, invalidate}` shape `DefaultAIClientManager` needs, with no Turnstile/network capability of its own — wired via `aiClientManager.setSessionManager(relay)` inside each Worker. `DefaultAIClientManager.sessionManager`'s type was widened from the concrete `AiSessionManager` class to a new `SessionTokenSource` interface so both implementations satisfy it.

**Known residual gap**: this is a push, not a pull — a Worker created (or a token that expires) between two main-thread token changes will 401 until the next relay fires. Given `initAiSessionEager()` already runs at `(app)` layout mount, well before a user could plausibly trigger Worker-driven generation, this window is small in practice but not zero. A full fix would need the Worker to pull a fresh token on demand (e.g. a Comlink callback into the main thread) rather than only being pushed to — not implemented, since the push-only fix already closes the actual reported bug (100% failure) and the residual window is narrow.

## Note on limiter precision

The Cloudflare Rate Limiting binding is permissive and eventually consistent, and supports only 10s/60s periods. It bounds abuse; it does not produce exact quota accounting. Do not write tests asserting an exact request-number cutoff.
