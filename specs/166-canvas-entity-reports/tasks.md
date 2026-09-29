---
description: "Task list for Canvas Entity Reports (166-canvas-entity-reports)"
---

# Tasks: Canvas Entity Reports

**Input**: Design documents from `/specs/166-canvas-entity-reports/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/entity-report-engine.md, quickstart.md

**Tests**: INCLUDED. The constitution (Principle II, TDD) and AGENTS.md require tests for changed behavior, covering a success path and at least one negative/failure/cancellation path. Within each story, write the test tasks first and confirm they fail before implementing.

**Organization**: Tasks are grouped by user story so each can be implemented and tested independently. Priorities: US1 (P1) generate + save an editable Note entity from a canvas · US2 (P2) read/edit like any note + Regenerate · US3 (P3) selection scope, incl. Graph and Table entry points · US4 (P4) Scope/Include/Detail controls · US5 (P5) export.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1–US5, mapped to spec.md
- All paths are relative to the repository root

## Guardrails (apply to every task)

- Svelte 5 Runes, Tailwind 4 semantic tokens (`text-theme-primary`), Iconify (`icon-[lucide--name]`, NEVER `lucide-svelte`) — see `docs/STYLE_GUIDE.md`.
- Constructor-based DI for `ReportService`: exported class + singleton, mirroring `apps/web/src/lib/services/delve-dossier-service.ts`.
- Do not grow `CanvasWorkspace.svelte` (1261 lines), `GraphView.svelte` (923), `table/+page.svelte` (850), `CanvasHUD.svelte` (570) or `ZenHeader.svelte` (580) beyond wiring; new logic goes in the new modules named below (Constitution XIV). `ZenView.svelte` is not touched.
- The saved report body goes in `Entity.content` (not `lore`); provenance goes in the new `Entity.report` field; the report adds NO `connections` (data-model.md).
- No AI/network calls anywhere in this feature; report content never leaves the browser.
- Run only impacted validation (`bun run lint:changed`, `bun run test:changed`, scoped `svelte-check`); use `bun`, never `node`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the new library package (Constitution I) and make it resolvable from `apps/web`.

- [x] T001 Create workspace package `packages/entity-report-engine/` with `package.json` (`name: "entity-report-engine"`, `type: module`, `main`/`types`/`exports` → `./src/index.ts`, scripts `test`/`test:coverage`/`lint` copied from `packages/generator-engine/package.json`, dependency `schema: workspace:*`, same devDependencies), plus `tsconfig.json`, `bunfig.toml` and `vitest.config.ts` copied from `packages/generator-engine/` and an empty `src/index.ts`
- [x] T002 Add `"entity-report-engine": "workspace:*"` to dependencies in `apps/web/package.json` (alphabetical, next to `generator-engine`) and run `bun install` to link the workspace

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared types, the provenance schema, the content hash, the shared input mapper, and the guest-export exclusion. No user-facing behavior yet.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T003 [P] Write `packages/entity-report-engine/src/types.ts` exactly per `data-model.md`: `ReportScope`, `ReportSource`, `ReportOptions`, `ReportEntityInput`, `ReportRelationshipInput`, `ReportInput`, `ReportDocument`, `ReportSection`, `ReportRelationshipLine`, plus the view-model types `CharacterReportView` and `FactionReportView` referenced by `contracts/entity-report-engine.md`
- [x] T004 [P] Extend `packages/schema/src/entity.ts` with `ReportProvenanceSchema` (origin, canvasId, selection, entityIds, include, detail, generatedAt, contentHash — exactly per `data-model.md`), an optional `report: ReportProvenanceSchema.optional()` field on `EntitySchema`, and the exported `ReportProvenance` type; additive only, no migration. Tests (schema package test file next to the existing entity tests, plus `apps/web/src/lib/utils/markdown.test.ts`): a valid provenance parses and is NOT stripped by `EntitySchema.parse`; an invalid `origin` or `detail` is rejected (negative); an entity without `report` still parses unchanged; `stringifyEntity` → `parseMarkdown` round-trips a `report` object intact
- [x] T005 [P] Write `packages/entity-report-engine/src/defaults.ts` exporting `DEFAULT_REPORT_INCLUDE` (every toggle on except `gmOnlySecrets: false`, per FR-003 and spec Assumptions) and `DEFAULT_REPORT_DETAIL = "standard"`, with a colocated `defaults.test.ts` asserting `gmOnlySecrets` defaults to `false` (SC-002)
- [x] T006 [P] Write `packages/entity-report-engine/src/content-hash.ts` (`hashReportContent(content: string): string`, FNV-1a 32-bit hex — deterministic, synchronous, no dependencies) with a colocated `content-hash.test.ts`: same input gives the same hash; a one-character change gives a different hash; empty string is handled; result is stable across calls
- [x] T007 Re-export the public surface from `packages/entity-report-engine/src/index.ts` (types, defaults, `hashReportContent`; the remaining function exports are added in Phase 3 as they are created) (depends on T003, T005, T006)
- [x] T008 Write the shared entity-to-input mapper `apps/web/src/lib/services/report-input-mapper.ts`: `toReportEntityInput(entity: Entity)` maps per data-model.md — `content` before its first Markdown heading → `description` (first paragraph, one line → `summary`), `content` from its first heading on → `notes`, `lore` → `secrets`, `image` → `portraitUrl`, `labels`; `buildRelationshipInputs(entityIds, connections)` keeps only pairs where BOTH endpoints are in `entityIds` (FR-006/FR-006a) using an id-keyed `Set` for O(n) matching; `buildFactionMembership(...)` applies the FR-019 rule (an in-scope relationship between a faction and a non-faction entity, either direction, any label, makes that entity a member; faction–faction is not membership; never vault-wide). Colocated `report-input-mapper.test.ts` covers: description/notes split at the first heading; a relationship to an out-of-scope entity is dropped (negative); membership from a relationship in either direction; faction–faction is not membership; membership never includes out-of-scope members (negative); a 500-entity input completes without pairwise scanning (perf guard) (depends on T003)
- [x] T009 [P] Exclude reports from guest output: in `packages/vault-engine/src/services/GuestExporter.ts` skip `entity.kind === "report"` alongside the existing draft exclusion (FR-021), so it is also dropped from `includedEntityIds` and every relationship/canvas-node filter that uses it. Extend `packages/vault-engine/src/services/GuestExporter.test.ts`: a `kind: "report"` entity is absent from the bundle even when visible and `active`; a canvas entity node pointing at a report is filtered out; an ordinary note with a similar title is still exported (negative)

**Checkpoint**: Types, provenance schema, hash, input mapping and the guest exclusion are ready — user stories can begin.

---

## Phase 3: User Story 1 - Generate a report from a canvas and save it as an editable Note entity (Priority: P1) 🎯 MVP

**Goal**: From an entity-linking canvas, "Generate report" opens a panel with a live preview (default options), and Save creates a Note-category entity (`kind: "report"`) that opens in the standard Zen view.

**Independent Test**: Open a canvas with several linked entities, click Generate report, confirm a structured preview appears with default options (GM-only excluded), Save, and confirm a new Note entity exists with the report body, is labelled `report`, and opens in Zen like any note.

### Tests for User Story 1 (write first, confirm they fail) ⚠️

- [x] T010 [P] [US1] `packages/entity-report-engine/src/build-report.test.ts`: overview counts (characters/relationships/factions); one section per entity with kind-appropriate section type; `secrets` are ABSENT when `include.gmOnlySecrets` is false even if supplied, and present but flagged GM-only when true (SC-002, negative); missing `portraitUrl` yields no portrait field (FR-016); result order is derived from explicit data (type then title), never from any position (FR-005); unknown entity types fall back to a `generic` section (FR-015); every `include` flag removes exactly its own content (descriptions, relationships, factions/affiliations, portraits, notes) without changing which entities/relationships are included (FR-010); Brief = name, type/role and one-line summary only, Standard adds the description, Detailed adds notes and secondary fields; affiliations are the factions the entity is a member of and nothing else; a 200-entity input builds a document with one section per entity (large-canvas edge case)
- [x] T011 [P] [US1] `packages/entity-report-engine/src/presentation/presentation.test.ts`: `renderCharacterSummary`, `renderFactionSummary`, `renderRelationshipLine` (e.g. `"Vargas — friend → Lajos"`, FR-009), and the generic renderer, each across Brief/Standard/Detailed; faction view lists only the supplied members (FR-019)
- [x] T012 [P] [US1] `packages/entity-report-engine/src/markdown.test.ts`: `renderReportMarkdown` emits the fixed heading grammar from research.md R3 (`## Overview`, `### <Entity name>`, `## Relationship Summary`, `## Factions`); omits the Relationships/Relationship Summary headings entirely when there are no relationships (edge case); omits empty sections; a GM-only block is visibly marked; a 200-entity document has one `###` heading per entity (large-canvas navigability)
- [x] T013 [P] [US1] `apps/web/src/lib/services/report-service.test.ts` (DI-mocked deps, pattern from `delve-dossier-service.test.ts`): `save()` calls `createNote` with `kind: "report"`, `labels` = `["report"]`, `content` = the markdown body starting with the Overview, NO `connections`, and a `report` provenance whose `contentHash` equals `hashReportContent(content)` and whose `generatedAt` comes from the injected `now`; `save()` REJECTS a document with zero entities and writes nothing (FR-017, negative); nothing is written until `save()` is called (FR-011); two `save()` calls with the same provenance create two separate entities and never update the first (second report from the same source)
- [x] T014 [P] [US1] `apps/web/src/lib/components/canvas/canvas-report-generation.test.ts`: entire-canvas scope returns entities from entity-linking nodes only and reads canvas edges (not `entity.connections`) for relationships (FR-006, R2); returns a `source` of `{ origin: "canvas", canvasId, selection: "entire" }`; adventure/Delve canvases and non-entity nodes are excluded (FR-018, negative); a canvas with zero entities returns `error: "no-entities"` (FR-017, negative)

