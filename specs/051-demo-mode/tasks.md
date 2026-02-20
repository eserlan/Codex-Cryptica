# Tasks: Interactive Demo Mode

**Input**: Design documents from `/specs/051-demo-mode/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and sample data preparation

- [x] T001 [P] Create sample JSON data for each theme in `apps/web/static/vault-samples/` (fantasy.json, vampire.json, scifi.json, cyberpunk.json, wasteland.json, modern.json)
- [x] T002 [P] Define `DemoMetadata` and `IDemoActions` types in `apps/web/src/lib/types/demo.ts` based on contracts/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Update `uiStore` in `apps/web/src/lib/stores/ui.svelte.ts` to include `isDemoMode`, `activeDemoTheme`, and `hasPromptedSave` fields
- [x] T004 Implement `loadDemoData(data)` in `apps/web/src/lib/stores/vault.svelte.ts` to populate vault state from in-memory object
- [x] T005 Implement `persistToIndexedDB(vaultId)` in `apps/web/src/lib/stores/vault.svelte.ts` to clone transient state to persistent storage
- [x] T006 Implement `startDemo(theme)` and `exitDemo()` actions in a new service `apps/web/src/lib/services/demo.ts`
- [x] T006.1 [US1] Add "Exit Demo" button to `apps/web/src/lib/components/VaultControls.svelte` next to the Demo badge

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Instant Exploration (Priority: P1) 🎯 MVP

**Goal**: Allow users to enter a pre-populated workspace from the landing page

**Independent Test**: Click "Try Demo" on landing page and verify graph/entities appear immediately

- [x] T007 [US1] Add "Try Demo" button next to "Enter Workspace" in `apps/web/src/routes/+page.svelte`
- [x] T008 [US1] Implement automatic demo prompt logic in `apps/web/src/routes/+layout.svelte` if vault is empty
- [x] T009 [US1] Add "DEMO MODE" status badge to `apps/web/src/lib/components/VaultControls.svelte` when `uiStore.isDemoMode` is true
- [x] T010 [US1] Gate data-destructive operations (like delete vault) in `apps/web/src/lib/stores/vault.svelte.ts` when in demo mode

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 4 - Theme-Specific Deep Linking (Priority: P1)

**Goal**: Support URL-based demo activation with specific themes

**Independent Test**: Visit `/?demo=vampire` and verify Vampire theme + jargon loads instantly

- [x] T011 [US4] Implement URL query parameter detection for `demo` in `apps/web/src/routes/+layout.svelte`
- [x] T012 [US4] Add "Theme Quick-Start" links (Fantasy, Vampire, Sci-Fi) to the marketing layer in `apps/web/src/routes/+page.svelte`
- [x] T013 [P] [US4] Create theme-specific marketing prompt logic in `apps/web/src/lib/services/demo.ts`
- [x] T013.1 [US4] Display marketing CTA in `apps/web/src/lib/components/oracle/OracleWindow.svelte` during active demo sessions

**Checkpoint**: Users can now deep-link into specific demo experiences

---

## Phase 5: User Story 2 - Sandbox Interaction (Priority: P2)

**Goal**: Allow transient editing and guided Oracle interactions

**Independent Test**: Edit a node in demo mode, reload, and verify changes are gone

- [x] T014 [US2] Update `OracleStore` in `apps/web/src/lib/stores/oracle.svelte.ts` to append "guided demo" instructions to system prompt when in demo mode
- [x] T015 [US2] Add visual feedback for "unsaved" status in `apps/web/src/lib/components/EntityDetailPanel.svelte` during demo mode

**Checkpoint**: Demo mode feels interactive but remains transient

---

## Phase 6: User Story 3 - Conversion to Campaign (Priority: P3)

**Goal**: Allow users to save their demo work as a permanent campaign

**Independent Test**: Click "Save as Campaign" and verify data persists after reload

- [x] T016 [US3] Add "Save as Campaign" CTA button to `apps/web/src/lib/components/settings/VaultSettings.svelte`
- [x] T017 [US3] Implement conversion logic in `apps/web/src/lib/services/demo.ts` to trigger `vault.persistToIndexedDB` and clear demo flags
- [x] T018 [US3] Show success notification after successful conversion

**Checkpoint**: All user stories are now independently functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final refinements and documentation

- [x] T019 [P] Add Demo Mode documentation to `apps/web/src/lib/config/help-content.ts`
- [x] T020 Ensure all 6 theme sample datasets are balanced and high-quality
- [x] T021 [P] Run E2E tests for demo activation and conversion flows

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Phase 1
- **User Stories (Phase 3-6)**: All depend on Phase 2 completion
- **Polish (Phase 7)**: Depends on all stories being complete

### User Story Dependencies

- **US1 & US4 (P1)**: High priority, can be worked on in parallel once foundation is ready
- **US2 (P2)**: Depends on US1
- **US3 (P3)**: Depends on US1

### Parallel Opportunities

- Creating sample data (T001) and defining types (T002)
- Implementing deep-linking (T011) and quick-start UI (T012)
- Documentation (T019) and E2E verification (T021)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Verify users can enter demo mode from landing page

### Incremental Delivery

1. Foundation + US1 (Instant Exploration) -> MVP ready
2. Add US4 (Deep Linking) -> Enhanced marketing
3. Add US2 (Guided Oracle) -> Interactive polish
4. Add US3 (Conversion) -> Full user lifecycle
