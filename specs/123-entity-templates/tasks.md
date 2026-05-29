# Tasks: Default Entity Templates

**Input**: Design documents from `/specs/123-entity-templates/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md

**Tests**: This project uses Vitest unit testing for core logic and Svelte test cases. Unit tests are mandatory.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Verify we are on the feature branch `123-entity-templates` and synchronize with `staging`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T002 Define built-in generic and theme-specific markdown formats as constants in a new file `apps/web/src/lib/services/EntityTemplateConstants.ts`
- [ ] T003 Create `EntityTemplateService.svelte.ts` class skeleton under `apps/web/src/lib/services/` with dependency injection constructors for file system handles and theme matching.

**Checkpoint**: Foundation ready - template storage constants and template service skeleton are available.

---

## Phase 3: User Story 1 - Create Entity with System Default Template (Priority: P1) 🎯 MVP

**Goal**: Pre-populate newly created Character, Faction, Location, Item, Event, Creature, or Note with standard markdown templates.

**Independent Test**: Create an entity in a clean vault. Verify the resulting editor's contents match the standard default markdown formats defined in spec.

### Tests for User Story 1 (MANDATORY TDD) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T004 Create unit tests in `apps/web/src/lib/services/EntityTemplateService.svelte.test.ts` to verify generic default fallback templates for all 7 entity types.

### Implementation for User Story 1

- [ ] T005 Implement generic fallback matching in `apps/web/src/lib/services/EntityTemplateService.svelte.ts` so that it returns the built-in Generic templates when no theme or local overrides exist.
- [ ] T006 Update `apps/web/src/lib/components/VaultControls.svelte` to resolve template content using `EntityTemplateService` on entity creation, and pass the resolved markdown as `initialData: { content: resolvedContent }` to `vault.createEntity`.

**Checkpoint**: At this point, creating any default entity type pre-populates the editor with the built-in system generic template.

---

## Phase 4: User Story 2 - Toggle Template Insertion in the Creation UI (Priority: P2)

**Goal**: Allow users to toggle "Start from default format" in the creation UI. If untoggled, start completely empty.

**Independent Test**: Open creation form, untick the template option, and verify that the created entity contains a completely blank document.

### Tests for User Story 2 (MANDATORY TDD) ⚠️

- [ ] T007 Add unit test in `apps/web/src/lib/services/EntityTemplateService.svelte.test.ts` verifying that if template selection is disabled or requested content is empty, the resolver returns an empty string `""`.

### Implementation for User Story 2

- [ ] T008 Add local checkbox state `$state(useTemplate = true)` and render a visual checkbox "Start from default format" in `apps/web/src/lib/components/VaultControls.svelte` under the title input.
- [ ] T009 Integrate toggle choice with the template resolver call inside `VaultControls.svelte` so that unchecking the toggle skips template insertion and passes `""`.

**Checkpoint**: Users can toggle between pre-populating standard structures or starting with blank pages.

---

## Phase 5: User Story 3 - Vault-Level Custom Templates (Priority: P2)

**Goal**: Read user custom template files inside `.cc/templates/{type}.md` (or `.codex/templates/{type}.md`) case-insensitively and use them as overrides. Empty files should produce empty documents (no fallback).

**Independent Test**: Create a custom template file `.cc/templates/character.md`, create a character entity, and verify it uses the custom template. Create an empty file, and verify it creates a blank entity page.

### Tests for User Story 3 (MANDATORY TDD) ⚠️

- [ ] T010 Add unit tests in `apps/web/src/lib/services/EntityTemplateService.svelte.test.ts` with mocked directory and file handles to verify reading custom overrides, case-insensitivity filename matching (e.g. `Character` -> `character.md`), folder-missing fallback, and empty-override file handling.

### Implementation for User Story 3

- [ ] T011 Implement file-based template matching and loading in `EntityTemplateService.svelte.ts`. Check `.cc/templates/` first, and `.codex/templates/` second, matching files case-insensitively, and reading contents via `readFile`. Ensure empty override files do not trigger fallbacks.
- [ ] T012 Pass folder/directory handles (like `vault.getActiveFolderHandle()`) into the template resolver call from `VaultControls.svelte`.

**Checkpoint**: Vault-level custom templates correctly override built-in formats, with support for empty override files.

---

## Phase 6: User Story 4 - Theme-Based System Default Templates (Priority: P3)

**Goal**: Automatically adapt system defaults to the vault's active theme (Fantasy, Sci-Fi) when no custom template is provided.

**Independent Test**: Set the active vault's theme to "Fantasy", create a character, and verify it includes fantasy fields like `Lineage` or `Magical Affinity`.

### Tests for User Story 4 (MANDATORY TDD) ⚠️

- [ ] T013 Add unit tests in `apps/web/src/lib/services/EntityTemplateService.svelte.test.ts` to verify theme-tailored built-in overrides for Fantasy and Sci-Fi character types, falling back gracefully to generic defaults for non-character types or unsupported themes.

### Implementation for User Story 4

- [ ] T014 Implement theme resolution logic in `EntityTemplateService.svelte.ts` to select theme-specific built-in templates (using `themeStore.worldThemeId` if no override directory exists or is matched).

**Checkpoint**: All 4 user stories are fully implemented, and all core logic is backed by failing-then-passing TDD unit tests.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: General optimizations, document validation, and formatting

- [ ] T015 Create a user-facing help guide article at `apps/web/src/lib/content/help/default-templates.md` describing custom override structures and UI controls per Constitution VII
- [ ] T016 Create a devlog/blog announcement article at `apps/web/src/lib/content/blog/default-entity-templates.md` announcing Customizable Default Entity Templates
- [ ] T017 Perform code linting and formatting across changed files (`apps/web/src/lib/services/EntityTemplateService.svelte.ts`, `apps/web/src/lib/components/VaultControls.svelte`, etc.) using `bun run lint` and `bun run lint:types`
- [ ] T018 Run the complete unit test suite `bun run test` to verify zero regression across existing stores and services

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3 to 6)**: Must proceed sequentially or in parallel after Foundational phase completes.
- **Polish (Phase 7)**: Depends on all user story completions.

### User Story Dependencies

- **User Story 1 (P1)**: Foundation complete. No other dependencies.
- **User Story 2 (P2)**: Integrates with US1 UI and resolver.
- **User Story 3 (P2)**: Extends US1 template resolver with file reads.
- **User Story 4 (P3)**: Extends US1/US3 template resolver with theme references.

### Parallel Opportunities

- Unit tests (`.test.ts`) can be designed and sketched in parallel with their corresponding implementation.
- Constant formats (`EntityTemplateConstants.ts`) and mock handles for unit tests can be developed at the same time.

---

## Parallel Example: User Story 1

```bash
# Running tests specifically targeting the new template service
bun run test apps/web/src/lib/services/EntityTemplateService.svelte.test.ts
```
