# Implementation Tasks: QuickNote Fast Scratchpad & AI Entity Elevation

**Feature**: Spec 109 - QuickNote Scratchpad  
**Plan**: [plan.md](./plan.md)  
**Spec**: [spec.md](./spec.md)

## Phase 1: Setup

- [ ] T001 Initialize the IndexedDB `quick_notes` store schema in `apps/web/src/lib/services/database.ts`
- [ ] T002 Configure the global hotkey (`Ctrl+I` / `Cmd+I`) listener in `apps/web/src/routes/(app)/+layout.svelte`

## Phase 2: Foundational

- [ ] T003 Implement `QuickNoteService` with constructor-based DI in `apps/web/src/lib/services/QuickNoteService.ts`
- [ ] T004 Implement `QuickNoteStore` using Svelte 5 Runes in `apps/web/src/lib/stores/quicknote.svelte.ts`

## Phase 3: User Story 1 - Instant Idea Dump [US1]

**Goal**: Capture ideas instantly via a floating scratchpad with auto-save.

**Independent Test**: Press `Ctrl+I`, type a note, refresh, and verify the note persists.

- [ ] T005 [P] [US1] Create the floating `QuickNoteScratchpad.svelte` component in `apps/web/src/lib/components/quicknote/`
- [ ] T006 [P] [US1] Implement the multi-note history list UI in `apps/web/src/lib/components/quicknote/NoteHistory.svelte`
- [ ] T007 [US1] Integrate hotkey and UI toggle triggers in `QuickNoteStore`
- [ ] T008 [US1] Implement debounced auto-save and manual save actions in `QuickNoteScratchpad.svelte`
- [ ] T008a [US1] Build the glassmorphic **Floating Action Bubble (FAB)** at the bottom-right corner with a pulse ring animation when active drafts exist
- [ ] T008b [US1] Integrate a glowing amber/orange count badge on the leftmost **Activity Bar** icon `[⚡]`
- [ ] T008c [US1] Add a compact draft counter pill (`[ X ⚡ Drafts ]`) in the **Campaign Header** near the active vault name

## Phase 4: User Story 2 - AI Entity Elevation [US2]

**Goal**: Transform raw notes into structured wiki entities via the Oracle.

**Independent Test**: Click "Elevate" on a note and verify the Entity Proposer opens with valid AI-generated fields.

- [ ] T009 [P] [US2] Implement the `elevate` method in `QuickNoteService.ts` using `textGenerationService.generateStructuredEntity`
- [ ] T010 [US2] Add the "Elevate" action button to `apps/web/src/lib/components/quicknote/NoteItem.svelte`
- [ ] T011 [US2] Wire elevation success to the `proposerStore` in `apps/web/src/lib/stores/proposer.svelte.ts`
- [ ] T012 [US2] Implement archival logic to mark notes as `elevated` ONLY upon successful proposer approval in `QuickNoteService.ts`

## Phase 5: User Story 3 - Visual Brainstorming [US3]

**Goal**: Visualize and interact with notes as dotted nodes on the relationship graph.

**Independent Test**: Open the graph and verify active notes appear as golden dotted nodes.

- [ ] T013 [P] [US3] Add the `.quicknote` style selector to `packages/graph-engine/src/GraphStyles.ts`
- [ ] T014 [US3] Update `packages/graph-engine/src/transformer.ts` to include active notes in the graph element stream
- [ ] T015 [US3] Implement click handlers in `apps/web/src/lib/components/GraphView.svelte` to open the scratchpad for a specific note
- [ ] T016 [US3] Integrate `QuickNoteService` results into the global search logic in `apps/web/src/lib/services/search.svelte.ts`

## Phase 6: Polish & Cross-Cutting

- [ ] T017 Add unit tests for `QuickNoteService` in `apps/web/src/lib/services/QuickNoteService.test.ts` (Maintain 70% coverage)
- [ ] T018 Add snapshot verification for Oracle elevation in `apps/web/src/lib/services/ai/text-generation.service.test.ts` (Maintain 70% coverage)
- [ ] T019 Verify <150ms scratchpad activation latency using Chrome DevTools
- [ ] T020 Add QuickNote user documentation to `apps/web/src/lib/config/help-content.ts`

## Dependencies

1. Phase 1 & 2 (Setup & Foundational) MUST be completed before User Story implementation.
2. `QuickNoteService` (T003) is a prerequisite for all UI and Graph integration tasks.
3. Graph styling (T013) MUST be completed before Graph transformer updates (T014).

## Implementation Strategy

1. **MVP**: Complete Phase 1-3 to provide the core "Instant Idea Dump" capability.
2. **Incremental**: Add AI Elevation (Phase 4) followed by Visual Brainstorming (Phase 5).
3. **Safety**: Every database and service change MUST include unit tests (Phase 6).
