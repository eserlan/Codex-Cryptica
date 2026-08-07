# Implementation Plan: Turnstile-signed Session Token & Rate Limiting

**Branch**: `154-llm-session-ratelimit` | **Date**: 2026-08-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/154-llm-session-ratelimit/spec.md`

## Summary

Implement a transparent, low-overhead anti-abuse mechanism for LLM generation endpoints. The app will fetch an opaque HMAC-signed capability token from a new `oracle-proxy` `/api/session` endpoint via an initial Turnstile handshake, then attach it to all generation requests. `oracle-proxy` will validate this signature instantly without network calls and enforce a sliding window rate limit of 100 requests per 10 minutes keyed by the token.

## Technical Context

**Language/Version**: TypeScript, Svelte 5 Runes, SvelteKit 2, Cloudflare Workers
**Primary Dependencies**: Cloudflare Turnstile, Web Crypto API
**Storage**: Cloudflare Rate Limiting binding, client-side `sessionStorage`
**Testing**: Vitest
**Target Platform**: Cloudflare Workers (`oracle-proxy`) and Browser (`apps/web`)
**Project Type**: Web Application & Serverless API Proxy
**Performance Goals**: <5ms overhead for token validation, zero network overhead for validation
**Constraints**: Non-blocking UX during handshake (queueing), no token storage in `localStorage`
**Scale/Scope**: All LLM operations in Codex Cryptica

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- [x] I. Library-First: Proxy changes reside in `apps/workers/oracle-proxy`.
- [x] II. TDD: Tests required for token issuance, validation, and queueing logic.
- [x] III. Simplicity & YAGNI: Utilizing native Web Crypto and existing Turnstile integration.
- [x] IV. AI-First Extraction: N/A directly, but secures the AI functionality.
- [x] V. Privacy: No accounts, fully anonymous tokens.
- [x] VI. Clean Implementation: Following Svelte 5 Runes.
- [x] VII. User Documentation: N/A (Internal security mechanism, no UI).
- [x] VIII. Dependency Injection: Ensure new token queueing manager uses DI.
- [x] X. Quality & Coverage: Tests will maintain worker coverage.

## Project Structure

### Documentation (this feature)

```text
specs/154-llm-session-ratelimit/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
apps/web/src/
├── lib/
│   └── services/
│       └── ai/
│           ├── ai-session-manager.ts   # Handles token fetching and queueing
│           └── ai-client-manager.ts    # Attaches token to outgoing requests

apps/workers/oracle-proxy/src/
├── session.ts               # Token minting and HMAC Web Crypto logic
├── index.ts                 # Route handling for /api/session and validation
```

**Structure Decision**: Added a session module to `oracle-proxy` for crypto logic. Added a session manager to `apps/web/src/lib/services/ai/` to orchestrate the Turnstile handshake and request queuing cleanly.
