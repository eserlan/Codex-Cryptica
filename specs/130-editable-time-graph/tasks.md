---
description: "Task list for Editable Time Graph with Semantic Temporal Placement"
---

# Tasks: Editable Time Graph with Semantic Temporal Placement

**Input**: Design documents from `/specs/130-editable-time-graph/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Included — Constitution II (TDD) mandates Red-Green-Refactor; test tasks precede implementation within each phase.

**Organization**: Tasks are grouped by user story (spec.md priorities) so each story is an independently testable increment. All temporal logic lives in `packages/` (Library-First); `apps/web` is the thin UI layer.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1–US6 (user-story phases only)

## Path Conventions

Web monorepo: libraries in `packages/<pkg>/src/` (+ co-located or `tests/` specs), UI in `apps/web/src/lib/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create stub modules/files so packages compile and parallel TDD can begin.

- [x] T001 [P] Create `chronology-engine` module stubs `meaning-sets.ts`, `anchors.ts`, `placement.ts` in `packages/chronology-engine/src/` and re-export them from `packages/chronology-engine/src/index.ts`
- [x] T002 [P] Create edit-mode UI stubs `ChronologyEditToggle.svelte`, `ChronologyDragIndicator.svelte`, `SemanticPlacementPopover.svelte` in `apps/web/src/lib/components/graph/`
- [x] T003 [P] Create `ChronologyEditService` stub with constructor DI (injectable vault/calendar/resolver deps) + default singleton export in `apps/web/src/lib/stores/chronology-edit.svelte.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The anchor model, pure resolution/semantics engines, edit-mode state, the placement service, and the drag plumbing shared by every user story.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Schema (contract: `contracts/schema.temporal-anchor.md`)

- [x] T004 [P] Write failing tests for `TemporalAnchorSchema` (at-least-one-date, custom⇒label, range non-inverted, date-shape) and `Entity` back-compat in `packages/schema/src/entity.test.ts`
- [x] T005 Implement `TemporalAnchorSchema` + add optional `temporalAnchors` to `EntitySchema` and `TemporalAnchor` type export in `packages/schema/src/entity.ts` (green for T004)

### graph-engine — position↔year + projection (contract: `contracts/graph-engine.anchor-projection.md`)

- [x] T006 [P] Write failing tests for `getYearForPosition` round-trip/out-of-range and `getAnchorTimelineLayout` per-anchor keys in `packages/graph-engine/tests/timeline-anchor.test.ts`
- [x] T007 Implement `getYearForPosition` (inverse of sequential/gap-compressed layout) and `getAnchorTimelineLayout` (keyed `"entityId::anchorId"`) additively in `packages/graph-engine/src/layouts/timeline.ts`

### chronology-engine — meanings, anchors, placement (contract: `contracts/chronology-engine.placement.md`)

- [x] T008 [P] Write failing tests for `MEANING_SETS`/`getMeanings`/`getBeginMeaning`/`getEndMeaning` (per-type sets, begin/end roles per FR-016a, universal custom, fallback) in `packages/chronology-engine/tests/meaning-sets.test.ts`
- [x] T009 Implement `MEANING_SETS` + `getMeanings`/`getBeginMeaning`/`getEndMeaning` (begin/end `role`, one `primary` per type) in `packages/chronology-engine/src/meaning-sets.ts`
- [x] T010 [P] Write failing tests for `deriveProjectedAnchors`, `validateRange`, `upsertAnchor`, `removeAnchor` (primary projection + per-anchor, no sibling/primary mutation) in `packages/chronology-engine/tests/anchors.test.ts`
- [x] T011 Implement `anchors.ts` helpers in `packages/chronology-engine/src/anchors.ts` (depends on T005, T009)
- [x] T012 [P] Write failing tests for `buildIntent` (Event primary→`date`; non-primary→anchor; span yields begin+end; never coordinates) and `detectConflict` (calendar-equality) in `packages/chronology-engine/tests/placement.test.ts`
- [x] T013 Implement `placement.ts` (`buildIntent`, `PlacementIntent`, `detectConflict`) in `packages/chronology-engine/src/placement.ts` (depends on T009, T011)

### Edit-mode state, service & drag plumbing (apps/web)

- [x] T014 Add `chronologyEditMode` state (requires `timelineMode`; toggling off clears pending drag) + toggle/guard actions to `apps/web/src/lib/stores/graph.svelte.ts`
- [x] T015 [P] Write failing tests for `ChronologyEditService` lifecycle — grab→drag→drop→confirm/cancel, gesture point/span derivation, restore-on-cancel, no-write-on-cancel, save via injected vault, conflict surfacing — in `apps/web/src/lib/stores/chronology-edit.svelte.test.ts`
- [x] T016 Implement `ChronologyEditService` (transient `ChronologyDrag` state, `pressYear`/`targetYear`/`gestureKind`, routes saves through injected `vault.updateEntity`; uses `buildIntent`/`detectConflict`/`getYearForPosition`) in `apps/web/src/lib/stores/chronology-edit.svelte.ts` (depends on T013, T007, T014)
- [x] T017 Implement `ChronologyEditToggle.svelte` mode toggle (placed near `TimelineControls`, clear "editing lore" affordance) in `apps/web/src/lib/components/graph/ChronologyEditToggle.svelte`
- [x] T018 Implement `ChronologyDragIndicator.svelte` live target-year axis indicator bound to service state, formatting the label via `calendarStore`/`chronology-engine` so it reads in-world notation (e.g. "605 P.C.") not a bare number (FR-010, U2), in `apps/web/src/lib/components/graph/ChronologyDragIndicator.svelte`
- [x] T019 Wire Cytoscape `grab`/`drag`/`dragfree` handlers (gated on `chronologyEditMode`) into `apps/web/src/lib/components/graph/graph-view-controller.svelte.ts` to drive `ChronologyEditService`

**Checkpoint**: Foundation ready — pure engines green, edit mode toggles, a gated drag updates the live indicator and resolves an intent (without writing yet).

---

## Phase 3: User Story 1 - Drag an Event to set its date (Priority: P1) 🎯 MVP

**Goal**: In edit-chronology mode, dragging an Event resolves a target year, shows a direct "Set event date to X?" confirmation, and on confirm updates the Event's `date` (persisted), with cancel a no-op.

**Independent Test**: Drag an Event in edit mode, observe the live year, confirm the direct prompt, verify `entity.date` changed and survives reload; repeat and cancel to verify no change.

- [x] T020 [P] [US1] Write failing test: an Event drop yields a primary-`date` intent with a "Set event date to {year}?" summary, and confirm→`vault.updateEntity({date})`, cancel→no write, in `apps/web/src/lib/stores/chronology-edit.svelte.test.ts`
- [x] T021 [US1] Implement the direct-confirmation path (primary `date` write) in `apps/web/src/lib/components/graph/SemanticPlacementPopover.svelte` — a compact "Set event date to {year}? Save/Cancel" mode (no full meaning list)
- [x] T022 [US1] Wire Event `dragfree` → `buildIntent` (begin/primary `date`) → direct confirm → `vault.updateEntity`; settle node at derived position on save and restore origin on cancel, in `ChronologyEditService` + `graph-view-controller.svelte.ts`
- [x] T023 [US1] Add persistence assertion test: saved Event has updated structured `date` and no raw graph coordinate stored (SC-008), in `apps/web/src/lib/stores/chronology-edit.svelte.test.ts`

**Checkpoint**: MVP — Events can be re-dated by direct manipulation, canon-safe.

---

## Phase 4: User Story 2 - Semantic placement popover (Priority: P1)

**Goal**: Dragging a Character/Faction/Location/Item/Note opens a popover offering type-appropriate meanings; saving writes the primary field or a `temporalAnchors[]` entry and discloses which field/anchor changes.

**Independent Test**: Drag a Character → popover shows Born/Died/Active/Reign/Major appearance/Custom; pick Born, save, verify the value persisted; drag a Faction → different (Founded/Dissolved/…) set.

- [x] T024 [P] [US2] Write failing tests for `SemanticPlacementPopover` rendering type-specific meanings (via `getMeanings`), begin-default selection, and the "field/anchor to be changed" disclosure (FR-005) in `apps/web/src/lib/components/graph/SemanticPlacementPopover.test.ts`
- [x] T025 [US2] Implement `SemanticPlacementPopover.svelte`: `@floating-ui/dom`-anchored popover showing entity name + target year, meaning list from `getMeanings(type)` (generic fallback for creature/custom categories), value field reusing `TemporalPicker`, write-target disclosure, a **conflict prompt** when `detectConflict` is true (FR-032), Save/Cancel (depends on T024)
- [x] T026 [US2] Route non-Event drops to the popover; on save apply `buildIntent` → `vault.updateEntity` writing the primary field or `upsertAnchor`-produced `temporalAnchors[]`, in `apps/web/src/lib/stores/chronology-edit.svelte.ts` + `apps/web/src/lib/components/graph/graph-view-controller.svelte.ts`
- [x] T027 [US2] Natural-language copy + keyboard/escape accessibility for the popover (Constitution IX); confirm cancel/escape writes nothing, in `apps/web/src/lib/components/graph/SemanticPlacementPopover.svelte`

**Checkpoint**: All entity types can be placed in time with the right vocabulary, canon-safe.

---

## Phase 5: User Story 3 - Drag a Period to set its range (Priority: P2)

**Goal**: Reshape Periods (and any span meaning) on the graph — move the whole span, drag a start/end edge, or draw a span in one gesture; reject inverted ranges.

**Independent Test**: Drag a Period span 50 years later → range shifts and both ends update; drag only the end edge → only end updates; attempt an inverted range → blocked with reason.

- [x] T028 [P] [US3] Write failing tests for span-gesture resolution (press=begin, release=end → begin+end pre-fill) and `validateRange` block in `apps/web/src/lib/stores/chronology-edit.svelte.test.ts`
- [x] T029 [US3] Implement gesture point/span derivation (threshold = swept width resolving to **≥ 1 year** and ≥ ~6px → `gestureKind`, `pressYear`/`targetYear`, begin→end pair via `getBeginMeaning`/`getEndMeaning`) and span pre-fill into the popover, in `apps/web/src/lib/stores/chronology-edit.svelte.ts`
- [x] T030 [US3] Implement whole-span move + individual start/end edge-drag handles for **any entity's `start_date`/`end_date` range** (not a "Period" type, which does not exist) in `apps/web/src/lib/components/graph/graph-view-controller.svelte.ts`, mapping to `start_date`/`end_date` writes
- [x] T031 [US3] Enforce range-inversion rejection in `SemanticPlacementPopover.svelte` using `validateRange` (block save + explain, FR-031)

**Checkpoint**: Spans are first-class — drawable, edge-adjustable, integrity-checked.

---

## Phase 6: User Story 4 - Multiple temporal anchors per entity (Priority: P2)

**Goal**: An entity renders at each of its anchor positions; grabbing one proposes updating it with an "add a new anchor instead" option; anchors are independently editable/removable; linked anchors degrade gracefully.

**Independent Test**: Add born/majorAppearance/disappeared to one Character; verify three persistent points; remove one → others unaffected.

- [x] T032 [P] [US4] Write failing tests for the update-or-add-new flow and per-anchor independence (`upsertAnchor`/`removeAnchor` via service, no sibling/primary mutation) in `apps/web/src/lib/stores/chronology-edit.svelte.test.ts`
- [x] T033 [US4] Wire `getAnchorTimelineLayout` projected synthetic nodes (`"entityId::anchorId"`) into `LayoutManager`/`graph-view-controller.svelte.ts` for timeline edit mode so each anchor is a grabbable point (FR-009a/FR-028)
- [x] T034 [US4] Implement "update this anchor / create new anchor instead" choice in `SemanticPlacementPopover.svelte`; persist via `vault.updateEntity` with `upsertAnchor` (depends on T026)
- [x] T035 [US4] Implement per-anchor edit/remove affordance + linked-entity soft reference with broken-link degradation (FR-033) in `apps/web/src/lib/components/graph/SemanticPlacementPopover.svelte`

**Checkpoint**: Recurring figures are represented faithfully across history.

---

## Phase 7: User Story 5 - Clear lore-vs-layout distinction (Priority: P3)

**Goal**: It is unmistakable which mode is active; only edit-chronology drags mutate metadata; layout-only movement (if any) is visually distinct.

**Independent Test**: Toggle view/edit; verify view-mode drags never change temporal metadata and the active mode is obvious at a glance.

- [x] T036 [P] [US5] Write failing tests asserting view-mode drags never mutate temporal metadata and the edit-mode guard blocks writes when off, in `apps/web/src/lib/stores/chronology-edit.svelte.test.ts`
- [x] T037 [US5] Implement clear mode indicators (view vs edit-chronology, plus layout-only if supported) and edit-drag affordance styling per `@docs/STYLE_GUIDE.md` in the graph HUD/toolbar (`GraphHUD.svelte`/`GraphToolbar.svelte`)
- [x] T038 [US5] Ensure layout-only node movement is visually distinct from chronology drags and writes no temporal metadata (guard + styling), in `apps/web/src/lib/components/graph/graph-view-controller.svelte.ts`

**Checkpoint**: Accidental canon changes are structurally and visually guarded.

---

## Phase 8: User Story 6 - Place an entity from the Explorer onto the timeline (Priority: P3)

**Goal**: Drag an entity from the Entity Explorer onto the axis to place it in time for the first time (incl. undated entities), gated on edit mode, routed through the same confirmation flow.

**Independent Test**: Drag an undated entity from the Explorer, drop at a year, confirm, verify it now appears in Timeline Mode and persists.

- [x] T039 [P] [US6] Write failing tests for the canvas drop handler: `clientX/Y`→model position→year resolution, edit-mode gating, invalid-drop cancel, in `apps/web/src/lib/components/graph/graph-view-controller.svelte.test.ts`
- [x] T040 [US6] Add `dragover`/`drop` handler on `apps/web/src/lib/components/GraphView.svelte` reading `application/codex-entity` (reusing the existing Explorer drag source), gated on `chronologyEditMode`, converting the drop point to a year via `getYearForPosition`
- [x] T041 [US6] Route the Explorer drop into the placement flow as a point/start candidate (FR-011b); support first-time placement of undated entities; for entities already on the timeline use the update-or-add-anchor flow (no duplicate), in `apps/web/src/lib/stores/chronology-edit.svelte.ts`
- [x] T042 [US6] Add test that a previously-undated entity appears in Timeline Mode after placement and persists across reload (SC-009), in `apps/web/src/lib/stores/chronology-edit.svelte.test.ts`

**Checkpoint**: Any entity, dated or not, can be pulled into time by direct manipulation.

---

## Phase 9: User Story 7 - Create a linked event by dragging (Priority: P3)

**Goal**: From the placement confirmation, optionally create a new Event dated at the target year, linked to the dragged entity via an anchor `linkedEntityId` and a connection — explicit, additive, transactional.

**Independent Test**: Drag a Character to 621, choose "Create an event here", edit the title, save; verify a new dated Event exists, the Character has an anchor with `linkedEntityId` to it and a connection, and the Character's existing placement is unchanged.

- [x] T043 [P] [US7] Write failing tests for the `createEvent` intent (`buildIntent` populates `createEvent` payload, leaves source primary/anchors untouched) in `packages/chronology-engine/tests/placement.test.ts`, and for the service create-link-connect-and-rollback flow in `apps/web/src/lib/stores/chronology-edit.svelte.test.ts`
- [x] T044 [US7] Extend `buildIntent`/`PlacementIntent` with the optional `createEvent` payload (title, date, anchorType, connectionType) in `packages/chronology-engine/src/placement.ts`
- [x] T045 [US7] Add the "Create an event here" option + editable pre-filled title field (`"{Entity} — {year}"`) and write-disclosure to `apps/web/src/lib/components/graph/SemanticPlacementPopover.svelte`
- [x] T046 [US7] Implement the event-creation save path in `apps/web/src/lib/stores/chronology-edit.svelte.ts`: `vault.createEntity("event", title, { date })` → `upsertAnchor` with `linkedEntityId` on the source → add `related_to` connection; additive, with rollback on partial failure (FR-039)
- [x] T047 [US7] Add test asserting the linked event + anchor `linkedEntityId` + connection all persist and the source entity's existing placement is unchanged (SC-010), in `apps/web/src/lib/stores/chronology-edit.svelte.test.ts`

**Checkpoint**: The timeline doubles as a lightweight event-authoring surface.

---

## Phase 10: Polish & Cross-Cutting Concerns

- [x] T048 [P] Add an "Edit Chronology" help article to `apps/web/src/lib/config/help-content.ts` and a `FeatureHint` for first edit-mode entry (Constitution VII)
- [x] T049 [P] STYLE_GUIDE / Tailwind-4 token + Svelte 5 runes compliance pass on all new components (Constitution VI)
- [x] T050 Run `quickstart.md` end-to-end and fix any gaps against the acceptance scenarios
- [x] T051 Verify ≥70% coverage on new package logic and run `pnpm run lint && pnpm test` green (Constitution VI, X)
- [x] T052 [P] Update `spec.md` status and cross-link the plan; confirm auto-Label (`past`) behaviour unchanged for anchor-driven status (Constitution XII)

---

## Phase 11: Conceptual Lifespans & Story Chains (Deferred / Post-MVP)

**Goal**: Support rendering visual lifespan connections and sequential story chains forward on the timeline.

- [ ] T053 [P] [US8] Write failing tests for connecting span coordinates and layout in packages/graph-engine/tests/timeline.test.ts
- [ ] T054 [US8] Implement span connector calculations in packages/graph-engine/src/layouts/timeline.ts
- [ ] T055 [US8] Render connecting span decorators and support span translation vs boundary resize in apps/web/src/lib/components/graph/graph-view-controller.svelte.ts
- [ ] T056 [P] [US9] Write failing tests for sequence edge filtering and swimlane layout in packages/graph-engine/tests/timeline.test.ts
- [ ] T057 [US9] Implement sequence edge filtering and swimlane grouping in packages/graph-engine/src/layouts/timeline.ts
- [ ] T058 [US9] Style narrative sequence edges with arrowheads in apps/web/src/lib/components/graph/graph-view-controller.svelte.ts

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (P1)**: no dependencies.
- **Foundational (P2)**: depends on Setup; **blocks all user stories**. Within it: schema (T004→T005) and graph-engine (T006→T007) are independent of each other; chronology-engine `anchors`/`placement` (T011/T013) depend on schema (T005) and meaning-sets (T009); the service (T016) depends on placement (T013), graph-engine (T007) and the store flag (T014).
- **User stories (P3–P8)**: all depend on Foundational. US1 is the MVP. US2 builds the popover that US3/US4 extend. US5/US6 depend only on the foundation + (US6 reuses the popover/placement of US1/US2).
- **Polish (P9)**: after the desired stories.

### User story dependencies

- **US1 (P1)**: foundation only.
- **US2 (P1)**: foundation; introduces `SemanticPlacementPopover` (T025) reused later.
- **US3 (P2)**: foundation + popover (T025/T026).
- **US4 (P2)**: foundation + popover save path (T026).
- **US5 (P3)**: foundation; mostly UI/guard, independent.
- **US6 (P3)**: foundation + placement/popover flow (T022/T026).
- **US7 (P3)**: foundation + popover (T025) + anchor save path (T026/T034); adds entity creation. Independently testable.

### Within each story

Tests (Red) → implementation (Green) → integration. Models/engine before services; services before UI wiring.

### Parallel opportunities

- Setup T001–T003 all `[P]`.
- Foundational test-writing T004, T006, T008, T010, T012, T015 are `[P]` (distinct files); each paired implementation follows its test.
- Across packages, schema (T004/T005) ∥ graph-engine (T006/T007) ∥ meaning-sets (T008/T009).
- Once Foundational completes, US5 (UI/guard) can proceed in parallel with US3/US4 by a second developer.

---

## Parallel Example: Foundational test-first

```bash
# Write these failing tests together (different files):
Task: "T004 schema TemporalAnchor tests in packages/schema/src/entity.test.ts"
Task: "T006 graph-engine position↔year tests in packages/graph-engine/tests/timeline-anchor.test.ts"
Task: "T008 meaning-sets tests in packages/chronology-engine/tests/meaning-sets.test.ts"
Task: "T010 anchors tests in packages/chronology-engine/tests/anchors.test.ts"
Task: "T012 placement tests in packages/chronology-engine/tests/placement.test.ts"
```

---

## Implementation Strategy

### MVP first (US1 only)

1. Phase 1 Setup → 2. Phase 2 Foundational (CRITICAL) → 3. Phase 3 US1 → **STOP & validate**: Events can be re-dated by dragging, canon-safe, persisted. Demo-able MVP.

### Incremental delivery

Foundation → US1 (MVP) → US2 (all types) → US3 (spans) → US4 (multi-anchor) → US5 (mode clarity) → US6 (Explorer placement) → US7 (linked-event creation). Each story is an independently testable, shippable increment.

### Deferred (per spec/clarifications)

- Undo of committed changes; touch/keyboard drag alternatives; bulk multi-select temporal edits — out of scope this iteration.

---

## Notes

- `[P]` = different files, no incomplete dependency.
- All saves go through `vault.updateEntity` (auto-Labels via `applyAutoLabels`); never write raw graph coordinates as temporal values.
- Verify each test fails before implementing (Constitution II).
- Commit after each task or logical group.
- FR-034 (must function without AI) is a standing constraint, not a buildable task — satisfied by keeping all logic in `chronology-engine`/`graph-engine`/`vault` with no AI calls; verify during T050/T051.