### Implementation for User Story 1

- [x] T015 [P] [US1] Implement `packages/entity-report-engine/src/presentation/relationship.ts` (`renderRelationshipLine`, `renderRelationshipReference`) and `presentation/generic.ts` (fallback view for other entity types), honoring `detail` and the `include` flags
- [x] T016 [P] [US1] Implement `packages/entity-report-engine/src/presentation/character.ts` (`renderCharacterSummary`) and `presentation/faction.ts` (`renderFactionSummary`, members limited to the supplied list), honoring `detail` (Brief/Standard/Detailed) and the `include` flags
- [x] T017 [US1] Implement `packages/entity-report-engine/src/build-report.ts` (`buildReport(input, options): ReportDocument`) per `contracts/entity-report-engine.md`; pure, no I/O; drops `secrets` unless `include.gmOnlySecrets` (and flags them GM-only when present); applies every other `include` flag and the detail level; affiliations derived from `factionMembership` (depends on T015, T016)
- [x] T018 [US1] Implement `packages/entity-report-engine/src/markdown.ts` (`renderReportMarkdown`) and export `buildReport`, `renderReportMarkdown` and the presentation functions from `src/index.ts` (depends on T017)
- [x] T019 [US1] Implement `apps/web/src/lib/services/report-service.ts`: `ReportServiceDeps` (`getEntity`, `createNote`, `updateEntity`, `now`) with production defaults wired to `vault.createEntity("note", …)` / `vault.updateEntity` as in `delve-dossier-service.ts`; `save(document, { title?, provenance })` writes the entity per data-model.md (`type: "note"`, `kind: "report"`, `content` = `renderReportMarkdown(document)`, `labels: ["report"]`, no `connections`, `report` = provenance + `generatedAt` + `contentHash: hashReportContent(content)`), then returns `{ entityId, created: true }`; default title derives from the canvas name + date (spec Assumptions); export class + `reportService` singleton (depends on T004, T018)
- [x] T020 [US1] Implement `apps/web/src/lib/components/canvas/canvas-report-generation.ts` (`useCanvasReportGeneration`) using T008's mapper and the canvas's own edges via the existing `flowEdgeToCanvasEdge`-style helpers in `apps/web/src/lib/components/canvas/canvas-workspace-helpers.ts`; returns `{ input, source, error }` with `error: "no-entities"` for an empty or non-entity-linking canvas (depends on T008)
- [x] T021 [P] [US1] Create `apps/web/src/lib/components/reports/ReportPreview.svelte`: renders a `ReportDocument` (pre-save only) using the engine's presentation views; portrait shown only when present; clearly labelled empty state with Save disabled when there are zero entities (FR-017); GM-only content, when present, visibly marked "GM only" (this component is pre-save only — it is NOT used to view a saved report). Colocated component test covers populated preview, empty state, and missing-portrait rendering
- [x] T022 [US1] Create `apps/web/src/lib/components/reports/ReportPanel.svelte`: takes a `ReportInput` and a `ReportSource`, holds `ReportOptions` state initialized from the T005 defaults, computes the preview reactively via `buildReport`, renders `ReportPreview`, and offers Save (calls `reportService.save` with provenance = source + options, then `modalUIStore.openZenMode(entityId)`, then closes the panel) and Cancel (writes nothing). Colocated test covers Save creates exactly one entity and opens Zen, and Cancel/close writes nothing (negative) (depends on T019, T021)
- [x] T023 [US1] Add an optional `onGenerateReport` prop and a "Generate report" button (`icon-[lucide--file-text]`, semantic tokens, `data-testid="canvas-generate-report"`) to `apps/web/src/lib/components/canvas/CanvasHUD.svelte`, shown only when the callback is provided; extend `CanvasHUD`'s existing test with shown/hidden cases
- [x] T024 [US1] Wire it in `apps/web/src/lib/components/canvas/CanvasWorkspace.svelte`: pass `onGenerateReport` only for entity-linking canvases that are not `metadata.kind === "adventure"` (FR-001/FR-018) and when not `vault.isGuest`; on click call `useCanvasReportGeneration` and open `ReportPanel` (state lives in the hook module, not inline); if `error` is set show it instead of opening an empty panel. Keep additions to wiring only (depends on T020, T022, T023)
- [ ] T025 [US1] Add a regression test (e.g. in a small zen test next to the existing Zen tests) asserting a saved `kind: "report"` note is shown by the standard entity view path with its `content` as the body and NO report-specific view (guards FR-013b and User Story 2 scenario 1); plus a `report-service.test.ts` case asserting the saved entity has `type: "note"` and the `report` label and title so it is findable and filterable like any note (FR-013a)
- [x] T026 [US1] Run the engine coverage report (`bun run test:coverage` in `packages/entity-report-engine`) and confirm the 70% new-code goal (Constitution X); add tests for uncovered branches

