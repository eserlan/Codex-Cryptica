# Implementation Tasks: Move Oracle to Left Sidebar

## Phase 1: Setup

- [ ] T001 [P] Create the directory for layout components in `apps/web/src/lib/components/layout/`

## Phase 2: Foundational

- [ ] T002 Update `uiStore` with sidebar state (`leftSidebarOpen`, `activeSidebarTool`, `isMobile`) and toggle methods in `apps/web/src/lib/stores/ui.svelte.ts`
- [ ] T003 Create unit tests for sidebar state transitions in `apps/web/src/lib/stores/ui.test.ts`
- [ ] T004 Refactor `apps/web/src/routes/+layout.svelte` to include a `flex-row` container for the main content and sidebar

## Phase 3: [US1] Dedicated Oracle Sidebar Access

**Goal**: Access the Oracle via a dedicated icon in a left sidebar instead of a floating button.

**Independent Test**: The floating orb is gone, replaced by a left sidebar icon that toggles the Oracle panel.

- [ ] T005 [P] Create the `LeftSidebar.svelte` component with the Oracle icon trigger in `apps/web/src/lib/components/layout/LeftSidebar.svelte`
- [ ] T006 [P] Create `OracleSidebarPanel.svelte` by refactoring logic from `OracleWindow.svelte` and reusing `OracleChat.svelte` in `apps/web/src/lib/components/oracle/OracleSidebarPanel.svelte`
- [ ] T007 Integrate `LeftSidebar` and `OracleSidebarPanel` into the refactored layout in `apps/web/src/routes/+layout.svelte`
- [ ] T008 Remove the floating "Oracle Orb" button and the docked window logic from `apps/web/src/lib/components/oracle/OracleWindow.svelte`
- [ ] T009 Create E2E test to verify Oracle sidebar toggling and workspace expansion in `apps/web/tests/oracle-sidebar.spec.ts`

## Phase 4: [US2] Persistent Navigation Hub

**Goal**: Left sidebar remains visible and maintains state across different views (Graph, Map, Canvas).

**Independent Test**: Open Oracle, navigate to Map, verify it stays open.

- [ ] T010 Ensure `activeSidebarTool` state is preserved in `uiStore` during client-side navigation in `apps/web/src/lib/stores/ui.svelte.ts`
- [ ] T011 Verify sidebar persistence across routes in E2E test `apps/web/tests/oracle-sidebar.spec.ts`

## Phase 5: [US3] Mobile Responsive Layout

**Goal**: Sidebar transitions to a mobile-friendly layout (bottom bar or overlay).

**Independent Test**: Resize viewport to mobile width and verify sidebar adapts.

- [ ] T012 Add responsive styles to `LeftSidebar.svelte` to transform into a bottom bar or hide on small screens
- [ ] T013 Update `OracleSidebarPanel.svelte` to render as a full-screen overlay or slide-up panel on mobile
- [ ] T014 Add E2E tests for mobile viewport responsiveness in `apps/web/tests/oracle-sidebar.spec.ts`

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T015 [P] Update user-facing help documentation in `apps/web/src/lib/config/help-content.ts`
- [ ] T016 [P] Add a `FeatureHint` for the new sidebar location in `apps/web/src/lib/components/GraphView.svelte`
- [ ] T017 Final project-wide linting and type checking (`npm run lint`)

## Dependencies

1. US1 depends on Phase 2 (Foundational).
2. US2 depends on US1.
3. US3 depends on US1.

## Parallel Execution Examples

- **Setup**: T001 can run while T002 is being planned.
- **US1**: T005 and T006 can be developed in parallel as they are separate files.
- **Polish**: T015 and T016 can be handled independently.

## Implementation Strategy

We will follow an incremental delivery approach:

1.  **Foundational**: Build the state management and layout structure first.
2.  **US1 (MVP)**: Migrate the Oracle to the sidebar. This is the primary value deliverable.
3.  **US2/US3**: Enhance the experience with persistence and responsiveness.
