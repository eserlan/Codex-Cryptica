# Tasks: Oracle Image Generation

## Phase 1: Setup & Infrastructure
- [x] T001 Create `/images` directory in OPFS vault structure
- [x] T002 Update `packages/schema/src/search.ts` to include `type` and `imageUrl` in `SearchResult`
- [x] T003 Update `packages/schema/src/entity.ts` to ensure `image` field is in `EntitySchema`
- [x] T004 Add `VITE_GOOGLE_IMAGEN_KEY` support to `apps/web/.env.example`

## Phase 2: Core AI & Storage Services
- [x] T005 [P] Implement `generateImage(prompt: string)` in `apps/web/src/lib/services/ai.ts` using Gemini 2.5 Flash Image REST API
- [x] T006 [P] Implement `saveImageToVault(blob: Blob, entityId: string)` in `apps/web/src/lib/stores/vault.svelte.ts`
- [x] T007 Implement image intent detection in `apps/web/src/lib/stores/oracle.svelte.ts` `ask()` method
- [x] T008 Update `OracleStore` to handle `image` type messages and store `imageUrl`

## Phase 3: User Story 1 - Instant Visualizing [US1]
- [x] T009 [US1] Create `apps/web/src/lib/components/oracle/ImageMessage.svelte` for rendering generated images
- [x] T010 [P] [US1] Update `ChatMessage.svelte` to delegate image rendering to `ImageMessage.svelte`
- [x] T011 [US1] Implement loading/progress state for image generation in chat UI
- [x] T012 [US1] Ensure existing Lightbox component supports local blob URLs from generated images

## Phase 4: User Story 2 & 4 - Archiving & Drag-and-Drop [US2] [US4]
- [x] T013 [US2] Add "SAVE TO [ENTITY]" button to `ImageMessage.svelte`
- [x] T014 [US4] Implement `draggable="true"` and drag start handlers on chat images in `ImageMessage.svelte`
- [x] T015 [US4] Implement drop zone logic in `apps/web/src/lib/components/EntityDetailPanel.svelte` to accept images
- [x] T016 [US2] [US4] Verify image path persistence in entity frontmatter after button click or drop

## Phase 5: User Story 3 - Contextual Generation [US3]
- [x] T017 [US3] Update `ai.ts` `generateImage` to include active entity context in the prompt construction
- [x] T018 [P] [US3] Add unit tests for prompt enhancement logic in `apps/web/src/lib/services/ai.test.ts`

## Phase 6: Polish & Robustness
- [x] T019 Implement safety filter error handling in `ai.ts` and UI notifications
- [x] T020 [P] Add E2E tests for image generation and drag-and-drop in `apps/web/tests/e2e/image-gen.spec.ts`
- [ ] T021 [P] Verify offline availability of archived images in OPFS
- [ ] T022 Acceptance: Offline Functionality Verification (Principle VIII)

## Dependencies
- [US1] relies on T001, T005, T007
- [US2] relies on [US1], T006
- [US4] relies on [US2], T015
- [US3] relies on [US1], T017

## Implementation Strategy
1. **MVP**: T001-T012 (Generate and view image in chat).
2. **Persistence**: T013-T016 (Link to vault).
3. **Refinement**: T017-T022 (Context and edge cases).