**Checkpoint**: User Story 1 works end to end from a canvas and is independently demoable (MVP).

---

## Phase 4: User Story 2 - Read and edit a saved report like any other vault entity; regenerate safely (Priority: P2)

**Goal**: A saved report is viewed and edited in the standard Zen view with no report-specific surface; only a conditional Regenerate action is added, and it warns before overwriting manual edits, working for every kind of source.

**Independent Test**: Open a saved report, edit its text, save; reopen and confirm the edit persisted. Then click Regenerate and confirm a warning appears because of the manual edit; cancelling leaves the edit intact.

### Tests for User Story 2 ⚠️

- [x] T027 [P] [US2] Extend `apps/web/src/lib/services/report-service.test.ts`: `regenerate()` reports `hadManualEdits: false` for untouched content and `true` after `content` changes (compares `report.contentHash` to `hashReportContent(content)`, FR-013d); with manual edits and `confirmed` not set, it returns `{ hadManualEdits: true, applied: false }` and writes NOTHING (cancellation path); with `confirmed: true` it rewrites `content`, `report.generatedAt` and `report.contentHash` and keeps `origin`, scope, `entityIds`, `include` and `detail`; regenerate on an entity that is not `kind: "report"` or has no `report` field fails safely without writing (negative); a report whose source canvas/entities were deleted keeps its saved text (spec edge case)
- [x] T028 [P] [US2] `apps/web/src/lib/services/report-source-resolver.test.ts`: `resolveReportSource` rebuilds the same `ReportInput` from a provenance for canvas + entire (re-read from the canvas), canvas + selected (from `entityIds`), graph and table (from `entityIds`), using the stored `include`/`detail`; a deleted canvas or all entities gone returns `error: "source-missing"` (negative); entities deleted from a selection are skipped and the rest are still reported; nothing is written by the resolver
- [x] T029 [P] [US2] `apps/web/src/lib/components/reports/ReportZenActions.test.ts`: the Regenerate action is defined only for `entity.kind === "report"` (absent for ordinary notes — negative); when `hadManualEdits` is true it requires confirmation, and declining performs no update (cancellation path); confirming performs the update; a `source-missing` result shows a plain-language message and performs no update (negative)

