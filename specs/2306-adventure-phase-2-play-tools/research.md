# Phase 0 Research: Oracle Adventure Mode — Phase 2

All Technical Context unknowns from `plan.md` are resolved below; none
required new external research since Phase 2 extends an already-shipped,
already-researched Phase 1 architecture (`specs/160-solo-adventure-mode/research.md`).

## Recap and visible-state inspection: deterministic render vs. new AI call

- **Decision**: Build recap and visible-state inspection as deterministic,
  client-side template renders over the already-committed `visibleState` and
  recent `turns`, computed in `AdventureManager` (or a small pure helper in
  `adventure-engine`), not as a new model-backed operation.
- **Rationale**: FR-006 requires the recap to be built only from committed
  player-visible state and transcript and to never draw on hidden state — a
  deterministic render trivially satisfies this by construction, since there
  is no hidden data in its inputs to begin with. It is also instant (no
  network round trip), free, and works fully offline (SC-008), which a
  model-backed summary would not guarantee without extra plumbing. This
  matches constitution III (reuse what exists, avoid a new AI surface for a
  problem the existing state shape already solves).
- **Alternatives considered**: A model-generated prose recap was considered
  for a more narrative tone, but it reintroduces every Phase-1-solved
  leakage-safety concern (the prompt would need the same hidden-state
  exclusion the turn-generation path already enforces) for a view that is
  fundamentally just "show me what I already know." Rejected as unnecessary
  complexity for Phase 2; a later phase can add a narrative recap mode on
  top of the same underlying state without changing this decision.

## Roll history: derived from turns vs. a separately persisted list

- **Decision**: Add an optional `resolvedRoll: { expression?: string; bands?: OutcomeBand[]; outcome: SuppliedRollOutcome }`
  field to `CommittedAdventureTurn`, populated when a turn commits while
  resolving a `PendingRoll`. Roll history is the ordered list of turns with
  this field present — no separate persisted list.
- **Rationale**: `PendingRoll` already carries `dice.expression`/`dice.bands`
  and, once a `SuppliedRollOutcome` is recorded, that information is
  currently discarded when the roll resolves and clears. Snapshotting it
  onto the turn that resolved it is the minimal change: it reuses the
  existing commit path, keeps roll history and the transcript in lockstep
  by construction (a roll can never appear in history without its resolving
  turn, or vice versa), and needs no separate list to keep in sync or
  migrate.
- **Alternatives considered**: A dedicated `AdventureSession.rollHistory[]`
  array was considered for a simpler "just append" mental model, but it is a
  second source of truth that must stay consistent with `turns` on every
  commit, retry, and duplicate — more surface for a Phase-1-established
  invariant (no partial/duplicate commits) to break. Rejected.

## State correction concurrency: new lock vs. existing revision check

- **Decision**: Route corrections through the same `save(expectedRevision, session)`
  optimistic-concurrency path `archive`/`deleteArchived` already use in
  `AdventureSessionRepository`. A correction submitted against a stale
  `revision` is rejected, surfacing a clear conflict message rather than
  silently overwriting or being overwritten by a concurrently completing
  model turn.
- **Rationale**: FR-010 requires that a correction and an in-flight turn
  never silently overwrite one another. Phase 1 already solved exactly this
  class of problem (concurrent commit safety) with the `revision` field;
  reusing it means no new locking primitive, and the failure mode ("stale
  revision, please retry") is already a pattern the codebase and its tests
  understand.
- **Alternatives considered**: A dedicated correction lock (similar to the
  cross-tab `adventure-control-lease.ts`) was considered but rejected as
  overkill — the cross-tab lease exists because two _tabs_ can be racing;
  correction-vs-turn is a single-tab, single-writer race already covered by
  optimistic concurrency on save.

## Schema evolution: `schemaVersion: 2` additive fields vs. a migration pass

- **Decision**: Bump `AdventureSession.schemaVersion` to a `1 | 2` union.
  All new Phase 2 fields (`dicePresets`, `resourceCounters`, per-turn
  `resolvedRoll`) are optional and default to empty/absent when loading a
  `v1` document; no rewrite of existing documents is performed.
- **Rationale**: Every new Phase 2 field is purely additive and has a safe
  empty default (no presets, no counters, no resolved-roll snapshot on
  historical turns). This avoids a migration step entirely — Phase 1
  documents remain valid, readable Phase 2 documents indefinitely, which
  also means `bun run test` coverage for "load a v1 document" doubles as
  regression coverage for this decision.
- **Alternatives considered**: A one-time migration on first load (rewriting
  `schemaVersion` to `2` and persisting immediately) was considered, but it
  adds a write on every existing session's next load for no functional
  benefit, and risks colliding with the revision-based optimistic
  concurrency check on a session another tab might be mid-turn on. Rejected
  in favor of read-time defaulting.

## Archive search: client-side filter vs. new index

- **Decision**: Archive search/filter (FR-003) is a pure, synchronous
  client-side filter over the already-loaded `AdventureListResult` entries'
  title and premise text — no new index, worker, or search library.
- **Rationale**: The existing archive list is already loaded into memory for
  rendering (`AdventureArchive.svelte`); at the stated acceptance scale (25+
  entries, SC-001's sub-100ms target), a linear substring filter is more
  than sufficient and needs no new dependency, consistent with constitution
  III.
- **Alternatives considered**: Reusing the app's existing FlexSearch-based
  entity search infrastructure was considered, but that subsystem is scoped
  to canonical vault entities; wiring session-scoped archive metadata into
  it would cross a boundary for no measurable benefit at this scale.
  Rejected; revisit only if archive sizes grow far beyond the Phase 2
  acceptance profile.

## Duplicate semantics: deep copy vs. premise-only reseed

- **Decision**: Duplicate (FR-002) produces a full, independent deep copy of
  the source adventure — transcript, visible state, hidden state, source
  references, and Phase 2 fields (presets, counters) — as a new document
  with a new id.
- **Rationale**: The primary use case named in the spec is "replay or branch
  from a specific point," which requires the copy to actually be at that
  point, not reset to a premise. Starting a fresh, differently-themed
  adventure is already served by the existing "start a new adventure" flow,
  so a premise-only reseed would duplicate that capability under a
  confusing name.
- **Alternatives considered**: A "duplicate from current point, forward only"
  variant that also resets hidden state was considered (to let a player
  fork a session without carrying forward GM secrets), but it silently
  breaks continuity if play later reveals a secret the fork no longer has.
  Rejected for Phase 2; nothing prevents a later phase from adding a
  separate "branch and reset secrets" action if requested.
