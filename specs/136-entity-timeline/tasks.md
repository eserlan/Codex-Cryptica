---
description: "Task list for Entity Timeline (MVP)"
---

# Tasks: Entity Timeline (MVP)

**Input**: Design documents from `/specs/136-entity-timeline/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/build-entity-timeline.md, quickstart.md

**Tests**: INCLUDED — Constitution Principle II (TDD) is mandatory for this repo. Write each test task and confirm it FAILS before the matching implementation task.

**Organization**: Tasks grouped by user story (US1–US4 from spec.md) for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1, US2, US3, US4 (maps to spec.md user stories)
- Exact file paths included in every task

## Path Conventions

Monorepo: reusable logic in `packages/chronology-engine/src/`; UI in `apps/web/src/`. Per plan.md Structure Decision.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the empty module/file scaffold so later tasks edit, not create-from-scratch.

- [x] T001 [P] Create placeholder module files with empty exports: `packages/chronology-engine/src/entity-timeline.ts`, `packages/chronology-engine/src/entity-timeline.test.ts`, `apps/web/src/lib/components/entity-detail/DetailTimelineTab.svelte`, `apps/web/src/lib/components/entity-detail/DetailTimelineTab.test.ts`, `apps/web/src/lib/components/entity-detail/entity-timeline-view.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Types + tab wiring + DI view-model scaffold that ALL user stories build on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 [P] Add `EntityTimelineRow`, `EntityTimelineGroup`, `EntityTimeline` view-model types (per data-model.md) to `packages/chronology-engine/src/types.ts`, and re-export the new module from `packages/chronology-engine/src/index.ts`
- [x] T003 Add `"timeline"` to `entityDetailTabs` in `apps/web/src/lib/components/entity-detail/detail-tabs.ts` (ensure `createEntityDetailTabIds` tab/panel id maps and `getNextEntityDetailTabInList` include it)
- [x] T004 Add the Timeline tab button to `apps/web/src/lib/components/entity-detail/DetailTabs.svelte` (`role="tab"`, `aria-selected`/`aria-controls`, keyboard nav via existing handler, Tailwind theme tokens; mirror existing Map tab markup)
- [x] T005 Render `<DetailTimelineTab {entity} />` under `{#if activeTab === "timeline"}` (with matching `role="tabpanel"`/`aria-labelledby`) in `apps/web/src/lib/components/EntityDetailPanel.svelte`
- [x] T006 [P] Scaffold the DI view-model in `apps/web/src/lib/components/entity-detail/entity-timeline-view.ts`: constructor injects `{ vault, calendarStore }` with production-default singletons (Principle VIII); exposes a `$derived` `timeline` that calls `buildEntityTimeline(entity, vault.allEntities, calendarStore.config)`. NOTE: `buildEntityTimeline` is the empty export from T001 at this point and returns real data only after T008 (US1) — the scaffold compiles and renders an empty panel until then.

**Checkpoint**: Timeline tab is selectable and mounts an (empty) panel; engine types compile.

---

## Phase 3: User Story 1 - See an entity's history in one place (Priority: P1) 🎯 MVP

**Goal**: Linked events appear in the Timeline tab, sorted earliest → latest, each row scannable.

**Independent Test**: Open an entity with several dated linked events → events render in chronological order with title + date + (when available) type/summary/participants.

### Tests for User Story 1 ⚠️ (write first, must FAIL)

