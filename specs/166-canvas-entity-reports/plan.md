# Implementation Plan: Canvas Entity Reports

**Branch**: `166-canvas-entity-reports` | **Date**: 2026-09-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/166-canvas-entity-reports/spec.md`

## Summary

Add a "Generate report" action to entity-linking Spatial Canvases (toolbar/`CanvasHUD`), Graph view, and Table view that turns a set of selected (or entire-canvas) entities and their explicit relationships into a structured, readable report. The report is previewed live (Scope/Include/Detail options), then saved as a **Note-category vault entity** (`kind: "report"`, following the existing `kind: "delve-dossier"` pattern in `delve-dossier-service.ts`) and opened in the app's **standard Zen Mode entity view — no report-specific viewing or editing surface**. The saved content is well-structured Markdown, so it reads with visible headings/sections/relationship lines through the same rendering every note already gets; editing uses the same editor every note already gets. Export to document-friendly text (Markdown/rich text) is a secondary action on the saved entity, reusing `ClipboardService`.

The reusable piece — formatting an entity/relationship for a given context and density (FR-014) — is extracted into a new, framework-free `packages/entity-report-engine` workspace package (pure functions over `schema`'s `Entity` type), mirroring how `generator-engine`'s `buildDelveDossier` already turns canvas nodes into structured markdown for the (unrelated) Delve dossier feature. No AI/network call is involved anywhere in this feature — it is deterministic templating over data already loaded in the vault, which is what makes FR-005 ("no inference from position") and SC-002/SC-003 (deterministic scoping) straightforward to guarantee.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 Runes, SvelteKit 2, Bun 1.3.14
**Primary Dependencies**: Existing `@codex/vault-engine` (`vault.createEntity`/`updateEntity`), `@codex/canvas-engine` (canvas nodes/edges), `schema` (Zod `Entity` type), existing `ZenView`/`modalUIStore.openZenMode`, existing `ClipboardService` (+ `marked`/`dompurify`, already a dependency per 2815-smart-copy), Cytoscape (Graph view selection, already used by `SelectionConnector.svelte`). **No new third-party dependency.**
**Storage**: Existing browser-local IndexedDB/OPFS vault. A report is an ordinary Note-category entity written as a normal Markdown file — no new persistence format, no new object store. One additive schema change: an optional `report` provenance field on `EntitySchema` (origin, scope ids, options, content hash), needed so Regenerate can work; existing entities are unaffected.
**Testing**: Vitest (unit/component, `bun run test:changed`), Playwright for the three new entry points if end-to-end coverage is warranted (mirrors existing `apps/web/tests/*.spec.ts` for canvas/welcome flows).
**Target Platform**: Browser (SvelteKit web app), same runtime as the rest of `apps/web`.
**Project Type**: Web application feature + one new internal library package (see Constitution Check, Principle I).
**Performance Goals**: SC-001 (preview within ~10s of interaction) — report generation is synchronous, in-memory templating over already-loaded entities; realistic canvases (tens of entities) resolve in well under a second. Relationship matching MUST be O(n) via an id-keyed lookup, not O(n²) pairwise scanning, for the "very large canvas" edge case.
**Constraints**: Offline-capable (no network/AI call required to generate or view a report); privacy (GM-only/secret fields excluded by default, reusing the existing `lore`/`artDirection` stripping and visibility-settings pattern from `GuestExporter`, never a new definition of "secret"); no new opt-in remote storage (Constitution V's narrow exception is not invoked — report content never leaves the browser unless the GM manually copies/exports it).
**Scale/Scope**: Canvases/selections up to roughly 50–100 entities in the stated edge case; the UI must degrade gracefully (still generate, remain navigable) rather than target a specific upper bound.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                          | Status                   | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Library-First                   | **PASS (with plan)**     | New reusable formatting logic (FR-014) lands in a new `packages/entity-report-engine` workspace package — pure functions, no Svelte/DOM — not inline in `apps/web`. `apps/web` calls into it the same way it already calls `generator-engine`'s `buildDelveDossier`.                                                                                                                                                                                                                  |
| II. TDD                            | **PASS (procedural)**    | Package and new services are written test-first per Phase 2 tasks; each task pairs implementation with its test.                                                                                                                                                                                                                                                                                                                                                                      |
| III. Simplicity & YAGNI            | **PASS (with decision)** | Reuses `delve-dossier-service.ts`'s note-creation shape and `ClipboardService` rather than inventing new persistence or clipboard mechanisms. There is no report-specific viewing/editing surface at all: the saved entity is opened in the standard `ZenView`, identical to any note — its readability comes from writing well-structured Markdown (predictable, self-authored headings), not from a bespoke renderer or a structured-block AST/WYSIWYG editor — see research.md R3. |
| IV. AI-First Extraction            | **N/A**                  | Deliberately non-AI: deterministic templating over structured entity/relationship data already in the vault. This is a requirement (FR-005, SC-002/SC-003), not a gap.                                                                                                                                                                                                                                                                                                                |
| V. Privacy & Client-Side           | **PASS**                 | 100% client-side; report entity lives in the existing local vault; reuses `GuestExporter`'s established GM-secret-field definition, and `GuestExporter` additionally skips `kind: "report"` entities so a report (which may hold opted-in GM-only text) never reaches guest snapshots or the public directory (FR-021). The narrow remote-storage exception (six conditions) is not invoked — nothing new leaves the browser.                                                         |
| VI. Clean Implementation           | **PASS (procedural)**    | Svelte 5 runes, Tailwind 4 semantic tokens, Iconify (`icon-[lucide--...]`, never `lucide-svelte`), `bun run lint:changed`/`test:changed` before done.                                                                                                                                                                                                                                                                                                                                 |
| VII. User Documentation            | **PASS (task planned)**  | A help-content.ts entry (and likely a `FeatureHint` for first use of "Generate report") is a Phase 2 task; the feature is non-trivial enough to warrant one.                                                                                                                                                                                                                                                                                                                          |
| VIII. Dependency Injection         | **PASS (with plan)**     | New `ReportService` follows `DelveDossierServiceDeps`'s exact shape (constructor-injected deps, sane defaults, exported class + singleton) — see data-model.md / contracts.                                                                                                                                                                                                                                                                                                           |
| IX. Natural Language               | **PASS (procedural)**    | UI copy ("Generate report", "Scope", "Include", "Detail") stays plain; verified at review.                                                                                                                                                                                                                                                                                                                                                                                            |
| X. Quality & Coverage              | **PASS (procedural)**    | New `packages/entity-report-engine` targets the 70% "new code" goal on introduction.                                                                                                                                                                                                                                                                                                                                                                                                  |
| XI. Agent Operational Protocol     | **PASS (procedural)**    | Applies during implementation; Phase 2 tasks are scoped surgically per file.                                                                                                                                                                                                                                                                                                                                                                                                          |
| XII. Terminology (Labels not Tags) | **PASS**                 | Report entities use the existing `labels` field (e.g. `["report"]`, mirroring `dossierLabels`), never a new "tags" concept.                                                                                                                                                                                                                                                                                                                                                           |
| XIII. Discovery Intent Governance  | **N/A**                  | Internal application feature; no public, indexable discovery page is added or repositioned.                                                                                                                                                                                                                                                                                                                                                                                           |
| XIV. Bounded Responsibility        | **PASS (with plan)**     | See Bounded Responsibility Check below.                                                                                                                                                                                                                                                                                                                                                                                                                                               |

### Discovery Intent Check

N/A — this feature adds no public, indexable discovery page. It is entirely inside the authenticated/local application (`(app)` route group, Canvas, Graph view, Table view, Zen Mode).

### Bounded Responsibility Check

Files this feature is likely to touch that already exceed 500 lines (excluding tests):

| File                                                        | Lines | Still-single responsibility today                                                                                                                                                                                       | This feature's plan                                                                                                                                                                                                                                                                                                               |
| ----------------------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/lib/components/canvas/CanvasWorkspace.svelte` | 1261  | Canvas page shell, composing extracted `*Logic` hooks (`createCanvasLogic`, `useCanvasNodeRotation`, `useCanvasContextMenu`, `useCanvasFileImport`, etc.) — it already delegates behavior rather than owning it inline. | Add a new `useCanvasReportGeneration` hook module (sibling to the existing `use*` hooks) that owns report-panel state and the "Generate report" trigger; `CanvasWorkspace.svelte` only wires it in and renders the panel, exactly as it does for the existing hooks. No inline growth of the component's own logic.               |
| `apps/web/src/lib/components/canvas/EntityNode.svelte`      | 672   | Canvas node rendering, dispatching to per-variant card body components (`CharacterCardBody`, `FactionCardBody`, etc.).                                                                                                  | Not touched. Report generation reads vault entity/connection data directly (via the new package + a thin service), not through canvas node rendering.                                                                                                                                                                             |
| `apps/web/src/lib/components/zen/ZenHeader.svelte`          | 580   | Zen header: title, status and the entity's action buttons, already branching by entity characteristics (e.g. the existing draft-approve action).                                                                        | No rendering/tab changes at all (FR-013b forbids a report-specific view). The only addition is two conditional buttons — Regenerate, Export — shown when `entity.kind === "report"`, following the exact pattern of the draft-approve action; the behavior lives in `ReportZenActions.ts`. `ZenView.svelte` (667) is not touched. |
| `apps/web/src/lib/components/canvas/CanvasHUD.svelte`       | 570   | Canvas toolbar: board-level action buttons, each driven by an optional callback prop.                                                                                                                                   | One optional `onGenerateReport` prop and one button, the same shape as its existing action buttons; no logic, no state.                                                                                                                                                                                                           |
| `apps/web/src/routes/(app)/table/+page.svelte`              | 850   | Table route: filtering, sorting, counts, row list.                                                                                                                                                                      | Row selection already exists. Add only a "Generate report" button to the existing bulk-actions bar (one small markup block + one handler), with the input-mapping logic in a new `table-report-generation.ts` module, not inline in this file.                                                                                    |
| `apps/web/src/lib/components/GraphView.svelte`              | 923   | Cytoscape graph canvas and its interaction modes.                                                                                                                                                                       | Add a "Generate report" trigger wired to the existing Cytoscape multi-selection (`cy.$("node:selected")`, already used by `SelectionConnector.svelte`) via a new small component/hook, not inline logic growth.                                                                                                                   |

Every split above carries its own tests (Principle XIV.5) — new hook/module files get their own test files rather than inheriting coverage from the host component's existing tests.

## Project Structure

### Documentation (this feature)

```text
specs/166-canvas-entity-reports/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── entity-report-engine.md
└── tasks.md             # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
packages/entity-report-engine/        # NEW workspace package (Principle I)
├── src/
│   ├── index.ts                      # public exports
│   ├── types.ts                      # ReportOptions, ReportScope, ReportInput, ReportDocument, PresentationView types
│   ├── build-report.ts               # buildReport(input, options) -> ReportDocument (pure)
│   ├── presentation/
│   │   ├── character.ts              # renderCharacterSummary / renderCharacterDetail
│   │   ├── faction.ts                # renderFactionSummary
│   │   ├── relationship.ts           # renderRelationshipLine, renderRelationshipReference
│   │   └── generic.ts                # fallback presentation for other entity types
│   ├── content-hash.ts               # hashReportContent — one definition for "edited since generation"
│   └── markdown.ts                   # ReportDocument -> Markdown string (predictable heading grammar)
└── *.test.ts                         # colocated tests per module, TDD

apps/web/src/lib/services/
└── report-service.ts                 # ReportService (DI, mirrors DelveDossierServiceDeps):
                                       # save(...) -> Note-category entity (kind: "report", body in `content`, provenance in `report`),
                                       # regenerate(...), export(...) via ClipboardService

apps/web/src/lib/components/canvas/
└── canvas-report-generation.ts       # useCanvasReportGeneration hook (canvas entry point)

packages/schema/src/entity.ts          # + ReportProvenanceSchema and optional `report` field on EntitySchema (additive, no migration)
packages/vault-engine/src/services/GuestExporter.ts  # skip kind: "report" entities (FR-021)

apps/web/src/lib/components/reports/  # NEW
├── ReportPanel.svelte                # Scope/Include/Detail + live preview (shared by all 3 entry points)
├── ReportPreview.svelte              # PRE-SAVE preview only — renders a ReportDocument using
                                       # entity-report-engine's presentation views. Once saved, the
                                       # entity is opened in the standard ZenView like any note —
                                       # no equivalent "post-save" rendering component exists.
└── ReportZenActions.ts               # Regenerate/Export action definitions rendered by
                                       # ZenHeader.svelte for kind: "report" entities only

apps/web/src/lib/components/table/
└── table-report-generation.ts        # NEW: maps existing Table row selection -> ReportInput

apps/web/src/lib/components/graph/
└── graph-report-generation.ts        # NEW: Cytoscape-selection entry point (parallels canvas-report-generation.ts)
```

**Structure Decision**: Standard `apps/web` + `packages/*` monorepo layout already used throughout this repo (e.g. `generator-engine`, `stat-sheet-engine`). The new `packages/entity-report-engine` is the "library" half of Principle I; `apps/web` stays a thin caller (a `ReportService` + a handful of small, single-purpose Svelte components/hooks) rather than growing any of the five large files identified above.

## Complexity Tracking

_No unjustified Constitution violations — table intentionally empty._
