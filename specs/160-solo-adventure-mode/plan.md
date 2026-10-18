# Implementation Plan: Solo Adventure Mode Foundation

**Branch**: `160-solo-adventure-mode` | **Date**: 2026-08-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/160-solo-adventure-mode/spec.md`

## Summary

Add a persistent, system-light Adventure Mode to Oracle in which one player
character explores the current vault while Oracle acts as GM. Adventure play
uses canonical vault records as anchors, keeps provisional inventions inside
the session, separates player-visible state from owner-hidden GM state, pauses
for meaningful rolls, and resumes from the latest fully committed turn.

The implementation centers on a new `packages/adventure-engine` workspace
package. It owns the versioned domain model, structured turn contract,
validation, hidden-state boundary, deterministic reducer, and turn state
machine. The web app remains a thin adapter for OPFS persistence, campaign
context retrieval, AI generation, dice, cross-tab control, and Svelte UI.
Each adventure is one authoritative versioned JSON file under the vault's
existing `.codex` metadata directory, so backup and restore include it without
a second persistence system. AI calls use the existing stateless,
provider-neutral `structured-generation` operation rather than the Interactions API;
the locally persisted state and bounded prompt are the sole continuity source.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5.55.9 Runes, SvelteKit 2, Bun 1.3.14
**Primary Dependencies**: Existing `@codex/ai-engine`, `@codex/oracle-engine`, `@codex/vault-engine`, `dice-engine`, `schema`/Zod, `idb`/Dexie, and `@codex/events`; no new third-party dependency
**Storage**: One versioned JSON document per session at `.codex/adventures/<session-id>.json`; transient cross-tab lease in existing IndexedDB `appSettings`; vault records remain canonical Markdown/metadata
**Testing**: Vitest/Bun unit and integration tests, Svelte Testing Library component tests, Playwright multi-tab/reload/backup/performance journeys, pure evaluation scorers plus an app-side configured-provider evaluation runner
**Target Platform**: Existing supported modern browsers with OPFS and IndexedDB; online generation with offline-readable sessions, preserved drafts/outcomes, and reconnect retry
**Project Type**: Web application — standalone workspace engine plus thin SvelteKit adapters and UI
**Performance Goals**: On a warmed production build in the release acceptance profile (current stable supported browser, at least 4 logical CPUs and 8 GB RAM), restore a representative 100-turn active session in under 2 seconds without AI; show submit/roll busy feedback within 16 ms before network work; validate and reduce a turn at p95 under 50 ms excluding model and OPFS latency; keep non-model start-flow time below 2 minutes
**Constraints**: Local-first; exactly one effective active session per vault and one controlling tab; no partial turn commit; hidden state never enters player-facing surfaces or normal Oracle prompts; no automatic Oracle discovery/archive; no canonical vault mutation; serialized compact state is capped at 32,000 characters and total generation input at 96,000 characters so complete state always fits a bounded prompt
**Scale/Scope**: One effective active session, preserved read-only recovery conflicts, and no product-imposed cap on the read-only archive; the Phase 1 performance acceptance range is 25 archived sessions and 100 turns/session, with a 30-turn coherence baseline and exactly one player-controlled character

## Constitution Check

_GATE: passed before Phase 0; re-checked after Phase 1 design._

| Principle                      | Status | How                                                                                                                                                                                                                                |
| ------------------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Library-First               | PASS   | `packages/adventure-engine` owns the domain model, reducer, validators, prompt input/output contracts, and state machine. Browser storage, context retrieval, AI transport, dice, and UI remain injected adapters.                 |
| II. TDD                        | PASS   | Implement contract schemas/reducer/lease/persistence behind failing tests first. Every affected behavior includes success and failure/cancellation coverage.                                                                       |
| III. Simplicity & YAGNI        | PASS   | Reuses existing structured generation, vault OPFS, context retrieval, dice, event, and Dexie facilities. One authoritative file avoids a transactional index. Phase 2 archive management and canonical write-back remain deferred. |
| IV. AI-First Extraction        | PASS   | Oracle returns a provider-neutral structured envelope validated twice: at the proxy and by `adventure-engine` before any state mutation.                                                                                           |
| V. Privacy & Client-Side       | PASS   | The vault is the only durable source of truth. Adventure uses the stateless operation pipeline rather than an Interactions thread; prompts contain only bounded turn context. Hidden state is never logged or sent to normal chat. |
| VI. Clean Implementation       | PASS   | Svelte 5 runes, Tailwind 4 semantic tokens, Iconify utilities, data-safety patterns, `bun run lint`, and `bun run test` are explicit gates.                                                                                        |
| VII. User Documentation        | PASS   | Add plain-language Adventure Mode help and a first-use `FeatureHint`, including the explicit “hidden, not encrypted” disclosure.                                                                                                   |
| VIII. Dependency Injection     | PASS   | Engine ports and app services accept storage, clock, id, generation, context, dice, lease, and notification dependencies through constructors; classes and production singletons are exported.                                     |
| IX. Natural Language           | PASS   | UI uses “Adventure”, “Continue”, “End adventure”, “Waiting for a roll”, and “Read-only in this tab”; no protocol terminology is exposed.                                                                                           |
| X. Quality & Coverage          | PASS   | New engine targets at least 70% coverage; critical reducers, isolation guards, persistence recovery, and lease arbitration receive branch-focused tests.                                                                           |
| XI. Agent Operational Protocol | PASS   | Work is split into independently verifiable slices. No normal Oracle, vault schema, or archive-management refactor beyond the integration seams required here.                                                                     |
| XII. Labels Over Tags          | PASS   | The feature introduces no categorization vocabulary and no `tags` field.                                                                                                                                                           |

**Post-Phase 1 re-check**: still passing. The design adds one focused workspace
package but no third-party dependency or new durable database. The transient
cross-tab lease reuses `appSettings`; the durable session remains in the vault.
Provider-retained interaction state was deliberately rejected because it would
duplicate the local session source of truth and complicate isolation, recovery,
and privacy.

## Project Structure

### Documentation (this feature)

```text
specs/160-solo-adventure-mode/
├── plan.md
├── spec.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── adventure-engine.md
│   ├── adventure-storage.md
│   └── adventure-turn-generation.md
├── checklists/
│   └── requirements.md
└── tasks.md                         # Phase 2: created by /speckit-tasks, not here
```

### Source Code (repository root)

```text
packages/adventure-engine/
├── package.json
├── src/
│   ├── index.ts
│   ├── types.ts                    # Session, state, turn, source, roll types
│   ├── schemas.ts                  # Versioned Zod persistence/output schemas
│   ├── state-machine.ts            # idle/generating/awaiting-roll/committing/error
│   ├── reducer.ts                  # Pure validate-and-apply transaction
│   ├── hidden-state.ts             # Reveal handling and leakage checks
│   ├── context-budget.ts           # Deterministic bounded prompt selection
│   └── prompt.ts                   # Provider-neutral system/input construction
└── tests/