### Implementation for User Story 2

- [x] T030 [US2] Implement `ReportService.regenerate(entityId, document, { confirmed })` in `apps/web/src/lib/services/report-service.ts` per the contract (uses `hashReportContent` from the engine; never prompts itself) (depends on T019)
- [x] T031 [US2] Implement `apps/web/src/lib/services/report-source-resolver.ts` (`resolveReportSource(provenance, deps)`) reusing T008's mapper and the same underlying functions as the canvas/graph/table hooks, so a report from any source can be rebuilt from its saved provenance alone (depends on T008, T020)
- [x] T032 [US2] Implement `apps/web/src/lib/components/reports/ReportZenActions.ts`: returns the Regenerate action definition for `kind: "report"` entities; resolves the input via `resolveReportSource(entity.report, …)`, builds the document with the stored options, asks for confirmation via the existing notification/confirmation UI when `hadManualEdits`, then calls `regenerate(…, { confirmed: true })` only after a yes; on `source-missing` surface a plain-language message and do nothing (depends on T030, T031)
- [x] T033 [US2] Wire the Regenerate action into `apps/web/src/lib/components/zen/ZenHeader.svelte` next to the existing draft-approve action pattern (around the `onApproveDraft` block at ~line 470): a conditional button only when `entity.kind === "report"` and not `vault.isGuest`; no rendering, tab, or editor changes (depends on T032). Extend the ZenHeader test with report/non-report/guest cases

