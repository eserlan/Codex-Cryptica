# Feature Specification: Turnstile-signed Session Token & Rate Limiting

**Feature Branch**: `154-llm-session-ratelimit`  
**Created**: 2026-08-07  
**Status**: Draft  
**Input**: User description: "Turnstile-signed session token plus a basic rate limiter for LLM generation endpoints"

## Clarifications

### Session 2026-08-07

- Q: What should the sliding window rate limit cap be for a single capability token? → A: 100 requests per 10 minutes - More generous for power users but allows more bot leakage.
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

**Independent Test**: Can be fully tested by spamming requests with the same valid token and verifying that the system blocks requests exceeding the concurrency/frequency cap.

**Acceptance Scenarios**:

1. **Given** a valid capability token, **When** the client exceeds the allowed generation request frequency, **Then** the worker rejects the excess requests with a 429 Too Many Requests status.

### Edge Cases

- What happens when a user leaves the app open for hours and the token expires? (The client should seamlessly request a new token via another invisible Turnstile challenge).
- How does the system handle a legitimate user switching networks (e.g., WiFi to Cellular) mid-session? (The token is not strictly IP-bound to prevent breaking the session, but anomalies are logged).
- What happens if the Web Crypto signing secret is rotated? (All existing active tokens immediately become invalid, forcing clients to fetch a new token).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide a new endpoint (`/api/session` or similar) that accepts a Turnstile token and returns a signed, short-lived (e.g., 20-30 minutes) capability token.
- **FR-002**: System MUST validate the Turnstile token server-side using the existing `verifyTurnstile()` logic before issuing the capability token.
- **FR-003**: System MUST sign the capability token using an opaque HMAC signature via the Web Crypto API, not requiring a database lookup.
- **FR-004**: System MUST include the issuing IP in the token payload for anomaly logging, but MUST NOT hard-fail generation requests if the IP changes mid-session.
- **FR-005**: All LLM generation endpoints MUST require and validate this capability token for access.
- **FR-006**: System MUST enforce a sliding window rate limit on generation endpoints keyed to the unique capability token (e.g., using a Cloudflare Rate Limiting binding).
- **FR-007**: Client MUST store the capability token in memory or `sessionStorage` (not `localStorage`) and attach it to LLM generation requests.

### Key Entities

- **Capability Token**: An opaque HMAC-signed string containing an expiration timestamp, unique identifier, and issuing IP. Stored client-side in `sessionStorage` or memory.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Bot-like or script-driven direct calls to LLM generation endpoints without a Turnstile solve are blocked 100% of the time.
- **SC-002**: Malicious actors who solve a Turnstile challenge are capped to a strict maximum of 100 LLM generation requests per 10 minutes.
- **SC-003**: Valid token verification adds less than 5ms of latency to LLM generation requests.
- **SC-004**: Legitimate users experiencing IP address changes (e.g., mobile users) do not have their active sessions interrupted.
