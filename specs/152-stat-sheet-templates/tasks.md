---
description: "Task list for Markdown-Based Presentation Templates for Stat Sheets"
---

# Tasks: Markdown-Based Presentation Templates for Stat Sheets

**Input**: Design documents from `/specs/152-stat-sheet-templates/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Included and REQUIRED — Constitution Principle II (TDD) mandates unit tests for all code logic; write each test task before its paired implementation task and confirm it fails first.

**Organization**: Tasks are grouped by user story (spec.md priorities) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)

## Path Conventions

Monorepo web app (per plan.md Project Structure): `packages/stat-sheet-engine/src/presentation/` for the parse/validate/render/package library, `apps/web/src/lib/components/stats/presentation/` and `apps/web/src/lib/stores/` for the UI layer, `packages/schema/src/stat-sheet.ts` for shared types.

---

## Phase 1: Setup

**Purpose**: Scaffolding shared by every later phase

- [ ] T001 Create `packages/stat-sheet-engine/src/presentation/` directory with empty `ast.ts`, `directives.ts`, `parse.ts`, `validate.ts`, `resolve.ts`, `package.ts`, `built-ins.ts`, `presentation.test.ts`, and export them from `packages/stat-sheet-engine/src/index.ts`
- [ ] T002 [P] Add `stat_sheet_presentation_templates` IndexedDB object store (keyPath `id`, indexes `by-vault` and `by-schema-template-id`) and bump `DB_VERSION` in `apps/web/src/lib/utils/idb.ts`, mirroring the existing `stat_sheet_templates` store
- [ ] T003 [P] Extend `packages/schema/src/stat-sheet.ts`: add optional `defaultPresentationTemplateId: string | null` to `StatSheetTemplateSchema`, and add optional `presentationTemplateId: string | null` to the entity `statSheet` association schema (per data-model.md)

**Checkpoint**: Directory/store/schema scaffolding exists; no behavior yet.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The parse → validate → render engine and storage plumbing every user story renders through. Per Constitution II, write each test before its implementation task.

**⚠️ CRITICAL**: No user story phase may start until this phase is complete.

- [ ] T004 [P] Define `PresentationAst` node types (`Heading`, `Paragraph`, `List`, `Table`, `Blockquote`, `ThematicBreak`, `Image`, `Section`, `Group`, `Card`, `Row`, `ListRegion`, `FieldReference`, `UnknownDirective`, `MissingField`) in `packages/stat-sheet-engine/src/presentation/ast.ts` per data-model.md
- [ ] T005 [P] Define the v1 allowlisted directive names (`stat-group`, `section`, `card`, `row`, `list-region`) and display modes (`plain`, `prominent`, `current-max`, `counter`, `progress`, `checkbox`, `tag-list`, `table`, `notes`) with their valid field-type mappings in `packages/stat-sheet-engine/src/presentation/directives.ts` per contracts/directive-syntax.md
- [ ] T006 Write failing unit tests for `parseTemplate(source, formatVersion)` in `packages/stat-sheet-engine/src/presentation/presentation.test.ts`: standard Markdown passthrough, `{{stat.field}}` inline tokens, `:::stat-group columns=N ... :::` fenced tokens, raw HTML/script never emitted as passthrough tokens, malformed/unterminated fences contained (no throw), empty-string input (depends on T004, T005)
- [ ] T007 Implement `parseTemplate()` in `packages/stat-sheet-engine/src/presentation/parse.ts` using `marked.lexer()` with custom tokenizer/renderer extensions for the directive syntax (research.md §1–§3), making T006 pass (depends on T006)
- [ ] T008 Write failing unit tests for `validateAst(ast, schema)` and `isTemplateUsable(template, schema)` in `packages/stat-sheet-engine/src/presentation/presentation.test.ts`: unresolved field → `MissingField`, unknown directive → `UnknownDirective`, incompatible display mode → falls back to type default, `schema` undefined → `isTemplateUsable` false, parse failure → `isTemplateUsable` false, otherwise true even with flagged nodes (depends on T007)
- [ ] T009 Implement `validateAst()` and `isTemplateUsable()` in `packages/stat-sheet-engine/src/presentation/validate.ts`, making T008 pass (depends on T008)
- [ ] T010 [P] Implement `PresentationTemplateStore` (DI-singleton, constructor-injected DB/vault deps, exports class + default instance) in `apps/web/src/lib/stores/presentation-templates.svelte.ts`, mirroring `apps/web/src/lib/stores/stat-sheet-templates.svelte.ts` (depends on T002)
- [ ] T011 [P] Implement `<PresentationRenderer>` and the base node components (`HeadingNode`, `ParagraphNode`, `ListNode`, `TableNode`, `BlockquoteNode`, `ImageNode`) that walk `PresentationAst` and render native Svelte elements (no `{@html}`) in `apps/web/src/lib/components/stats/presentation/` (depends on T004)
- [ ] T012 Wire `isTemplateUsable()` into the entity Stat Sheet render path in `apps/web/src/lib/components/stats/DetailStatsTab.svelte`: usable → render via `<PresentationRenderer>`, not usable → render existing `StatSheetView.svelte` unchanged (FR-010) (depends on T009, T010, T011)

**Checkpoint**: Engine can parse/validate a template and the app can decide render-vs-fallback. No UI exists yet for authoring or picking templates.

---

## Phase 3: User Story 1 - Switch how a Stat Sheet looks without touching its data (Priority: P1) 🎯 MVP

**Goal**: A user can apply a built-in presentation template to an entity, switch to a different compatible one, and edit values through either — all without altering or duplicating the underlying Stat Sheet data.

**Independent Test**: Create an entity with a populated Stat Sheet, apply a built-in template, switch to a different compatible built-in template, confirm identical values render in both and edits made through the rendered controls persist across the switch.

### Tests for User Story 1

- [ ] T013 [P] [US1] Write failing unit tests for selection resolution (schema default vs. per-entity override precedence, entity with no override inherits schema default) in `packages/stat-sheet-engine/src/presentation/presentation.test.ts`
- [ ] T014 [P] [US1] Write failing component test in `apps/web/src/lib/components/stats/presentation/PresentationTemplatePicker.test.ts`: switching an entity between two compatible templates changes rendered layout but not underlying `statSheet` field values; browsing offers only templates whose `schemaTemplateId` exact-matches the entity's schema; when a schema has more than one compatible template (FR-008), the picker lists all of them and each is independently selectable

### Implementation for User Story 1

- [ ] T015 [US1] Implement selection resolution logic (`resolvePresentationTemplate(entity, schema)`) in `packages/stat-sheet-engine/src/presentation/resolve.ts`, making T013 pass (depends on T009, T013)
- [ ] T016 [US1] Seed the 4 built-in templates (standard form layout, compact stat block, dashboard/card layout, mobile quick-reference layout) as read-only `PresentationTemplate` records with `isBuiltIn: true` in `packages/stat-sheet-engine/src/presentation/built-ins.ts` (depends on T004, T005)
- [ ] T017 [US1] Implement `FieldReferenceNode.svelte` in `apps/web/src/lib/components/stats/presentation/nodes/FieldReferenceNode.svelte`, reusing the existing counter/checkbox/number/text controls from `StatSheetEditor.svelte` so edits write back to the entity's `statSheet` data (FR-014) (depends on T011)
- [ ] T018 [US1] Implement `PresentationTemplatePicker.svelte` (lists templates exact-matching the current schema, shows current schema-default vs. per-entity override state) in `apps/web/src/lib/components/stats/presentation/PresentationTemplatePicker.svelte`, making T014 pass (depends on T015, T016, T017)
- [ ] T019 [US1] Wire `PresentationTemplatePicker` into `apps/web/src/lib/components/stats/DetailStatsTab.svelte` and `apps/web/src/lib/components/stats/TokenQuickStats.svelte`, persisting picker changes to `SchemaPresentationDefault`/`EntityPresentationOverride` via `PresentationTemplateStore` (depends on T010, T018)
- [ ] T020 [US1] Manually run quickstart.md §1 and confirm both acceptance scenarios pass end-to-end

**Checkpoint**: User Story 1 is fully functional and independently testable — this is the MVP.

---

## Phase 4: User Story 2 - Author a custom presentation template in Markdown (Priority: P1)

**Goal**: A user can duplicate a built-in template or start from scratch, write extended Markdown with field references and layout directives, get live-preview and diagnostic feedback, and save it as a selectable template for its schema.

**Independent Test**: Open the editor, select a schema, write Markdown with a heading, a table, and a `stat-group` directive referencing two valid fields, preview against sample values, save, and confirm it appears in the picker from User Story 1 for that schema only.

### Tests for User Story 2

- [ ] T021 [P] [US2] Write failing unit tests for field-reference autocomplete candidates (valid schema fields offered, already-invalid names excluded) in `packages/stat-sheet-engine/src/presentation/presentation.test.ts`
- [ ] T022 [P] [US2] Write failing component test in `apps/web/src/lib/components/stats/presentation/PresentationTemplateEditor.test.ts`: typing `{{stat.doesNotExist}}` flags the reference before save is enabled; duplicating a built-in produces an editable vault-owned copy that does not alter the original
- [ ] T023 [P] [US2] Write failing unit tests for the `:::list-region field="<fieldId>" :::` directive in `packages/stat-sheet-engine/src/presentation/presentation.test.ts`: a list-typed field produces a `ListRegion` node with an `item.*`-scoped item template; a non-list-typed field produces a flagged/incompatible node, not a parse error (per contracts/directive-syntax.md and spec.md Edge Cases)

### Implementation for User Story 2

- [ ] T024 [US2] Implement `GroupNode.svelte`, `SectionNode.svelte`, `CardNode.svelte`, `RowNode.svelte` (responsive containers, degrade below requested `columns` per FR-018) in `apps/web/src/lib/components/stats/presentation/nodes/` (depends on T011)
- [ ] T025 [US2] Extend `parseTemplate()`/`validateAst()` to recognize `:::list-region field="..." :::` and its `{{item.*}}`-scoped inline placeholders, validating the field is list-typed, making T023 pass (depends on T007, T009, T023)
- [ ] T026 [US2] Implement `ListRegionNode.svelte` (renders the item template once per element of the bound list field, read-only per FR-014) in `apps/web/src/lib/components/stats/presentation/nodes/ListRegionNode.svelte` (depends on T025)
- [ ] T027 [US2] Implement `PresentationTemplateEditor.svelte` (Markdown source textarea + live preview via `<PresentationRenderer>` in `preview` mode + inline diagnostics for `MissingField`/`UnknownDirective`) in `apps/web/src/lib/components/stats/presentation/PresentationTemplateEditor.svelte`, making T022 pass (depends on T009, T024)
- [ ] T028 [US2] Implement field-reference autocomplete popover in the editor, insertable at cursor, making T021 pass (depends on T021, T027)
- [ ] T029 [US2] Implement create-from-scratch, duplicate-built-in, and duplicate-existing flows with per-schema name uniqueness (auto-suffix or block on collision, per data-model.md Validation Rules) in `PresentationTemplateEditor.svelte`, persisting via `PresentationTemplateStore` (depends on T010, T016, T027)
- [ ] T030 [US2] Add a "Presentation Templates" section to the Stat Sheet template management area (entry point alongside existing `StatSheetTemplateModal.svelte`) linking to the editor and picker (depends on T018, T029)

**Checkpoint**: Users can author, preview, and save custom templates, including list-region layouts; User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Template stays safe and predictable when things go wrong (Priority: P2)

**Goal**: Renamed/removed fields, malformed or disallowed content, and invalid/missing templates never crash a Stat Sheet or corrupt data — they degrade visibly and safely.

**Independent Test**: Rename a field a saved template references and confirm the sheet still renders with the field flagged; import a file containing a `<script>` tag and confirm it's stripped with a notice; point an entity at a nonexistent template id and confirm it falls back to `StatSheetView.svelte`.

### Tests for User Story 3

- [ ] T031 [P] [US3] Write failing unit tests in `packages/stat-sheet-engine/src/presentation/presentation.test.ts`: renaming/removing a referenced schema field turns that `FieldReference` into `MissingField` without invalidating the rest of the template (`isTemplateUsable` stays true)
- [ ] T032 [P] [US3] Write failing unit tests for import sanitization in `packages/stat-sheet-engine/src/presentation/presentation.test.ts`: a source string containing raw HTML/`<script>`/executable-expression content imports with that content stripped and a list of removed fragments returned, remaining valid Markdown preserved
- [ ] T033 [P] [US3] Write failing component test in `apps/web/src/lib/components/stats/DetailStatsTab.test.ts`: an entity whose `presentationTemplateId` points at a missing/deleted template renders via `StatSheetView.svelte` (FR-010), not an error state

### Implementation for User Story 3

- [ ] T034 [US3] Implement `MissingFieldNode.svelte` and `UnknownDirectiveNode.svelte` (visible flagged placeholders, plain-language messaging per Constitution IX) in `apps/web/src/lib/components/stats/presentation/nodes/`, making T031 pass in the rendered UI (depends on T009)
- [ ] T035 [US3] Implement the strip-and-report sanitization pass (reject raw HTML/CSS/JS/executable expressions, keep the rest) as part of `parseTemplate()`/`validateAst()` used by both save and import paths in `packages/stat-sheet-engine/src/presentation/parse.ts` and `packages/stat-sheet-engine/src/presentation/package.ts`, making T032 pass (depends on T007, T009)
- [ ] T036 [US3] Implement deletion-fallback rules in `packages/stat-sheet-engine/src/presentation/resolve.ts` and `PresentationTemplateStore`: deleting a schema's default resets it to `null`; deleting a template referenced by an entity override leaves a dangling id that `resolvePresentationTemplate` treats as invalid → fallback (per data-model.md Validation Rules), making T033 pass (depends on T012, T015)
- [ ] T037 [US3] Manually run quickstart.md §3 and confirm all four scenarios pass end-to-end

**Checkpoint**: Safety/fallback guarantees hold; User Stories 1–3 all work independently.

---

## Phase 6: User Story 4 - Export and share a presentation template (Priority: P3)

**Goal**: A user can export a custom template as a value-free, portable file and import it elsewhere, with clear incompatibility feedback when the target vault lacks a matching schema.

**Independent Test**: Export a custom template, inspect the file for absence of entity values/vault id/private assets, import it into a vault with a matching schema (works) and one without (clearly flagged).

### Tests for User Story 4

- [ ] T038 [P] [US4] Write failing unit tests in `packages/stat-sheet-engine/src/presentation/presentation.test.ts`: exporting a `PresentationTemplate` produces a `PresentationTemplatePackage` containing only `formatVersion`, `name`, `description`, `schemaTemplateId`, `source` — asserting absence of any entity-value, vault-id, or asset-reference fields
- [ ] T039 [P] [US4] Write failing unit tests: importing a package whose `schemaTemplateId` has no match among the destination vault's schemas returns a typed incompatibility result rather than silently attaching to an unrelated schema

### Implementation for User Story 4

- [ ] T040 [US4] Implement `exportTemplate()`/`importTemplatePackage()` in `packages/stat-sheet-engine/src/presentation/package.ts`, modeled on `template-package.ts`'s existing versioned-envelope pattern, making T038 and T039 pass (depends on T035)
- [ ] T041 [US4] Add export/import buttons and incompatibility messaging to the Presentation Templates management area in `apps/web/src/lib/components/stats/presentation/PresentationTemplateEditor.svelte` (depends on T030, T040)
- [ ] T042 [US4] Manually run quickstart.md §4 and confirm all three scenarios pass end-to-end

**Checkpoint**: All four user stories are independently functional and testable.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, coverage, and final validation across all stories

- [ ] T043 [P] Add a Presentation Templates entry to `apps/web/src/lib/config/help-content.ts` and a `FeatureHint` for first-time use of the editor (Constitution VII)
- [ ] T044 [P] Pass over all diagnostic/flag copy (`MissingField`, `UnknownDirective`, import-stripped notices, incompatibility messages) for plain, non-technical language (Constitution IX)
- [ ] T045 Run `bun run lint` and `bun run test` across `packages/stat-sheet-engine` and `apps/web`, confirming the new code meets the 70% coverage goal (Constitution X)
- [ ] T046 Run a full manual pass of quickstart.md end-to-end (all four stories in one continuous session), explicitly timing the presentation switch (SC-001: under 10s) and checking template layouts at both a desktop and a mobile viewport width for overflow/unreadable content (SC-008)
- [ ] T047 Update `AGENTS.md` Active Technologies note if any implementation detail diverged from plan.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational only
- **User Story 2 (Phase 4)**: Depends on Foundational; reuses US1's `built-ins.ts` (T016) and picker (T018) but is otherwise independent
- **User Story 3 (Phase 5)**: Depends on Foundational; extends resolution logic from US1 (T015) and parsing from Foundational (T007) — independently testable via a template deliberately broken after US1/US2 exist
- **User Story 4 (Phase 6)**: Depends on Foundational and US3's sanitization pass (T035)
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### Recommended Order

Given the dependency chain above (US3 reuses US1's resolver, US4 reuses US3's sanitizer), implement in priority + dependency order: Setup → Foundational → US1 → US2 → US3 → US4 → Polish, rather than parallelizing US3/US4 ahead of their prerequisites.

### Parallel Opportunities

- T002, T003 (Setup) in parallel
- T004, T005 (Foundational types/directives) in parallel; T010, T011 in parallel once their own deps land
- T013, T014 (US1 tests) in parallel
- T021, T022, T023 (US2 tests) in parallel
- T031, T032, T033 (US3 tests) in parallel
- T038, T039 (US4 tests) in parallel
- T043, T044 (Polish) in parallel

---

## Parallel Example: Foundational Phase

```bash
Task: "Define PresentationAst node types in packages/stat-sheet-engine/src/presentation/ast.ts"
Task: "Define allowlisted directives/display modes in packages/stat-sheet-engine/src/presentation/directives.ts"
```

## Parallel Example: User Story 1

```bash
Task: "Unit tests for selection resolution in packages/stat-sheet-engine/src/presentation/presentation.test.ts"
Task: "Component test for PresentationTemplatePicker in apps/web/src/lib/components/stats/presentation/PresentationTemplatePicker.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (blocks everything)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE** via quickstart.md §1
5. Demo: switching a built-in presentation without touching data

### Incremental Delivery

1. Setup + Foundational → engine + fallback wiring ready
2. + US1 → MVP: built-in templates are switchable (deploy/demo)
3. + US2 → users can author their own templates
4. + US3 → safety/fallback guarantees hold under real-world drift
5. + US4 → templates become portable/shareable

---

## Notes

- [P] tasks touch different files with no unmet dependencies
- Tests are REQUIRED here (Constitution II) — do not skip the "write failing test first" step
- Commit after each task or logical group, per the existing repo workflow (`--no-verify` only when explicitly instructed)
- Stop at each phase checkpoint and run the corresponding quickstart.md section before continuing
