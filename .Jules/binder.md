## 2026-11-04 - Dependency Injection in Cloudflare Workers Route Handlers

**Learning:** Route handlers in this repository (e.g., in apps/workers/oracle-proxy/) often directly call `crypto.randomUUID()` and `new Date().toISOString()`. While some parts of the system (like `session.ts`) inject these as optional defaults, other route handlers (like `handleCreateTemplateListing`) do not.

**Action:** Injecting these dependencies via an optional `deps` parameter (defaulting to the native browser globals) is a safe and effective way to improve testability without affecting the existing application logic.
## 2024-05-20 - Inject ID generator in `selectAdventureForPlay`

**Learning:** `selectAdventureForPlay` used `crypto.randomUUID()` to generate fallback UUIDs deep within the business logic. While a small detail, this hardcoded infrastructure dependency made tests harder to write without global mocking if we needed deterministic output. The repository already has a `@codex/runtime` package providing a `systemIdGenerator` that gracefully falls back if `crypto` is unavailable.

**Action:** Replaced `crypto.randomUUID()` with an injectable `IdGenerator` dependency. We used `systemIdGenerator` from `@codex/runtime` as the default to preserve production behavior while exposing the seam for tests. Future helper functions should similarly accept `idGenerator: IdGenerator = systemIdGenerator` instead of directly relying on the global `crypto` object.
