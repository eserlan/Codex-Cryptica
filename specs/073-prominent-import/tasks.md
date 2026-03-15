# Tasks: Prominent Import Feature

## Phase 1: Setup

- [x] T001 [P] Create E2E test file for feature verification in `apps/web/tests/import-prominence.spec.ts`

## Phase 2: Foundational

- [x] T002 [P] Update `UIStore` to support deep-linking to specific settings sections in `apps/web/src/lib/stores/ui.svelte.ts`
- [x] T003 [P] Create unit test for `UIStore` deep-linking logic in `apps/web/src/lib/stores/ui.test.ts`

## Phase 3: User Story 1 - Quick Access from Top Menu (Priority: P1)

**Goal**: Add a global "IMPORT" button to the top menu Vault Controls.

**Independent Test**: Click "IMPORT" in the header; verify Settings Modal opens to the 'Vault' tab and scrolls to Ingestion.

- [x] T004 [P] [US1] Add "IMPORT" button with icon and `btnSecondary` style to `apps/web/src/lib/components/VaultControls.svelte`
- [x] T005 [US1] Implement button click handler to trigger `uiStore.openSettings('vault', 'ingestion')` in `apps/web/src/lib/components/VaultControls.svelte`
- [x] T006 [US1] Add E2E test case for sidebar/header button visibility and action in `apps/web/tests/import-prominence.spec.ts`

## Phase 4: User Story 3 - Onboarding from Empty State (Priority: P1)

**Goal**: Show a prominent call-to-action when the vault is empty.

**Independent Test**: Launch app with an empty vault; verify central overlay appears with "Import" and "Create" buttons.

- [x] T007 [P] [US3] Create `EmptyVaultOverlay.svelte` component with "Create" and "Import" actions in `apps/web/src/lib/components/vaults/EmptyVaultOverlay.svelte`
- [x] T008 [P] [US3] Create unit test for `EmptyVaultOverlay.svelte` rendering and event emission in `apps/web/src/lib/components/vaults/EmptyVaultOverlay.test.ts`
- [x] T009 [US3] Implement logic to display `EmptyVaultOverlay` when `vault.allEntities.length === 0` in `apps/web/src/routes/+page.svelte`
- [x] T010 [US3] Add E2E test case for empty state overlay display and interactions in `apps/web/tests/import-prominence.spec.ts`

## Phase 5: User Story 2 - Contextual Access from File Explorer (Priority: P2)

**Goal**: Add an import icon to the File Explorer header.

**Independent Test**: Open File Explorer; click the new import icon; verify Settings Modal opens.

- [x] T011 [P] [US2] Locate File Explorer header and add a small "Import" icon button next to "New Node" in `apps/web/src/lib/components/canvas/EntityPalette.svelte`
- [x] T012 [US2] Implement icon click handler to trigger `uiStore.openSettings('vault', 'ingestion')` in `apps/web/src/lib/components/canvas/EntityPalette.svelte`
- [x] T013 [US2] Add E2E test case for explorer icon visibility and action in `apps/web/tests/import-prominence.spec.ts`

## Phase 6: Polish & Cross-Cutting

- [x] T014 [P] Add a `FeatureHint` for the new Import button in `apps/web/src/lib/components/VaultControls.svelte`
- [x] T015 Ensure consistent styling and spacing across all new buttons in `apps/web/src/lib/components/VaultControls.svelte` and `apps/web/src/lib/components/vaults/EmptyVaultOverlay.svelte`
- [x] T016 Run final verification suite: `npm run lint` and all E2E tests

## Dependencies

1. US1 and US3 (P1) should be completed before US2 (P2).
2. T002 (Foundational) should be completed before US1/US2/US3 if deep-linking logic is complex (though simple `openSettings` works immediately).

## Parallel Execution

- US1, US2, and US3 can be developed in parallel as they modify different files (`VaultControls.svelte`, `EntityPalette.svelte`, and `EmptyVaultOverlay.svelte` respectively).

## Implementation Strategy

1. **MVP**: Implement User Story 1 (Header button) first to provide immediate global access.
2. **Onboarding**: Implement User Story 3 (Empty state) to improve the first-run experience.
3. **Contextual**: Implement User Story 2 (Explorer icon) last as a contextual shortcut.
