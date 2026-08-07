# Specification Quality Checklist: Turnstile-signed Session Token & Rate Limiting

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-07
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- Checked against standard specifications. All criteria pass.

### Review revisions (2026-08-07)

- **Limiter semantics corrected.** The original "100 requests per 10 minutes sliding window" is not implementable with the Cloudflare Rate Limiting binding, which supports only 10s/60s periods and is permissive/eventually consistent. Replaced with native burst + sustained caps (5/10s, 20/60s). A Durable Object could give a true 10-minute window but was rejected as overkill — this is abuse suppression, not quota accounting.
- **Client integration point corrected.** The plan pointed at `apps/web/src/lib/services/ai/ai-client-manager.ts`, which does not exist. The shared AI client manager is `packages/ai-engine/src/client-manager.ts` (`DefaultAIClientManager`) and already owns the proxy calls for the generation pipeline and interactions path. Session handling moved into `packages/ai-engine` so there is one choke point and no parallel transport layer.
- **"Opaque HMAC token" reworded** to "signed capability token" — the client holds the whole signed payload, so it is unforgeable, not secret.
- **Auth header pinned** to `Authorization: Bearer <token>`.
- **Expiry behaviour pinned**: 401 + `SESSION_TOKEN_EXPIRED`, one-shot refresh and replay, no retry loop.
