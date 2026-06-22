# Codex-Cryptica Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-06-22

## Active Technologies

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

- 134-entity-navigation-history: Added TypeScript 6.0.3 + Svelte 5 Runes, SvelteKit, Tailwind 4

- 129-seo-landing-pages: Added TypeScript 6.0.3 + Svelte 5 (Runes), SvelteKit, `@google/generative-ai` (Gemini SDK via `aiClientManager`), `@codex/vault-engine`

- 127-context-aware-entity-generator: Added TypeScript 6.0.3 + Svelte 5 Runes, SvelteKit, `@google/generative-ai`

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
