# Codex-Cryptica Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-01-26

## Active Technologies

- TypeScript 5.x / Node.js 20+ + `@google/generative-ai` (for context), Browser Native `fetch` (for Imagen REST API), `idb` (for metadata) (011-oracle-image-gen)
- OPFS (Origin Private File System) for binary images, Markdown (frontmatter) for entity linkage. (011-oracle-image-gen)
- TypeScript 5.x / Node.js 20+ + Cytoscape.js (Graph Engine), Svelte 5 (UI Framework) (012-minimap)
- N/A (Transient UI state) (012-minimap)
- TypeScript 5.x / Node.js 20+ + Cytoscape.js, Svelte 5 (014-graph-focus-mode)
- N/A (UI-only state) (014-graph-focus-mode)
- TypeScript 5.x, Node.js 20+ + Google Drive API v3, Svelte 5, `idb` (017-sync-refinement)
- OPFS (Vault), IndexedDB (Metadata Store) (017-sync-refinement)
- TypeScript 5.x, Node.js 20+ + Svelte 5, Cytoscape.js, `@google/generative-ai` (018-perf-improvements)
- OPFS (Origin Private File System), IndexedDB (via `idb`) (018-perf-improvements)
- TypeScript 5.x / Node.js 20+ + `@google/generative-ai`, FlexSearch, Svelte 5 (019-oracle-rag-improvements)
- IndexedDB (Chat History), Markdown (Vault) (019-oracle-rag-improvements)
- TypeScript 5.x / Node.js 20+ + Svelte 5, FlexSearch, marked (markdown parsing) (020-help-guide-system)
- LocalStorage (progress tracking), Static JSON/Markdown (content) (020-help-guide-system)
- TypeScript 5.x / Node.js 20+ + Svelte 5 (UI Framework), `packages/editor-core` (for content handling logic) (022-oracle-data-parsing)
- OPFS (Markdown files with YAML frontmatter) (022-oracle-data-parsing)
- TypeScript 5.x / Node.js 20+ + Svelte 5, Cytoscape.js, FlexSearch, `editor-core` (024-delete-nodes)
- OPFS / Local Directory (Markdown files with YAML frontmatter) (024-delete-nodes)
- TypeScript 5.x / Node.js 20+ + Svelte 5, Turborepo, Vitest, Playwright (026-world-timeline)
- OPFS / Local File System (Markdown + YAML Frontmatter) (026-world-timeline)
- TypeScript 5.x / Node.js 20+ + Svelte 5, Cytoscape.js, Tailwind CSS 4.x, `idb` (for settings) (028-styling-templates)
- Vault Metadata (Markdown Frontmatter or `.codex/config.json`) (028-styling-templates)
- OPFS (Origin Private File System) via `editor-core`. (031-import-file-content)
- TypeScript 5.x + `cytoscape` (Core), `svelte` (UI) (032-central-node-orbit)
- N/A (Transient view state) (032-central-node-orbit)
- TypeScript 5.x + `cytoscape` (Graph Visualization), `svelte` (UI), `zod` (Validation) (033-connection-labels)
- Markdown YAML Frontmatter (Local-First) via `vault` store (033-connection-labels)
- TypeScript 5.x / Node.js 20+ + Svelte 5, Cytoscape.js, FlexSearch, `idb` (034-fog-of-war)
- OPFS (Vault Files), IndexedDB (Metadata), LocalStorage (UI State) (034-fog-of-war)

- TypeScript 5.x, Node.js 20+ (dev), Browser Runtime + `googleapis` or `gapi-script` (003-gdrive-mirroring)
- OPFS (Origin Private File System) / IndexedDB (Metadata) (003-gdrive-mirroring)
- FlexSearch (004-fuzzy-search)
- `@sveltejs/adapter-static` (005-gh-pages-deploy)
- IndexedDB Caching (007-scalability-hardening)
- Google Gemini API (008-lore-oracle)
- Tailwind CSS 4.x / Svelte 5 (009-mobile-ux-sync-feedback)

## Project Structure

```text
apps/
  web/          # SvelteKit application
packages/
  editor-core/  # Markdown editing logic
  graph-engine/ # Visualization logic
  schema/       # Shared data models
specs/          # Feature specifications
```

## Commands

npm test; npm run lint

## Code Style

TypeScript: Follow standard conventions

## Implementation Guardrails (AI Guidelines)

- **Prefix Unused Vars**: Always prefix unused callback parameters or variables with an underscore (e.g., `_evt`) to satisfy strict `no-unused-vars` linting rules.
- **Svelte 5 Reactivity**: Avoid initializing `$state` directly from props (e.g., `let x = $state(prop)`). Use `$derived` for data that should stay in sync, or ensure the intent of a local-only copy is clear to avoid `state_referenced_locally` warnings.
- **Tailwind 4 Syntax**: Use Tailwind 4's `@reference`, `@theme`, and `@apply` rules correctly in Svelte `<style>` blocks. Ignore standard CSS linter warnings for these specific at-rules.
- **Package Type Safety**: When modifying or creating packages, ensure `node` types are included in `tsconfig.json` if the code uses Node globals (e.g., `Buffer`, `process`, `fs`).
- **Branching Strategy**: Always create a new branch for code changes, fixes, improvements, or refactoring. Never commit directly to the main branch.

## Recent Changes

- 036-oracle-undo: Implemented undo/revert capabilities for AI actions (Smart Apply, Create Node) and added global undo shortcut (Ctrl+Z).
- 038-staging-environment: Implemented parallel staging deployment at /staging with auto-enabled debug tools.
- 035-patreon-support-link: Added Patreon support link to footer (Addresses #75)
- 034-fog-of-war: Added TypeScript 5.x / Node.js 20+ + Svelte 5, Cytoscape.js, FlexSearch, `idb`
- 033-connection-labels: Added TypeScript 5.x + `cytoscape` (Graph Visualization), `svelte` (UI), `zod` (Validation)
- 032-central-node-orbit: Added TypeScript 5.x + `cytoscape` (Core), `svelte` (UI)

<!-- MANUAL ADDITIONS START -->

- **Staging Environment**: Accessible at `/staging`. Features `VITE_STAGING=true` which enables the `DebugConsole` for on-device diagnostics without affecting production.
- **Pre-commit Hooks**: Husky and lint-staged are active. Runs `eslint --fix` and `prettier --write` on staged files.
