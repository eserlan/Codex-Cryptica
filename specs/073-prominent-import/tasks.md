# Tasks: Prominent Import Feature

## Phase 1: Setup

- [x] T001 [P] Create E2E test file for feature verification in `apps/web/tests/import-prominence.spec.ts`

## Phase 2: Foundational

- [x] T002 [P] Create dedicated route at `apps/web/src/routes/import/+page.svelte` using `ImportSettings` component
- [x] T003 [P] Add `openImportWindow` method to `UIStore` in `apps/web/src/lib/stores/ui.svelte.ts` using `window.open`
- [x] T004 [P] Update `+layout.svelte` to hide global navigation for the `/import` route (focused popup mode)
- [x] T005 [P] Create unit test for `UIStore` window-opening logic in `apps/web/src/lib/stores/ui.svelte.test.ts`

## Phase 3: User Story 1 - Dedicated Archive Importer (Priority: P1)

**Goal**: Add a global "IMPORT" button that opens the focused popout importer.

**Independent Test**: Click "IMPORT" in the header; verify focused Archive Importer opens in a new window.

- [x] T006 [P] [US1] Add "IMPORT" button with icon and `btnSecondary` style to `apps/web/src/lib/components/VaultControls.svelte`
- [x] T007 [US1] Implement button click handler to trigger `ui.openImportWindow()` in `apps/web/src/lib/components/VaultControls.svelte`
- [x] T008 [US1] Add E2E test case for popout window behavior in `apps/web/tests/import-prominence.spec.ts`

## Phase 4: User Story 2 - Contextual Access from File Explorer (Priority: P2)

**Goal**: Add an import shortcut to the File Explorer header.

**Independent Test**: Open File Explorer; click the import icon; verify popout terminal opens.

- [x] T009 [P] [US2] Add small "Import" icon button to `apps/web/src/lib/components/canvas/EntityPalette.svelte` header
- [x] T010 [US2] Implement icon click handler to trigger `uiStore.openImportWindow()` in `apps/web/src/lib/components/canvas/EntityPalette.svelte`
- [x] T011 [US2] Add E2E test case for explorer shortcut in `apps/web/tests/import-prominence.spec.ts`

## Phase 5: Polish & Cross-Cutting

- [x] T012 [P] Add a `FeatureHint` for the new Import button in `apps/web/src/lib/components/VaultControls.svelte`
- [x] T013 [P] Add `import-feature` help content to `apps/web/src/lib/config/help-content.ts`
- [x] T014 Replace embedded import section in `SettingsModal.svelte` with a CTA to launch the dedicated terminal
- [x] T015 Run final verification suite: `npm run lint` and all E2E tests

## Dependencies

1. US1 should be completed before US2 (P2).
2. Phase 2 (Foundational) blocks all UI implementation tasks.

## Parallel Execution

- US1 and US2 were developed in parallel as they modified independent components.

## Implementation Strategy

1. **Focused Importer**: Establish the popout route first to serve as the global target.
2. **Global Access**: Add the header button to provide immediate discoverability.
3. **Contextual**: Provide shortcuts within specialized views (Explorer).