**Checkpoint**: US1 + US2 both work; saved reports read/edit exactly like any note and regenerate safely from any source.

---

## Phase 5: User Story 3 - Report on a selection, from Canvas, Graph view or Table view (Priority: P3)

**Goal**: The same panel and presentation work for "Selected nodes only" on a canvas, for selected nodes in Graph view, and for checked rows in Table view, with relationships drawn only between selected entities.

**Independent Test**: From each of the three surfaces select 3 entities and generate; each report contains exactly those 3 entities and only the relationships among them, using the same panel.

### Tests for User Story 3 ⚠️

- [x] T034 [P] [US3] Extend `apps/web/src/lib/components/canvas/canvas-report-generation.test.ts`: `selection: "selected"` includes only selected nodes and returns their ids in `source.entityIds`; an edge to an unselected node is omitted (FR-006); no selection returns `error: "no-selection"` (FR-004, negative)
- [x] T035 [P] [US3] `apps/web/src/lib/components/graph/graph-report-generation.test.ts`: selected node ids → input with only those entities and `source` `{ origin: "graph", entityIds }`; relationships come from `entity.connections` filtered to pairs inside the selection (FR-006a); a related-in-vault pair never connected on any canvas still appears; empty selection returns `error: "no-selection"` (negative); entities also placed on canvases do not pull in other canvas entities
- [x] T036 [P] [US3] `apps/web/src/lib/components/table/table-report-generation.test.ts`: same expectations as T035 for checked rows (`origin: "table"`), plus produces a result identical in structure to the graph path for the same ids (SC-008)

