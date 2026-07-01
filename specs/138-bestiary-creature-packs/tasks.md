---
description: "Task list for Bestiary & Creature Catalogue Packs"
---

# Tasks: Bestiary & Creature Catalogue Packs

**Input**: Design documents from `/specs/138-bestiary-creature-packs/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/
**Source Issue**: [#1545](https://github.com/eserlan/Codex-Cryptica/issues/1545)

**Tests**: REQUIRED — the constitution mandates TDD (II) and coverage floors (X). Test tasks are
written FIRST within each story and must FAIL before implementation.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 / US2 / US3 maps to the spec's user stories

## Path Conventions

- New package: `packages/content-packs/`
- Web app: `apps/web/src/`
- Existing importer package: `packages/importer/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Stand up the new framework-free content package (Library-First, Constitution I)

- [x] T001 Create `packages/content-packs/package.json` (name `@codex/content-packs`, type module, build/test scripts mirroring a sibling package like `packages/generator-engine`)
- [x] T002 [P] Add `packages/content-packs/tsconfig.json` extending the workspace base config
- [x] T003 [P] Add `packages/content-packs/vitest.config.ts` (or bun test config) consistent with sibling packages
- [x] T004 Run `bun install` so the workspace links `@codex/content-packs`, and add it as a dependency of `apps/web` (`apps/web/package.json`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared types both the mapper and the importer depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 [P] Define `CreaturePack` and `CreaturePackEntry` interfaces in `packages/content-packs/src/types.ts` per data-model.md
- [x] T006 Widen `DiscoveredEntity.suggestedType` to include `"Creature"` in `packages/importer/src/types.ts` (do NOT touch the Oracle prompt)
- [x] T007 [P] Create `packages/content-packs/src/index.ts` exporting the public API surface (types, registry, mapper — filled in as they land)

**Checkpoint**: Types compile; importer rail can express `creature`.

---

## Phase 3: User Story 1 - Populate a vault from a starter pack (Priority: P1) 🎯 MVP

**Goal**: A user previews a fantasy creature pack in the importer, selects creatures, and imports
them as editable `creature` entities — no AI required.

**Independent Test**: With AI disabled, open the importer, pick the fantasy pack, confirm the preview
lists every creature, import a subset, and verify the chosen creatures exist as editable `creature`
entities (with all sections) and deselected ones do not.

### Tests for User Story 1 (write first, must FAIL) ⚠️

- [x] T008 [P] [US1] Pack integrity test in `packages/content-packs/tests/fantasy-bestiary.test.ts` — pack id unique/slug-safe, 12–20 entries, entry titles unique (case-insensitive), required fields non-empty
- [x] T009 [P] [US1] Mapper test in `packages/content-packs/tests/pack-to-discovered.test.ts` — output length == entries; every item `suggestedType === "Creature"`; `frontmatter.labels` includes `"creature-pack"`; `chronicle === entry.description`; body contains template section headings (Summary/Habitat/Behaviour/Threat Level/Variants/Story Hooks; Combat Notes only when present); `confidence === 1`; `detectedLinks === []`; purity (same input → same output)
- [x] T010 [P] [US1] Registry test in `packages/content-packs/tests/registry.test.ts` — `listPacks()` non-empty with unique ids; `getPack("fantasy-bestiary")` returns it; `getPack(unknown)` returns `undefined`

### Implementation for User Story 1

- [x] T011 [US1] Author `packages/content-packs/src/packs/fantasy-bestiary.ts` — curated `CreaturePack` of 12–20 system-neutral creatures (e.g. wolf, goblin, bandit, skeleton, ghoul, dire bear, giant spider, will-o'-wisp, harpy, troll, young dragon…), each with description/habitat/behaviour/threatLevel/variants/hooks
- [x] T012 [P] [US1] Implement `packages/content-packs/src/creature-pack-registry.ts` — `listPacks()` / `getPack(id)`
- [x] T013 [US1] Implement `packages/content-packs/src/pack-to-discovered.ts` — `packToDiscoveredEntities(pack, existingTitles?)` core mapping (type, labels, template-rendered body, confidence, empty links); `matchedEntityId` left undefined here (match detection is US3)
- [x] T014 [US1] Export registry + mapper from `packages/content-packs/src/index.ts` (extends T007)
- [x] T015 [US1] Add `creature` to `mapType()` in `apps/web/src/lib/components/settings/ImportSettings.svelte` (`if (t === "creature") return "creature";`)
- [x] T016 [US1] Add a "Creature Packs" section to the `step === "upload"` view in `ImportSettings.svelte` — render `listPacks()` as cards (name, description, entry count)
- [x] T017 [US1] Wire pack selection in `ImportSettings.svelte` — on click: `discoveredEntities = packToDiscoveredEntities(pack); step = "review";` (reuses existing `ReviewList` + save path)
- [x] T018 [US1] Component test in `apps/web/src/lib/components/settings/ImportSettings.test.ts` (or sibling) — selecting a pack moves to `review` with all entries listed; saving a subset writes only selected `creature` entities (mock vault store); assert the pack-import path issues **zero AI-client calls** (covers FR-006 / SC-004)

**Checkpoint**: MVP — fantasy pack importable end-to-end through the existing preview/select flow.

---

## Phase 4: User Story 2 - Discover packs from an empty vault (Priority: P2)

**Goal**: An empty vault shows a "Populate with a pack" call-to-action that routes to the importer's
pack section; it disappears once the vault has content.

**Independent Test**: Open an empty vault → CTA appears → click → lands on the pack picker. Add an
entity → CTA no longer shown.

### Tests for User Story 2 (write first, must FAIL) ⚠️

- [x] T019 [P] [US2] Component test for the empty-vault CTA (in the `GraphView` / `EmptyState` test) — secondary CTA renders when vault has 0 entities, is absent when entities exist, and **activating it fires the navigation intent** to the importer pack section (assert the intent, not the destination — independent of US1)

### Implementation for User Story 2

- [x] T020 [P] [US2] Extend `apps/web/src/lib/components/ui/EmptyState.svelte` with optional `secondaryCta` / `onSecondaryCta` props (it currently supports a single CTA), preserving existing styling/a11y
- [x] T021 [US2] In `apps/web/src/lib/components/GraphView.svelte`, add a "Populate with a pack" secondary CTA to the empty-vault `EmptyState` (`graph-empty-state`, shown only when the vault is empty) and wire it to navigate to the importer with the Creature Packs section in view (route + open-state signal consumed by `ImportSettings.svelte`)

**Checkpoint**: New users discover packs at the moment of need; US1 still works independently.

---

## Phase 5: User Story 3 - Avoid duplicate creatures on re-import (Priority: P3)

**Goal**: Re-importing a pack flags creatures already in the vault and leaves them deselected by
default — no silent duplicates.

**Independent Test**: With "Goblin" already in the vault, preview a pack containing "Goblin" → that
entry is marked existing and unchecked by default.

### Tests for User Story 3 (write first, must FAIL) ⚠️

- [x] T022 [P] [US3] Extend `packages/content-packs/tests/pack-to-discovered.test.ts` — when `existingTitles` contains an entry's slug, that item's `matchedEntityId` is set; otherwise undefined

### Implementation for User Story 3

- [x] T023 [US3] Implement match detection in `packages/content-packs/src/pack-to-discovered.ts` — set `matchedEntityId` from the injected `existingTitles` lookup (extends T013)
- [x] T024 [US3] In `ImportSettings.svelte`, build `knownTitleToId` from `vault.entities` and pass it to `packToDiscoveredEntities(pack, knownTitleToId)` (extends T017) so matched entries are deselected by default in `ReviewList`

**Checkpoint**: All three stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T025 [P] [Constitution VII] Add a Creature Packs help article to `apps/web/src/lib/config/help-content.ts` (what they are, preview/select/import, imported = normal editable entities; user-facing wording "Creature Packs"/"Populate Vault")
- [x] T026 [P] Add `packages/content-packs/README.md` documenting the pack format and how to add a new genre pack (supports SC-006)
- [x] T027 Verify coverage meets the 70% goal for `@codex/content-packs` (Constitution X)
- [x] T028 Run quickstart.md validation — walk SC-001…SC-006 manually
- [x] T029 Final gate: `bun run lint && bun run test` green (Constitution VI)
- [x] T030 [P] [Constitution VII] Add a `FeatureHint` for first-time discovery of Creature Packs (SHOULD per constitution; guides users to the importer pack section)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: depends on Setup — BLOCKS all stories
- **User Stories (Phase 3–5)**: depend on Foundational
  - US1 (P1) is the MVP and should land first
  - US2 (P2) depends on US1's importer pack section existing (it links to it)
  - US3 (P3) extends US1's mapper + injection call
- **Polish (Phase 6)**: after the desired stories are complete

### Within Each User Story

- Tests written first and FAIL before implementation (Constitution II)
- Package data/registry/mapper before web wiring
- Story complete before next priority

### Parallel Opportunities

- T002, T003 (setup configs) in parallel
- T005, T007 (foundational types/exports) in parallel; T006 (importer union) independent
- US1 tests T008/T009/T010 in parallel; T012 parallel with T011
- T025, T026 (docs) in parallel

---

## Parallel Example: User Story 1

```bash
# Tests first (parallel):
Task: "Pack integrity test in packages/content-packs/tests/fantasy-bestiary.test.ts"
Task: "Mapper test in packages/content-packs/tests/pack-to-discovered.test.ts"
Task: "Registry test in packages/content-packs/tests/registry.test.ts"

# Then implementation (registry parallel with pack data):
Task: "Author packs/fantasy-bestiary.ts"
Task: "Implement creature-pack-registry.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 Setup → 2. Phase 2 Foundational → 3. Phase 3 US1
2. **STOP & VALIDATE**: import the fantasy pack end-to-end with AI disabled
3. Ship as MVP

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 → test → ship (MVP)
3. US2 (empty-vault discovery) → test → ship
4. US3 (dedupe) → test → ship
5. Polish (help article, docs, coverage, gate)

---

## Notes

- [P] = different files, no incomplete dependencies
- US1 and US3 both touch `pack-to-discovered.ts` (US3 extends US1) — sequence them, don't parallelize
- US2 links to the importer section built in US1 — build US1 first
- Origin marking is a **Label** (`creature-pack`), never a tag (Constitution XII)
- Commit after each task or logical group
