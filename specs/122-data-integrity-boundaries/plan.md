# Implementation Plan: Data Integrity At Trust Boundaries

**Branch**: `122-data-integrity-boundaries` | **Date**: 2026-05-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/122-data-integrity-boundaries/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Implement strict Zod schema validation for data entering the system from external or local storage trust boundaries, and establish a safe, log-backed, and reversible migration system for local database schema upgrades.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 Runes  
**Primary Dependencies**: `zod` (validation), `idb` (IndexedDB wrapper)  
**Storage**: IndexedDB (Metadata/Cache), OPFS (Vault Files)  
**Testing**: Bun test  
**Target Platform**: Web application (Modern Browsers)  
**Project Type**: SvelteKit Web Application & Workspace Packages (`vault-engine`, `importer`, `schema`)  
**Performance Goals**: Minimal overhead (<5ms) during entity validation on bulk loads.  
**Constraints**: Graceful degradation (quarantine bad records) instead of throwing on initial load.  
**Scale/Scope**: Handling thousands of entities in the graph; migrations must be atomic or cleanly reversible.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- [x] **I. Library-First**: Logic for parsing and DB migration belongs in `packages/vault-engine` and `packages/importer`, not the web app.
- [x] **II. TDD**: Reversibility tests for migrations and invalid data quarantine tests are mandatory.
- [x] **III. Simplicity & YAGNI**: Use Zod for validation rather than reinventing a schema validator.
- [x] **IV. AI-First Extraction**: N/A
- [x] **V. Privacy & Client-Side**: All validation and snapshots happen strictly locally.
- [x] **VI. Clean Implementation**: Follows strict types and Svelte 5 runes.
- [x] **VIII. Dependency Injection**: Migration log services must be injectable.
- [x] **XII. Labels Over Tags**: Ensure schema validation enforces `labels` not `tags`.

## Project Structure

### Documentation (this feature)

```text
specs/122-data-integrity-boundaries/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
```

### Source Code (repository root)

```text
.
├── packages/
│   ├── schema/
│   │   ├── src/
│   │   │   └── entity.ts         # Zod schemas for entities
│   │   └── package.json
│   ├── vault-engine/
│   │   ├── src/
│   │   │   ├── migrations/       # Migration logic and snapshots
│   │   │   ├── repository.svelte.ts # Read-back validation
│   │   │   └── parser.ts         # Markdown YAML validation
│   │   └── tests/
│   │       ├── migrations.test.ts
│   │       └── validation.test.ts
│   └── importer/
│       ├── src/
│       │   └── utils/validation.ts # File extension checks
│       └── tests/
└── apps/
    └── web/
        └── src/
            └── lib/
                └── components/
                    └── settings/
                        └── ImportSettings.svelte
```

**Structure Decision**: Logic is heavily concentrated in the workspace packages (`schema`, `vault-engine`, `importer`) to adhere to the Library-First principle.