### Implementation for User Story 3

- [x] T037 [P] [US3] Add selection handling to `apps/web/src/lib/components/canvas/canvas-report-generation.ts`: the `selection` argument reads currently selected entity nodes; excludes edges whose other endpoint is unselected (depends on T020)
- [x] T038 [P] [US3] Implement `apps/web/src/lib/components/graph/graph-report-generation.ts` (`useGraphReportGeneration(selectedNodeIds, getEntity)`), reusing T008's mapper; selected ids come from Cytoscape's existing selection (`cy.$("node:selected")`, same primitive as `SelectionConnector.svelte`)
- [x] T039 [P] [US3] Implement `apps/web/src/lib/components/table/table-report-generation.ts` (`useTableReportGeneration(selectedEntityIds, getEntity)`), reusing T008's mapper
- [x] T040 [US3] Graph entry point: add a small `apps/web/src/lib/components/graph/GraphReportAction.svelte` (button, `data-testid="graph-generate-report"`, visible when at least one node is selected and not `vault.isGuest`; opens `ReportPanel` with a fixed selection scope per FR-002a) and mount it in `apps/web/src/lib/components/GraphView.svelte` beside `SelectionConnector`; wiring only in GraphView (depends on T038, T022). Component test: hidden with no selection, hidden for a guest (negative), opens panel with the selected ids
- [ ] T041 [US3] Table entry point: add a "Generate report" button to the existing bulk-actions bar in `apps/web/src/routes/(app)/table/+page.svelte` next to "Add / remove labels" (`data-testid="entity-table-bulk-generate-report"`, `icon-[lucide--file-text]`, hidden for guests); its handler calls `useTableReportGeneration(selectedVisible.map((e) => e.id), …)` and opens `ReportPanel` (depends on T039, T022). Extend the route's existing test: button appears only with rows selected and not for a guest; clicking opens the panel with those ids
- [x] T042 [US3] Canvas "Selected nodes only" wiring: extend the `CanvasWorkspace.svelte` handler from T024 to pass the current selection to the hook and make it available to the panel's scope choice (scope UI is completed in T047) (depends on T037)

**Checkpoint**: All three entry points produce identical-structure reports; scoping never leaks entities or relationships.

---

## Phase 6: User Story 4 - Adjust Scope, Include and Detail with a live preview (Priority: P4)

**Goal**: The panel exposes Scope (canvas only), Include toggles and Detail, and the preview updates in place; GM-only content is opt-in and visibly marked. (The engine already honors every option since US1 — this phase adds the controls.)

**Independent Test**: In the preview, turn off Notes and switch Detail to Brief; the preview drops notes and shortens sections without reopening the panel.

### Tests for User Story 4 ⚠️

- [x] T043 [P] [US4] Extend the `ReportPanel` test: changing any option updates the preview without remount (FR-012); the chosen options end up in the saved provenance; the Scope control is shown for canvas origin but NOT for graph/table origin (FR-002a, negative); enabling GM-only shows a "GM only" marker; "Selected nodes only" with no selection shows an explanation and no preview (FR-004, negative)

