# Implementation Plan: Oracle Store Refactor

**Branch**: `067-oracle-store-refactor` | **Date**: 2026-03-11 | **Spec**: `/specs/067-oracle-store-refactor/spec.md`
**Input**: Feature specification from `/specs/067-oracle-store-refactor/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Refactor the monolithic `OracleStore` into smaller, modular, and independently testable services (`ChatHistoryService`, `OracleCommandParser`, `OracleActionExecutor`, `OracleGenerator`, `OracleSettingsService`, `UndoRedoService`). To align with the **Library-First** principle, these services will be implemented in a new `packages/oracle-engine` workspace, leaving `OracleStore` as an ultra-thin UI state controller (< 150 LOC).

## Technical Context

**Language/Version**: TypeScript 5.9.3
**Primary Dependencies**: Svelte 5 (Runes), IndexedDB (`idb`)
**Storage**: IndexedDB (via `ChatHistoryService` and `OracleSettingsService`)
**Testing**: Vitest (for unit testing the extracted services in isolation)
**Target Platform**: Web Browser (Client-side)
**Project Type**: Web application (`apps/web`) + Library Package (`packages/oracle-engine`)
**Performance Goals**: N/A
**Constraints**: Must maintain existing BroadcastChannel sync logic for cross-tab communication.
**Scale/Scope**: ~1600 LOC extraction into a new package, with minimal logic left in the web app.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **I. Library-First**: All business and infrastructure logic (parsing, execution, generation, undo/redo, settings, and chat history) will be extracted into a standalone package `packages/oracle-engine`.
- **II. Test-Driven Development (TDD)**: The refactoring mandates 100% test coverage for new services.
- **III. Simplicity & YAGNI**: Breaking down a God Object directly aligns with simplicity.
- **IV. AI-First Extraction**: AI logic and settings isolated.
- **V. Privacy & Client-Side Processing**: Logic remains 100% browser-native.
- **VI. Clean Implementation**: Utilizes Svelte 5 `$state` and standard TypeScript classes.
- **VII. User Documentation**: Will verify Oracle help content.

## Project Structure

### Documentation (this feature)

```text
specs/067-oracle-store-refactor/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── contracts/           # Phase 1 output
```

### Source Code (repository root)

```text
packages/oracle-engine/
├── package.json
├── src/
│   ├── chat-history.svelte.ts # Extracted: Persistence & Sync + Mutations
│   ├── oracle-executor.ts     # Extracted: Command logic
│   ├── oracle-generator.ts    # Extracted: AI prompt & RAG orchestration
│   ├── oracle-settings.svelte.ts # Extracted: API keys & Tier management
│   ├── undo-redo.svelte.ts    # Extracted: Undo/Redo stack
│   └── oracle-parser.ts       # Extracted: Regex & Intent
└── tests/
    └── unit/                  # 100% coverage for engine logic

apps/web/
└── src/
    └── lib/
        └── stores/
            ├── oracle.svelte.ts       # Ultra-thin UI wrapper (< 150 LOC)
            └── oracle.test.ts         # Integration tests
```

**Structure Decision**: The logic is moved to `packages/oracle-engine` to follow the Library-First mandate. `apps/web` will import these services and manage the reactive UI state.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| None      |            |                                      |
