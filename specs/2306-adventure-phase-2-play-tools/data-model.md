# Data Model: Oracle Adventure Mode — Phase 2

This extends `specs/160-solo-adventure-mode/data-model.md`. Only new or
changed shapes are documented here; everything not listed (e.g.
`VisibleAdventureState`, `HiddenAdventureState`, `SourceRecordReference`,
`ProvisionalFact`, `PendingRoll`, `State Patches`) is unchanged from Phase 1.

## AdventureSession (extended)

```ts
export interface AdventureSession {
  schemaVersion: 1 | 2; // was: 1
  // ...all Phase 1 fields unchanged...
  dicePresets: DicePreset[]; // NEW, defaults to [] when absent (v1 load)
  resourceCounters: ResourceCounter[]; // NEW, defaults to [] when absent (v1 load)
}
```

### Invariants (additional to Phase 1)

- A `v1` document has no `dicePresets`/`resourceCounters` keys; the loader
  MUST default both to `[]` rather than treating their absence as corrupt
  data.
- `dicePresets` and `resourceCounters` are keyed by their own `id`; ids MUST
  be unique within a session but are not unique across sessions (duplicate
  copies presets/counters with fresh ids belonging to the new session).

## DicePreset (new)

```ts
export interface DicePreset {
  id: string;
  label: string; // user-facing name, e.g. "Advantage d20"
  expression: string; // e.g. "2d20kh1"
  createdAt: string;
}
```

- Purely a reuse convenience over Phase 1's roll handoff — does not change
  when or whether Oracle requests a roll (FR-011).
- CRUD is local: create, rename (edit `label`), and delete. No `update`
  beyond rename/expression edit is required by the spec; both are simple
  field replacements identified by `id`.

## Resolved Roll snapshot (extends CommittedAdventureTurn)

```ts
export interface CommittedAdventureTurn {
  // ...all Phase 1 fields unchanged...
  resolvedRoll?: {
    expression?: string; // present only for a basic Codex Cryptica roll
    bands?: OutcomeBand[]; // present only for a basic Codex Cryptica roll
    outcome: SuppliedRollOutcome; // always present when resolvedRoll is set
  };
}
```

- Set exactly once, at the moment the reducer commits a turn that resolves
  the session's `pendingRoll`. Never mutated afterward — a turn's roll
  history entry is as immutable as the turn itself (FR-012).
- **Roll History** (as a concept) is not a stored field; it is
  `session.turns.filter(t => t.resolvedRoll)` in commit order. See
  research.md "Roll history" decision.

## ResourceCounter (new)

```ts
export interface ResourceCounter {
  id: string;
  label: string; // user-defined, e.g. "Ammo", "Favor with the Baron"
  value: number;
  createdAt: string;
  updatedAt: string;
}
```

- System-agnostic: the engine applies no formula, unit, min/max, or
  game-system rule to `value` (FR-013). The reducer only validates that
  `value` is a finite number; negative or extreme values are accepted, per
  the spec's Edge Cases.
- CRUD is local: create, rename, adjust `value` (any finite delta or direct
  set), delete.

## StateCorrection (new, not persisted as its own record)

```ts
export interface StateCorrectionRequest {
  expectedRevision: number; // Phase 1's existing optimistic-concurrency field
  visiblePatch: VisibleStatePatch; // reuses Phase 1's existing patch shape
}

export interface StateCorrectionResult {
  outcome: "applied" | "stale-revision";
  session?: AdventureSession; // present when outcome === "applied"
}
```

- A correction is **not** a new entity type persisted with the session — it
  is applied through the existing `VisibleStatePatch` reducer path
  (`applyVisiblePatch`, already used for committed turns) and the existing
  `save(expectedRevision, session)` optimistic-concurrency guard already
  used by `archive`/`deleteArchived`.
- "Auditable" (FR-008) is satisfied because the correction still produces a
  new `revision` and `updatedAt` on the session; a future phase may add an
  explicit correction-log entity if product feedback asks for a visible
  history of corrections, but Phase 2 does not require one.
- `outcome: "stale-revision"` is the FR-010 conflict signal: the caller
  (`AdventureManager`) surfaces this as "the session changed — review and
  retry" rather than silently discarding either side.
- Corrections MUST NOT touch `hiddenState` (FR-009); the reducer function
  for corrections accepts only a `VisibleStatePatch`, so there is no code
  path by which a correction could patch hidden state.

## Archive operations (repository-level, not new domain types)

```ts
rename(vaultId: string, sessionId: string, expectedRevision: number, title: string): Promise<AdventureSaveResult>
duplicate(vaultId: string, sessionId: string): Promise<{ id: string } | AdventureLoadResult["condition"]>
```

- `rename` reuses the existing `save` path with only `title` and
  `updatedAt` changed — same optimistic-concurrency and validation as any
  other save.
- `duplicate` performs a `load`, assigns a new `id`/`createdAt`/`updatedAt`
  and `revision: 0`, and `save`s it as a new document; it never mutates the
  source document (FR-002).
- `deleteArchived` (FR-004) and `list`/`load` (used for search, FR-003, and
  resume, FR-005) are unchanged from Phase 1 — Phase 2 adds no new deletion
  or listing primitive.

## Recap and Visible-State Inspection (view models, not persisted)

```ts
export interface AdventureRecap {
  location?: StateFact;
  situation?: StateFact;
  objectives: StateFact[];
  activeCharacters: StateFact[];
  knownFacts: StateFact[];
  recentTurnSummaries: string[]; // narration excerpts from the last N committed turns
}
```

- Computed on demand from `session.visibleState` and the tail of
  `session.turns`; never persisted, never sent to a model, never contains
  any field sourced from `session.hiddenState` (FR-006).

## Schema Migration Note

`schemas.ts`'s Zod schema for `AdventureSession` gains a `.passthrough()`-free,
explicit `v2` shape; the existing versioned loader (already dispatching on
`schemaVersion` per Phase 1's `research.md`) adds one branch: a `v1` payload
is parsed with the `v1` schema, then defaulted into the in-memory `v2` shape
(`dicePresets: []`, `resourceCounters: []`, each turn's `resolvedRoll` left
`undefined`). No `v1` document is ever rewritten to `v2` on disk until the
user next performs a `v2`-aware `save` (e.g., committing a turn, renaming,
adding a preset) — consistent with the additive-only migration decision in
research.md.
