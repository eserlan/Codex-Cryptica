# Codex-Cryptica Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-08-17

## Active Technologies

- TypeScript 6.0.3, Svelte 5.55.9 Runes, SvelteKit 2, Bun 1.3.14 + Existing `@codex/adventure-engine`, `@codex/ai-engine` (`AdventureTurnGenerationService`), `@codex/oracle-engine`, `dice-engine`, `schema`/Zod, `idb`; no new third-party dependency (2306-adventure-phase-2-play-tools)
- Extends the existing one-document-per-session OPFS layout (`.codex/adventures/<session-id>.json`, `AdventureSessionRepository`) with a `schemaVersion: 2` shape adding optional `dicePresets`, `resourceCounters`, and per-turn `resolvedRoll` fields; a `schemaVersion: 1` document loads unchanged with these fields defaulted empty/absent (2306-adventure-phase-2-play-tools)

- TypeScript 6.0.3, Svelte 5 Runes, SvelteKit 2, Bun 1.3.14 + Existing `chronology-engine`, Svelte components/stores, Playwright performance harness, Vitest (2147-timeline-agenda-bounded-rendering)
- N/A; deterministic benchmark data is synthetic and transient (2147-timeline-agenda-bounded-rendering)

- TypeScript, Cloudflare Workers runtime (no Node built-ins) + None new — Workers runtime `fetch`/`crypto` globals only, same as today's Gemini forwarding (`apps/workers/oracle-proxy` has no `package.json` of its own; built via Bun workspaces path resolution) (153-llm-model-registry)
- N/A — model registry is static in-code config, no database, no persistence this slice (FR-014) (153-llm-model-registry)

- TypeScript 6.0.3, Svelte 5 Runes, SvelteKit 2, Bun 1.3.14 + Zod/schema, `@codex/stat-sheet-engine`, existing (150-stat-sheet-marketplace)
- R2 for public listing/package records; IndexedDB vault-scoped (150-stat-sheet-marketplace)

- TypeScript 6.0.3, Bun 1.3.14 + Svelte 5 (Runes), SvelteKit 2 + `@codex/vault-engine`, Svelte 5 runes (`$state`, `$derived`, `$effect`), `diceRollerService`, `vttSessionService` (149-reusable-stat-sheets)
- Entity frontmatter (`statSheet`) via OPFS/IndexedDB in `vault.svelte.ts`; Stat Sheet templates stored in campaign IndexedDB/OPFS registry (149-reusable-stat-sheets)

- TypeScript 6.0.3 + Svelte 5 Runes, SvelteKit, Tailwind 4 (134-entity-navigation-history)
- N/A (In-memory session state) (134-entity-navigation-history)

- TypeScript 6.0.3 + Svelte 5 (Runes), SvelteKit, `@google/generative-ai` (Gemini SDK via `aiClientManager`), `@codex/vault-engine` (129-seo-landing-pages)
- `localStorage` (transient transfer), OPFS & IndexedDB (via vault stores) (129-seo-landing-pages)

- TypeScript 6.0.3 + Svelte 5 Runes, SvelteKit, `@google/generative-ai` (127-context-aware-entity-generator)
- OPFS (Vault Files), IndexedDB (via existing stores/vault.svelte.ts) (127-context-aware-entity-generator)

- TypeScript 6.0.3, Svelte 5 runes, Bun 1.3.14 workspace + Svelte 5, Cytoscape, `graph-engine`, `schema`, existing vault/entity stores, existing Tailwind 4 theme tokens (118-graph-important-label)

## Project Structure

```text
apps/
  web/
packages/
  graph-engine/
  schema/
specs/
.specify/
```

## Commands

bun run test
bun run lint

## Code Style

TypeScript 6.0.3, Svelte 5 runes, Bun 1.3.14 workspace: Follow standard conventions

## Recent Changes

- 2306-adventure-phase-2-play-tools: Added TypeScript 6.0.3, Svelte 5.55.9 Runes, SvelteKit 2, Bun 1.3.14 + Existing `@codex/adventure-engine`, `@codex/ai-engine` (`AdventureTurnGenerationService`), `@codex/oracle-engine`, `dice-engine`, `schema`/Zod, `idb`; no new third-party dependency

- 2147-timeline-agenda-bounded-rendering: Added TypeScript 6.0.3, Svelte 5 Runes, SvelteKit 2, Bun 1.3.14 + Existing `chronology-engine`, Svelte components/stores, Playwright performance harness, Vitest

- 153-llm-model-registry: Added TypeScript, Cloudflare Workers runtime (no Node built-ins) + None new — Workers runtime `fetch`/`crypto` globals only, same as today's Gemini forwarding (`apps/workers/oracle-proxy` has no `package.json` of its own; built via Bun workspaces path resolution)

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
