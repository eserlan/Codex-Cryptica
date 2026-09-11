# Implementation Plan: Turnstile-signed Session Token & Rate Limiting

**Branch**: `154-llm-session-ratelimit` | **Date**: 2026-08-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/154-llm-session-ratelimit/spec.md`

## Summary

Implement a transparent, low-overhead anti-abuse mechanism for LLM generation endpoints. The app will fetch an HMAC-signed capability token from a new `oracle-proxy` `/api/session` endpoint via an initial Turnstile handshake, then attach it as `Authorization: Bearer <token>` to all generation requests. `oracle-proxy` will validate this signature instantly without network calls and apply Cloudflare Rate Limiting bindings keyed by the token id (5 req/10s burst + 20 req/60s sustained).

Token acquisition, queueing, attachment and 401 refresh live in `packages/ai-engine` and are wired into the existing `DefaultAIClientManager`, which already owns every proxy call (generation pipeline and interactions path). No second AI transport layer is introduced.

## Technical Context

**Language/Version**: TypeScript, Svelte 5 Runes, SvelteKit 2, Cloudflare Workers
**Primary Dependencies**: Cloudflare Turnstile, Web Crypto API
**Storage**: Cloudflare Rate Limiting bindings (native `[[ratelimits]]`, periods limited to 10s/60s), client-side `sessionStorage`
**Testing**: Vitest
**Target Platform**: Cloudflare Workers (`oracle-proxy`) and Browser (`apps/web`)
**Project Type**: Web Application & Serverless API Proxy
**Performance Goals**: <5ms overhead for token validation, zero network overhead for validation
**Constraints**: Non-blocking UX during handshake (queueing), no token storage in `localStorage`
**Scale/Scope**: All LLM operations in Codex Cryptica

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- [x] I. Library-First: Proxy changes reside in `apps/workers/oracle-proxy`; client session logic is a reusable module in `packages/ai-engine`, not app code.
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
packages/ai-engine/src/
├── session-manager.ts       # NEW: Turnstile handshake, token cache, queueing, refresh
└── client-manager.ts        # EXISTING: DefaultAIClientManager — attaches token, handles 401 replay

apps/workers/oracle-proxy/src/
├── session.ts               # Token minting and HMAC Web Crypto logic
├── turnstile.ts             # EXISTING: reuse verifyTurnstile()
├── index.ts                 # Route handling for /api/session, token validation, rate limiting
└── wrangler.toml            # EXISTING [[ratelimits]] pattern extended with two LLM limiters
```

**Structure Decision**:

- A session module in `oracle-proxy` holds the crypto logic; `verifyTurnstile()` in `turnstile.ts` is reused as-is (it already validates the challenge server-side plus hostname and optional action).
- The client-side session mechanism is a small reusable component in **`packages/ai-engine`**, not `apps/web`. The shared AI client manager already lives at `packages/ai-engine/src/client-manager.ts` and owns the proxy calls for both the provider-neutral generation pipeline and the interactions path. Putting token handling in `apps/web` would create a second AI transport layer and risk missing calls. `DefaultAIClientManager` obtains and attaches the token centrally — one choke point for virtually every text LLM request.
- `DefaultAIClientManager` already takes an injected `fetcher` in its constructor; the session manager is injected the same way (Constitution VIII), so tests supply a fake without stubbing globals.
