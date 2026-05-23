# Tasks: Default Art Prompts

**Input**: Design documents from `/specs/115-default-art-prompts/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/art-direction-resolver-contract.md

**Tests**: Required by FR-020. Write tests first and confirm they fail before implementation.

**Organization**: Tasks are grouped by user story so each story can be implemented and verified independently after the shared resolver foundation is in place.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files and has no dependency on another incomplete task
- **[Story]**: Which user story the task supports
- Every task includes exact file paths

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the branch and add the empty resolver test/implementation files used by later phases.

- [ ] T001 Confirm the working branch is `115-default-art-prompts` and the worktree is ready with `git status --short --branch`
- [ ] T002 Create `packages/schema/src/art-direction.test.ts` with a skipped or placeholder `describe("art direction resolver")` block
- [ ] T003 [P] Create `packages/schema/src/art-direction.ts` exporting placeholder resolver types needed by tests

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the pure shared resolver and exports. No draw surface should be integrated before this phase is complete.

**CRITICAL**: User story work depends on these resolver contracts and shipped defaults.

- [ ] T004 Add failing resolver tests for empty fallback, `{subject}` insertion, missing placeholder handling, repeated placeholder handling, and fallback metadata in `packages/schema/src/art-direction.test.ts`
- [ ] T005 Implement `ArtDirectionSource`, `DrawSurface`, `DrawRequestContext`, `ResolvedArtDirection`, template validation, subject insertion, and `resolveArtDirection` in `packages/schema/src/art-direction.ts`
- [ ] T006 Add failing tests that shipped defaults include global, world-cover, Character, Creature, Location, Item, Faction, Event, and Note templates and reject named living-artist references in `packages/schema/src/art-direction.test.ts`
- [ ] T007 Implement shipped global, category, world-cover, and theme default template maps in `packages/schema/src/art-direction.ts`
- [ ] T008 Export the art direction resolver, types, and shipped default helpers from `packages/schema/src/index.ts`
- [ ] T009 Run the focused schema resolver tests with `bun test packages/schema/src/art-direction.test.ts`

**Checkpoint**: Shared resolver returns deterministic prompts and metadata without using web state or network calls.

---

## Phase 3: User Story 1 - Predictable Art Prompt Resolution (Priority: P1) MVP

**Goal**: Drawing an entity uses the most specific available art direction in the required fallback order.

**Independent Test**: Provide entity, user-authored, category, theme, and global candidates in resolver/context tests and verify the highest-priority non-empty candidate wins.

### Tests for User Story 1

- [ ] T010 [US1] Add failing fallback-order tests for entity-specific, user-authored, category, theme, and global precedence in `packages/schema/src/art-direction.test.ts`
- [ ] T011 [P] [US1] Add failing Oracle action-manager tests proving `drawEntity` passes resolved art direction metadata/context before executor image generation in `apps/web/src/lib/stores/oracle/tests/action-manager.test.ts`
- [ ] T012 [P] [US1] Add failing Oracle store tests proving `drawEntity` still delegates through the action manager with an entity id and execution context in `apps/web/src/lib/stores/oracle.svelte.test.ts`

### Implementation for User Story 1

- [ ] T013 [US1] Implement fallback precedence and source metadata for entity, user-authored, category, theme, and global candidates in `packages/schema/src/art-direction.ts`
- [ ] T014 [US1] Extend Oracle draw context types to carry resolved art direction input/output fields in `apps/web/src/lib/stores/oracle/types.ts`
- [ ] T015 [US1] Collect entity title, stable category id/label, theme id, entity art direction, and user-authored art direction candidates for `drawEntity` in `apps/web/src/lib/stores/oracle/action-manager.svelte.ts`
- [ ] T016 [US1] Pass the resolved prompt and resolver metadata through the Oracle store execution context in `apps/web/src/lib/stores/oracle.svelte.ts`
- [ ] T017 [US1] Ensure Oracle context snapshots keep existing tier, capability, guest, and AI-disabled gates unchanged in `apps/web/src/lib/stores/oracle/context-manager.svelte.ts`
- [ ] T018 [US1] Run focused tests for resolver and Oracle entity draw paths: `bun test packages/schema/src/art-direction.test.ts apps/web/src/lib/stores/oracle/tests/action-manager.test.ts apps/web/src/lib/stores/oracle.svelte.test.ts`

**Checkpoint**: Entity draw requests resolve art direction deterministically and expose the winning source for troubleshooting.

---

## Phase 4: User Story 2 - Category-Aware Composition Defaults (Priority: P1)

**Goal**: Common entity categories produce category-specific composition guidance while retaining the same world/theme style chain.

**Independent Test**: Draw the same subject as Character, Location, Item, Creature, Faction, Event, and Note and verify the resolved prompts differ by category composition.

### Tests for User Story 2

- [ ] T019 [US2] Add failing category composition tests for Character, Creature, Location, Item, Faction, Event, Note, and world-cover defaults in `packages/schema/src/art-direction.test.ts`
- [ ] T020 [P] [US2] Add failing `/draw character Almos` parsing tests for command category hints and entity metadata precedence in `apps/web/src/lib/config/chat-commands.test.ts`

### Implementation for User Story 2

- [ ] T021 [US2] Implement category default lookup by stable category id, including normalized fallback aliases only when no real category id is available, in `packages/schema/src/art-direction.ts`
- [ ] T022 [US2] Add category hint parsing for recognized `/draw` category words without treating unknown words as categories in `apps/web/src/lib/config/chat-commands.ts`
- [ ] T023 [US2] Make entity metadata category ids override command-provided category hints when `/draw` resolves a known entity in `apps/web/src/lib/stores/oracle/action-manager.svelte.ts`
- [ ] T024 [US2] Run focused category and command tests: `bun test packages/schema/src/art-direction.test.ts apps/web/src/lib/config/chat-commands.test.ts apps/web/src/lib/stores/oracle/tests/action-manager.test.ts`

**Checkpoint**: Category defaults control composition and command category hints never override matched entity metadata.

---

## Phase 5: User Story 3 - User Authored Art Direction Content (Priority: P2)

**Goal**: Custom art direction comes from normal notes/entities already present in draw context, with no dedicated settings editor or new settings storage.

**Independent Test**: Include a note/entity art direction candidate in draw context and verify it wins over shipped defaults; remove or empty it and verify fallback continues safely.

### Tests for User Story 3

- [ ] T025 [US3] Add failing user-authored context tests for present, edited, deleted, empty, and overly long art direction values in `packages/schema/src/art-direction.test.ts`
- [ ] T026 [P] [US3] Add failing Oracle action-manager tests proving normal draw context can provide `userAuthoredArtDirection` without reading settings storage in `apps/web/src/lib/stores/oracle/tests/action-manager.test.ts`
- [ ] T027 [P] [US3] Add a failing settings test or static guard proving no dedicated art direction settings controls are added to `apps/web/src/lib/components/settings/AISettings.svelte` in `apps/web/src/lib/components/settings/AISettings.test.ts`

### Implementation for User Story 3

- [ ] T028 [US3] Normalize, trim, cap, and skip invalid user-authored art direction candidates in `packages/schema/src/art-direction.ts`
- [ ] T029 [US3] Extract user-authored art direction from existing Oracle draw context content, notes, or entity context without adding new persistence in `apps/web/src/lib/stores/oracle/action-manager.svelte.ts`
- [ ] T030 [US3] Preserve existing settings UI by avoiding new art direction settings controls in `apps/web/src/lib/components/settings/AISettings.svelte`
- [ ] T031 [US3] Run focused user-authored context tests: `bun test packages/schema/src/art-direction.test.ts apps/web/src/lib/stores/oracle/tests/action-manager.test.ts apps/web/src/lib/components/settings/AISettings.test.ts`

**Checkpoint**: User-authored art direction behaves like normal vault content and there is still no dedicated art-style settings editor.

---

## Phase 6: User Story 4 - Theme Defaults For Art Style (Priority: P2)

**Goal**: Active world themes provide descriptive default art style when no higher-priority art direction exists.

**Independent Test**: Resolve the same subject with different supported themes and no entity/user/category art direction, then verify each theme changes mood/style while avoiding named living artists.

### Tests for User Story 4

- [ ] T032 [US4] Add failing theme default tests for fantasy, sci-fi, cyberpunk, modern, post-apocalyptic, gothic horror, steampunk, mythic, and pulp-adventure theme ids in `packages/schema/src/art-direction.test.ts`
- [ ] T033 [P] [US4] Add failing Oracle context-manager tests proving the active theme id is available in draw execution context in `apps/web/src/lib/stores/oracle/tests/context-manager.test.ts`

### Implementation for User Story 4

- [ ] T034 [US4] Implement supported theme defaults and missing-theme fallback to global default in `packages/schema/src/art-direction.ts`
- [ ] T035 [US4] Include active world theme id in Oracle draw context snapshots in `apps/web/src/lib/stores/oracle/context-manager.svelte.ts`
- [ ] T036 [US4] Thread active theme id into entity and chat draw resolver calls in `apps/web/src/lib/stores/oracle/action-manager.svelte.ts`
- [ ] T037 [US4] Run focused theme tests: `bun test packages/schema/src/art-direction.test.ts apps/web/src/lib/stores/oracle/tests/context-manager.test.ts apps/web/src/lib/stores/oracle/tests/action-manager.test.ts`

**Checkpoint**: Theme defaults affect generated prompts only after higher-priority entity, user-authored, and category inputs are absent.

---

## Phase 7: User Story 5 - Draw Entry Points Use Resolved Art Direction (Priority: P2)

**Goal**: `/draw`, entity sidebar draw, Zen mode draw, graph context menu draw, front page cover generation, and Oracle chat draw all use the same resolver.

**Independent Test**: Trigger each entry point with equivalent subject/category/theme context and verify each path resolves art direction before image generation.

### Tests for User Story 5

- [ ] T038 [US5] Add failing image generation service tests proving it receives the resolver's final prompt without changing model request behavior in `apps/web/src/lib/services/ai/image-generation.service.test.ts`
- [ ] T039 [P] [US5] Add failing chat message action tests proving Oracle chat draw requests use resolver context when message/entity/category data exists in `apps/web/src/lib/components/oracle/chat-message.actions.test.ts`
- [ ] T040 [P] [US5] Add failing graph context menu tests proving selected graph nodes call the central entity draw path with entity/category context in `apps/web/src/lib/components/graph/graph-context-menu-controller.test.ts`
- [ ] T041 [P] [US5] Add failing front page tests proving cover generation uses world-cover context and active theme defaults in `apps/web/src/lib/components/world/FrontPage.test.ts`
- [ ] T042 [P] [US5] Add failing E2E coverage for `/draw`, entity sidebar, and Zen mode draw buttons using resolved art direction in `apps/web/tests/draw-button.spec.ts`
- [ ] T043 [P] [US5] Add failing E2E coverage for graph image generation using resolved art direction in `apps/web/tests/graph-image-gen.spec.ts`

### Implementation for User Story 5

- [ ] T044 [US5] Ensure `ImageGenerationService` accepts the resolved prompt as its final prompt while preserving existing visual distillation behavior in `apps/web/src/lib/services/ai/image-generation.service.ts`
- [ ] T045 [US5] Route `/draw` command execution through the shared resolver and central Oracle draw context in `apps/web/src/lib/stores/oracle/action-manager.svelte.ts`
- [ ] T046 [US5] Verify entity sidebar draw remains a thin central `oracle.drawEntity(entity.id)` call with no duplicate resolver logic in `apps/web/src/lib/components/entity-detail/DetailImage.svelte`
- [ ] T047 [US5] Verify Zen mode draw remains a thin central `oracle.drawEntity(entity.id)` call with no duplicate resolver logic in `apps/web/src/lib/components/zen/ZenSidebar.svelte`
- [ ] T048 [US5] Ensure graph context menu image generation uses the central Oracle draw path and preserves existing selected-node gating in `apps/web/src/lib/components/graph/graph-context-menu-controller.svelte.ts`
- [ ] T049 [US5] Resolve front page cover prompts with `surface: "cover"`, world subject, cover category default, and active theme before upload/generation in `apps/web/src/lib/components/world/FrontPage.svelte`
- [ ] T050 [US5] Keep `CoverImage` upload/drop behavior unchanged while allowing generated cover prompts to come from `FrontPage` resolver context in `apps/web/src/lib/components/world/CoverImage.svelte`
- [ ] T051 [US5] Route Oracle chat draw actions through resolver-aware `drawMessage` context where message/entity/category context is available in `apps/web/src/lib/components/oracle/chat-message.actions.ts`
- [ ] T052 [US5] Run focused draw entry point tests: `bun test apps/web/src/lib/services/ai/image-generation.service.test.ts apps/web/src/lib/components/oracle/chat-message.actions.test.ts apps/web/src/lib/components/graph/graph-context-menu-controller.test.ts apps/web/src/lib/components/world/FrontPage.test.ts`
- [ ] T053 [US5] Run focused Playwright entry point tests: `bun playwright test apps/web/tests/draw-button.spec.ts apps/web/tests/graph-image-gen.spec.ts`

**Checkpoint**: All existing image generation entry points use the shared resolver and preserve current capability/tier gating.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, validation, and regression checks across all stories.

- [ ] T054 [P] Update user-facing help text to mention normal notes/entities as Art Direction context without implying a settings editor in `apps/web/src/lib/content/help/chat-commands.md`
- [ ] T055 [P] Update quickstart validation notes with the final focused commands and manual draw surfaces in `specs/115-default-art-prompts/quickstart.md`
- [ ] T056 [P] Add or update troubleshooting labels to expose resolver source names using "Art Direction", "Default Art Style", and "Category Defaults" wording in `apps/web/src/lib/stores/oracle/action-manager.svelte.ts`
- [ ] T057 Run all resolver and unit coverage for the feature: `bun test packages/schema/src/art-direction.test.ts apps/web/src/lib/stores/oracle/tests/action-manager.test.ts apps/web/src/lib/config/chat-commands.test.ts apps/web/src/lib/components/world/FrontPage.test.ts apps/web/src/lib/components/graph/graph-context-menu-controller.test.ts apps/web/src/lib/services/ai/image-generation.service.test.ts`
- [ ] T058 Run E2E validation for existing draw paths: `bun playwright test apps/web/tests/draw-button.spec.ts apps/web/tests/draw-autocomplete.spec.ts apps/web/tests/graph-image-gen.spec.ts`
- [ ] T059 Run repository lint/typecheck/test command used for this branch and record any unrelated failures in the PR notes
- [ ] T060 Review changed shipped prompt defaults for concise descriptive language and absence of named living-artist imitation in `packages/schema/src/art-direction.ts`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup and blocks all user stories
- **US1 and US2 (P1)**: Depend on Foundational; implement before P2 stories
- **US3, US4, US5 (P2)**: Depend on Foundational; US5 benefits from US1/US2 context but should still be tested by surface
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 Predictable Art Prompt Resolution**: First MVP story after foundation; no dependency on other stories
- **US2 Category-Aware Composition Defaults**: Can start after foundation; depends on shared category default support
- **US3 User Authored Art Direction Content**: Can start after US1 resolver precedence exists
- **US4 Theme Defaults For Art Style**: Can start after foundation; must preserve US1 precedence
- **US5 Draw Entry Points Use Resolved Art Direction**: Can start after US1 central entity draw context exists; each entry point remains independently testable

### Within Each User Story

- Write failing tests before implementation
- Implement shared schema behavior before web integration that consumes it
- Preserve existing tier/capability/guest/AI-disabled gates before changing prompt behavior
- Complete each story's focused test command before moving to the next checkpoint

### Parallel Opportunities

- T003 can run in parallel with T002
- T011 and T012 can run in parallel after T010
- T020 can run in parallel with T019
- T026 and T027 can run in parallel after T025
- T033 can run in parallel with T032
- T039 through T043 can run in parallel because they cover different entry point files
- T054 through T056 can run in parallel during polish

---

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Complete US1 and US2.
3. Validate with focused schema, Oracle action-manager, and `/draw` command tests.
4. Stop for review before expanding to P2 surfaces if needed.

### Incremental Delivery

1. Shared resolver and defaults.
2. Entity and `/draw` fallback hierarchy.
3. User-authored context and theme defaults.
4. Remaining draw entry points.
5. Documentation and broad regression checks.

### Notes

- Do not add a dedicated Vault Settings art-style editor.
- Do not add new runtime dependencies or new settings storage.
- Keep resolver logic in `packages/schema`; components should stay thin and call existing central draw actions.
- Preserve existing image model calls, upload behavior, and capability gating.
- Commit after each logical group or completed story checkpoint.
