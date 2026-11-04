## 2026-11-04 - Dependency Injection in Cloudflare Workers Route Handlers

**Learning:** Route handlers in this repository (e.g., in apps/workers/oracle-proxy/) often directly call `crypto.randomUUID()` and `new Date().toISOString()`. While some parts of the system (like `session.ts`) inject these as optional defaults, other route handlers (like `handleCreateTemplateListing`) do not.

**Action:** Injecting these dependencies via an optional `deps` parameter (defaulting to the native browser globals) is a safe and effective way to improve testability without affecting the existing application logic.
