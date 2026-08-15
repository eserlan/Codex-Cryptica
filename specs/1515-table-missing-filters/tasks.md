# Tasks: Missing-Data Visibility & Column-Level Filters for Entity Table

## Phase 1: Core Filtering Logic & Unit Tests (TDD)

- [x] **T001**: Add `evaluateEntityMissingFields` and `TableColumnFilters` types and logic to `apps/web/src/lib/components/explorer/entityListFiltering.ts`.
- [x] **T002**: Extend `filterEntities` in `apps/web/src/lib/components/explorer/entityListFiltering.ts` with `showIncompleteOnly` and `columnFilters` predicates.
- [x] **T003**: Write comprehensive unit tests in `apps/web/src/lib/components/explorer/entityListFiltering.test.ts` verifying all missing-data predicates and multi-criteria AND combinations.

## Phase 2: UI Components & Table Integration

- [x] **T004**: Add "Show incomplete only" toggle switch with badge count and "Clear all filters" button to `apps/web/src/routes/(app)/table/+page.svelte`.
- [x] **T005**: Create `TableColumnFilterMenu.svelte` for header filter popovers (Labels, Type, Summary, Connections, Dates).
- [x] **T006**: Update `EntityTable.svelte` header row to display filter trigger buttons and active filter indicators on filtered columns.
- [x] **T007**: Update `EntityTableRow.svelte` to highlight empty cells with distinct styling when `showIncompleteOnly` is active.

## Phase 3: Verification & Integration Testing

- [x] **T008**: Run full unit test suite `bun test` and typecheck/lint `bun run lint`.
- [x] **T009**: Verified component and filtering tests across `EntityTable.test.ts` and `entityListFiltering.test.ts`.
