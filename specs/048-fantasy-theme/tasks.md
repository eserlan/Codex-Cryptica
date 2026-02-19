# Tasks: Ancient Parchment Theme

**Input**: Design documents from `/specs/048-fantasy-theme/`

## Phase 1: Setup & Foundational

- [x] T001 Define `ancient-parchment.ts` theme structure in `packages/schema/src/themes/` (Consolidated in `packages/schema/src/theme.ts`)
- [x] T002 Add new font selections (e.g., 'Cinzel') to `apps/web/src/app.css`
- [ ] T003 [P] Add new texture image asset to `apps/web/static/themes/`
- [x] T004 Update `packages/schema/src/themes/index.ts` to export the new `ANCIENT_PARCHMENT` theme (Consolidated in `packages/schema/src/theme.ts`)
- [x] T005 Update `apps/web/src/lib/stores/theme.svelte.ts` to set "ancient-parchment" as the `DEFAULT_THEME`

---

## Phase 2: User Story 1 - "Magic Tome" Typography (P1) 🎯 MVP

**Goal**: Implement the primary typography changes for an immersive, book-like feel.
**Independent Test**: Activate the theme and verify all headers use the new Serif font.

### Implementation for User Story 1

- [x] T006 [US1] Define `fontHeader` (e.g., 'Cinzel') and `fontBody` in `packages/schema/src/themes/ancient-parchment.ts` (Consolidated in `packages/schema/src/theme.ts`)
- [x] T007 [US1] Update `apps/web/src/lib/stores/theme.svelte.ts` to apply the `fontHeader` and `fontBody` CSS variables.
- [x] T008 [US1] [P] Create an E2E test in `apps/web/tests/themes.spec.ts` to verify header font changes on theme activation.

---

## Phase 3: User Story 2 - De-Digitalizing the Graph (P2)

**Goal**: Make the graph visualization match the "ink and dye" aesthetic.
**Independent Test**: Activate the theme and verify the graph's node and edge colors have changed.

### Implementation for User Story 2

- [x] T009 [US2] Define a muted "ink and dye" color palette in `packages/schema/src/themes/ancient-parchment.ts` (Consolidated in `packages/schema/src/theme.ts`)
- [x] T010 [US2] Update `packages/graph-engine/src/transformer.ts` to use the new theme colors for node borders.
- [x] T011 [US2] Update `packages/graph-engine/src/transformer.ts` to use a thicker "Sepia Ink" color for edges.
- [x] T012 [US2] [P] Add E2E test assertions in `apps/web/tests/themes.spec.ts` to validate the new graph colors.

---

## Phase 4: User Story 3 - UI Polish & Texture Integration (P3)

**Goal**: Apply final textural and stylistic touches to complete the "enchanted book" feel.
**Independent Test**: Activate the theme and check for textured backgrounds and inset button-press effects.

### Implementation for User Story 3

- [x] T013 [US3] Define `texture` file path in `packages/schema/src/themes/ancient-parchment.ts` (Consolidated in `packages/schema/src/theme.ts`)
- [x] T014 [US3] Update `apps/web/src/lib/stores/theme.svelte.ts` to apply the texture overlay to sidebars and modals.
- [x] T015 [US3] Implement "pressed" inset shadow button styles in `apps/web/src/app.css` using theme variables.
- [x] T016 [US3] [P] Add E2E test assertions in `apps/web/tests/themes.spec.ts` to verify textured backgrounds on modals.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T017 [P] Create help article `apps/web/src/lib/content/help/themes.md` explaining how to switch themes.
- [ ] T018 Run a final accessibility check using `unlighthouse` or browser devtools to ensure all new text and color combinations meet WCAG AA contrast ratios (SC-002).
- [ ] T019 Manually review the 10 most common UI components to verify theme application (SC-003).
- [ ] T020 [P] Configure E2E tests for visual regression or create a manual testing guide for visual consistency.

---

## Dependencies & Execution Order

- **Phase 1**: Must be completed first.
- **User Stories (Phase 2-4)**: Can be implemented sequentially (P1 -> P2 -> P3) for a focused rollout.
- **Parallel Work**:
  - After Phase 1, `T006`, `T009`, and `T013` can be done in parallel as they modify the same data file.
  - All E2E test tasks (`T008`, `T012`, `T016`) can be developed in parallel.

## Implementation Strategy

1.  **MVP First**: Complete Phase 1 and Phase 2 (User Story 1) to deliver the core typography overhaul. This provides the highest-impact user value first.
2.  **Incremental Rollout**: Sequentially add the Graph (US2) and UI Polish (US3) improvements.
3.  **Final Polish**: Complete Phase 5 to ensure documentation and accessibility standards are met.
