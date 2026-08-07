# Phase 0: Research

All technical approaches and architectural decisions were resolved during the specification and clarification phases. No unresolved questions remain.

## Decisions

- **Token Format**: Opaque HMAC-signed string using Web Crypto API to ensure <5ms validation without network overhead.
- **Queueing Strategy**: The UI will transparently queue generation requests made before the initial Turnstile token handshake finishes, using an async orchestrator in `apps/web`.
- **Rate Limiting**: Cloudflare Rate Limiting bindings will be used to enforce a 100 requests / 10 minutes cap per session token.
