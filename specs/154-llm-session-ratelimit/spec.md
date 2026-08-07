# Feature Specification: Turnstile-signed Session Token & Rate Limiting

**Feature Branch**: `154-llm-session-ratelimit`  
**Created**: 2026-08-07  
**Status**: Draft  
**Input**: User description: "Turnstile-signed session token plus a basic rate limiter for LLM generation endpoints"

## Clarifications

### Session 2026-08-07

- Q: What should the rate limit cap be for a single capability token? → A: A burst cap plus a sustained cap, both expressed in the periods the platform limiter supports natively (10s and 60s). The goal is abuse suppression, not billing-grade quota accounting, so the limiter is permissive and eventually consistent by design. Initial values: 5 requests / 10 seconds (burst) and 20 requests / 60 seconds (sustained), tunable without spec changes.
- Q: Where should the client attach the capability token? → A: Centrally, in the existing shared AI transport (`DefaultAIClientManager` in `packages/ai-engine`), so every text LLM request passes one choke point rather than a second parallel transport layer.
- Q: How should the application handle a user attempting an LLM generation immediately upon page load, before the initial Turnstile handshake has finished? → A: Queue LLM requests transparently - The UI remains responsive; if a user triggers generation before the handshake completes, the request is queued and fires automatically once the token arrives.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Secure LLM Session Handshake (Priority: P1)

As a legitimate application user, I want my browser to transparently obtain an anti-abuse capability token upon loading, so that I can use LLM generation features without being blocked by bot protections or experiencing delays on every request.

**Why this priority**: Without this handshake, the client has no way to prove it's a legitimate browser before calling the LLM generation endpoints, which leaves the proxy exposed to abuse.

**Independent Test**: Can be fully tested by verifying the client fetches a token via the new `/api/session` endpoint using Turnstile and stores it locally for the session.

**Acceptance Scenarios**:

1. **Given** a new application session starts, **When** the Turnstile challenge is successfully solved in the background, **Then** the client requests and receives a signed capability token from the worker.
2. **Given** a user triggers a generation request before the initial Turnstile handshake completes, **When** the action is performed, **Then** the request is transparently queued and automatically fires once the token arrives, keeping the UI responsive.
3. **Given** an invalid or expired Turnstile challenge token, **When** the client requests a capability token, **Then** the worker rejects the request and no token is issued.

---

### User Story 2 - Authenticated LLM Generation (Priority: P1)

As a legitimate user, I want my LLM generation requests to be processed quickly using my capability token, so that I experience fast AI responses while the proxy remains protected.

**Why this priority**: This enforces the capability token at the boundary of the LLM endpoints.

**Independent Test**: Can be fully tested by sending an LLM generation request with and without a valid signed capability token.

**Acceptance Scenarios**:

1. **Given** a valid capability token, **When** the client sends a generation request, **Then** the worker verifies the token signature locally and processes the generation request.
2. **Given** a missing, expired, or cryptographically invalid token, **When** the client sends a generation request, **Then** the worker rejects the request with a 401/403 status.
3. **Given** a capability token where the request IP differs from the token's original IP, **When** the client sends a generation request, **Then** the request is still processed but the anomaly is logged.

---

### User Story 3 - Per-Token Rate Limiting (Priority: P2)

As a platform owner, I want the system to rate limit LLM generation requests bound to specific tokens, so that malicious actors who bypass Turnstile cannot spam the LLM endpoints.

**Why this priority**: A token by itself only forces one Turnstile challenge. Rate limiting per token mitigates the volume of abuse.

**Independent Test**: Can be fully tested by spamming requests with the same valid token and verifying that sustained request rates well above the cap are rejected.

**Acceptance Scenarios**:

1. **Given** a valid capability token, **When** the client sustains a generation request rate well above the configured cap, **Then** the worker rejects the excess requests with a 429 Too Many Requests status.
2. **Given** a valid capability token, **When** the client makes requests at or below the configured cap, **Then** no request is rejected with 429.

**Note on limiter semantics**: The platform limiter is permissive and eventually consistent — it is not an exact counter. Tests and acceptance criteria must therefore assert "sustained overage is blocked" and "normal usage is never blocked", never an exact request-number cutoff.

### Edge Cases

- What happens when a user leaves the app open for hours and the token expires? (The generation endpoint returns 401 with an `error.code` of `SESSION_TOKEN_EXPIRED`; the client discards the stored token, solves a fresh invisible Turnstile challenge, mints a new capability token, and replays the failed request exactly once. A second 401 on the replay surfaces as an error rather than looping).
- How does the system handle a legitimate user switching networks (e.g., WiFi to Cellular) mid-session? (The token is not strictly IP-bound to prevent breaking the session, but anomalies are logged).
- What happens if the Web Crypto signing secret is rotated? (All existing active tokens immediately become invalid, forcing clients to fetch a new token).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide a new endpoint (`/api/session` or similar) that accepts a Turnstile token and returns a signed, short-lived (e.g., 20-30 minutes) capability token.
- **FR-002**: System MUST validate the Turnstile token server-side using the existing `verifyTurnstile()` logic before issuing the capability token.
- **FR-003**: System MUST issue a **signed capability token**: a payload (expiry, unique id, issuing IP) carried by the client together with an HMAC signature computed via the Web Crypto API. The token is readable by anyone holding it — it is not opaque and MUST NOT be treated as confidential. Its security property is unforgeability, not secrecy. Validation MUST require no database or network lookup.
- **FR-004**: System MUST include the issuing IP in the token payload for anomaly logging, but MUST NOT hard-fail generation requests if the IP changes mid-session.
- **FR-005**: All LLM generation endpoints MUST require and validate this capability token for access.
- **FR-006**: System MUST enforce rate limiting on generation endpoints keyed to the token's unique id, using the platform's native rate limiting binding. Because that binding supports only 10-second and 60-second periods and is permissive/eventually consistent, the requirement is expressed as **two native caps** — a short burst cap and a sustained per-minute cap — not as an exact long-window quota. Initial values: 5 requests / 10 seconds and 20 requests / 60 seconds.
- **FR-007**: Client MUST store the capability token in memory or `sessionStorage` (not `localStorage`) and attach it to LLM generation requests as `Authorization: Bearer <token>`.
- **FR-008**: When a generation request is rejected with 401 due to an expired or invalid capability token, the client MUST discard the token, obtain a fresh one via a new Turnstile handshake, and replay the request **exactly once**. A second consecutive 401 MUST surface as an error and MUST NOT trigger a further refresh.
- **FR-009**: Token attachment and the 401 refresh-and-replay MUST be implemented once, inside the shared AI transport layer that already owns proxy calls, so that every text LLM request is covered by a single choke point.

### Key Entities

- **Capability Token**: A signed (HMAC) string carrying an expiration timestamp, unique identifier, and issuing IP. Not confidential — unforgeable. Stored client-side in `sessionStorage` or memory.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Bot-like or script-driven direct calls to LLM generation endpoints without a Turnstile solve are blocked 100% of the time.
- **SC-002**: A single capability token driven at 10x the configured cap is throttled: the large majority of its excess requests receive 429, bounding a solved-Turnstile attacker to roughly tens of generations per minute rather than unbounded volume. (Approximate by design — the limiter is permissive, so no exact cutoff is claimed.)
- **SC-003**: Valid token verification adds less than 5ms of latency to LLM generation requests.
- **SC-004**: Legitimate users experiencing IP address changes (e.g., mobile users) do not have their active sessions interrupted.
