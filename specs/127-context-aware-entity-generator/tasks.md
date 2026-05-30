# Tasks: Context-Aware Entity Generator

**Input**: Design documents from `/specs/127-context-aware-entity-generator/`
**Prerequisites**: plan.md (required), spec.md (required)

**Organization**: Tasks are grouped by foundational architecture and user story to enable independent implementation and testing.

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Core prompt building, AI generation logic, and unit testing infrastructure. No UI work can begin until this phase is complete.

- [x] T001 [P] Implement `buildRelatedEntityGenerationPrompt` in `apps/web/src/lib/services/ai/prompts/related-entity-generation.ts`.
- [x] T002 [P] Write prompt unit tests in `apps/web/src/lib/services/ai/prompts/related-entity-generation.test.ts`.
- [x] T003 [P] Implement `generateRelatedEntity` in `TextGenerationService` (`apps/web/src/lib/services/ai/text-generation.service.svelte.ts`).
- [x] T004 Write service-level unit tests in `apps/web/src/lib/services/ai/text-generation.service.test.ts`.

**Checkpoint**: Foundational prompt and service layer complete and fully tested.

---

## Phase 2: User Story 1 - Generate Related Action and Modal (Priority: P1) 🎯 MVP

**Goal**: Render the "Generate Related" action trigger and display the lightweight configuration modal.

- [x] T005 [P] Create configuration wizard component `RelatedEntityModal.svelte` (renders Type dropdown, Relationship dropdown + input, Custom instructions input).
- [x] T006 [P] Integrate the "Generate Related" action button in `DetailStatusTab.svelte` and `ZenContent.svelte` to launch the modal.
- [x] T007 Write unit tests verifying configuration UI options and dynamic relationship loading in `apps/web/src/lib/components/entity-detail/RelatedEntityModal.test.ts`.

**Checkpoint**: Configuration UI and modal wizard are fully functional and interactive.

---

## Phase 3: User Story 2 - Context-Aware Generation (Priority: P1)

**Goal**: Compile active entity + neighbor context, trigger AI generation, and display the preview.

- [x] T008 [P] Implement neighbor gathering logic in `RelatedEntityModal` to query direct graph connections (Title, Type, Relationship, and Chronicle content).
- [x] T009 [P] Connect the modal "Generate" trigger to the `TextGenerationService` and implement loading/progress UI.
- [x] T010 Parse the AI JSON output and bind the generated draft entity to the review stage within the modal.
- [x] T011 Write tests for the context compilation and draft parsing integration.

**Checkpoint**: AI-grounded draft entity generation and preview works end-to-end.

---

## Phase 4: User Story 3 - Review, Edit, and Save Draft (Priority: P1)

**Goal**: Allow editing draft fields, saving the entity, regenerating, or cancelling.

- [x] T012 [P] Bind generated draft fields (name, summary, description, labels, plotHook) to editable form fields on the review screen.
- [x] T013 [P] Implement the "Create Entity" save handler (creates new entity and directed connection in the vault).
- [x] T014 Implement the "Regenerate" trigger and "Cancel" handler (closing the modal clean).
- [x] T015 Write unit tests for draft editing and saving behaviors.

**Checkpoint**: Generated entities can be successfully customized and persisted to the vault.

---

## Phase 5: User Story 4 - Link back to Source Entity (Priority: P2)

**Goal**: Automate directed relationship links from Source → New Entity.

- [x] T016 Ensure the save handler creates the directed connection edge using `vault.addConnection` and verify in unit tests.

---

## Phase 6: User Story 5 - "Surprise Me" Option (Priority: P2)

**Goal**: AI-driven dynamic target type and relationship selection.

- [x] T017 Wire up the "Surprise Me" target option in the dropdown and teach prompt instructions to dynamically pick a fitting category from allowed vault categories.

---

## Phase 7: Polish & Documentation

**Purpose**: Help guidelines, cross-cutting checks, and final testing.

- [x] T018 Add user-facing help description article about "Generate Related" in `apps/web/src/lib/content/help/generate-related.md` (or equivalent help store).
- [x] T019 Run full package build and test suite (`bun run test` + `bun run lint`) to verify 0 regressions.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: Can start immediately. Blocks all UI and integration phases.
- **User Story 1 (Phase 2)**: Depends on Phase 1. Blocks User Story 2 (requires the modal).
- **User Story 2 (Phase 3)**: Depends on Phase 2. Blocks User Story 3 (requires the generated draft).
- **User Story 3 (Phase 4)**: Depends on Phase 3.
- **User Story 4 & 5 (Phase 5 & 6)**: Can run in parallel after Phase 4 is complete.
- **Polish (Phase 7)**: Runs at the end.
