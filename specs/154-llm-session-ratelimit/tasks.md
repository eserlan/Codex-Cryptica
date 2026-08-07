# Tasks: Turnstile-signed Session Token & Rate Limiting

## Phase 1: Setup & Foundation

- [x] T001 Setup basic token signature and verification utilities using Web Crypto API in `apps/workers/oracle-proxy/src/session.ts`
- [x] T002 Add two `[[ratelimits]]` bindings to `apps/workers/oracle-proxy/wrangler.toml`, following the existing `PUBLISH_*_RATE_LIMITER` pattern: `LLM_BURST_RATE_LIMITER` (limit 5, period 10) and `LLM_GENERATION_RATE_LIMITER` (limit 20, period 60). Periods **must** be 10 or 60 — no other value is supported.
- [x] T003 Confirm `verifyTurnstile()` in `apps/workers/oracle-proxy/src/turnstile.ts` is directly reusable from the session route (it is already exported and consumed by `publish.ts`/`reports.ts`); add a session-specific `action` value if the widget sets one. No refactor expected.

## Phase 2: Secure LLM Session Handshake (US1)

- [x] T004 [US1] Create `/api/session` POST endpoint in `apps/workers/oracle-proxy/src/index.ts` to accept Turnstile tokens
- [x] T005 [US1] Implement Turnstile verification inside the `/api/session` endpoint
- [x] T006 [US1] Generate and return the HMAC-signed capability token upon successful Turnstile verification in `apps/workers/oracle-proxy/src/index.ts`
- [x] T007 [US1] Create the `AiSessionManager` component in `packages/ai-engine/src/session-manager.ts` — Turnstile initialization and token fetching. It belongs in the engine package, alongside the client manager it serves, not in `apps/web`.
- [x] T008 [US1] Store the capability token in memory with `sessionStorage` backing (never `localStorage`) in `packages/ai-engine/src/session-manager.ts`
- [x] T009 [US1] Write unit tests for token generation and Turnstile verification in `apps/workers/oracle-proxy/src/__tests__/session.test.ts`

## Phase 3: Authenticated LLM Generation & Queueing (US2)

- [x] T010 [P] [US2] Implement transparent queueing in `packages/ai-engine/src/session-manager.ts` to defer generation requests until the handshake completes
- [x] T011 [US2] Inject `AiSessionManager` into `DefaultAIClientManager` (`packages/ai-engine/src/client-manager.ts`) via its constructor, alongside the existing `fetcher` param, and attach `Authorization: Bearer <token>` centrally to **every** proxy call — the generation pipeline path and `sendInteraction()` alike. This is the one choke point; do not add token logic to any `apps/web` call site.
- [x] T012 [US2] Audit `packages/ai-engine/src/client-manager.ts` for any proxy `fetch` that bypasses the shared header path, so no LLM request escapes token attachment
- [x] T013 [US2] Add middleware or checks in `oracle-proxy` LLM endpoints to validate the capability token signature in `apps/workers/oracle-proxy/src/index.ts`
- [x] T014 [US2] Return 401 with `error.code` of `SESSION_TOKEN_MISSING` / `SESSION_TOKEN_INVALID` / `SESSION_TOKEN_EXPIRED`; log IP anomalies without hard failing, in `apps/workers/oracle-proxy/src/index.ts`
- [x] T015 [US2] Implement one-shot refresh-and-replay in `packages/ai-engine/src/client-manager.ts`: on 401 `SESSION_TOKEN_EXPIRED`, discard the token, re-handshake, retry the request exactly once; a second 401 propagates as an error
- [x] T016 [US2] Write unit tests for queueing, central token attachment, and the one-shot 401 replay (including the no-infinite-loop case) in `packages/ai-engine/src/session-manager.test.ts` (colocated, matching the package convention)

## Phase 4: Per-Token Rate Limiting (US3)

- [x] T017 [US3] Consult both rate limiting bindings inside the LLM generation endpoints, keyed by `session:<jti>`, in `apps/workers/oracle-proxy/src/index.ts`
- [x] T018 [US3] Return 429 with `error.code = "RATE_LIMITED"` when either binding reports the request as over the limit, in `apps/workers/oracle-proxy/src/index.ts`
- [x] T019 [US3] Add rate limiting tests in `apps/workers/oracle-proxy/src/__tests__/session.test.ts` (kept with the other session tests rather than a separate file). Assert **behaviour, not exact counts**: normal-rate traffic is never 429'd, and sustained heavy overage is throttled. The binding is permissive and eventually consistent — a test asserting "request N+1 is blocked" will be flaky.

## Phase 5: Polish & Security Audit

- [x] T020 Audit token expiry behavior (20-30 min) and confirm the refresh path in `packages/ai-engine/src/session-manager.ts` re-solves an invisible Turnstile challenge without user-visible interruption
- [ ] T021 End-to-end testing of the complete session token lifecycle with rate limiting across client and proxy. **Not done** — covered by unit tests on both halves, but never exercised against a deployed worker with real Turnstile and real rate limit bindings. Do this on staging once `SESSION_TOKEN_SECRET` is set.