- [x] T007 [P] [US1] Unit tests for `buildEntityTimeline` in `packages/chronology-engine/src/entity-timeline.test.ts` covering: direct outgoing + incoming link resolution (C-01), one-hop only (C-02), de-dupe across both directions (C-03), `type === "event"` filter excludes non-event links (test #8), dated ascending order with title tie-break (C-04), and input-purity snapshot (C-08)

### Implementation for User Story 1

- [x] T008 [US1] Implement `buildEntityTimeline` in `packages/chronology-engine/src/entity-timeline.ts`: resolve direct bidirectional event links over `allEntities`, de-dupe by id, build dated rows using `calendarEngine.getTimelineValue`/`format`/`isValid`, derive `eventCategory` from the event's `labels` (never the entity-type value `"event"`), sort ascending with case-insensitive title tie-break (depends on T002, T007)
- [x] T009 [US1] Render dated rows in `apps/web/src/lib/components/entity-detail/DetailTimelineTab.svelte` via the view-model: title, date label, `eventCategory` (derived from the event's `labels`, never the entity-type value `"event"`) rendered as a Label (Principle XII), trimmed summary, and participant titles excluding the subject (data-model invariants); Tailwind theme tokens only (depends on T006, T008)
- [x] T010 [P] [US1] Component test in `apps/web/src/lib/components/entity-detail/DetailTimelineTab.test.ts`: dated rows render in order with title/date and optional fields (depends on T009)

**Checkpoint**: US1 fully functional — chronological linked-event list renders.

---

## Phase 4: User Story 2 - Open an event from the timeline (Priority: P1)

**Goal**: Clicking a timeline row opens that event's entity detail page.

**Independent Test**: Click any row → app navigates to the event's `vault/[id]/entity/[eventId]` page.

### Tests for User Story 2 ⚠️ (write first, must FAIL)

- [x] T011 [P] [US2] Component test in `apps/web/src/lib/components/entity-detail/DetailTimelineTab.test.ts`: clicking a row invokes navigation to the event entity id (spy/mock navigation)

### Implementation for User Story 2

- [x] T012 [US2] Make each row a keyboard-activatable control in `apps/web/src/lib/components/entity-detail/DetailTimelineTab.svelte` that navigates to the event entity detail page, reusing the existing entity-navigation mechanism (as in `RelatedEntityModal`); honors entity-navigation-history (depends on T009, T011)

**Checkpoint**: US1 + US2 work — list is navigable.

---

## Phase 5: User Story 3 - Undated events remain visible (Priority: P2)

**Goal**: Undated linked events appear in a clearly labelled trailing "Undated" group; date ranges sort by start.

**Independent Test**: Link an undated event and a ranged event → undated appears under "Undated" at the end (no invented date); ranged event displays both endpoints and sorts by its start.

### Tests for User Story 3 ⚠️ (write first, must FAIL)

- [x] T013 [P] [US3] Unit tests in `packages/chronology-engine/src/entity-timeline.test.ts`: undated events form a single trailing group with `sortKey === undefined` and stable title order (C-05, FR-009), and a `start_date`+`end_date` event has `isRange === true` and sorts by `start_date` (C-09, research R3)

### Implementation for User Story 3

- [x] T014 [US3] Extend `buildEntityTimeline` in `packages/chronology-engine/src/entity-timeline.ts`: emit a trailing `undated` group (no fabricated sort key) and compute `isRange` + range-aware primary date (`start_date ?? date ?? end_date`) (depends on T008, T013)
- [x] T015 [US3] Render the "Undated" group heading and ranged date labels in `apps/web/src/lib/components/entity-detail/DetailTimelineTab.svelte` (depends on T009, T014)
- [x] T016 [P] [US3] Component test in `apps/web/src/lib/components/entity-detail/DetailTimelineTab.test.ts`: undated group renders with its heading after dated rows (depends on T015)

**Checkpoint**: US1–US3 work — dated + undated both visible and correct.

---

## Phase 6: User Story 4 - Helpful empty state (Priority: P2)

**Goal**: Entities with no linked events show a clear, plain-language empty state.

**Independent Test**: Open an entity with zero linked events → see "No linked events yet. Add or link events to build this entity's history."

### Tests for User Story 4 ⚠️ (write first, must FAIL)

- [x] T017 [P] [US4] Unit test in `packages/chronology-engine/src/entity-timeline.test.ts`: `isEmpty === true` and `groups === []` when the subject has no linked events (C-06)
- [x] T018 [P] [US4] Component test in `apps/web/src/lib/components/entity-detail/DetailTimelineTab.test.ts`: empty state copy renders when `isEmpty`

### Implementation for User Story 4

- [x] T019 [US4] Render the empty-state branch (Principle IX plain copy) when `timeline.isEmpty` in `apps/web/src/lib/components/entity-detail/DetailTimelineTab.svelte` (depends on T009, T017, T018)

**Checkpoint**: All four user stories independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T020 [P] Add a `"timeline"` help entry in `apps/web/src/lib/config/help-content.ts` (Constitution Principle VII); add a `FeatureHint` for first-time discovery
- [x] T021 [P] End-to-end test `apps/web/tests/entity-timeline.spec.ts` (Playwright): open an entity's Timeline tab, verify chronological order, click an event, assert the event detail page loads
- [x] T022 Confirm whether `apps/web/src/lib/components/zen/ZenView.svelte` consumes the shared tab registry; if so verify the Timeline tab appears there, otherwise record a Zen-support fast-follow note (do not expand MVP scope)
- [x] T023 [P] Read-only guarantee test (FR-010 / SC-005) in `apps/web/src/lib/components/entity-detail/DetailTimelineTab.test.ts`: snapshot vault state, open the Timeline tab and click a row, assert the vault entities are byte-for-byte unchanged (no mutation API invoked)
- [x] T024 [P] Long-list test (FR-012) in `packages/chronology-engine/src/entity-timeline.test.ts`: `buildEntityTimeline` for a subject with many linked events (e.g. 200) returns all of them in one ordered `dated` group with no cap/pagination, completing well within frame budget
- [x] T025 Run `bun run lint` and `bun run test`; confirm new engine module meets ≥70% coverage (Principle X) and execute the `quickstart.md` manual acceptance across factions, characters, locations, items (SC-007)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none — start immediately.
- **Foundational (Phase 2)**: depends on Setup — **BLOCKS all user stories**.
- **User Stories (Phase 3–6)**: all depend on Foundational. US1 is the MVP. US2/US3/US4 each extend the same component/engine and build on US1's render path; within a story, tests precede implementation.
- **Polish (Phase 7)**: depends on the user stories you intend to ship.

### User Story Dependencies

- **US1 (P1)**: after Foundational. Core engine + dated render.
- **US2 (P1)**: after US1 (rows must render before they can be clicked).
- **US3 (P2)**: after US1 (extends the engine output + render).
- **US4 (P2)**: after US1 (adds the empty-state branch). Independent of US2/US3.

### Within Each User Story

- TDD: write the test task(s), confirm failure, then implement.
- Engine (`packages/chronology-engine`) before its UI consumption (`apps/web`).
- Story complete before moving to next priority.

---

## Parallel Opportunities

- T001 (setup) and T002/T006 (different files) are `[P]`.
- Each story's test task (`[P]`) is authored before its implementation.
- T020 (help) and T021 (e2e) in Polish are `[P]`.
- US3 and US4 implementation can proceed in parallel by different developers once US1 lands (different concerns: grouping vs. empty state), though both touch `DetailTimelineTab.svelte` — coordinate edits to avoid conflicts.

## Parallel Example: User Story 1

```bash
# Write the failing unit test first:
Task: "Unit tests for buildEntityTimeline in packages/chronology-engine/src/entity-timeline.test.ts"
# Then implement engine, then render, then component test (T010 [P]).
```

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Phase 1 Setup → Phase 2 Foundational.
2. Phase 3 (US1) → STOP and validate the chronological list independently.
3. Phase 4 (US2) → rows clickable → **shippable MVP** (matches the issue's core acceptance: visible, ordered, navigable).

### Incremental Delivery

US3 (undated visibility) → US4 (empty state) → Polish (help, e2e, Zen check, coverage). Each adds value without breaking prior stories.

---

## Notes

- `[P]` = different files, no incomplete dependencies.
- All four stories are demonstrable increments; US1 alone is a viable MVP per spec.
- Read-only guarantee (FR-010/SC-005) is structural: no mutation API is imported into the timeline path — assert vault-snapshot equality in a component test.
- Verify every test fails before implementing; run `bun run lint` + `bun run test` before considering a task done (Principle VI).
