# Implementation Plan: Session Journal (data model, persistence & lifecycle)

**Branch**: `163-session-journal` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/163-session-journal/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

First of four planned slices of the Session Journal feature (#3402, tracked as #3406). Delivers the `SessionJournal`/`JournalSection`/`JournalEntry` data model, IndexedDB persistence, and a start/resume/end lifecycle, surfaced only via a three-state control in the existing Quicknote/Scratchpad UI. Technical approach: pure lifecycle/validation/ordering logic extracted into a new `packages/session-journal-engine` workspace package (mirroring `packages/chronology-engine`'s split from `calendar.svelte.ts`), glued to a single `$state`-bearing `SessionJournalStore` in `apps/web` that persists to the existing shared `idb`-backed `CodexDB` (mirroring `calendar.svelte.ts`, not Quicknote's separate Dexie database). The store's entry-append API is shaped so slice 3 (#3408, automatic capture) can call it from an `AppEventBus` listener later without a breaking change.

This slice also wires session journals into the existing cloud backup feature (FR-016/FR-017): the personal, opt-in cloud backup a vault can already enable now includes journals in its snapshot and restore, alongside entities/maps/canvases, with the consent screen updated to say so. This does **not** extend to the separate guest/player-facing vault export, which stays exactly as it is today.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 Runes, SvelteKit 2, Bun 1.3.14
**Primary Dependencies**: Existing `idb` (via `apps/web/src/lib/utils/idb.ts`), existing `vault-registry.svelte.ts`; no new third-party dependency. New internal workspace package `packages/session-journal-engine` (framework-free). Existing `packages/cloud-backup-sync` (bundle/delta payload shape) and `apps/web/src/lib/stores/cloud-backup.svelte.ts` (restore wiring) for FR-016.
**Storage**: Browser-local IndexedDB, via the shared `CodexDB` schema (new `session_journals` object store, `by-vault` index) — not a new database, not Dexie.
**Testing**: Vitest. `session-journal-engine`: plain unit tests, no mocking. `session-journal.svelte.ts`: `getDB()` mocked with an in-memory fake, following `calendar.test.ts`.
**Target Platform**: Browser (existing SvelteKit web app), no server/API component.
**Project Type**: Web application feature — new workspace package + store + Svelte components within the existing `apps/web` app.
**Performance Goals**: No new measurable performance goal beyond SC-005 (adding a journal entry must not perceptibly slow down any other in-progress activity) — this is a small, low-frequency write path (manual notes only in this slice), well within the existing IndexedDB store's demonstrated headroom for similarly-sized records (`canvases`, `dice_history`).
**Constraints**: Must not alter or degrade Quicknote/Scratchpad's existing transient-note behavior (spec FR-015). Must not introduce a second, redundant persistence mechanism (research.md's Alternatives Considered). Cloud backup inclusion (FR-016) must reuse the existing opt-in cloud backup feature's payload/restore/consent surface rather than a parallel sync path, and must not appear in the separate guest/player-facing vault export (FR-016).
**Scale/Scope**: Single vault's worth of journals at a time in the UI; no pagination requirement in this slice (a vault accumulates at most a few dozen journals per year of real play, well within an unpaginated `listJournals()`'s comfortable range).

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **I. Library-First** — PASS. Lifecycle/validation/ordering logic extracted into `packages/session-journal-engine`; `apps/web` store is a thin glue layer (see research.md, data-model.md).
- **II. TDD** — PASS (planned). `session-journal-engine`'s pure functions and `session-journal.svelte.ts`'s store methods each get unit tests before/alongside implementation; tasks.md will sequence tests ahead of or alongside their implementation per user story.
- **III. Simplicity & YAGNI** — PASS. No new third-party dependency; reuses the existing `idb` package and `vault-registry` pattern rather than introducing a new persistence library. Explicitly does not build the global indicator, automatic capture, or promote-to-entity in this slice (deferred to #3407–#3409, per spec).
- **IV. AI-First Extraction** — N/A. This slice has no Oracle/AI interaction.
- **V. Privacy & Client-Side Processing** — PASS. Journal data is fully browser-local by default (IndexedDB); no remote storage happens unless the user has separately, previously opted into this vault's cloud backup — a pre-existing feature that already satisfies all six conditions of the Narrow Exception. This slice does not invoke the exception itself; it extends an already-compliant surface with one more data type, and re-affirms each condition still holds with journals included: (1) off by default — journals back up only if cloud backup is already enabled, never on their own; (2) informed consent — the consent screen copy is updated to name session journals among what is stored (FR-016), so nothing new is stored silently; (3) reversible — disabling/deleting the existing backup already covers everything in it, journals included, with no separate control needed; (4) local remains authoritative — the store's local IndexedDB copy is unaffected by backup/restore either way; (5) no onward sharing — journals flow through the exact same upload path as entities/maps/canvases, which already satisfies this; (6) internal access — support access to a backup already covers its full content, journals included, under the existing disclosure.
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

Files under 500 lines (gate does not trigger): `QuickNoteScratchpad.svelte` (178), `quicknote.svelte.ts` (423), `vault-registry.svelte.ts` (162, read-only — not modified), `idb.ts` (453, gaining one guarded object-store block, consistent with how every other store was added; worth flagging that it's approaching the trigger for whichever future feature adds the _next_ object store, not this one).

Files over 500 lines, touched only for FR-016 (cloud backup inclusion) — each named per its still-held single responsibility, with the change confined to that responsibility (Principle XIV.1/XIV.3), not a new concern:

- `packages/cloud-backup-sync/src/cloud-backup-sync.ts` (920 lines) — responsibility: "build, parse, and reconcile a cloud backup bundle/delta." Adding a `sessionJournals` field alongside the existing `maps`/`canvases` optional bundle fields is the same category of change as those, not a new responsibility. No split planned.
- `apps/web/src/lib/stores/cloud-backup.svelte.ts` (1,162 lines) — responsibility: "client-side orchestration of one vault's cloud backup lifecycle" (enable/disable/attach/backup/restore/auto-sync/conflict-resolution — one class, one cohesive concept per its own method list, not several unrelated concerns). Adding an `importSessionJournals` restore-dependency hook follows the exact existing `importMaps`/`importCanvases` pattern. This file is already known to be over any reasonable line-count budget (flagged in PR #3404's own Fallow audit caveat, pre-existing and unrelated to that PR too) and is a fair decomposition candidate on its own merits — but splitting a 1,162-line file is disproportionate to this slice's one-hook addition and would violate Principle XI.3 (surgical changes only). No split planned as part of this slice; noted here for whichever future change takes on `cloud-backup.svelte.ts` as its primary subject.
- `apps/web/src/lib/components/settings/CloudBackupSettings.svelte` (530 lines) — responsibility: "cloud backup settings UI and consent copy." The FR-016 change is a copy-text update (naming session journals among what's stored), not new behavior. No split planned.
- `apps/web/src/lib/app/init/app-init.ts` (910 lines) — responsibility: "wire production dependencies into stores at app startup." Adding `sessionJournals: sessionJournalStore.allJournals` to the existing `buildPayload` call's third argument is one line, following the existing `maps`/`canvases` wiring immediately above it. No split planned.

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
│   ├── session-journal.test.ts          # mocks getDB(), follows calendar.test.ts
│   └── cloud-backup.svelte.ts           # +importSessionJournals restore hook (FR-016)
├── utils/
│   └── idb.ts                           # +session_journals object store, +by-vault index
├── app/init/
│   └── app-init.ts                      # +sessionJournals in buildPayload wiring (FR-016)
└── components/
    ├── quicknote/
    │   ├── QuickNoteScratchpad.svelte      # +three-state Start/Open/Resume control
    │   ├── QuickNoteScratchpad.test.ts      # existing suite, extended for the new control
    │   ├── SessionJournalView.svelte        # new: entry list, add-note field, sections
    │   └── SessionJournalView.test.ts
    └── settings/
        └── CloudBackupSettings.svelte      # consent copy: name session journals (FR-016)

apps/web/src/lib/config/
└── help-content.ts                        # +Session Journal entry (Constitution VII)

packages/cloud-backup-sync/src/
└── cloud-backup-sync.ts                   # +sessionJournals bundle/delta field (FR-016)
```

**Structure Decision**: New pure-logic package `packages/session-journal-engine` (Constitution I), thin store glue in `apps/web/src/lib/stores/session-journal.svelte.ts` persisting through the existing shared `idb.ts` schema, and UI additions confined to the existing `apps/web/src/lib/components/quicknote/` directory (no new top-level UI area — this slice is explicitly Quicknote-only per spec scope; the global indicator is #3407's job). Cloud backup inclusion (FR-016) is wired entirely through existing extension points in `cloud-backup-sync`, `cloud-backup.svelte.ts`, `app-init.ts`, and `CloudBackupSettings.svelte` — no new backup mechanism, no new consent flow.

## Complexity Tracking

_No Constitution Check violations — this section is not needed._
