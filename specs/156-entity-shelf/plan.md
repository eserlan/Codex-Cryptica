# Implementation Plan: Entity Shelf

**Branch**: `feat/2101-entity-shelf` | **Date**: 2026-08-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/156-entity-shelf/spec.md`

## Summary

Authors move entities between vaults without leaving the application: select entities in one
vault, send them to the Shelf, switch vault, import. The transport is a pair of new
origin-level IndexedDB stores that every vault can read, since all vaults already share one
`CodexCryptica` database and one OPFS root.

The technical shape follows from three facts established in Phase 0. The vault's own
serialisation (`stringifyEntity`) is already lossless, so the shelf carries an entity record
verbatim rather than converting it. Import only ever creates and never overwrites, so
all-or-nothing behaviour reduces to journalled compensating deletes rather than a distributed
transaction. And the cross-tab event channel cannot carry blobs, so tabs exchange a bare
"changed" notification and re-read from storage.

All logic lands in a new `packages/entity-shelf` behind ports; `apps/web` supplies storage
adapters and UI.

## Technical Context

**Language/Version**: TypeScript 6.0.3 (TypeScript 7 on hold — see repository history)
**Primary Dependencies**: `idb` (IndexedDB wrapper), `js-yaml` (frontmatter), Svelte 5 runes;
no new third-party dependencies
**Storage**: IndexedDB `CodexCryptica` v22 → v23, two new non-vault-scoped stores; OPFS for
entity files and assets
**Testing**: Vitest — unit tests in `packages/entity-shelf`, component and store tests in
`apps/web`
**Target Platform**: Browsers with OPFS and IndexedDB; `BroadcastChannel` optional and
degraded gracefully
**Project Type**: Web application over workspace packages
**Performance Goals**: Ten entities with images shelve in under 5s and import in under 5s;
progress shown beyond 1s (SC-009)
**Constraints**: Entirely client-side, no network; blobs never cross the cross-tab channel;
import contains no user interaction after the conflict step (FR-016a)
**Scale/Scope**: Shelf holds a handful of entries at a time by design (FR-026); one new
package, two new IndexedDB stores, three existing UI surfaces extended

## Constitution Check

_GATE: evaluated against constitution v1.3.1 before Phase 0 and re-checked after Phase 1._

| Principle                      | Verdict                     | Notes                                                                                                                                                                                                                                                                                                                |
| ------------------------------ | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Library-First               | **PASS**                    | All logic in `packages/entity-shelf`; `apps/web` holds only adapters and UI.                                                                                                                                                                                                                                         |
| II. TDD                        | **PASS**                    | Port-based design makes every rule (titles, connections, conflicts, rollback) unit-testable without browser storage. Tests precede implementation.                                                                                                                                                                   |
| III. Simplicity & YAGNI / DRY  | **PASS**                    | Reuses `stringifyEntity`/`parseMarkdown`, `AssetManager`, `exportPresentationTemplate`, `CrossTabBroadcaster`. No zip, no serialisation format, no archive validation — the in-app route deletes that work rather than duplicating `vault-archive.ts`. One deliberate divergence recorded under Complexity Tracking. |
| IV. AI-First Extraction        | **N/A**                     | No Oracle involvement; this moves existing structured data.                                                                                                                                                                                                                                                          |
| V. Privacy & Client-Side       | **PASS (strongly aligned)** | Nothing leaves the browser at any point — no file, no network, no service.                                                                                                                                                                                                                                           |
| VI. Clean Implementation       | **PASS**                    | Svelte 5 runes and Tailwind 4 tokens per style guide; `bun run lint` and `bun run test` gate completion.                                                                                                                                                                                                             |
| VII. User Documentation        | **PASS (action required)**  | A `help-content.ts` entry is required, plus a `FeatureHint` — the shelf's browser-local nature (FR-024) is exactly the first-use guidance a hint exists for. Tracked as a task, not an afterthought.                                                                                                                 |
| VIII. Dependency Injection     | **PASS**                    | Ports injected via constructor with production defaults; class and singleton both exported, per ADR 007.                                                                                                                                                                                                             |
| IX. Natural Language           | **PASS**                    | "Shelf", "Send to Shelf", "Import from Shelf" — confirmed in clarification. No metaphor requiring explanation.                                                                                                                                                                                                       |
| X. Quality & Coverage          | **PASS**                    | New package must meet the 70% goal on introduction; pure logic behind ports makes that reachable.                                                                                                                                                                                                                    |
| XI. Agent Operational Protocol | **PASS**                    | Scope is the spec; no unrelated refactoring.                                                                                                                                                                                                                                                                         |
| XII. Labels Over Tags          | **PASS (action required)**  | See below.                                                                                                                                                                                                                                                                                                           |

### Principle XII — required correction

The spec's prose repeatedly enumerates "tags, labels" when describing what survives a round
trip (FR-004, SC-002). The `Entity` schema does carry both a `tags` and a `labels` field, and
FR-004's requirement that _nothing_ be lost means the `tags` field must still be preserved in
the data. But the constitution forbids exposing the term "Tags" to users.

**Action**: no user-facing string in this feature may say "tags". Import outcome summaries,
help content, hints and entry cards say "labels". The data-level field keeps its name; the
vocabulary does not surface. Spec prose will be corrected in the same pass.

This is a wording defect, not a design one — no requirement changes.

## Project Structure

### Documentation (this feature)

```text
specs/156-entity-shelf/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output — port contracts
│   └── ports.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
packages/entity-shelf/
├── src/
│   ├── index.ts                  # Public surface
│   ├── types.ts                  # ShelfEntry, ShelfGroup, ImportPlan, ImportOutcome
│   ├── ports.ts                  # ShelfStore, VaultReader, VaultWriter, Clock, IdFactory
│   ├── shelve.ts                 # Entity + dependencies -> ShelfEntry
│   ├── titles.ts                 # Collision detection and suffixing (FR-013a)
│   ├── connections.ts            # Batch-then-vault resolution, ambiguity (FR-017/018)
│   ├── templates.ts              # Conflict detection and resolution (FR-015/016/016a)
│   ├── import.ts                 # Planning, journalled write, rollback (FR-020)
│   └── *.test.ts                 # Co-located unit tests
└── package.json

