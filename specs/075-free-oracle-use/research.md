# Research: Free Oracle Use (Advanced Tier)

## Dual-Path Fetch Strategy

### Decision

Implement a service-level switch that chooses between a direct Google API call (Sovereign Mode) and a Cloudflare Worker proxy call (System Mode).

### Rationale

This architecture allows users to start using the advanced AI features immediately without the friction of obtaining an API key. By using a Cloudflare Worker as a proxy, we can safely append a system-level API key to the requests without ever exposing it to the client side.

### Alternatives Considered

- **Shared Client Key**: Storing a restricted key in the client bundle. Rejected because it's harder to rotate and more vulnerable to abuse even with domain restrictions.
- **Backend-only processing**: Moving all AI logic to a server. Rejected to maintain the "Local-First" principle where the client remains the orchestrator.

## Model Selection

### Decision

Default all free/proxy use to the "Advanced Tier" model (Gemini 1.5 Pro).

### Rationale

To provide the best possible first impression and support complex sync features (Graph/Map), the Advanced model is required. Providing only a "Lite" trial would not demonstrate the app's full potential.

## Storage Migration

### Decision

Migrate global application settings (AI API Key, Tier) from legacy `idb` stores to a new `appSettings` table in the `CodexEntityDb` (Dexie).

### Rationale

Consolidating global state into the Dexie database provides a more modern, observable, and performant storage layer. It aligns with the project's direction established in feature 073 and simplifies database management by reducing the number of disparate IndexedDB instances the app needs to coordinate.

## Environment Detection

### Decision

Extend `IS_STAGING` to check for `window.location.pathname.includes("/staging")` in addition to hostnames and env vars.

### Rationale

Ensures the staging indicator and environment-specific behaviors (like dev-only proxy testing) work correctly across various deployment styles, including GitHub Pages subfolders.
