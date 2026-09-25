# Implementation Plan: Session Journal (data model, persistence & lifecycle)

**Branch**: `163-session-journal` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/163-session-journal/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

First of four planned slices of the Session Journal feature (#3402, tracked as #3406). Delivers the `SessionJournal`/`JournalSection`/`JournalEntry` data model, IndexedDB persistence, and a start/resume/end lifecycle, surfaced only via a three-state control in the existing Quicknote/Scratchpad UI. Technical approach: pure lifecycle/validation/ordering logic extracted into a new `packages/session-journal-engine` workspace package (mirroring `packages/chronology-engine`'s split from `calendar.svelte.ts`), glued to a single `$state`-bearing `SessionJournalStore` in `apps/web` that persists to the existing shared `idb`-backed `CodexDB` (mirroring `calendar.svelte.ts`, not Quicknote's separate Dexie database). The store's entry-append API is shaped so slice 3 (#3408, automatic capture) can call it from an `AppEventBus` listener later without a breaking change.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 Runes, SvelteKit 2, Bun 1.3.14
**Primary Dependencies**: Existing `idb` (via `apps/web/src/lib/utils/idb.ts`), existing `vault-registry.svelte.ts`; no new third-party dependency. New internal workspace package `packages/session-journal-engine` (framework-free).
**Storage**: Browser-local IndexedDB, via the shared `CodexDB` schema (new `session_journals` object store, `by-vault` index) — not a new database, not Dexie.
**Testing**: Vitest. `session-journal-engine`: plain unit tests, no mocking. `session-journal.svelte.ts`: `getDB()` mocked with an in-memory fake, following `calendar.test.ts`.
**Target Platform**: Browser (existing SvelteKit web app), no server/API component.
**Project Type**: Web application feature — new workspace package + store + Svelte components within the existing `apps/web` app.
**Performance Goals**: No new measurable performance goal beyond SC-005 (adding a journal entry must not perceptibly slow down any other in-progress activity) — this is a small, low-frequency write path (manual notes only in this slice), well within the existing IndexedDB store's demonstrated headroom for similarly-sized records (`canvases`, `dice_history`).
**Constraints**: Must not alter or degrade Quicknote/Scratchpad's existing transient-note behavior (spec FR-015). Must not introduce a second, redundant persistence mechanism (research.md's Alternatives Considered).
**Scale/Scope**: Single vault's worth of journals at a time in the UI; no pagination requirement in this slice (a vault accumulates at most a few dozen journals per year of real play, well within an unpaginated `listJournals()`'s comfortable range).

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **I. Library-First** — PASS. Lifecycle/validation/ordering logic extracted into `packages/session-journal-engine`; `apps/web` store is a thin glue layer (see research.md, data-model.md).
- **II. TDD** — PASS (planned). `session-journal-engine`'s pure functions and `session-journal.svelte.ts`'s store methods each get unit tests before/alongside implementation; tasks.md will sequence tests ahead of or alongside their implementation per user story.
- **III. Simplicity & YAGNI** — PASS. No new third-party dependency; reuses the existing `idb` package and `vault-registry` pattern rather than introducing a new persistence library. Explicitly does not build the global indicator, automatic capture, or promote-to-entity in this slice (deferred to #3407–#3409, per spec).
- **IV. AI-First Extraction** — N/A. This slice has no Oracle/AI interaction.
- **V. Privacy & Client-Side Processing** — PASS. Fully browser-local (IndexedDB); no remote storage, no exception clauses invoked.
- **VI. Clean Implementation** — PASS (planned). `bun run lint:changed` / `bun run test:changed` and `svelte-check` will gate the PR per this repo's own AGENTS.md rules.
- **VII. User Documentation** — PASS (planned). A help-content entry for Session Journal will be added to `apps/web/src/lib/config/help-content.ts`, plus a `FeatureHint` given the multi-step nature (start → note → optional sections → end) — tracked as a task.
- **VIII. Dependency Injection** — PASS. `SessionJournalStore` takes `vaultRegistry` and DB access via constructor injection with production defaults, matching `QuickNoteStore`/`calendar.svelte.ts`.
- **IX. Natural Language** — PASS (planned). UI copy ("Start Session Journal" / "Open Session Journal" / "Resume Session Journal") already matches this principle's plain-language bar; no jargon introduced.
- **X. Quality & Coverage** — PASS (planned). New package targets the 70% goal for new logic extractions on introduction (Principle X).
- **XI. Agent Operational Protocol** — PASS. This plan states approach and assumptions explicitly (see spec.md Assumptions); scope is deliberately narrow (data model/persistence/lifecycle only).
- **XII. Labels Over Tags** — N/A. No tagging/categorization surface in this slice.

### Discovery Intent Check

N/A — this feature has no public, indexable discovery page. It is an authenticated, in-app tool surface (Quicknote/Scratchpad), not `/for`, `/answers`, `/examples`, `/solutions`, `/vs`, `/import`, a generator/tool landing page, or an evergreen reference post.

### Bounded Responsibility Check

- [x] Files this feature will touch that already exceed 500 lines are listed, excluding tests and data-only modules.
- [x] For each, either the single responsibility it still holds is named, or a decomposition is planned as part of this work.
- [x] New behaviour that does not belong to a listed file's existing responsibility has an extraction target.
- [x] Any planned split carries its tests across, or gains its own.

None of the files this feature touches exceed 500 lines: `QuickNoteScratchpad.svelte` (178), `quicknote.svelte.ts` (423), `vault-registry.svelte.ts` (162, read-only — not modified), `idb.ts` (453, gaining one guarded object-store block, consistent with how every other store was added). The gate does not trigger. Worth noting for future review: `idb.ts` is approaching the 500-line trigger — if the _next_ feature after this one adds another object store, it may cross the line and warrant decomposing the schema definitions from the `upgrade()` migration logic at that point (not this one, per Principle XIV.2's "cost is paid only when the file is already being edited [past the trigger]").

## Project Structure

### Documentation (this feature)

```text
specs/163-session-journal/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── session-journal-store-api.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
packages/session-journal-engine/
├── package.json          # mirrors packages/chronology-engine's shape
├── src/
│   ├── types.ts           # SessionJournal, JournalSection, JournalEntry, JournalEntryInput
│   ├── engine.ts           # startOrResumeJournal, endJournal, appendEntry, createSection,
│   │                       # renameSection, validateSectionName — pure, no I/O
│   └── index.ts            # re-exports
└── tests/
    └── engine.test.ts

apps/web/src/lib/
├── stores/
│   ├── session-journal.svelte.ts       # $state + DI + idb.ts persistence + engine calls
│   └── session-journal.test.ts          # mocks getDB(), follows calendar.test.ts
├── utils/
│   └── idb.ts                           # +session_journals object store, +by-vault index
└── components/quicknote/
    ├── QuickNoteScratchpad.svelte        # +three-state Start/Open/Resume control
    ├── SessionJournalView.svelte          # new: entry list, add-note field, sections
    └── SessionJournalView.test.ts
```

**Structure Decision**: New pure-logic package `packages/session-journal-engine` (Constitution I), thin store glue in `apps/web/src/lib/stores/session-journal.svelte.ts` persisting through the existing shared `idb.ts` schema, and UI additions confined to the existing `apps/web/src/lib/components/quicknote/` directory (no new top-level UI area — this slice is explicitly Quicknote-only per spec scope; the global indicator is #3407's job).

## Complexity Tracking

_No Constitution Check violations — this section is not needed._