apps/web/src/lib/
├── features/shelf/
│   ├── idb-shelf-store.ts        # ShelfStore port over IndexedDB
│   ├── web-shelf-vault.ts        # VaultReader/VaultWriter over OPFS + stores
│   └── shelf.svelte.ts           # Svelte store, cross-tab wiring, progress
├── components/shelf/
│   ├── ShelfPanel.svelte         # Flat list, newest first (FR-026)
│   ├── ShelfEntryCard.svelte     # Title, type, source vault, date (FR-022)
│   ├── TemplateConflictStep.svelte   # Single up-front resolution (FR-016a)
│   └── ImportOutcomeSummary.svelte   # Renames, templates, dropped edges (FR-019)
├── utils/idb.ts                  # v23 + shelf_entries, shelf_journal
└── config/help-content.ts        # Principle VII

# Existing surfaces extended (surgical additions only)
apps/web/src/lib/components/entity-detail/DetailHeader.svelte        # FR-001
apps/web/src/lib/components/table/TableContextMenu.svelte            # FR-002
apps/web/src/lib/components/graph/graph-context-menu-controller.svelte.ts  # FR-002
```

**Structure Decision**: A new workspace package for the logic, per Principle I, with browser
storage reached only through injected ports. The three existing UI surfaces gain a menu action
each and are otherwise untouched — the selection machinery they already have is what the
feature builds on, per the spec's Assumptions.

## Complexity Tracking

| Violation                                                        | Why Needed                                                                                                                                                                                                                                                                                    | Simpler Alternative Rejected Because                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Shelf import does not reuse `packages/importer`'s draft pipeline | `EntityDraft` carries no `statSheet`, `connections`, `soundBite`, `date`, `status`, `kind`, `visibility`, `languageProfile` or `imageArtDirection`. Routing native entities through it would silently discard the stat sheet — the reported motivation for the feature — in breach of FR-004. | Adding a `native` passthrough field to `EntityDraft` would put a field on a shared foreign-content contract that exactly one caller ever populates, and would drag the review-and-match pipeline (`findBySourceRef`, `associateDrafts`) into a flow that has neither foreign content nor a review step. That passthrough remains the right answer if file-based import is built later, where a dropped file genuinely must enter through review. |
| Two new IndexedDB stores rather than one                         | The journal's lifetime is a single import and a crashed import must be findable without scanning shelf contents.                                                                                                                                                                              | Folding the journal into `settings` as an untyped key/value would lose the type safety every other store in the database has, for no saving.                                                                                                                                                                                                                                                                                                     |

Nothing else in the design departs from the constitution.

## Phase 1 outputs

- [data-model.md](./data-model.md) — stored shapes, invariants, lifecycle
- [contracts/ports.md](./contracts/ports.md) — the four ports and their guarantees
- [quickstart.md](./quickstart.md) — build order and how to verify each slice
