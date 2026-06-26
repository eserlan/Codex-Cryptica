---
description: "Task list for Generic CC Import Format and Import Engine"
---

# Tasks: Generic CC Import Format and Import Engine

**Input**: Design documents from `specs/138-generic-cc-importer/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: INCLUDED — Constitution II (TDD) is mandatory for this repo; the plan specifies Red-Green-Refactor. Test tasks precede their implementation tasks.

**Organization**: Grouped by user story (US1–US3 from spec.md) so each is independently implementable and testable.

## Path Conventions

All engine code lives in the existing `@codex/importer` package: `packages/importer/src/cc/` and tests in `packages/importer/tests/cc/`. The engine is headless/client-side; the production web binding (VaultWriter + preview UI) is OUT OF SCOPE (separate UI subissue).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the `cc/` module skeleton inside `@codex/importer` and wire test infrastructure.

- [x] T001 Create the `cc/` module directory and empty barrel at `packages/importer/src/cc/index.ts`, and re-export it from `packages/importer/src/index.ts`
- [x] T002 [P] Create test folder `packages/importer/tests/cc/` and fixtures folder `packages/importer/tests/cc/fixtures/`
- [x] T003 [P] Verify `zod` and `@codex/schema` are resolvable from `@codex/importer`; add `@codex/schema` to `packages/importer/package.json` dependencies if absent
- [x] T004 [P] Add a hand-written valid sample package fixture `packages/importer/tests/cc/fixtures/kanka-minimal.ts` (2 entity drafts, 1 relationship draft, per quickstart) for reuse across specs

**Checkpoint**: Module skeleton compiles; fixtures importable.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The package schema, source-ref helper, mapping rules, and the VaultWriter port + in-memory fake. Every user story depends on these.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T005 [P] Define `zod` schemas + inferred types for `CCImportPackage`, `EntityDraft`, `RelationshipDraft`, `AssetDraft`, `ImportWarning` in `packages/importer/src/cc/package.ts` (per contracts/cc-import-package.md and data-model.md)
- [x] T006 [P] Define the `VaultWriter` port interface, `NewEntityInput`, `EntityPatch`, `AssetInput` in `packages/importer/src/cc/ports.ts` (per contracts/vault-writer-port.md)
- [x] T007 [P] Define `MappingRuleSet` type and `ImportEngineOptions` defaults (defaultType `note`, maxAssetBytes 25 MB, acceptedVersions `["1.0"]`) in `packages/importer/src/cc/mapping.ts`
- [x] T008 [P] Write tests for source-ref build/parse round-trip (id-based and path-based) in `packages/importer/tests/cc/source-ref.spec.ts`
- [x] T009 Implement `buildSourceRef`/`parseSourceRef` (`<system>:<type>:<id>` and `<system>:path:<encodedPath>`) in `packages/importer/src/cc/source-ref.ts` (makes T008 pass)
- [x] T010 [P] Implement an in-memory `FakeVaultWriter` test double (entity map keyed by id, `findBySourceRef` exact-match, field-level `updateEntity` merge that preserves unspecified fields) in `packages/importer/tests/cc/fixtures/fake-vault-writer.ts`

**Checkpoint**: Types, port, mapping config, and source-ref helper exist with the fake writer ready. User stories can now proceed.

---

## Phase 3: User Story 1 — Preview and commit a structured import (Priority: P1) 🎯 MVP

**Goal**: Validate a package, map drafts deterministically (with `note` fallback), produce a curatable preview where items can be ignored, commit included drafts (preserving source refs), and emit a reconciling report.

**Independent Test**: Feed `kanka-minimal` fixture → `prepare` → ignore one item → `commit` → assert created entities exist in the FakeVaultWriter with correct `discoverySource`, ignored item skipped, and report totals reconcile.

### Tests (write first — must fail)

- [x] T011 [P] [US1] Validation tests in `packages/importer/tests/cc/validate.spec.ts`: rejects unknown/missing version, missing required fields, draft with neither sourceId nor sourcePath; collects ALL errors; flags duplicate sourceId as warning (not fatal); rejects direct-write directive (FR-006/007/028)
- [x] T012 [P] [US1] Mapping tests in `packages/importer/tests/cc/mapping.spec.ts`: sourceType→type via rules (first match wins), `note` fallback when no rule/absent type, `typeFallback` flag set (FR-009/010/012)
- [x] T013 [P] [US1] Preview/session tests in `packages/importer/tests/cc/session.spec.ts`: `prepare` builds one PreviewItem per draft with resolvedType/sourceRef; `setItemDecision` toggles include/ignore; empty package → valid empty session (FR-017/018, edge cases)
- [x] T014 [P] [US1] Commit tests in `packages/importer/tests/cc/commit-entities.spec.ts`: only included drafts written; every created entity carries `discoverySource`; report counts created/skipped; partial-failure on a writer reject recorded in `failures` without aborting (FR-011/024/026, SC-002/007)
- [x] T015 [P] [US1] No-AI/no-network assertion test in `packages/importer/tests/cc/no-ai.spec.ts`: spy confirms zero network/AI calls during prepare+commit (FR-027, SC-006)

### Implementation

- [x] T016 [US1] Implement `validatePackage(input)` returning collect-all errors + warnings in `packages/importer/src/cc/validate.ts` (makes T011 pass)
- [x] T017 [US1] Implement deterministic `mapDraftToType(draft, rules)` and field mapping draft→`NewEntityInput` in `packages/importer/src/cc/mapping.ts` (makes T012 pass)
- [x] T018 [US1] Implement `ImportSession` type, `prepare()` (validate → map → source-ref → build PreviewItems), and pure `setItemDecision` in `packages/importer/src/cc/session.ts` (makes T013 pass)
- [x] T019 [US1] Implement `ImportReport` type + builder with reconciliation invariant in `packages/importer/src/cc/report.ts`
- [x] T020 [US1] Implement `ImportEngine` class (constructor DI `{ writer }` + options), `parsePackage`, `prepare`, and `commit` (entity create/skip + report) in `packages/importer/src/cc/engine.ts` (makes T014/T015 pass)
- [x] T021 [US1] Export public surface (`ImportEngine`, `createImportEngine` factory, types, `setItemDecision`) from `packages/importer/src/cc/index.ts`

**Checkpoint**: US1 is a working, independently testable MVP — a valid package can be previewed, curated, committed, and reported entirely headlessly.

---

## Phase 4: User Story 2 — Resolve explicit links between drafts (Priority: P1)

**Goal**: Resolve relationship endpoints by exact source-id match (in-package first, then vault via `findBySourceRef`), write one-directional connections on the source entity, and record unresolved/self-referential/dangling endpoints in the report.

**Independent Test**: Package with (a) in-package link, (b) link to an entity pre-seeded in FakeVaultWriter by source ref, (c) link to a non-existent target → commit → assert (a)+(b) become connections on the `from` entity only, (c) appears in `unresolvedReferences`, no connection invented.

### Tests (write first — must fail)

- [x] T022 [P] [US2] Resolution tests in `packages/importer/tests/cc/resolve.spec.ts`: in-package match, vault match by `discoverySource`, no-match→unresolved, self-ref→unresolved, endpoint-ignored→unresolved; exact-match only (no fuzzy) (FR-013/014/015)
- [x] T023 [P] [US2] Connection-write tests in `packages/importer/tests/cc/commit-connections.spec.ts`: connection written on `from` entity only (no reciprocal on target); `type`/`label` carried; entities created before connections (FR-016/016a/024, Clarification Q2)
- [x] T024 [P] [US2] Report tests in `packages/importer/tests/cc/report.spec.ts`: `relationshipsCreated` and `unresolvedReferences[{fromRef,toRef,type,reason}]` populated correctly (FR-025, SC-004)

### Implementation

- [x] T025 [US2] Implement two-stage exact-match `resolveRelationships(drafts, session, writer)` returning resolved pairs + unresolved records in `packages/importer/src/cc/resolve.ts` (makes T022 pass)
- [x] T026 [US2] Add `PreviewRelationship` annotation (resolved/unresolved + reason) into `prepare()` in `packages/importer/src/cc/session.ts`
- [x] T027 [US2] Extend `commit()` to write one-directional connections via `writer.updateEntity` after entity creation, skipping endpoints that are ignored/skipped/failed, and feed unresolved into the report in `packages/importer/src/cc/engine.ts` (makes T023/T024 pass)

**Checkpoint**: US1 + US2 deliver entities AND their explicit links, with unresolved references surfaced — no dangling or invented connections.

---

## Phase 5: User Story 3 — Repeat import and update tracking (Priority: P2)

**Goal**: Recognise drafts whose source ref matches an existing vault entity, present them as matches with a per-item skip/create/update choice, apply field-level update (preserving vault-only fields), and never auto-merge or fuzzy-dedupe.

**Independent Test**: Commit `kanka-minimal`; mutate an entity's image/notes in the FakeVaultWriter; commit a second package with same source IDs + changed content → assert items flagged `match`, choosing "update" overwrites only draft fields and preserves the image; differing source IDs are NOT proposed as duplicates.

### Tests (write first — must fail)

- [x] T028 [P] [US3] Match-detection tests in `packages/importer/tests/cc/session.spec.ts`: drafts with existing source ref get `match:{entityId}`; default decision is non-destructive; differing source IDs never proposed as duplicates (FR-019/023, SC-003)
- [x] T029 [P] [US3] Update-semantics tests in `packages/importer/tests/cc/commit-update.spec.ts`: "update" overwrites only draft-supplied fields and preserves image/artDirection/soundBite/manual edits and `discoverySource`; "skip" writes nothing; "create" makes a new entity (FR-021/022, Clarification Q1)
- [x] T030 [P] [US3] Report tests in `packages/importer/tests/cc/report.spec.ts`: `entitiesUpdated` counted; reconciliation invariant holds across create+update+skip+failure (SC-007)

### Implementation

- [x] T031 [US3] Add `setMatchDecision` (skip/create/update) and match annotation defaults to `packages/importer/src/cc/session.ts` (makes T028 pass)
- [x] T032 [US3] Implement update path in `commit()` building an `EntityPatch` of only draft-supplied fields and calling `writer.updateEntity`; honour skip/create exactly; count `entitiesUpdated` in `packages/importer/src/cc/engine.ts` (makes T029/T030 pass)

**Checkpoint**: All three user stories complete — first import, links, and idempotent repeat/update import.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Asset handling, determinism guard, and package-level edge cases that span stories.

- [x] T033 [P] Asset tests in `packages/importer/tests/cc/commit-assets.spec.ts`: eligible asset routed via `writer.saveAsset` and placement ref substituted in content; missing bytes and oversize (>25 MB) skipped with warning, non-fatal (FR-004, edge cases)
- [x] T034 Implement asset routing + size guard in `commit()` (`assetsImported`/`assetsSkipped` in report) in `packages/importer/src/cc/engine.ts` (makes T033 pass)
- [x] T035 [P] Determinism test in `packages/importer/tests/cc/determinism.spec.ts`: same package + rules + vault state yields identical entity field values, source refs, connection targets, and report counts across two runs (SC-005)
- [x] T036 [P] Duplicate-source-id-within-package warning test in `packages/importer/tests/cc/validate.spec.ts` + implementation surfaced in preview and report (`DUPLICATE_SOURCE_ID`) (edge case)
- [x] T037 [P] Run `bun run --filter @codex/importer test` and `bun run lint`; fix lint (prefix unused with `_`, full types) per Constitution VI
- [x] T038 [P] Add a `quickstart`-aligned integration spec `packages/importer/tests/cc/quickstart.spec.ts` exercising the full prepare→curate→commit flow end-to-end against the fake writer
- [x] T039 Record the Principle VII (User Documentation) obligation: add a note in this file's Implementation Strategy and a tracked item to the UI subissue so the engine's user-facing help-content entry (`apps/web/src/lib/config/help-content.ts`) + FeatureHint are delivered when the preview UI is built (deferred here because the engine is headless)

---

## Dependencies & Execution Order

- **Setup (Phase 1)** → blocks everything.
- **Foundational (Phase 2)** → blocks all user stories. T009 depends on T008; T005/T006/T007/T010 are independent [P].
- **US1 (Phase 3)** → depends only on Foundational. MVP. Tests T011–T015 [P] before impl T016–T021.
- **US2 (Phase 4)** → depends on US1 (extends `prepare`/`commit`). Tests T022–T024 [P] before impl T025–T027.
- **US3 (Phase 5)** → depends on US1 (extends session/commit). Largely independent of US2. Tests T028–T030 [P] before impl T031–T032.
- **Polish (Phase 6)** → after the stories it touches (asset/determinism/edge cases).

### Story completion order

```
Setup → Foundational → US1 (MVP) → US2 ─┐
                                 └→ US3 ─┴→ Polish
```

US2 and US3 both build on US1 but are independent of each other and can be done in either order or in parallel by different developers.

## Parallel Execution Examples

- **Foundational**: T005, T006, T007, T010 in parallel (different files); T008 then T009.
- **US1 tests**: T011, T012, T013, T014, T015 in parallel (each writes a distinct spec file) before any US1 implementation.
- **US2 vs US3**: once US1 lands, one developer takes T022–T027, another takes T028–T032.

## Implementation Strategy

1. **MVP = Phases 1–3** (Setup + Foundational + US1): a headless engine that validates, previews, curates, commits, and reports — demonstrable against fixtures with zero adapters and zero UI.
2. Add **US2** for explicit links, then **US3** for repeat/update import.
3. **Polish** covers assets, determinism proof, and edge-case warnings.
4. Out of scope here (tracked elsewhere): production `VaultWriter` binding + preview UI in `apps/web`, and the nine source adapters (#1536–#1544).
5. **Constitution VII (User Documentation) obligation** is a MUST that this headless engine cannot satisfy alone; T039 records it so the help-content entry (`apps/web/src/lib/config/help-content.ts`) + FeatureHint are delivered with the preview UI subissue and not lost.
