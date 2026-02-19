# Implementation Plan: Visual Styling Templates

**Branch**: `028-styling-templates` | **Date**: 2026-01-31 | **Spec**: [link](./spec.md)
**Input**: Feature specification from `/specs/028-styling-templates/spec.md`

## Summary

Implement a multi-genre theming system ("Zen Templates") that allows users to shift the application's aesthetic between Sci-Fi, Fantasy, Modern, Cyberpunk, and Post-Apocalyptic styles. This includes dynamic CSS variable injection for the UI and style merging for the Cytoscape knowledge graph.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+
**Primary Dependencies**: Svelte 5, Cytoscape.js, Tailwind CSS 4.x, `idb` (for settings)
**Storage**: Vault Metadata (Markdown Frontmatter or `.codex/config.json`)
**Testing**: Vitest, Playwright
**Target Platform**: PWA (Mobile/Desktop)
**Performance Goals**: < 300ms theme switch latency
**Constraints**: Must work 100% offline (Law VIII)

## Constitution Check

- [x] **Local-First Sovereignty**: Theme selection persists in the local vault configuration.
- [x] **Relational-First Navigation**: Templates enhance rather than replace the relational graph.
- [x] **Sub-100ms Performance**: CSS variable switching is near-instant; Graph style updates must be optimized.
- [x] **Atomic Worldbuilding**: Theming engine is a standalone module.
- [x] **System-Agnostic Core**: Themes are purely aesthetic and do not impact game mechanics.
- [x] **Pure Functional Core**: Style derivation logic will be implemented as pure functions.
- [x] **Verifiable Reality**: E2E tests for theme application and persistence.
- [x] **Test-First PWA Integrity**: Assets (textures/fonts) must be cached for offline use.

## Phase 0: Outline & Research

1. **Research CSS Variable dynamic injection in Svelte 5**: Find the most performant way to swap global style tokens without full page reloads.
2. **Research Cytoscape.js style merging patterns**: Determine how to cleanly overlay "Genre" styles (node shapes, edge markers) on top of "Category" colors.
3. **PWA Asset Strategy**: Pattern for caching genre-specific textures (e.g., parchment, rusted metal) in the service worker.

## Phase 1: Design & Contracts

1. **Entities**: Define `StylingTemplate` and its schema.
2. **Persistence**: Update Vault config to store `activeTemplateId`.
3. **Component Architecture**: Create a `ThemeProvider` or Svelte Store to broadcast theme changes.

## Phase 2: Implementation

1. Scaffold Theme Store and global CSS variables.
2. Implement Template Selection UI in Settings.
3. Update Cytoscape renderer to respect active template.
4. Implement specific styles for the 5 requested genres.

## Phase 6: Campaign-Specific Persistence

1. **Vault Integration**: Connect `ThemeStore` to `VaultStore` lifecycle.
2. **IndexedDB Storage**: Implement vault-prefixed keys in IDB `settings` store for theme persistence.
3. **Multi-Campaign Validation**: Add E2E tests for theme isolation between vaults.