### Implementation for User Story 4

- [x] T044 [US4] Add the controls to `apps/web/src/lib/components/reports/ReportPanel.svelte`: Scope segmented control (Entire canvas / Selected nodes only — canvas origin only), Include toggles (descriptions, relationships, factions/affiliations, portraits, notes, GM-only/secret fields with an explanatory note), Detail control (Brief/Standard/Detailed); plain-language labels (Constitution IX); reactive preview recomputation via `$derived`; a stable layout so earlier previews are never left mixed with the current one (depends on T022, T042)

**Checkpoint**: Every FR-002/FR-010/FR-012 behavior verifiable in the panel.

---

## Phase 7: User Story 5 - Export a saved report for use outside Codex Cryptica (Priority: P5)

**Goal**: From a saved report's normal entity view, copy it as Markdown / rich text with headings preserved.

**Independent Test**: Open a saved report, use Export, paste into a Markdown-aware editor; headings and relationship lines survive.

### Tests for User Story 5 ⚠️

- [x] T045 [P] [US5] Extend `apps/web/src/lib/services/report-service.test.ts`: `export(entityId, "markdown")` calls `ClipboardService.copyContent({ markdown })` with the entity's `content`; unknown entity id or non-report entity returns `false` and copies nothing (negative); clipboard failure resolves `false` without throwing
- [x] T046 [P] [US5] Extend `apps/web/src/lib/components/reports/ReportZenActions.test.ts`: Export action defined only for `kind: "report"`

### Implementation for User Story 5

- [x] T047 [US5] Implement `ReportService.export()` in `apps/web/src/lib/services/report-service.ts` via `apps/web/src/lib/services/ClipboardService.ts` (`copyContent({ markdown })`, R4); add a `copyContent` dep to `ReportServiceDeps` (depends on T019)
- [x] T048 [US5] Add the Export action to `apps/web/src/lib/components/reports/ReportZenActions.ts` and wire it into `apps/web/src/lib/components/zen/ZenHeader.svelte` beside Regenerate (T033); show a brief success/failure confirmation with the existing notification mechanism (depends on T047, T033)

**Checkpoint**: All five stories functional.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [x] T049 [P] Add a `help-content.ts` entry (`id: "entity-reports"`, plain-language description of Generate report from Canvas/Graph/Table, Save as a note, editing, Regenerate, Export) to `apps/web/src/lib/config/help-content.ts` (Constitution VII), plus a `FeatureHint` for first use if the existing hint pattern fits
- [ ] T050 [P] Add a user-facing entry to `apps/web/src/lib/content/changelog/releases.json` describing "Generate readable reports from your canvas, graph, or table selection" only (no technical refactor notes, per AGENTS.md)
- [ ] T051 [P] Playwright E2E `apps/web/tests/entity-reports.spec.ts` (mirroring existing canvas specs): canvas → Generate report → Save → note opens in Zen → edit persists after reload (SC-004/SC-005) → the report is found by a vault search for its title (FR-013a); a second report from the same canvas is a separate note; Regenerate after an edit warns and declining keeps the edit; Graph selection and Table selection each reach the same panel and can be regenerated afterwards; GM-only content absent by default; a 60-entity canvas still generates and the saved report has a heading per entity
- [x] T052 Bounded-responsibility check: confirm `CanvasWorkspace.svelte`, `GraphView.svelte`, `table/+page.svelte`, `CanvasHUD.svelte` and `ZenHeader.svelte` grew only by wiring (no inline logic); move anything larger into the new modules
- [ ] T053 Run `quickstart.md` end to end manually against the dev server (including the second-report and Regenerate steps) and fix any drift
- [ ] T054 Validation gate (impacted-only): scoped `bunx svelte-check --tsconfig ./tsconfig.json --threshold error` in `apps/web` and `packages/entity-report-engine` (and `packages/schema`, `packages/vault-engine` for their touched files); `bun run lint:changed`; `bun run test:changed`; `bunx fallow audit --format json --quiet --explain --gate-marker agent` (fix any `fail` verdict); run the `codex-review` specialist review; then open a regular (non-draft) PR

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (1)** → **Foundational (2)** → user stories → **Polish (8)**
- **US1 (P1)** is the MVP and has no story dependencies.
- **US2** builds on US1's `ReportService` (T019) and Zen integration (T025); independently testable once a report exists.
- **US3** builds on US1's panel (T022) and canvas hook (T020); Graph/Table entry points (T038–T041) are independent of each other.
- **US4** builds on US1's panel; T044 needs T042 for the canvas selection scope.
- **US5** builds on US1's `ReportService` and US2's action slot (T033).