packages/ai-engine/src/
├── adventure-turn-generation.service.ts  # NEW: structured-generation adapter
└── index.ts                               # EXTENDED: export service/contracts

packages/oracle-engine/src/
├── oracle-generator.ts             # EXTENDED: explicit normal-chat context key
└── tests/                           # EXTENDED: normal/adventure isolation tests

apps/web/src/lib/
├── services/adventure/
│   ├── adventure-session-repository.ts   # OPFS list/load/save/archive
│   ├── adventure-context-service.ts      # Anchors + action-relevant records
│   ├── adventure-control-lease.ts        # Foundational atomic IndexedDB authority
│   ├── adventure-control-coordinator.ts  # Heartbeat, lifecycle, BroadcastChannel
│   └── adventure-evaluation-runner.ts    # Configured-provider behavioral runner
├── stores/oracle/
│   └── adventure-manager.svelte.ts       # Reactive orchestration, constructor DI
├── stores/oracle.svelte.ts               # EXTENDED: expose manager, no domain logic
├── workers/oracle.worker.ts               # EXTENDED: dedicated generation method
├── components/oracle/adventure/
│   ├── AdventureStart.svelte
│   ├── AdventurePlay.svelte
│   ├── AdventureStateSummary.svelte
│   ├── AdventureRollPrompt.svelte
│   ├── AdventureArchive.svelte
│   └── AdventureTranscript.svelte
└── config/help-content.ts                 # EXTENDED: help + privacy disclosure

