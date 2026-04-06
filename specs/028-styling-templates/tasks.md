# Tasks: Visual Styling Templates

**Issue Reference**: [eserlan/Codex-Arcana#24](https://github.com/eserlan/Codex-Arcana/issues/24)
**Branch**: `028-styling-templates`
**Spec**: [spec.md](./spec.md)

## Phase 1: Setup

- [x] T001 [P] Create static assets directory for theme textures in `apps/web/static/themes/`
- [x] T002 [P] Export `StylingTemplate` and related interfaces in `packages/schema/src/index.ts`
- [x] T003 Define initial theme constants for the 5 genres in `apps/web/src/lib/config/themes.ts`

## Phase 2: Foundational (Theming Engine)

**Goal**: Establish the core reactive theming store and CSS variable injection mechanism.

- [x] T004 Create Svelte 5 theme store in `apps/web/src/lib/stores/theme.svelte.ts`
- [x] T005 Implement CSS variable injection logic in `apps/web/src/lib/stores/theme.svelte.ts` (targeting `:root`)
- [x] T006 Update `VaultStore` in `apps/web/src/lib/stores/vault.svelte.ts` to include `activeTemplateId` in config
- [x] T007 [P] Initialize `theme` store in `apps/web/src/routes/+layout.svelte`

## Phase 3: User Story 1 - Multi-Genre Aesthetic Alignment (Priority: P1)

**Goal**: Allow users to select and persist genre templates.
**Independent Test**: Selecting "Fantasy" in settings updates UI colors/fonts and persists after reload.

- [x] T008 [US1] Implement `ThemeSelector.svelte` component in `apps/web/src/lib/components/settings/ThemeSelector.svelte`
- [x] T009 [US1] Add "Aesthetics" tab to `SettingsModal.svelte` and integrate `ThemeSelector`
- [x] T010 [US1] Connect `ThemeSelector` to `VaultStore` for persistence of `activeTemplateId`
- [x] T011 [US1] Update global `app.css` to use theme CSS variables for primary UI colors and fonts

## Phase 4: User Story 3 - Graph-Level Stylistic Cohesion (Priority: P1)

**Goal**: Ensure the Relational Graph adopts genre-specific geometry and styles.
**Independent Test**: Switching to "Cyberpunk" changes node shapes to octagons with neon glows on the canvas.

- [x] T012 [US3] Refactor `apps/web/src/lib/themes/graph-theme.ts` into a `getGraphStyle(template, categories)` generator
- [x] T013 [US3] Update `GraphView.svelte` to reactive re-apply styles when the theme store updates
- [x] T014 [US3] Implement genre-specific node shapes and edge styles in `graph-theme.ts` for all 5 templates

## Phase 6: User Story 4 - Campaign-Specific Persistence (Priority: P1)

**Goal**: Store theme selection in IndexedDB per vault ID, similar to the calendar config.
**Independent Test**: Switching vaults automatically loads the correct theme.

- [x] T017 [US4] Update `ThemeStore.setTheme` to persist theme ID to IndexedDB with a vault-specific key (`theme_{vaultId}`)
- [x] T018 [US4] Implement `ThemeStore.loadForVault(vaultId)` to fetch and apply the theme from IDB
- [x] T019 [US4] Update `VaultStore.switchVault` to trigger `themeStore.loadForVault`
- [x] T020 [US4] Add E2E test verifying theme persistence across multiple campaigns

## Phase 7: Verification

- [x] T021 [US1] Implement Playwright E2E tests for theme selection and persistence in `apps/web/tests/themes.spec.ts`
- [x] T022 [US3] Add integration tests for graph style generation in `packages/graph-engine/tests/themes.test.ts`
- [x] T019 [x] Add "Offline Functionality Verification" for all theme assets (textures/fonts)

---

## Dependencies

1. **US1 & US3** depend on **Phase 2 (Foundational)**.
2. **US2** depends on **US1** UI components.
3. **Phase 6** depends on all User Stories for final visual refinement.

## Parallel Execution

- T001, T002, T007 can be started immediately.
- Phase 3 (UI) and Phase 4 (Graph) can be worked on simultaneously once Phase 2 is complete.

## Implementation Strategy

1. **MVP**: Complete Phase 1, 2, and US1 (Standard UI theming). This delivers immediate user value.
2. **Relational Depth**: Complete US3 to align the graph with the selected genre.
3. **UX Polish**: Complete US2 (Preview) and Phase 6 (Textures/Fonts).
