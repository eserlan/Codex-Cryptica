# Tasks: CIF Mechanical Importer — Phase 1, Text-Only Core

**Input**: Design documents from `/specs/143-cif-importer/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/cif-importer.md, quickstart.md

**Tests**: Included — Constitution II mandates TDD (Red-Green-Refactor). Test tasks precede their implementation tasks and must fail first.

**Organization**: Grouped by user story. US1 = happy-path import (MVP), US2 = safe rejection & transparent warnings, US3 = repeat import without duplicates.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1 / US2 / US3 from spec.md

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Test fixtures every story builds on — no new scaffolding (existing workspace, no new deps).

- [x] T001 Create CIF test fixture builders in `packages/importer/src/cif/fixtures.ts`: minimal valid manifest builder with overrides; builders for each invalid class (duplicate entity/relationship keys, unresolved parent/endpoint/media ref, self-link, hierarchy cycle, unsupported version, non-CIF JSON); undirected + in-package-duplicate relationships; missing `worldKey`; dates at year/month/day precision; unknown kind + unknown extension + non-empty assets; and a generated ~1,000-entity manifest (SC-006). Published examples in `schemas/cif/1.0/examples/` are loaded from disk in tests, not copied.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The CIF structural schema and basic container parsing that both US1 and US2 depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 Failing schema tests in `packages/importer/src/cif/package.test.ts`: the published `valid-text-only.cif.json` parses; the published `invalid-missing-entity-title.cif.json` fails for the documented reason (parity with the public JSON Schema contract); required/optional field coverage per data-model.md (`format` literal, non-empty keys, markdown-only content, labels/aliases as non-empty strings, dates precision enum)
- [x] T003 Implement zod schemas + public types (`CifManifest`, `CifSource`, `CifWorld`, `CifEntity`, `CifRelationship`, `CifDate`, `CifValidationError`, `SUPPORTED_CIF_VERSIONS`) in `packages/importer/src/cif/package.ts` until T002 passes
- [x] T004 Failing tests + implementation for basic container parsing in `packages/importer/src/cif/parse.ts` + `parse.test.ts`: `parseCifFile({fileName,size,text})` returns coded errors (never throws) for malformed JSON (`malformed-json`) and non-CIF objects (`not-cif`); returns the manifest for valid input; export `parseCifFile` and the types from `packages/importer/src/cif/index.ts` and `packages/importer/src/index.ts` (size guard and ZIP refusal are US2 — T013/T014)

**Checkpoint**: Published fixtures parse/fail correctly — user story implementation can begin.

---

## Phase 3: User Story 1 - Import a world from another tool (Priority: P1) 🎯 MVP

**Goal**: A valid text-only `.cif.json` flows file → parse → normalize → existing `ImportEngine` review → commit, fully client-side, with correct field mapping, hierarchy, and relationships.

**Independent Test**: Import `schemas/cif/1.0/examples/valid-text-only.cif.json` into an empty vault offline; verify every entity (title, category, summary/body placement, labels, aliases, parent) and every relationship, entities created before relationships (quickstart steps 1–3; SC-001, SC-003).

### Tests for User Story 1 (write first, must fail) ⚠️

- [x] T005 [P] [US1] Failing unit tests for normalization in `packages/importer/src/cif/normalize.test.ts`: field mapping per data-model (`summary`→`content`, `content.body`→`lore`, `labels` deduped, `aliases` deduped, `kind`→`sourceType`, `parent`→`parentRef` in sourceRef form, dates→`startDate`/`endDate`, `tags` always empty — Constitution XII); `sourceLabel` = world title (FR-006); directed relationship → one draft, `directed: false` → two reciprocal drafts, in-package duplicates staged once with `cif.duplicate-relationship` (FR-013); identity encoding is injective (crafted keys containing `:`/`%` cannot collide — FR-014) and kind-independent; missing `worldKey` → empty component + `cif.no-world-key` warning; the normalized package contains exactly one draft per package entity — world metadata never becomes an entity draft (FR-006); output always passes `ImportEngine.parsePackage` (contract guarantee 5)

### Implementation for User Story 1

- [x] T006 [US1] Implement `packages/importer/src/cif/normalize.ts` (+ warning codes/messages in `packages/importer/src/cif/report.ts`) until T005 passes, including the `cif:entity:<e(system)>:<e(worldKey|"")>:<e(key)>` source-ref builder exported for engine wiring (research Decision 3)
- [x] T007 [P] [US1] Failing CC-core tests in `packages/importer/src/cc/engine.test.ts` + `packages/importer/src/cc/package.test.ts` (or existing test files): `ImportEngineOptions.sourceRefBuilder` overrides `buildEntitySourceRef` in both `prepare()` and commit resolution; new optional `startDate`/`endDate`/`aliases` fields accepted on `EntityDraft`/`NewEntityInput`/`EntityPatch` and passed through `mapDraftToFields`; omitting the new options reproduces current behavior (chronica/scabard regression guard — contract compat rule 1)
- [x] T008 [US1] Implement the `sourceRefBuilder` engine option and draft/port date+alias fields in `packages/importer/src/cc/engine.ts`, `packages/importer/src/cc/package.ts`, `packages/importer/src/cc/mapping.ts`, `packages/importer/src/cc/ports.ts` until T007 passes; extend `apps/web/src/lib/features/importer/web-vault-writer.ts` to map `startDate`/`endDate` into the vault's temporal metadata (year minimum, finer precision where the schema supports it) and `aliases` onto the entity, with writer tests
- [x] T009 [US1] Wire CIF into `apps/web/src/lib/components/settings/import-settings-controller.svelte.ts`: detect CIF before the chronica/scabard checks (filename `.cif.json`, or parsed `format === "codex-world-interchange"`), run `parseCifFile` → `normalizeCifPackage` → existing engine `prepare()` with the CIF `sourceRefBuilder`, surface world title/description in the review session header; controller tests for detection order, the happy path, cancel-at-review discarding the session with zero vault mutations (FR-009), and a guest-session assertion that the CIF path is unreachable (FR-019)
- [x] T010 [US1] End-to-end library test in `packages/importer/src/cif/import-flow.test.ts`: valid fixture through `ImportEngine.prepare()`+`commit()` with a mock writer — all entities created before any connection, parents resolved to created entity ids, undirected bond readable from both endpoints, report counts match the fixture; **cancellation coverage (FR-008/FR-009/SC-007)**: preparing a session and never calling `commit()` invokes zero writer mutation methods, and an `AbortSignal` fired between the entity and connection phases stops the commit with zero dangling parent/relationship references (everything written references entities that exist); plus guards that no CIF module references `fetch`/`XMLHttpRequest`/`WebSocket` (FR-018/SC-003) and that validation/normalization error and warning messages carry record keys and rule names, never entity content bodies (FR-018 logging clause)

**Checkpoint**: The published valid fixture imports end-to-end offline; bounded existing importers untouched.

---

## Phase 4: User Story 2 - Broken or hostile packages never damage a vault (Priority: P2)

**Goal**: Every invalid-package class is blocked before review with the offending record named; warning-level findings (unknown kinds, extensions, assets, missing worldKey) import with a complete report instead of silent loss.

**Independent Test**: Feed each invalid-class fixture and confirm pre-review rejection with record-naming errors and zero vault changes; import the unknown-kind/extension fixture and confirm core data lands with every warning in the report (SC-002, SC-005).

### Tests for User Story 2 (write first, must fail) ⚠️

- [x] T011 [P] [US2] Failing cross-record validation tests in `packages/importer/src/cif/validate.test.ts`: duplicate entity key, duplicate relationship key, unresolved `parent`/`from`/`to`/`media.assetKey`, self-link, hierarchy cycle (error names all member keys; iterative — a 10,000-deep parent chain must not overflow), unsupported `version` (message names both versions — US2 scenario 2); every error carries `{code, message, recordKey}`; warnings-vs-errors disjointness: unknown kind, unknown extension, non-empty assets, missing worldKey each yield `ok: true` + warning (FR-011/FR-012)
- [x] T012 [P] [US2] Failing container-guard tests in `packages/importer/src/cif/parse.test.ts`: file over `maxManifestBytes` (default 20 MB) → `oversized-manifest` without reading/parsing content; `.cif.zip` filename and ZIP magic bytes (`PK\x03\x04`) → `zip-not-supported` with the FR-004 message; empty `entities` array parses fine (friendly empty state, not an error)

### Implementation for User Story 2

- [x] T013 [US2] Implement `packages/importer/src/cif/validate.ts` (key maps, O(records) checks, iterative cycle walk) until T011 passes
- [x] T014 [US2] Implement the size guard and ZIP refusal in `packages/importer/src/cif/parse.ts` until T012 passes
- [x] T015 [US2] Warning-report completeness in `packages/importer/src/cif/normalize.ts`/`report.ts` + tests: `cif.unmapped-kind` (from the existing `typeFallback` mechanism, fallback category "note"), `cif.unknown-extension` (named per namespace), `cif.assets-not-imported`, `cif.date-precision` — asserting a test-corpus package produces a report entry for every droppable item (SC-005, FR-017)
- [x] T016 [US2] Surface blocking errors in the UI: `apps/web/src/lib/components/settings/import-settings-controller.svelte.ts` (+ review/report component) shows `cif-import-error` with record-naming messages and never opens a review session for an invalid package; `.cif.zip` refusal notice; report view renders the `cif.*` warning buckets; component tests for each path (SC-002)

**Checkpoint**: All invalid classes blocked pre-review; zero silent data loss; US1 still passes.

---

## Phase 5: User Story 3 - Re-import an updated export without duplicates (Priority: P3)

**Goal**: Rename-safe identity matching (never by title), update/skip with a visible field diff, FR-016 field-class update semantics, links resolving to existing entities, and duplicate-link reporting.

**Independent Test**: Import a fixture, re-import a modified version (renamed entity, new entity linked to an old one, changed prose): renamed entity matches, new entity creates, links resolve to existing entities, skip-all is a no-op, update replaces prose/unions labels/preserves category (SC-004; US3 scenarios 1–7).

### Tests for User Story 3 (write first, must fail) ⚠️

- [ ] T017 [P] [US3] Failing CC-core tests in `packages/importer/src/cc/engine.test.ts` + `packages/importer/src/cc/session.test.ts` (create if absent): `prepare()` populates `PreviewItem.existing` from the new optional `VaultWriter.getEntityFields` (absent port → no snapshot, no crash); `updatePolicy: "cif"` patch rules — title/content/lore/dates replaced, `labels`/`aliases` unioned with existing, `type` never in the patch (mapped kind ≠ existing type → `cif.kind-changed` warning), `parent` only when the draft provides one; default `"replace-all"` policy byte-identical to today (chronica regression guard); `appendConnection` returning `{created: false}` lands in `report.duplicatesSkipped` (FR-013)
- [ ] T018 [P] [US3] Failing writer tests in `apps/web/src/lib/features/importer/web-vault-writer.test.ts` (or alongside existing tests): `getEntityFields` returns current comparable fields; `titleFallback: false` makes `findBySourceRef` exact-match only — a renamed vault entity is still found by sourceRef, and a same-titled _different_ entity is NOT matched (FR-014); `appendConnection` returns `{created}` and stays idempotent

### Implementation for User Story 3

- [ ] T019 [US3] Implement the CC-core changes in `packages/importer/src/cc/engine.ts`, `session.ts`, `ports.ts`, `report.ts` until T017 passes
- [ ] T020 [US3] Implement the `WebVaultWriter` changes (`getEntityFields`, `titleFallback` option, `appendConnection` return) in `apps/web/src/lib/features/importer/web-vault-writer.ts` until T018 passes; CIF controller path constructs the writer with `titleFallback: false` and `updatePolicy: "cif"`
- [ ] T021 [US3] Review diff UI for matched items (`cif-review-diff-{sourceRef}`: current vs. package value per changed field, from `PreviewItem.existing`) plus `import-report-duplicates` rendering, in the existing review/report components; component tests (FR-015)
- [ ] T022 [US3] Re-import scenario test (library-level, `packages/importer/src/cif/reimport.test.ts`): import fixture v1 → build v2 (one renamed entity, one new entity with a relationship to a v1 entity, changed prose, added label) → re-import with mixed decisions: renamed entity matches (not create), new entity's link resolves to the _existing skipped_ entity (FR-008), identical relationship not duplicated, skip-all second pass is a vault no-op (SC-004; US3 scenarios 1–7)

**Checkpoint**: All three stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T023 [P] Add a CIF import help entry in `apps/web/src/lib/config/help-content.ts` (Constitution VII; plain language per IX; note that family-alias relationship labels like "mother of" become real family links — research Decision 12)
- [ ] T024 [P] Performance guard test: the generated ~1,000-entity manifest parses + validates + normalizes in under 5 s in `packages/importer/src/cif/perf.test.ts` (SC-006)
- [ ] T025 Verify coverage: new `cif/` modules ≥ 70% (Constitution X) via the repo coverage command; add missing unit tests if under
- [ ] T026 Run full gates `bun run lint && bun run test` from repo root; confirm all pre-existing importer (chronica/scabard) tests pass unmodified; walk quickstart.md acceptance spot-checks (SC-001…SC-007) including the offline run

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 — no dependencies, start immediately
- **Foundational (Phase 2)**: T002 → T003 → T004 (T002 needs T001's builders) — BLOCKS all stories
- **US1 (Phase 3)**: After Phase 2. T005 ∥ T007 (different files) → T006 (after T005) and T008 (after T007) → T009 → T010
- **US2 (Phase 4)**: After Phase 2; independent of US1's engine wiring but T015/T016 build on T006/T009 — run after US1 when solo. T011 ∥ T012 → T013/T014 → T015 → T016
- **US3 (Phase 5)**: After US1 (extends the engine wiring and controller path). T017 ∥ T018 → T019/T020 → T021 → T022
- **Polish (Phase 6)**: T023 ∥ T024, then T025 → T026

### Within Each User Story

- Tests written and failing before implementation (Constitution II)
- Library (schemas → parse → validate/normalize → engine) before UI; core flow before diff/report refinements

### Parallel Opportunities

- T005 ∥ T007 (cif vs cc test files); T011 ∥ T012 (validate vs parse tests); T017 ∥ T018 (engine vs writer tests); T023 ∥ T024
- US2's library half (T011–T015) can proceed in parallel with US1's UI half (T009–T010) if staffed

## Parallel Example: User Story 1

```bash
# Draft failing tests together:
Task: "normalization tests in packages/importer/src/cif/normalize.test.ts"   # T005
Task: "CC-core option/field tests in packages/importer/src/cc/*.test.ts"     # T007

# Then implement against them: T006 ∥ T008 → T009 → T010
```

## Implementation Strategy

**MVP = Phase 1 + 2 + US1 (T001–T010)**: a valid CIF package imports end-to-end offline through the existing review flow — demoable with the published fixture. US2 makes it safe to hand to external tool authors; US3 makes it a repeatable bridge. Stop and validate at every checkpoint; commit per task or logical group; `bun run lint && bun run test` before each commit (Constitution VI.3).

## Notes

- Every CC-core change must keep the default path byte-identical (chronica/scabard regression guards in T007/T017 are non-negotiable)
- No new external dependencies anywhere (plan Technical Context); zod only
- T005/T006 and T015 touch `normalize.ts`/`report.ts`; T011/T013 and T012/T014 pair on `validate.ts`/`parse.ts` — sequence within each pair when executing solo
- The identity builder ships in **US1** (not US3) — sourceRefs are persisted at first import, so they must be final from day one even though their payoff (matching) is US3