### Within each story

- Tests first (confirm they fail) → engine/service → components → wiring.
- Same-file tasks are sequential: `report-service.ts` (T019 → T030 → T047), `ReportPanel.svelte` (T022 → T044), `ZenHeader.svelte` (T033 → T048), `ReportZenActions.ts` (T032 → T048), `canvas-report-generation.ts` (T020 → T037), `CanvasWorkspace.svelte` (T024 → T042), `report-service.test.ts` (T013 → T027 → T045).

### Parallel opportunities

- Phase 2: T003, T004, T005, T006, T009 in parallel; T007 after T003/T005/T006; T008 after T003.
- US1 tests T010–T014 all in parallel; T015 ∥ T016; T021 ∥ T015–T018.
- US2 tests T027–T029 in parallel.
- US3: T034–T036 in parallel; T037 ∥ T038 ∥ T039.
- US5 tests (T045, T046) can be written in parallel with other stories' work once US1 lands.
- Polish T049–T051 in parallel.

### Parallel example: User Story 1

```text
Task: "build-report tests in packages/entity-report-engine/src/build-report.test.ts"        (T010)
Task: "presentation tests in packages/entity-report-engine/src/presentation/presentation.test.ts" (T011)
Task: "markdown tests in packages/entity-report-engine/src/markdown.test.ts"                (T012)
Task: "report-service save tests in apps/web/src/lib/services/report-service.test.ts"       (T013)
Task: "canvas hook tests in apps/web/src/lib/components/canvas/canvas-report-generation.test.ts" (T014)
```

## Implementation Strategy

### MVP first (User Story 1)

1. Phase 1 → Phase 2 → Phase 3 (US1).
2. Stop and validate: canvas → preview → Save → editable Note opened in Zen, GM-only excluded.
3. This alone satisfies the original request (a readable, correctable document from a canvas); demo/PR-able.

### Incremental delivery

1. US1 → MVP. 2. US2 (regenerate safely) → 3. US3 (selection + Graph/Table) → 4. US4 (options UI) → 5. US5 (export) → Polish.
   Each story adds value without breaking the earlier ones; each can be its own PR if smaller reviews are preferred (branch from the previous merged work).

## Notes

- Corrections made after `/speckit-analyze`: reports store their provenance in a new typed `Entity.report` field (the existing `metadata` object is fixed and would drop extra keys); the report body lives in `content`, not `lore`; the report adds no connections (no hub node in Graph/Table); `GuestExporter` skips reports; Regenerate rebuilds its input from the saved provenance so it works for Graph/Table and "selected" reports; the content hash lives in the engine and is available before `save()`; Include/Detail behavior and its tests moved into US1 so US4 is UI-only; the optional "known kind list" task was dropped because `kind` is a free-form string and no list exists.
- Earlier-spec inaccuracies corrected while generating the first task list: the Table view already has row selection (so only a bulk-bar button is added), and the canvas has no general "Export" menu (so the entry point is a `CanvasHUD` toolbar button).
- Total: 54 tasks (Setup 2, Foundational 7, US1 17, US2 7, US3 9, US4 2, US5 4, Polish 6).
