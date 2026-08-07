# Tasks: Turnstile-signed Session Token & Rate Limiting

## Phase 1: Setup & Foundation

- [ ] T001 Setup basic token signature and verification utilities using Web Crypto API in `apps/workers/oracle-proxy/src/session.ts`
- [ ] T002 Update wrangler.toml or environment setup for rate limiting binding (`LLM_GENERATION_RATE_LIMITER`) in `apps/workers/oracle-proxy`
- [ ] T003 Expose the `verifyTurnstile` helper globally in the proxy to be reusable for the session endpoint in `apps/workers/oracle-proxy/src/turnstile.ts`

## Phase 2: Secure LLM Session Handshake (US1)

- [ ] T004 [US1] Create `/api/session` POST endpoint in `apps/workers/oracle-proxy/src/index.ts` to accept Turnstile tokens
- [ ] T005 [US1] Implement Turnstile verification inside the `/api/session` endpoint
- [ ] T006 [US1] Generate and return the HMAC-signed capability token upon successful Turnstile verification in `apps/workers/oracle-proxy/src/index.ts`
- [ ] T007 [US1] Create `AiSessionManager` service to handle Turnstile initialization and token fetching in `apps/web/src/lib/services/ai/ai-session-manager.ts`
- [ ] T008 [US1] Store the capability token securely in `sessionStorage` in `apps/web/src/lib/services/ai/ai-session-manager.ts`
- [ ] T009 [US1] Write unit tests for token generation and Turnstile verification in `apps/workers/oracle-proxy/src/__tests__/session.test.ts`

## Phase 3: Authenticated LLM Generation & Queueing (US2)

- [ ] T010 [P] [US2] Implement transparent queueing logic in `AiSessionManager` to defer LLM generation requests until the handshake completes in `apps/web/src/lib/services/ai/ai-session-manager.ts`
- [ ] T011 [US2] Update `aiClientManager` (or `oracleClient`) to await `AiSessionManager`'s token and attach it as `Authorization: Bearer <token>` in `apps/web/src/lib/services/ai/ai-client-manager.ts`
- [ ] T012 [US2] Add middleware or checks in `oracle-proxy` LLM endpoints to validate the capability token signature in `apps/workers/oracle-proxy/src/index.ts`
- [ ] T013 [US2] Ensure LLM generation endpoints return 401/403 for missing or invalid tokens, and log IP anomalies without hard failing in `apps/workers/oracle-proxy/src/index.ts`
- [ ] T014 [US2] Write unit tests for request queueing behavior in `apps/web/src/lib/services/ai/ai-session-manager.test.ts`

## Phase 4: Per-Token Rate Limiting (US3)

- [ ] T015 [US3] Implement Cloudflare Rate Limiting logic inside the LLM generation endpoints, keyed by the session token JTI, in `apps/workers/oracle-proxy/src/index.ts`
- [ ] T016 [US3] Ensure requests exceeding 100 requests per 10 minutes return a 429 Too Many Requests status in `apps/workers/oracle-proxy/src/index.ts`
- [ ] T017 [US3] Add rate limiting integration tests to verify sliding window caps in `apps/workers/oracle-proxy/src/__tests__/rate-limit.test.ts`

## Phase 5: Polish & Security Audit

- [ ] T018 Audit token expiry behavior (20-30 min) and implement token refresh mechanism in `AiSessionManager` via invisible Turnstile challenge in `apps/web/src/lib/services/ai/ai-session-manager.ts`
- [ ] T019 End-to-end testing of the complete session token lifecycle with rate limiting across client and proxy.
