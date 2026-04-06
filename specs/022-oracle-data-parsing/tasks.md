# Tasks: Intelligent Oracle Data Separation

**Feature**: Intelligent Oracle Data Separation
**Branch**: `022-oracle-data-parsing`
**Status**: Ready

## Implementation Strategy

We will implement this feature in phases, starting with the core parsing logic and its verification, followed by UI integration for each user story. The parser will be a pure function in `packages/editor-core`, allowing for robust unit testing. The UI will be updated incrementally to support structured and unstructured data separation.

## Dependencies

- **User Story 1** depends on **Foundational Parsing Logic**
- **User Story 2** depends on **User Story 1** (fallback logic)
- **User Story 3** depends on **User Story 1** and **User Story 2** (UI preview)

## Parallel Execution

- T001 and T002 can be done in parallel.
- Once T004 is complete, T005 and T006 can be done in parallel.

---

## Phase 1: Setup

- [ ] T001 [P] Ensure directory exists for parsing logic in `packages/editor-core/src/parsing/`
- [ ] T002 [P] Update `packages/editor-core/src/index.ts` to export future parsing utilities

## Phase 2: Foundational Parsing Logic

- [ ] T003 Create unit test suite for Oracle parser in `packages/editor-core/src/parsing/oracle.test.ts`
- [ ] T004 Implement pure functional parser with marker detection in `packages/editor-core/src/parsing/oracle.ts`

## Phase 3: User Story 1 - Intelligent "Copy to Node" (Priority: P1)

**Goal**: Automatically split content by markers and update node fields.
**Independent Test**: Provide text with `## Chronicle` and `## Lore` headers, click "Apply", and verify both fields in the vault update correctly.

- [ ] T005 [P] [US1] Define `OracleParseResult` interface in `packages/editor-core/src/parsing/oracle.ts`
- [ ] T006 [P] [US1] Implement marker stripping logic in `packages/editor-core/src/parsing/oracle.ts`
- [ ] T007 [US1] Update `apps/web/src/lib/components/oracle/ChatMessage.svelte` to use the new parser for structured content
- [ ] T008 [US1] Implement `applyIntelligent` function in `apps/web/src/lib/components/oracle/ChatMessage.svelte` to update `vault` store

## Phase 4: User Story 2 - Heuristic Fallback (Priority: P2)

**Goal**: Support separation for unstructured text using paragraph heuristics.
**Independent Test**: Provide text with two paragraphs and no headers, click "Apply", and verify first paragraph goes to Chronicle and second to Lore.

- [ ] T009 [US2] Update parser in `packages/editor-core/src/parsing/oracle.ts` to include paragraph-based heuristic fallback
- [ ] T010 [US2] Add unit tests for heuristic fallback scenarios in `packages/editor-core/src/parsing/oracle.test.ts`
- [ ] T011 [US2] Ensure `wasSplit` flag correctly reflects heuristic separation in `packages/editor-core/src/parsing/oracle.ts`

## Phase 5: User Story 3 - Visual Confirmation (Priority: P3)

**Goal**: Show a preview of the split before applying.
**Independent Test**: Hover over the "Apply All" button and verify a tooltip or highlight shows which text belongs to which field.

- [ ] T012 [US3] Implement preview tooltip/popover in `apps/web/src/lib/components/oracle/ChatMessage.svelte`
- [ ] T013 [US3] Add visual highlight for "Chronicle" vs "Lore" sections in the chat message when hovering "Apply All"

## Phase 6: Polish & Cross-cutting Concerns

- [ ] T014 Ensure sub-100ms performance for parsing and UI updates
- [ ] T015 Verify offline functionality for the parsing logic
- [ ] T016 Run final integration tests (Playwright) for the end-to-end "Generate -> Apply" flow in `apps/web/tests/oracle.spec.ts`
