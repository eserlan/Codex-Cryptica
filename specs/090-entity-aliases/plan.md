# Implementation Plan: Entity Alias Support

**Branch**: `090-entity-aliases` | **Date**: 2026-04-23 | **Spec**: [./spec.md](./spec.md)
**Input**: Feature specification from `/specs/090-entity-aliases/spec.md`

## Summary

Add support for alternative names (aliases) to world entities. This involves updating the core entity schema to include an `aliases` array, modifying the search engine to index these aliases with high weight, and updating multiple UI surfaces (Entity Explorer list and Zen Mode header/edit-mode) to display and manage aliases.

## Technical Context

**Language/Version**: TypeScript 5.9.3, Svelte 5 (Runes)
**Primary Dependencies**: SvelteKit web app, `zod` for schema validation, `flexsearch` via `@codex/search-engine`, `js-yaml` for frontmatter.
**Storage**: OPFS (via `VaultRepository`) using YAML frontmatter in Markdown files.
**Testing**: Vitest for unit tests (schema, search engine, stores) and Svelte Testing Library for UI components.
**Target Platform**: Web application (Desktop/Mobile browsers).
**Project Type**: Monorepo web application with workspace packages.
**Performance Goals**: Alias search results should return in <100ms; UI rendering must maintain 60fps scrolling in Entity Explorer.
**Constraints**: Must remain 100% client-side; must adhere to existing frontmatter parsing patterns.
**Scale/Scope**: Impacts `packages/schema`, `packages/search-engine`, and `apps/web` (stores and components).

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

1. **Library-First**: Pass. Core schema change lives in `packages/schema`. Search weighting logic lives in `packages/search-engine`.
2. **TDD**: Pass. Plan includes unit tests for the schema update and search indexing _before_ UI implementation.
3. **Simplicity & YAGNI**: Pass. Using existing YAML frontmatter and FlexSearch capabilities rather than a new indexing system.
4. **AI-First Extraction**: Pass. The Oracle (Gemini) can naturally populate the `aliases` field during entity creation (out of scope for this task but supported by schema).
5. **Privacy & Client-Side Processing**: Pass. All indexing and display logic remains client-side.
6. **Clean Implementation**: Pass. Adhering to Svelte 5 Runes and `@docs/STYLE_GUIDE.md`.
7. **User Documentation**: Pass. Plan includes updating `help-content.ts` with alias-based discovery info.
8. **Dependency Injection**: Pass. Using existing DI patterns in `SearchStore` and `EntityStore`.
9. **Natural Language**: Pass. Using the term "Alias" which is standard and approachable.
10. **Quality & Coverage Enforcement**: Pass. Will add tests to maintain coverage floors.

## Project Structure

### Documentation (this feature)

```text
specs/090-entity-aliases/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
packages/
├── schema/src/entity.ts      # Update EntitySchema
└── search-engine/src/index.ts # Update indexing/weighting

apps/web/src/lib/
├── components/
│   ├── explorer/EntityList.svelte # Display aka: Alias 1, Alias 2
│   ├── zen/ZenHeader.svelte       # NEW: Host AliasInput in edit mode; display aliases in read-only
│   └── labels/AliasInput.svelte   # NEW: UI for managing aliases (patterned after LabelInput)
├── stores/
│   ├── vault/entity-store.svelte.ts # CRUD methods if needed
│   └── vault/search-store.svelte.ts # Pass aliases to search engine
└── config/help-content.ts           # Documentation
```

**Structure Decision**: Standard monorepo distribution: Schema changes in `packages/schema`, search logic in `packages/search-engine`, and UI/State logic in `apps/web`. A new `AliasInput` component will be created to maintain modularity.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| N/A       |            |                                      |
