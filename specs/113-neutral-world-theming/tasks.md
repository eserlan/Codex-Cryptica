# Tasks: Neutral App Chrome and World Theming

**Input**: Design documents from `/specs/113-neutral-world-theming/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/appearance-theme-contract.md

**Tests**: Required by FR-026 and FR-027. Write the listed tests before implementation for the relevant story and verify they fail for the current one-layer theme behavior.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently after the foundational split is in place.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other tasks in the same phase because it touches different files or independent test coverage.
- **[Story]**: Maps to user stories from spec.md.
- Paths are repo-root relative.

## Coding Standards Guardrails

- Follow `docs/STYLE_GUIDE.md` for Svelte 5 runes, Tailwind 4 semantic tokens, accessibility, component composition, and animation behavior.
- Use Iconify utility classes such as `icon-[lucide--search]` for icons; do not introduce `lucide-svelte` component imports.
- Keep store/storage changes dependency-injectable with sensible production defaults and mockable test dependencies.
- Prefix intentionally unused variables or parameters with `_`.
- Do not add new runtime dependencies for this feature.
- Keep user-facing settings and help copy plain: "App appearance" and "World theme".

---

## Phase 1: Setup

**Purpose**: Confirm branch state and create the focused validation targets.

- [x] T001 Verify branch `113-neutral-world-theming` is active and clean before implementation.
- [x] T002 Create focused browser test scaffold in `apps/web/tests/themes.spec.ts` for app appearance, world theme, texture scoping, and first-pass surface checks.
- [x] T003 [P] Create schema/theme unit test scaffold in `packages/schema/src/theme.test.ts`.

---

## Phase 2: Foundational Theme Split

**Purpose**: Define the shared model and store contract that all user stories depend on.

**CRITICAL**: No user story implementation should begin until these tasks are complete.

### Tests for Foundation

- [x] T004 [P] Add failing tests in `packages/schema/src/theme.test.ts` for `workspace` as a dedicated world theme distinct from `modern`, neutral app appearance ids, and default world theme resolution.
- [x] T005 [P] Add failing tests in `apps/web/src/lib/stores/theme.test.ts` for separate `appAppearanceId`, `resolvedAppAppearanceId`, `worldThemeId`, and backwards-compatible `currentThemeId`.
- [x] T006 Add failing tests in `apps/web/src/lib/stores/theme.test.ts` proving old `codex-cryptica-active-theme` values become world-theme fallback only and do not set app appearance.

### Implementation for Foundation

- [x] T007 Add `workspace` world theme, neutral app appearance definitions, default ids, and exported types in `packages/schema/src/theme.ts`.
- [x] T008 Export new theme/app appearance types and helpers from `packages/schema/src/index.ts`.
- [x] T009 Refactor `apps/web/src/lib/stores/theme.svelte.ts` so app appearance and world theme are independent state fields with injectable storage.
- [x] T010 Preserve `setTheme(id)` and `currentThemeId` in `apps/web/src/lib/stores/theme.svelte.ts` as backwards-compatible aliases for world-theme behavior.
- [x] T011 Add global app appearance persistence key `codex-cryptica-app-appearance` in `apps/web/src/lib/stores/theme.svelte.ts` with missing/invalid values resolving to `system`.
- [x] T012 Update theme application in `apps/web/src/lib/stores/theme.svelte.ts` to set `data-app-appearance`, `data-app-appearance-choice`, and `data-world-theme` separately.
- [x] T013 Keep `data-theme` compatibility in `apps/web/src/lib/stores/theme.svelte.ts` while preventing new chrome behavior from depending on it.

**Checkpoint**: Shared schema and store can represent neutral app chrome, `workspace` world theme, existing saved world themes, and independent persistence.

---

## Phase 3: User Story 1 - Neutral Default Workspace (Priority: P1) MVP

**Goal**: First-time users get system-resolved neutral app chrome and new worlds get `workspace`, while existing saved themes remain honored as world themes.

**Independent Test**: Clear storage, load the app, and confirm neutral app chrome plus `workspace` world theme. Seed a saved fantasy or modern theme and confirm it remains the active world theme without changing app appearance.

### Tests for User Story 1

- [x] T014 [P] [US1] Add unit tests in `apps/web/src/lib/stores/theme.test.ts` for first-time `system` app appearance and `workspace` world theme defaults.
- [x] T015 [US1] Add unit tests in `apps/web/src/lib/stores/theme.test.ts` for preserving saved fantasy, modern, and other valid world themes.
- [x] T016 [P] [US1] Add E2E coverage in `apps/web/tests/themes.spec.ts` asserting first load is not fantasy parchment and `data-world-theme="workspace"`.

### Implementation for User Story 1

- [x] T017 [US1] Change no-saved-vault fallback in `apps/web/src/lib/stores/theme.svelte.ts` from old `DEFAULT_THEME` behavior to `workspace`.
- [x] T018 [US1] Update first-paint theme bootstrapping in `apps/web/src/app.html` to resolve app appearance separately from world theme.
- [x] T019 [US1] Update default theme exports in `packages/schema/src/theme.ts` so new world default is `workspace` without removing or rewriting existing `fantasy` or `modern`.
- [x] T020 [US1] Ensure invalid stored world theme ids in `apps/web/src/lib/stores/theme.svelte.ts` fall back to `workspace` at read time without overwriting saved data.

**Checkpoint**: User Story 1 is functional and independently testable.

---

## Phase 4: User Story 2 - Stable App Chrome (Priority: P1)

**Goal**: Header, activity bar, footer, settings, search, and structural shells stay neutral when world themes change.

**Independent Test**: Switch between `workspace`, `fantasy`, and a dark genre theme. Chrome surfaces remain neutral, readable, and texture-free while world surfaces change.

### Tests for User Story 2

- [x] T021 [P] [US2] Add focused component/unit coverage in `apps/web/src/lib/components/layout/AppHeader.test.ts` for neutral chrome labels and app appearance stability across world themes.
- [x] T022 [P] [US2] Add focused component/unit coverage in `apps/web/src/lib/components/layout/ActivityBar.test.ts` for chrome styling independent of `data-world-theme`.
- [x] T023 [P] [US2] Add focused component/unit coverage in `apps/web/src/lib/components/search/SearchModal.test.ts` for search shell using neutral app chrome labels and not world jargon.
- [x] T024 [P] [US2] Add E2E checks in `apps/web/tests/themes.spec.ts` proving body, header, activity bar, footer, settings, and search have no parchment/world texture.

### Implementation for User Story 2

- [x] T025 [US2] Split root CSS variables in `apps/web/src/app.css` into app chrome variables and scoped world theme variables.
- [x] T026 [US2] Remove world texture from `body`, header, footer, activity bar, settings shells, and search shells in `apps/web/src/app.css`.
- [x] T027 [US2] Update `apps/web/src/lib/components/layout/AppHeader.svelte` to use app chrome tokens and plain neutral chrome language.
- [x] T028 [US2] Update `apps/web/src/lib/components/layout/ActivityBar.svelte` to use app chrome tokens and remain visually stable across world themes.
- [x] T029 [US2] Update `apps/web/src/lib/components/layout/AppFooter.svelte` to use app chrome tokens and no world texture.
- [x] T030 [US2] Update `apps/web/src/lib/components/settings/SettingsModal.svelte` so the modal shell uses app chrome styling.
- [x] T031 [US2] Update `apps/web/src/lib/components/search/SearchModal.svelte` so the modal shell and utility labels use app chrome styling and neutral terminology.
- [x] T032 [US2] Update `apps/web/src/lib/components/layout/SidebarPanelHost.svelte` and `apps/web/src/lib/components/EntityDetailPanel.svelte` so structural shells stay neutral while inner world content can be themed.

**Checkpoint**: User Story 2 is functional and independently testable.

---

## Phase 5: User Story 3 - Per-World Genre Canvas (Priority: P2)

**Goal**: World theme controls world/canvas mood, graph styling, in-world accents, and world vocabulary per vault without changing app appearance.

**Independent Test**: Create or open two worlds with different world themes. Each world restores its own theme, graph styling, and vocabulary while app chrome remains unchanged.

### Tests for User Story 3

- [x] T033 [P] [US3] Add unit tests in `apps/web/src/lib/stores/theme.test.ts` for per-vault world theme load/save and temporary preview behavior.
- [x] T034 [P] [US3] Add E2E coverage in `apps/web/tests/themes.spec.ts` for switching two worlds with different world themes while app appearance stays unchanged.
- [x] T035 [P] [US3] Add graph style tests in `packages/graph-engine/src/GraphStyles.test.ts` for using active world theme graph tokens.

### Implementation for User Story 3

- [x] T036 [US3] Update `apps/web/src/lib/components/settings/ThemeSelector.svelte` to expose separate App appearance and World theme controls.
- [x] T037 [US3] Update `apps/web/src/lib/components/world/FrontPage.svelte` and `apps/web/src/lib/components/world/FrontPageHero.svelte` to scope world theme texture/accent to world surfaces only.
- [x] T038 [US3] Update `apps/web/src/lib/components/world/EntityCard.svelte` to use world theme accent tokens only inside world content cards.
- [x] T039 [US3] Update graph surface wiring in `apps/web/src/lib/components/GraphView.svelte` and `apps/web/src/lib/components/graph/GraphToolbar.svelte` so graph/canvas regions receive world theme scope without changing chrome controls.
- [x] T040 [US3] Update `packages/graph-engine/src/GraphStyles.ts` and `packages/graph-engine/src/transformer.ts` to consume world theme graph tokens consistently.
- [x] T041 [US3] Update entity detail world content areas in `apps/web/src/lib/components/entity-detail/DetailHeader.svelte`, `apps/web/src/lib/components/entity-detail/DetailTabs.svelte`, and `apps/web/src/lib/components/entity-detail/DetailStatusTab.svelte` to apply world accents without theming structural shells.
- [x] T042 [US3] Ensure world jargon in `apps/web/src/lib/stores/theme.svelte.ts` applies to world/content labels only and does not rename neutral app chrome controls.

**Checkpoint**: User Story 3 is functional and independently testable.

---

## Phase 6: User Story 4 - Neutral Light and Dark App Appearances (Priority: P2)

**Goal**: Users can choose System, Light, or Dark app appearance independently of world theme.

**Independent Test**: Toggle Light, Dark, and System. Chrome changes between neutral light/dark, follows `prefers-color-scheme` in System, and does not change the selected world theme.

### Tests for User Story 4

- [x] T043 [P] [US4] Add unit tests in `apps/web/src/lib/stores/theme.test.ts` for `setAppAppearance`, invalid appearance fallback, and `prefers-color-scheme` changes.
- [x] T044 [P] [US4] Add E2E checks in `apps/web/tests/themes.spec.ts` for Light, Dark, and System app appearance controls.

### Implementation for User Story 4

- [x] T045 [US4] Implement `setAppAppearance`, system resolution, and matchMedia listener lifecycle in `apps/web/src/lib/stores/theme.svelte.ts`.
- [x] T046 [US4] Add App appearance UI options `System`, `Light`, and `Dark` in `apps/web/src/lib/components/settings/ThemeSelector.svelte`.
- [x] T047 [US4] Add neutral light/dark app chrome CSS variables and resolved selectors in `apps/web/src/app.css`.
- [x] T048 [US4] Verify mixed light-world/dark-app and dark-world/light-app boundaries in `apps/web/tests/themes.spec.ts`.

**Checkpoint**: User Story 4 is functional and independently testable.

---

## Phase 7: User Story 5 - Layered Typography (Priority: P2)

**Goal**: App controls, world mood surfaces, and authored content use distinct readable typography roles.

**Independent Test**: Compare neutral chrome, themed world headings, graph labels, and authored content. Controls remain practical, world headings may carry genre character, and body content stays readable.

### Tests for User Story 5

- [x] T049 [P] [US5] Add schema tests in `packages/schema/src/theme.test.ts` for app appearance typography tokens and fantasy heading/body distinction.
- [x] T050 [P] [US5] Add component coverage in `apps/web/src/lib/components/world/FrontPage.test.ts` for world heading typography scope.

### Implementation for User Story 5

- [x] T051 [US5] Define app chrome typography variables and world typography variables in `packages/schema/src/theme.ts` and `apps/web/src/app.css`.
- [x] T052 [US5] Apply neutral typography to chrome controls in `apps/web/src/lib/components/layout/AppHeader.svelte`, `apps/web/src/lib/components/layout/ActivityBar.svelte`, `apps/web/src/lib/components/layout/AppFooter.svelte`, `apps/web/src/lib/components/settings/SettingsModal.svelte`, and `apps/web/src/lib/components/search/SearchModal.svelte`.
- [x] T053 [US5] Apply world heading typography only to world hero, graph labels, and entity/world headings in `apps/web/src/lib/components/world/FrontPageHero.svelte`, `apps/web/src/lib/components/GraphView.svelte`, and entity detail components under `apps/web/src/lib/components/entity-detail/`.
- [x] T054 [US5] Ensure authored content areas in `apps/web/src/lib/components/entity-detail/DetailLoreTab.svelte` and `apps/web/src/lib/components/MarkdownEditor.svelte` remain long-form readable.
- [x] T055 [US5] Update theme help copy in `apps/web/src/lib/content/help/themes.md` to explain App appearance versus World theme.

**Checkpoint**: User Story 5 is functional and independently testable.

---

## Phase 8: User Story 6 - Fantasy Theme Refinement (Priority: P3)

**Goal**: Fantasy remains recognizable when intentionally selected, but with better hierarchy, graph weight, overlay behavior, palette balance, and edge treatment.

**Independent Test**: Select Fantasy world theme and inspect world surfaces, graph relationships, typography, and light hero overlays. Fantasy mood remains, but graph edges and parchment treatment no longer dominate app chrome or content.

### Tests for User Story 6

- [x] T056 [P] [US6] Add schema tests in `packages/schema/src/theme.test.ts` for fantasy distinct heading/body fonts, intentional border radius, and reduced graph edge weight.
- [x] T057 [P] [US6] Add graph tests in `packages/graph-engine/src/GraphStyles.test.ts` for fantasy edge width and color/opacity expectations.
- [x] T058 [P] [US6] Add E2E/visual assertions in `apps/web/tests/themes.spec.ts` for fantasy texture scoping and light hero overlay behavior.

### Implementation for User Story 6

- [x] T059 [US6] Refine fantasy tokens in `packages/schema/src/theme.ts` with distinct heading/body typography, palette contrast, and intentional corner treatment.
- [x] T060 [US6] Reduce fantasy graph relationship visual weight in `packages/schema/src/theme.ts` and `packages/graph-engine/src/GraphStyles.ts`.
- [x] T061 [US6] Replace dark light-theme vignette behavior in `apps/web/src/lib/components/world/FrontPage.svelte` and `apps/web/src/lib/components/world/FrontPageHero.svelte` with token-based overlays.
- [x] T062 [US6] Keep parchment texture available for fantasy world/canvas moments while preventing repetition on body/chrome in `apps/web/src/app.css`.

**Checkpoint**: User Story 6 is functional and independently testable.

---

## Phase 9: Polish & Verification

**Purpose**: Cross-story cleanup, docs, and final validation.

- [x] T063 [P] Update `docs/STYLE_GUIDE.md` so theming guidance documents app appearance versus world theme, app chrome token usage, scoped world texture, and no longer describes Fantasy as the default app theme.
- [x] T064 [P] Update `specs/113-neutral-world-theming/quickstart.md` if implementation commands or validation steps change.
- [x] T065 Run focused unit tests: `bun run --filter schema test`, `bun run --filter graph-engine test`, and `bun run --filter web test -- theme`.
- [x] T066 Run focused browser checks: `bun run --filter web test:e2e -- themes.spec.ts`.
- [x] T067 Run full validation: `bun run lint` and `bun run test`.
- [x] T068 Manually validate first-pass surfaces from quickstart: header, activity bar, footer, settings, search, front page, graph, and entity detail.
- [x] T069 Confirm no unintended changes to existing saved theme behavior by testing fantasy, modern, and one dark genre theme.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup**: No dependencies.
- **Phase 2 Foundation**: Depends on Phase 1 and blocks all user stories.
- **Phase 3 US1**: Depends on Phase 2 and is the MVP.
- **Phase 4 US2**: Depends on Phase 2; can proceed alongside US1 after shared store/schema contract is stable, but MVP validation should include US1 + US2.
- **Phases 5-7 US3-US5**: Depend on Phase 2 and can proceed after the app/world split is available.
- **Phase 8 US6**: Depends on world theme scoping from US3 for texture/graph behavior.
- **Phase 9 Polish**: Depends on all intended user stories being complete.

### User Story Dependencies

- **US1 Neutral Default Workspace**: Requires foundational schema/store split only.
- **US2 Stable App Chrome**: Requires foundational DOM/app appearance attributes only.
- **US3 Per-World Genre Canvas**: Requires foundational world theme state and should integrate with US2 shell boundaries.
- **US4 Neutral Light and Dark App Appearances**: Requires foundational app appearance state; independent of genre canvas after that.
- **US5 Layered Typography**: Requires app/world style scopes from US2 and US3.
- **US6 Fantasy Theme Refinement**: Requires world theme scoping from US3.

### Parallel Opportunities

- T002 and T003 can run in parallel.
- T004 and T005 can run in parallel; T006 edits the same store test file as T005 and should follow it.
- Component tests T021-T024 can run in parallel.
- US3 tests T033-T035 can run in parallel.
- US4 tests T043-T044 can run in parallel.
- US5 tests T049-T050 can run in parallel.
- US6 tests T056-T058 can run in parallel.
- Different component styling updates in US2 can be split by file once app chrome variables exist.

## Implementation Strategy

### MVP First

1. Complete Phase 1.
2. Complete Phase 2.
3. Complete Phase 3 and Phase 4.
4. Validate first-time neutral defaults, saved-theme preservation, and texture-free chrome.

### Incremental Delivery

1. Add US1 neutral defaults.
2. Add US2 chrome stability.
3. Add US3 per-world canvas behavior.
4. Add US4 light/dark/system app appearance.
5. Add US5 typography layering.
6. Add US6 fantasy refinement.
7. Run Phase 9 validation.

## Notes

- Tests listed for each story should be written before implementation and should fail against current behavior.
- Do not overwrite existing user theme values during migration; invalid values are ignored at read time until the user saves a new selection.
- Keep app chrome labels plain neutral language; world theme jargon applies only to world/content actions and labels.
- `workspace` is the only default for missing world theme values; `modern` remains a normal selectable existing theme.
