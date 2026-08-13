# Tasks: VTT Domain Extraction

**Input**: Design documents from `/specs/1661-extract-vtt-domain/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

## Phase 1: Setup

- [x] T001 Add the VTT domain module export in `packages/map-engine/src/index.ts`.

## Phase 2: Foundational

- [x] T002 Define the framework-independent VTT types and normalization contract in `packages/map-engine/src/vtt.ts`.

## Phase 3: User Story 1 - Preserve VTT sessions across the application (P1)

**Goal**: Keep saved VTT sessions valid and behaviorally unchanged after extraction.

**Independent Test**: Normalize a session containing legacy visibility, invalid selection, and invalid turn state.

- [x] T003 [P] [US1] Add success and invalid-session tests in `packages/map-engine/src/vtt.test.ts`.
- [x] T004 [US1] Implement token and encounter-session normalization in `packages/map-engine/src/vtt.ts`.
- [x] T005 [US1] Replace the web VTT type definition with a compatibility re-export in `apps/web/src/types/vtt.ts`.
- [x] T006 [US1] Consume package token normalization in `apps/web/src/lib/stores/vtt/vtt-token-manager.svelte.ts`.
- [x] T007 [US1] Consume package session normalization in `apps/web/src/lib/stores/vtt/vtt-session-snapshot-manager.ts`.
- [x] T008 [US1] Extend regression coverage in `apps/web/src/lib/stores/vtt/vtt-session-snapshot-manager.test.ts`.

## Phase 4: User Story 2 - Change VTT rules safely (P2)

**Goal**: Verify the package boundary directly.

**Independent Test**: Run the package test file without loading web code.

- [x] T009 [US2] Verify `packages/map-engine/src/vtt.ts` has no `apps/web` imports and package tests exercise the public API.

## Phase 5: Polish & Cross-Cutting Concerns

- [x] T010 Run `bun run lint` and `bun run test` from the repository root.
- [x] T011 Update the completed task markers in `specs/1661-extract-vtt-domain/tasks.md`.

## Dependencies & Execution Order

- T001 and T002 establish the package boundary.
- T003 precedes T004.
- T005 through T008 depend on T004.
- T009 through T011 run after the integration tasks.
