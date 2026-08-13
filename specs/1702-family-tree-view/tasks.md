---
description: "Task list for Family Tree View"
---

# Tasks: Family Tree View

**Input**: Design documents from `specs/1702-family-tree-view/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/family-engine.md, quickstart.md

**Tests**: Included — Constitution Principle II (TDD) and Principle X (coverage floors) require unit tests for all new logic. Write the test task before its implementation task (Red → Green → Refactor).

**Organization**: Tasks are grouped by user story (US1 = P1, US2 = P2, US3 = P3) so each is an independently testable increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1 / US2 / US3 (setup, foundational, and polish tasks carry no story label)

## Path Conventions

Web monorepo: new pure logic in `packages/family-engine/`; UI + mutations in `apps/web/src/lib/`. Paths below are repo-relative.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Schema types and the new engine package skeleton that everything else builds on.

- [x] T001 Add `parent_of`, `child_of`, `spouse_of` to `ConnectionTypeSchema` in `packages/schema/src/connection.ts`, and assert they parse in `packages/schema/src/schema.test.ts` (additive; no migration).
- [x] T002 Scaffold the `@codex/family-engine` package at `packages/family-engine/` mirroring `packages/graph-engine/` (`package.json` with name `@codex/family-engine`, `tsconfig.json`, `vitest.config.ts`, `bunfig.toml`, empty `src/index.ts`). The `package.json` `name` MUST exactly match the import specifier used in T003/T018 (`@codex/family-engine`, scoped like `@codex/search-orchestrator`).
- [x] T003 [P] Register `@codex/family-engine` as a dependency of `apps/web` (add to `apps/web/package.json`, ensure tsconfig path resolution) and run `bun install`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Family-type primitives shared by every story. **No user-story work starts until this is done.**

- [x] T004 Write tests for family-type helpers in `packages/family-engine/src/family-types.test.ts`: `FAMILY_CONNECTION_TYPES` contents, `isFamilyType` true for family types / false for generic + custom, `inverseFamilyType` (parent_of↔child_of, spouse_of→spouse_of).
- [x] T005 Implement `FAMILY_CONNECTION_TYPES`, `isFamilyType`, `inverseFamilyType` in `packages/family-engine/src/family-types.ts` and export from `packages/family-engine/src/index.ts` (per `contracts/family-engine.md`). Keep the type set and inverse mapping **data-driven** (a single source list + inverse map) so future kinds (adoption, guardianship, half-siblings, former partners, etc.) extend it without restructuring callers — satisfies FR-017.

**Checkpoint**: Family type primitives available and green.

---

## Phase 3: User Story 1 — View a character's family at a glance (Priority: P1) 🎯 MVP

**Goal**: A read-only, auto-laid-out family tree in a Family tab on the character detail view, derived from existing connections.

**Independent Test**: Link grandparent→parent→child via standard connections; open the middle character's Family tab and confirm parent above, child below, correct cards, and shared-parent siblings grouped.

- [x] T006 [P] [US1] Write tests for `buildFamilyTree` in `packages/family-engine/src/family-tree.test.ts`: parents/children/partners buckets, sibling inference from shared parents, reads either link direction, skips dangling targets (deleted linked character — edge case), **multiple partners** returned in `partners[]` (edge case), **missing intermediate generation** (grandchild present, parent absent) still places generations correctly (edge case), characters-only, `deceased`/`lifespan` derivation, no mutation of input.
- [x] T007 [US1] Implement `FamilyMember`/`FamilyTree` types and `buildFamilyTree(focusId, entities)` in `packages/family-engine/src/family-tree.ts`; export from `index.ts` (per `contracts/family-engine.md`).
- [x] T008 [US1] Add `"family"` to `entityDetailTabs` in `apps/web/src/lib/components/entity-detail/detail-tabs.ts` and update `apps/web/src/lib/components/entity-detail/detail-tabs.test.ts` for the new tab id/nav order.
- [x] T009 [US1] Render the Family tab trigger + panel in `apps/web/src/lib/components/entity-detail/DetailTabs.svelte` (only for `character` entities), wiring `createEntityDetailTabIds`; update `apps/web/src/lib/components/entity-detail/DetailTabs.test.ts`.
- [x] T010 [P] [US1] Create `apps/web/src/lib/components/entity-detail/family-tree/FamilyMemberCard.svelte` — portrait (or placeholder), name, role, lifespan (reuse `getTemporalLabel` Born/Died), living/deceased badge. The badge is a **display** of the derived `deceased` flag; the source of truth remains the end-date Label (Constitution XII) — do not introduce a new status field.
- [x] T011 [US1] Create `apps/web/src/lib/components/entity-detail/family-tree/FamilyTree.svelte` — deterministic generation layout (parents above, partners beside, children below, siblings on focus row) using CSS grid/flex; consumes `buildFamilyTree`. Handle >1 partner without breaking layout, and render a graceful gap when an intermediate generation is missing (edge cases).
- [x] T012 [US1] Create `apps/web/src/lib/components/entity-detail/DetailFamilyTab.svelte` — reads the focused character + entity map, renders `FamilyTree`, shows the empty state (character alone with labelled empty slots) when no family links exist.
- [x] T013 [US1] Add component tests `apps/web/src/lib/components/entity-detail/family-tree/FamilyTree.test.ts` covering 3-generation layout, sibling grouping, empty state, **multiple-partner rendering**, and **missing-generation gap** (edge cases).

**Checkpoint**: US1 is a shippable MVP — family viewing works end-to-end, read-only.

---

## Phase 4: User Story 2 — Build the family directly from the tree (Priority: P2)

**Goal**: Fill empty parent/child/partner slots by connecting an existing character or creating a new one, writing both sides and blocking cycles.

**Independent Test**: From an empty partner slot, create a new character; confirm it exists, appears as partner, and the reciprocal link shows on the other character; attempting circular ancestry is blocked.

- [x] T014 [P] [US2] Write tests for `wouldCreateCycle` in `packages/family-engine/src/cycle-detection.test.ts`: self-parent, descendant-as-parent, valid parent = false, terminates on already-cyclic/malformed input.
- [x] T015 [US2] Implement `wouldCreateCycle(entities, childId, proposedParentId)` in `packages/family-engine/src/cycle-detection.ts`; export from `index.ts`.
- [x] T016 [P] [US2] Write tests for family mutations in `apps/web/src/lib/stores/vault/family-mutations.test.ts`: `addFamilyLink` writes both sides with correct inverse type, `removeFamilyLink` removes both sides, cycle rejection (no writes), non-`character` target rejection, and that each written family link is a plain typed `Connection` inside the entities' `connections[]` (no separate store — asserts FR-015 / SC-006 automatically, not just via manual T030).
- [x] T017 [US2] Implement `addFamilyLink` / `removeFamilyLink` in `apps/web/src/lib/stores/vault/family-mutations.ts` — cycle guard via `wouldCreateCycle`, character-only validation (FR-014), both-sides write/remove via existing `addConnection`/`removeConnection` + `inverseFamilyType`.
- [x] T018 [US2] Expose `addFamilyLink` / `removeFamilyLink` from `apps/web/src/lib/stores/vault.svelte.ts` (thin delegation to the entity store), mirroring existing `addConnection` wiring.
- [x] T019 [US2] Create `apps/web/src/lib/components/entity-detail/family-tree/EmptyFamilySlot.svelte` — "Connect existing" (reuse the character-filtered entity search from `RelatedEntityModal`/`ConnectionCreator`) and "Create new" (standard new-character flow) affordances, calling the family mutations.
- [x] T020 [US2] Wire `EmptyFamilySlot` into `FamilyTree.svelte`/`DetailFamilyTab.svelte` for parent, child, and partner slots; surface the hard-block error message on cycle rejection.
- [x] T021 [US2] Add tests `apps/web/src/lib/components/entity-detail/family-tree/EmptyFamilySlot.test.ts` for connect-existing, create-new, and blocked-cycle messaging.

**Checkpoint**: US1 + US2 — users can view and build a consistent, cycle-free family.

---

## Phase 5: User Story 3 — Navigate and manage large family trees (Priority: P3)

**Goal**: Re-centre, collapse/expand branches, open entities, and stay usable on mobile.

**Independent Test**: In a 4-generation tree, collapse a branch (descendants hide with an expand indicator), re-centre on a leaf, open a card's entity, and confirm no horizontal overflow on a mobile viewport.

- [x] T022 [US3] Add re-centre in `DetailFamilyTab.svelte`: selecting a non-focus card sets it as the new focus and rebuilds the tree via `buildFamilyTree`.
- [x] T023 [US3] Add collapse/expand of branches in `FamilyTree.svelte` with a clear "expandable" indicator and per-branch collapsed state.
- [x] T024 [P] [US3] Add "open entity" from `FamilyMemberCard.svelte` (navigate to / focus that character), keyboard-activatable.
- [x] T025 [US3] Make `FamilyTree.svelte` mobile-usable: horizontal pan/scroll contained within its own `overflow-x` region so the page never overflows (FR-008/SC-005); responsive card sizing.
- [x] T026 [US3] Add tests `apps/web/src/lib/components/entity-detail/family-tree/FamilyTree.navigate.test.ts` for re-centre, collapse/expand, and open-entity.

**Checkpoint**: All three stories complete and independently verifiable.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T027 [P] Add a Family Tree help article to `apps/web/src/lib/config/help-content.ts` and a first-use `FeatureHint` (Constitution VII); use plain language ("Family", "Add parent", "Partner").
- [x] T028 [P] Verify `@codex/family-engine` coverage ≥70% (`bun run --filter family-engine test -- --coverage`); add cases for any gaps (Constitution X).
- [x] T029 Run `bun run lint`, `bun run lint:types`, and `bun run --filter web test` + `bun run --filter family-engine test`; fix issues (Constitution VI).
- [x] T030 Execute the `quickstart.md` manual validation (SC-001…SC-007), including the mobile-overflow and ≥50-member responsiveness checks.

---

## Dependencies & Execution Order

- **Setup (T001–T003)** → blocks everything.
- **Foundational (T004–T005)** → blocks all user stories (types used by derivation and mutations).
- **US1 (T006–T013)** → depends on Foundational; delivers the MVP. Independent of US2/US3.
- **US2 (T014–T021)** → depends on Foundational; builds on US1's tree UI for slot wiring (T020) but engine/mutation tasks (T014–T018) are independent of US1.
- **US3 (T022–T026)** → depends on US1's tree UI; independent of US2.
- **Polish (T027–T030)** → after the stories it documents/validates.

## Parallel Opportunities

- Setup: T003 [P] alongside T002 finishing.
- US1: T006 (engine test) [P] with T010 (card component) [P] — different files.
- US2: T014 (cycle tests) [P] with T016 (mutation tests) [P].
- Polish: T027 and T028 [P].

## Implementation Strategy

- **MVP = Phase 1 + Phase 2 + Phase 3 (US1)**: a read-only family tree derived from existing connections — shippable on its own.
- Add **US2** for editing/consistency, then **US3** for large-tree navigation and mobile polish.
- TDD throughout: the test task precedes its implementation task within each pair.

## Summary

- **Total tasks**: 30
- **US1 (MVP)**: 8 (T006–T013) · **US2**: 8 (T014–T021) · **US3**: 5 (T022–T026)
- **Setup**: 3 · **Foundational**: 2 · **Polish**: 4
- **Suggested MVP scope**: User Story 1 (Phases 1–3).