apps/web/tests/
├── adventure-mode-*.spec.ts        # Start, resume, roll, isolation, two-tab paths
└── performance/adventure-mode.spec.ts
```

**Structure Decision**: A new workspace engine is warranted because state
transition, reveal safety, prompt contracts, and validation are reusable domain
logic and constitute the feature's correctness boundary. The app-specific
`AdventureManager` composes existing browser and Oracle facilities; it does not
expand `OracleChatManager` or put domain logic in the facade.

## Key Design Decisions

Full reasoning and rejected alternatives are in [research.md](./research.md).

1. **Local session state is authoritative** (R1). Adventure uses the stateless
   operation pipeline—not an Interactions request—and each request supplies
   bounded canonical context, compact state, pending input, and recent transcript.
2. **One versioned JSON file per adventure** (R2). No authoritative index and no
   multi-file turn transaction. Archive metadata is derived from session files.
3. **A pure reducer is the commit boundary** (R3). Generation returns narration,
   explicit patches, source references, and either completion or a roll request.
   Only a fully parsed, invariant-safe envelope can produce the next session.
4. **Roll requests are persisted pauses, not half-committed fiction** (R4).
   A supplied outcome is saved on the pending roll before resolution, survives
   offline/failure retry, is sent authoritatively, and moves to one committed turn.
5. **Hidden state has typed secret records and explicit reveal IDs** (R5).
   Unrevealed secret canaries are checked across every player-facing field before
   commit. Semantic leakage is additionally covered by prompt evaluations.
6. **Canonical and provisional knowledge remain separate** (R6). Anchored and
   retrieved records are read live by ID; inventions only enter session state.
   No drafting, discovery, archive, or entity write path is invoked.
7. **Cross-tab control separates authority from coordination** (R7). The atomic
   IndexedDB lease is foundational and available to every commit path; a later
   coordinator adds heartbeat, lifecycle release, and observer broadcasts.
8. **Adventure is its own Oracle manager and worker method** (R8), preventing
   ordinary chat history, retained context, and automatic discovery from being
   reused accidentally.
9. **The prompt budget is deterministic and finite** (R9): state schemas enforce
   a 32,000-character aggregate ceiling, while the 96,000-character request
   budget reserves space for behavior, input, anchors, retrieval, and transcript.

## Delivery Order

1. Create `adventure-engine` bounded schemas, state machine, reducer,
   hidden-state guard, and fixtures through TDD.
2. Add the OPFS repository plus the atomic lease authority required by every
   commit path; add browser heartbeat/broadcast coordination with resume work.
3. Add the structured-generation adapter and dedicated worker method; prove
   ordinary Oracle history/discovery isolation before UI integration.
4. Add canonical context composition and missing/changed-source handling.
5. Exercise the authority and coordinator together with deterministic cross-tab
   arbitration, observer-refresh, lifecycle-release, and takeover tests.
6. Add `AdventureManager` and the start/play/resume/roll/archive Svelte surfaces.
7. Add help, accessibility, privacy disclosure, offline recovery, explicit
   performance budgets, and the configured-provider evaluation runner, then run
   full lint/test/build gates.

## Risks

| Risk                                                | Mitigation                                                                                                                                                                                  |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Model returns valid JSON with an invalid transition | Proxy schema + local Zod parsing + pure invariant checks; never mutate the live object before save succeeds.                                                                                |
| Secret appears in player-facing text                | Separate typed state, explicit reveal IDs, normalized canary scan over every visible field, negative fixtures, and semantic evaluation set.                                                 |
| OPFS write fails after generation                   | Compute a candidate session, persist it, then publish it to reactive UI; retain the previous object and offer retry on failure.                                                             |
| Two tabs submit concurrently                        | Atomic Dexie lease transaction, owner token on commands, heartbeat/expiry, serialized per-owner submissions, and multi-page Playwright tests.                                               |
| Large lore exceeds model context                    | Fixed priority budget; full compact state is never dropped, while source excerpts and transcript are deterministically trimmed.                                                             |
| Compact state grows until it cannot fit             | Schemas cap individual fields and aggregate serialized state at 32,000 characters; post-patch overflow rejects atomically with a safe retry that asks Oracle to consolidate existing facts. |
| A source record changes or disappears               | Resolve by ID each turn, include current content only, record unavailable status, and never reuse cached lore as current canon.                                                             |
| Structured provider behavior differs                | Use the existing provider-neutral operation and JSON Schema; contract fixtures exercise each configured structured-output provider path.                                                    |
| Long sessions make single-file rewrites expensive   | Prompting is bounded; persistence is measured with representative 100-turn sessions. Split storage is deferred unless profiling fails the restore/write budgets.                            |

## Complexity Tracking

No constitution violations require justification. The new engine package and
lease service are the minimum boundaries needed for state safety and exact
single-writer behavior. A server-retained interaction, an authoritative archive
index, resumable archived sessions, canonical write-back, and a hidden-state
editor were considered and excluded from Phase 1.
