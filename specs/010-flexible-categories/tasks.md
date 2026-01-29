# Tasks: Flexible Categories

- [x] **Schema & Store** <!-- id: 1 -->
    - [x] Update `packages/schema/src/entity.ts` with `icon` and `Creature` category. <!-- id: 1.1 -->
    - [x] Create `apps/web/src/lib/stores/categories.svelte.ts` with `resetToDefaults`. <!-- id: 1.2 -->
    - [x] Register store in `+layout.svelte`. <!-- id: 1.3 -->

- [x] **Graph View Integration** <!-- id: 2 -->
    - [x] Refactor `graph-theme.ts` to `BASE_STYLE` and `getTypeStyles`. <!-- id: 2.1 -->
    - [x] Implement reactive `cy.style()` update in `GraphView.svelte`. <!-- id: 2.2 -->

- [x] **UI: Management** <!-- id: 3 -->
    - [x] Create `CategorySettings.svelte`. <!-- id: 3.1 -->
    - [x] Integrate into `CloudStatus.svelte` settings menu. <!-- id: 3.2 -->
    - [x] Update `VaultControls.svelte` creation dropdown. <!-- id: 3.3 -->
    - [x] Implement Icon Picker in `CategorySettings.svelte`. <!-- id: 3.4 -->

- [x] **Polishing & Robustness** <!-- id: 4 -->
    - [x] Update entity detail panel to show category label instead of raw ID. <!-- id: 4.1 -->
    - [x] Update search preview to show category label and icon. <!-- id: 4.2 -->
    - [x] Add "Reset to Defaults" button in settings. <!-- id: 4.3 -->
    - [x] Add basic unit tests for `categories.svelte.ts`. <!-- id: 4.4 -->
    - [x] **Data Integrity**: Verify non-destructive deletion and fallback style in GraphView. <!-- id: 4.5 -->
    - [x] **E2E**: Add test for category-driven style updates (Reactive Border Color). <!-- id: 4.6 -->
    - [x] **Acceptance**: Offline Functionality Verification (ensure categories persist/work without network). <!-- id: 4.7 -->