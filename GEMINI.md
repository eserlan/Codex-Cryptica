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

- TypeScript 5.x, Node.js 20+ (dev), Browser Runtime + `googleapis` or `gapi-script` (003-gdrive-mirroring)
- OPFS (Origin Private File System) / IndexedDB (Metadata) (003-gdrive-mirroring)
- FlexSearch (004-fuzzy-search)
- @sveltejs/adapter-static (005-gh-pages-deploy)
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

## Recent Changes
- 017-sync-refinement: Added TypeScript 5.x, Node.js 20+ + Google Drive API v3, Svelte 5, `idb`
- 014-graph-focus-mode: Added TypeScript 5.x / Node.js 20+ + Cytoscape.js, Svelte 5
- 012-minimap: Added TypeScript 5.x / Node.js 20+ + Cytoscape.js (Graph Engine), Svelte 5 (UI Framework)


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
