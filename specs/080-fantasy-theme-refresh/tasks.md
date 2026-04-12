# Tasks: Fantasy Theme Refresh

**Input**: Design documents from `/specs/080-fantasy-theme-refresh/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Tests**: Playwright coverage is required because the specification explicitly calls for automated verification of the refreshed fantasy-theme behavior.

**Organization**: Tasks are grouped by user story to keep each story independently implementable and testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no blocking dependency)
- **[Story]**: Which user story this task belongs to (`US1`, `US2`, `US3`)
- Every task includes exact file paths

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare shared verification and styling entry points for the refresh

- [ ] T001 Add baseline fantasy-theme regression coverage scaffolding in `apps/web/tests/themes.spec.ts`
- [ ] T002 [P] Inventory the screenshot-identified fantasy-theme touchpoints in `packages/schema/src/theme.ts`, `apps/web/src/lib/stores/theme.svelte.ts`, `apps/web/src/app.css`, `apps/web/src/lib/components/explorer/EntityList.svelte`, and `apps/web/src/lib/components/entity-detail/DetailHeader.svelte`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Update shared theme tokens and global styling hooks that all user stories depend on

**⚠️ CRITICAL**: No user story work should begin until this phase is complete

- [ ] T003 Update the base fantasy-theme token values in `packages/schema/src/theme.ts` to enforce dark ink, brown interaction, gold focus, and warmer parchment-aligned surfaces
- [ ] T004 [P] Expose revised fantasy-theme CSS variables through `apps/web/src/lib/stores/theme.svelte.ts` for brown interaction states, gold focus states, panel warmth, and firmer edges
- [ ] T005 [P] Normalize shared fantasy surface, border, radius, and interaction styling hooks in `apps/web/src/app.css`

**Checkpoint**: Shared fantasy tokens and CSS hooks are ready for story-specific work

---

## Phase 3: User Story 1 - Cohesive Fantasy Styling (Priority: P1) 🎯 MVP

**Goal**: Remove cyan and pink accents and replace multicolor icon treatment with a single muted-brown fantasy system

**Independent Test**: Activate the fantasy theme and confirm the explorer and entity header no longer show cyan text, pink borders or highlights, or multicolor standard UI icon states, and that standard interaction still reads as brown rather than gold

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they fail before implementation**

- [ ] T006 [P] [US1] Add Playwright assertions for dark-ink text, brown standard interaction, and unified muted-brown fantasy icon colors in `apps/web/tests/themes.spec.ts`

### Implementation for User Story 1

- [ ] T007 [US1] Remove multicolor default icon treatment from the fantasy explorer controls in `apps/web/src/lib/components/explorer/EntityList.svelte`
- [ ] T008 [P] [US1] Replace cyan-like fantasy title treatment with dark ink title styling and unified tool-icon states in `apps/web/src/lib/components/entity-detail/DetailHeader.svelte`
- [ ] T009 [P] [US1] Replace pink-adjacent fantasy emphasis with brown standard interaction states in `apps/web/src/lib/components/entity-detail/DetailTabs.svelte`

**Checkpoint**: User Story 1 should now deliver a cohesive fantasy color language on its own

---

## Phase 4: User Story 2 - Parchment-Aligned Surfaces (Priority: P2)

**Goal**: Warm the main fantasy panels and sidebars so they match the parchment background and reduce app-like separation

**Independent Test**: Activate the fantasy theme and compare the explorer, sidebar shells, detail surfaces, and dominant brown action surface against the page background; they should read as integrated parchment surfaces rather than neutral cards, and the cards should feel slightly firmer and less soft

### Tests for User Story 2 ⚠️

- [ ] T010 [P] [US2] Add Playwright assertions for fantasy panel warmth, border tone, firmer card edges, and dominant brown action-surface treatment in `apps/web/tests/themes.spec.ts`

### Implementation for User Story 2

- [ ] T011 [US2] Warm and integrate the entity detail shell in `apps/web/src/lib/components/EntityDetailPanel.svelte`
- [ ] T012 [P] [US2] Warm and integrate the sidebar shell in `apps/web/src/lib/components/layout/SidebarPanelHost.svelte`
- [ ] T013 [P] [US2] Warm and integrate the embedded entity shell, tone down the dominant brown action surface, and reduce overly soft card feel in `apps/web/src/lib/components/entity/EmbeddedEntityView.svelte` and `apps/web/src/app.css`

**Checkpoint**: User Story 2 should now deliver parchment-aligned core surfaces independently

---

## Phase 5: User Story 3 - Clearer Reading Hierarchy (Priority: P3)

**Goal**: Improve title weight, section separation, metadata de-emphasis, and gold focus treatment in entity reading views

**Independent Test**: Open an entity in the fantasy theme and confirm the title, section headings such as the chronicle area, metadata, and reading blocks have clearer visual hierarchy, with gold reserved for active tabs, selected elements, and key highlights

### Tests for User Story 3 ⚠️

- [ ] T014 [P] [US3] Add Playwright assertions for fantasy title hierarchy, section-heading distinction, quieter metadata, and gold-only focus states in `apps/web/tests/themes.spec.ts`

### Implementation for User Story 3

- [ ] T015 [US3] Strengthen title and metadata hierarchy in `apps/web/src/lib/components/entity-detail/DetailHeader.svelte`
- [ ] T016 [US3] Strengthen section spacing, section-heading distinction, and secondary text hierarchy in `apps/web/src/lib/components/entity-detail/DetailStatusTab.svelte`
- [ ] T017 [US3] Apply gold-only focus treatment to active tabs, selected elements, and key highlights in `apps/web/src/lib/components/entity-detail/DetailTabs.svelte`, `apps/web/src/lib/components/layout/ActivityBar.svelte`, and `apps/web/src/app.css`

**Checkpoint**: User Story 3 should now make the fantasy reading view feel structured and authored on its own

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and regression protection across the refreshed fantasy theme

- [ ] T018 [P] Reconcile and clean up final fantasy-theme assertions in `apps/web/tests/themes.spec.ts`
- [ ] T019 Verify cross-theme safety in `packages/schema/src/theme.ts`, `apps/web/src/lib/stores/theme.svelte.ts`, and `apps/web/src/app.css`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup completion and blocks all user story work
- **User Story 1 (Phase 3)**: Depends on Foundational completion
- **User Story 2 (Phase 4)**: Depends on Foundational completion
- **User Story 3 (Phase 5)**: Depends on Foundational completion and benefits from User Story 1 styling decisions
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start immediately after Foundational completion
- **User Story 2 (P2)**: Can start immediately after Foundational completion
- **User Story 3 (P3)**: Should follow the shared styling direction established in User Story 1, but remains independently testable

### Within Each User Story

- Playwright assertions should be written before the implementation tasks for that story
- Shared token work must land before component-specific refinements
- Story-specific UI changes should be complete before final cross-theme cleanup

### Parallel Opportunities

- `T002` can run in parallel with `T001`
- `T004` and `T005` can run in parallel after `T003`
- `T008` and `T009` can run in parallel after `T006`
- `T012` and `T013` can run in parallel after `T010`
- `T018` can run in parallel with `T019`

---

## Parallel Example: User Story 1

```bash
# Parallel story test + UI slices once foundational work is done:
Task: "Add Playwright assertions for fantasy title, icon, and highlight color behavior in apps/web/tests/themes.spec.ts"
Task: "Update fantasy title and tool-icon treatment in apps/web/src/lib/components/entity-detail/DetailHeader.svelte"
Task: "Soften fantasy active and hover tab emphasis in apps/web/src/lib/components/entity-detail/DetailTabs.svelte"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Validate the fantasy theme no longer shows digital-looking accents in the main explorer and entity header

### Incremental Delivery

1. Land shared token and CSS groundwork
2. Deliver User Story 1 for immediate cohesion wins
3. Deliver User Story 2 to integrate surfaces with the parchment background
4. Deliver User Story 3 to improve reading hierarchy and polish

### Parallel Team Strategy

1. One developer handles shared token and CSS groundwork
2. One developer handles fantasy explorer and header cohesion work
3. One developer handles fantasy surface integration and hierarchy refinements after the shared groundwork is stable

---

## Notes

- `[P]` tasks are limited to work that can proceed without unresolved file conflicts
- `apps/web/tests/themes.spec.ts` is the primary regression file for this feature
- The highest-priority implementation slice is exactly the user-provided distilled rule set: dark ink text, brown interaction, gold focus, unified brown icons, warmer parchment panels, and firmer edges
- Preserve the existing theme system; do not create a fantasy-only styling path outside shared theme plumbing
