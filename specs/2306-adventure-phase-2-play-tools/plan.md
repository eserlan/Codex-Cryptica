# Implementation Plan: Oracle Adventure Mode — Phase 2: Play Tools & Session Control

**Branch**: `2306-adventure-phase-2-play-tools` | **Date**: 2026-08-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/2306-adventure-phase-2-play-tools/spec.md`

## Summary

Extend the shipped Phase 1 Solo Adventure Foundation (`160-solo-adventure-mode`,
PR #2311) with player-facing session-control tools that Phase 1 explicitly
deferred: archive management (rename, duplicate, search, and explicit resume
of an archived adventure), an on-demand recap and visible-state inspection
view, an explicit player-visible-state correction path, optional dice
presets and roll history, optional named resource counters, and hardening
of context pinning / hidden-state exclusion under long-session transcript
summarisation.

No new workspace package is introduced. `packages/adventure-engine` gains
new pure domain operations (state correction, dice preset, roll history
derivation, resource counter mutation) and a `schemaVersion: 2` persisted
shape that is backward-compatible with Phase 1's `schemaVersion: 1`
sessions. `AdventureSessionRepository` gains `rename` and `duplicate`
(archive `search` stays a pure client-side filter; `deleteArchived` already
exists). Recap and visible-state inspection are deterministic, client-side
renders of already-committed state — no new model call — keeping them fully
offline-capable and avoiding a second source of truth for "what the player
currently knows."

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5.55.9 Runes, SvelteKit 2, Bun 1.3.14
**Primary Dependencies**: Existing `@codex/adventure-engine`, `@codex/ai-engine` (`AdventureTurnGenerationService`), `@codex/oracle-engine`, `dice-engine`, `schema`/Zod, `idb`; no new third-party dependency
**Storage**: Extends the existing one-document-per-session OPFS layout (`.codex/adventures/<session-id>.json`, `AdventureSessionRepository`) with a `schemaVersion: 2` shape adding optional `dicePresets`, `resourceCounters`, and per-turn `resolvedRoll` fields; a `schemaVersion: 1` document loads unchanged with these fields defaulted empty/absent
**Testing**: Vitest/Bun unit tests for new `adventure-engine` operations and repository methods, Svelte Testing Library for new/updated components, Playwright journeys for rename/duplicate/search/resume, correction-vs-in-flight-turn race, and long-session summarisation leak checks
**Target Platform**: Same as Phase 1 — existing supported modern browsers with OPFS/IndexedDB; all Phase 2 capabilities except recap-if-model-backed (not used here — recap is deterministic) work fully offline against committed state
**Project Type**: Web application — extends the existing `packages/adventure-engine` workspace engine plus `apps/web` adapters/UI; no new workspace package
**Performance Goals**: On the standard release acceptance profile (current stable supported browser, ≥4 logical CPUs, 8 GB RAM, warmed production build): archive search/filter over 25+ entries renders in under 100 ms; rename/duplicate/delete complete in under 10 seconds of non-model time (SC-001); recap and visible-state inspection render from already-loaded state with no additional network round trip
**Constraints**: Local-first, same as Phase 1; state corrections apply only to player-visible state and go through the same optimistic-concurrency `revision` check already used by `save`/`archive`/`deleteArchived`, so a correction racing an in-flight turn commit is rejected rather than silently overwritten (FR-010); duplicate produces a fully independent document (no shared references) so mutating one adventure never touches the other (FR-002); resource counters carry no game-system semantics — plain named numeric values only (FR-013)
**Scale/Scope**: Builds on Phase 1's scale envelope (one effective active session, no product-imposed archive cap); Phase 2 acceptance profile adds a 25-adventure archive for search/rename/duplicate testing and a long-session summarisation test exceeding the bounded context window from `context-budget.ts`

## Constitution Check

_GATE: passed before Phase 0; re-checked after Phase 1 design._

| Principle                      | Status | How                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Library-First               | PASS   | New domain logic (state correction validation, dice preset CRUD, roll-history derivation, resource-counter mutation) lands in `packages/adventure-engine` as pure functions, not inline in `apps/web`. Recap/inspection rendering is presentational only.                                                                                                                              |
| II. TDD                        | PASS   | New reducer/repository/preset/counter behavior gets failing tests first, each with a success path and a meaningful failure path (e.g., stale-revision correction rejected, delete without confirmation blocked).                                                                                                                                                                       |
| III. Simplicity & YAGNI        | PASS   | Roll history is derived from existing `CommittedAdventureTurn` records (a new `resolvedRoll` field captured at commit time) rather than a duplicated list. Recap is a deterministic template over existing visible state rather than a new AI call, avoiding new cost, latency, and a second source of truth. Archive search stays a client-side filter, not a new indexing subsystem. |
| IV. AI-First Extraction        | PASS   | No new AI surface is introduced; Phase 2 tools operate on already-generated, already-validated state.                                                                                                                                                                                                                                                                                  |
| V. Privacy & Client-Side       | PASS   | Everything stays local-first; duplicate/rename/search/recap/inspection/correction/presets/counters never leave the device. Corrections are explicitly scoped away from owner-hidden GM state (FR-009).                                                                                                                                                                                 |
| VI. Clean Implementation       | PASS   | Svelte 5 runes, Tailwind 4 tokens, `bun run lint`, `bun run test` remain explicit gates for all new UI (archive toolbar, recap panel, correction form, dice-preset/roll-history/resource-counter UI).                                                                                                                                                                                  |
| VII. User Documentation        | PASS   | Extend the existing Adventure Mode help content with archive-management, recap, correction, and resource-tracking guidance; a `FeatureHint` on first use of state correction, since silently allowing it without explanation risks eroding trust in "hidden state stays hidden."                                                                                                       |
| VIII. Dependency Injection     | PASS   | New repository methods and engine operations take the same injected clock/id/storage dependencies already used by `AdventureSessionRepository` and `adventure-engine`; production singletons remain exported alongside classes.                                                                                                                                                        |
| IX. Natural Language           | PASS   | UI language stays plain: "Rename", "Duplicate", "Resume", "Recap", "Fix this", "Roll history", "Track a resource" — no protocol or schema terminology surfaces to the player.                                                                                                                                                                                                          |
| X. Quality & Coverage          | PASS   | New `adventure-engine` operations target the package's existing ≥70% engine floor; new repository/store code targets the ≥50% store floor.                                                                                                                                                                                                                                             |
| XI. Agent Operational Protocol | PASS   | Phase 2 touches only the adventure surface (`adventure-engine`, `services/adventure`, `stores/oracle/adventure-manager.svelte.ts`, `components/oracle/adventure/*`); no unrelated refactor of `OracleChatManager` or vault schema.                                                                                                                                                     |
| XII. Labels Over Tags          | PASS   | Archive search matches title/premise text; no new tag/label vocabulary is introduced.                                                                                                                                                                                                                                                                                                  |

**Post-Phase 1 design re-check**: still passing. `schemaVersion: 2` is additive-only (new optional fields), so no migration script or dual-write is required — Phase 1 documents remain valid Phase 2 documents on load. No new durable store or third-party dependency was added during design.

## Project Structure

### Documentation (this feature)

```text
specs/2306-adventure-phase-2-play-tools/
├── plan.md
├── spec.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── adventure-archive-management.md
│   └── adventure-session-tools.md
├── checklists/
│   └── requirements.md
└── tasks.md                         # Phase 2 of speckit: created by /speckit-tasks, not here
```

### Source Code (repository root)

```text
packages/adventure-engine/src/
├── types.ts                        # EXTENDED: CommittedAdventureTurn.resolvedRoll,
│                                    #   AdventureSession.dicePresets/resourceCounters,
│                                    #   StateCorrection, DicePreset, ResourceCounter types
├── schemas.ts                      # EXTENDED: schemaVersion 2 Zod schema, v1→v2 loader (additive-only)
├── reducer.ts                      # EXTENDED: applyStateCorrection (visible-state-only,
│                                    #   revision-checked), resource-counter mutation
└── tests/                          # EXTENDED: correction, preset, counter, v1-load-under-v2 coverage

apps/web/src/lib/services/adventure/
├── adventure-session-repository.ts # EXTENDED: rename(), duplicate(); deleteArchived() reused for FR-004
└── adventure-session-repository.test.ts

apps/web/src/lib/stores/oracle/
└── adventure-manager.svelte.ts     # EXTENDED: recap/inspection derived state, correction/preset/
                                     #   counter actions, resume-archived-as-active orchestration
                                     #   (reuses the existing single-active-adventure rule)

apps/web/src/lib/components/oracle/adventure/
├── AdventureArchive.svelte         # EXTENDED: rename, duplicate, search box, resume-when-archived
├── AdventureStateSummary.svelte    # EXTENDED: recap view, visible-state inspection
├── AdventureCorrectionForm.svelte  # NEW: explicit visible-state correction UI
├── AdventureRollHistory.svelte     # NEW: dice presets + chronological roll history
└── AdventureResourceCounters.svelte # NEW: named resource counter tracker

apps/web/src/lib/config/help-content.ts  # EXTENDED: archive management, recap, correction,
                                          #   resource-tracking help entries

apps/web/tests/
└── adventure-mode-phase2-*.spec.ts # NEW: rename/duplicate/search/resume, correction-vs-in-flight
                                     #   race, long-session summarisation leak check
```

**Structure Decision**: No new workspace package. All new domain rules
(correction validation, preset/counter mutation, roll-history derivation,
additive schema migration) extend `packages/adventure-engine`, preserving
Phase 1's boundary that adventure correctness logic lives in the engine, not
`apps/web`. `AdventureManager` (`stores/oracle/adventure-manager.svelte.ts`)
remains the sole app-side orchestrator; it composes the extended repository
and engine rather than growing new domain logic itself, consistent with
Phase 1's decision to keep `OracleStore`/`OracleChatManager` free of
Adventure-specific behavior.

## Key Design Decisions

Full reasoning and rejected alternatives are in [research.md](./research.md).

- Recap and visible-state inspection are deterministic, client-side renders
  of committed state — not a new AI call — so they are instant, free, and
  offline by construction, and cannot themselves introduce a hidden-state
  leak surface.
- Roll history is derived from a new `resolvedRoll` snapshot captured on
  `CommittedAdventureTurn` at the moment a pending roll resolves, rather than
  a separately persisted list, avoiding a second source of truth for the
  same data.
- State correction reuses Phase 1's existing optimistic-concurrency
  `revision` field rather than introducing a new locking mechanism; a
  correction submitted against a stale revision is rejected with a clear
  "the session changed, review and retry" message.
- `schemaVersion` moves from `1` to `2` with purely additive optional
  fields, so no migration pass or dual-write period is needed — the loader
  simply defaults absent Phase 2 fields when reading a `v1` document.
