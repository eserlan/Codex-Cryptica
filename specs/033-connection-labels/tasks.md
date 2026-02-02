# Tasks: Connection Labels & Visual Representation

**Feature Branch**: `033-connection-labels`
**Spec**: [specs/033-connection-labels/spec.md](spec.md)

## Implementation Strategy
We will first update the core data schema to support connection metadata, then enhance the graph engine to render these new properties, and finally update the UI to allow users to edit them.

## Dependencies
- Phase 2 (Schema) blocks Phase 3 (Graph) and Phase 4 (UI).
- Phase 3 and Phase 4 can be developed in parallel after Phase 2.

---

## Phase 1: Setup
Goal: Initialize the feature branch and verify the environment.

- [X] T001 Verify project state and ensure no schema conflicts exist.

## Phase 2: Core Schema & Data Model
Goal: Update the `Connection` schema to support types and labels.
**Story**: [US1] Categorize Connections

- [ ] T002 [P] [US1] Update `ConnectionSchema` in `packages/schema/src/connection.ts` to include `type` enum and optional `label` string.
- [ ] T003 [P] [US1] Update `EntitySchema` in `packages/schema/src/entity.ts` if necessary (likely just re-export/verification).
- [ ] T004 [US1] Add unit tests for new connection schema validation in `packages/schema/src/schema.test.ts`.

## Phase 3: Graph Visualization
Goal: Render edge colors and labels based on connection data.
**Story**: [US2] Visual Representation & [US3] Custom Relationship Labels

- [ ] T005 [P] [US2] Define color constants for 'friendly', 'enemy', and 'neutral' in `packages/graph-engine/src/defaults.ts`.
- [ ] T006 [P] [US2] Update `GraphTransformer` in `packages/graph-engine/src/transformer.ts` to map connection `type` to edge `line-color` and `target-arrow-color`.
- [ ] T007 [P] [US3] Update `GraphTransformer` to map connection `label` to Cytoscape edge `label` property.
- [ ] T008 [US2] Update graph stylesheet in `packages/graph-engine/src/defaults.ts` (or relevant style file) to ensure edge labels are visible and positioned correctly.
- [ ] T009 [US2] Add unit tests in `packages/graph-engine/tests/transformer.test.ts` to verify correct style mapping for different connection types.

## Phase 4: UI Integration
Goal: Allow users to edit connection details in the Entity Detail Panel.
**Story**: [US1] Categorize Connections & [US3] Custom Relationship Labels

- [ ] T010 [P] [US1] Update `apps/web/src/lib/stores/vault.svelte.ts` to support updating `type` and `label` in `updateConnection` method.
- [ ] T011 [US1] Create a new `ConnectionEditor.svelte` component (or update existing inline editor) in `apps/web/src/lib/components/connections/`.
- [ ] T012 [P] [US1] Add dropdown for "Relationship Type" (Friendly, Enemy, Neutral) to the connection editor.
- [ ] T013 [P] [US3] Add text input for "Custom Label" to the connection editor.
- [ ] T014 [US1] Integrate the updated connection editor into `EntityDetailPanel.svelte`.

## Phase 5: Verification & Polish
Goal: Ensure the feature works end-to-end and looks good.

- [ ] T015 [US2] Create E2E test in `apps/web/tests/graph-connections.spec.ts` to verify edge colors update when connection type changes.
- [ ] T016 [US3] Create E2E test to verify edge labels appear when custom text is entered.
- [ ] T017 Manual verification: Create a "triangle of conflict" (A-B Enemy, B-C Friendly, C-A Neutral) and verify visual distinction.
- [ ] T018 Constitution Verification: Verify offline functionality by creating/editing connections while network is disconnected.
