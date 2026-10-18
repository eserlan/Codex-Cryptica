# Data Model: Solo Adventure Mode Foundation

**Feature**: 160-solo-adventure-mode | **Schema version**: 1

The TypeScript/Zod definitions live in `@codex/adventure-engine`. App adapters
may add ephemeral view state, but they must not widen the persisted contract.

## AdventureSession

The single authoritative durable document.

| Field                                    | Type                       | Rules                                                                                                                                        |
| ---------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `schemaVersion`                          | `2`                        | Read older versions through ordered, pure migrations; reject newer versions without rewriting.                                               |
| `id`                                     | UUID/string                | Immutable; also used as filename.                                                                                                            |
| `vaultId`                                | string                     | Must match the open vault.                                                                                                                   |
| `title`                                  | string                     | Non-empty, plain text.                                                                                                                       |
| `status`                                 | `active \| archived`       | At most one valid record is selected as the effective active session per vault; duplicate active-marked records load as read-only conflicts. |
| `createdAt`, `updatedAt`, `lastPlayedAt` | ISO timestamp              | Monotonic on successful commits.                                                                                                             |
| `revision`                               | non-negative integer       | Increments on every successful persisted mutation.                                                                                           |
| `playerCharacter`                        | `PlayerCharacter`          | Exactly one.                                                                                                                                 |
| `premise`                                | string                     | User-authored starting premise.                                                                                                              |
| `sourceRecords`                          | `SourceRecordReference[]`  | Unique by record ID.                                                                                                                         |
| `visibleState`                           | `VisibleAdventureState`    | Safe for player-facing rendering.                                                                                                            |
| `hiddenState`                            | `HiddenAdventureState`     | Never rendered through player surfaces.                                                                                                      |
| `provisionalFacts`                       | `ProvisionalFact[]`        | Session-only; never canonical writes.                                                                                                        |
| `turns`                                  | `CommittedAdventureTurn[]` | Append-only committed transcript.                                                                                                            |
| `pendingRoll`                            | `PendingRoll \| null`      | At most one; references one unresolved input.                                                                                                |

### Invariants

- `archived` sessions cannot accept inputs, rolls, or state patches.
- `turns[].sequence` is contiguous and unique; IDs are unique.
- `revision` changes only after durable save succeeds.
- no hidden-state object is reachable from a player transcript DTO.
- a session with `pendingRoll` cannot accept another action until the roll is
  resolved, dismissed, or replaced by an explicit changed approach.
- only records with `availability: available` may contribute current canon.
- all state text values are at most 600 characters and the canonical serialized
  combination of `visibleState`, `hiddenState`, and `provisionalFacts` is at most
  `MAX_SERIALIZED_STATE_CHARS = 32_000` after every committed patch.

### Collection limits

| Collection                | Maximum items |
| ------------------------- | ------------: |
| Visible objectives        |            20 |
| Visible active characters |            30 |
| Visible known facts/clues |            60 |
| Visible relationships     |            40 |
| Hidden secrets            |            60 |
| Hidden GM threads         |            40 |
| Provisional facts         |            60 |

The reducer evaluates removals and updates before additions, then validates the
complete candidate. An overflow returns `state-budget-exceeded`, changes
nothing, and permits retry with instructions to consolidate or update existing
facts rather than append duplicates.

## PlayerCharacter

Discriminated union:

```ts
type PlayerCharacter =
  | {
      kind: "canonical";
      recordId: string;
      name: string;
    }
  | {
      kind: "provisional";
      name: string;
      description: string;
    };
```

A canonical character is resolved live before each turn. A provisional
character remains entirely inside the session.

## VisibleAdventureState

Compact, player-safe continuity rather than a prose recap.

```ts
interface VisibleAdventureState {
  location?: StateFact;
  situation?: StateFact;
  objectives: StateFact[];
  activeCharacters: StateFact[];
  knownFacts: StateFact[];
  relationships: RelationshipFact[];
}

interface StateFact {
  id: string;
  text: string;
  source: "canonical" | "provisional" | "revealed-secret";
  sourceRecordId?: string;
}
```

Collections have stable IDs so patches update/remove named facts rather than
replace whole arrays. All text is eligible for rendering and secrecy scanning.

## HiddenAdventureState

```ts
interface HiddenAdventureState {
  secrets: HiddenSecret[];
  gmThreads: HiddenThread[];
}

interface HiddenSecret {
  id: string;
  text: string;
  revealCondition?: string;
  status: "hidden" | "revealed";
  revealedOnTurnId?: string;
}
```

`HiddenThread` uses the same stable-ID pattern for motives, agendas, answers,
and future developments. Revealing a secret changes only the named record and
adds an explicitly generated player-visible fact. Revealed records remain in
hidden history for audit but are omitted from the unrevealed prompt block.

## SourceRecordReference

```ts
interface SourceRecordReference {
  recordId: string;
  recordType: string;
  displayName: string;
  role: "player-character" | "anchor" | "turn-source";
  availability: "available" | "unavailable";
  lastResolvedAt?: string;
}
```

The persisted reference is not a canonical-content cache. Prompt excerpts are
transient `ResolvedSourceExcerpt` values produced from the current vault.

## ProvisionalFact

```ts
interface ProvisionalFact {
  id: string;
  kind: "person" | "place" | "faction" | "item" | "event" | "clue" | "other";
  name: string;
  summary: string;
  introducedOnTurnId: string;
  visibility: "player-visible" | "gm-only";
}
```

The engine does not expose a conversion-to-entity operation in Phase 1.

## CommittedAdventureTurn

```ts
interface CommittedAdventureTurn {
  id: string;
  sequence: number;
  inputId: string;
  playerAction: string;
  rollOutcome?: SuppliedRollOutcome;
  narration: string;
  visiblePatch: VisibleStatePatch;
  hiddenPatch: HiddenStatePatch;
  revealedSecretIds: string[];
  sourceRecordIds: string[];
  provisionalFactIds: string[];
  committedAt: string;
}
```

Rejected, cancelled, interrupted, and invalid proposals are not appended. Error
details are ephemeral UI state, not adventure history.

## PendingRoll

```ts
interface PendingRoll {
  id: string;
  inputId: string;
  playerAction: string;
  setupNarration?: string;
  uncertainty: string;
  stakes: string;
  dice?: {
    expression: string;
    bands: OutcomeBand[];
  };
  resolutionStatus: "awaiting-outcome" | "ready-to-resolve";
  suppliedOutcome?: SuppliedRollOutcome;
  createdAt: string;
  outcomeRecordedAt?: string;
}
```

An outcome is validated and persisted before the resolution request. While
`ready-to-resolve`, it cannot be replaced, dismissed, or rolled again; offline
or failed generation retries reuse it. A successfully committed turn copies the
outcome into `CommittedAdventureTurn.rollOutcome` and clears `pendingRoll` in
the same candidate session. This makes retry durable without allowing reuse.

## State Patches

Patches use explicit operations over stable IDs:

```ts
interface CollectionPatch<T> {
  add: T[];
  update: T[];
  removeIds: string[];
}

interface VisibleStatePatch {
  location?: StateFact | null;
  situation?: StateFact | null;
  objectives: CollectionPatch<StateFact>;
  activeCharacters: CollectionPatch<StateFact>;
  knownFacts: CollectionPatch<StateFact>;
  relationships: CollectionPatch<RelationshipFact>;
}
```

Hidden state uses equivalent typed patches. Validation rejects duplicate IDs,
updates/removals of unknown IDs, overlapping operations, attempts to remove an
unrelated fact, invalid reveal IDs, or a patch inconsistent with its narration
fixture rules.

## Ephemeral Types

These are not written to the vault:

- `AdventureTurnProposal`: model response awaiting validation.
- `AdventureTurnAttempt`: submitted input plus generation/recovery state; only a
  successful attempt becomes a `CommittedAdventureTurn`.
- `ResolvedSourceExcerpt`: current canonical prompt material.
- `AdventureControlLease`: tab owner ID, fencing token, expiry.
- `AdventureGenerationAttempt`: cancellation/retry state.
- `AdventureLoadCondition`: `normal | duplicate-active-conflict | unreadable`;
  never persisted and never changes the source record during load.
- `AdventureArchiveEntry`: safe list projection including load condition; never
  includes hidden state.

## State Transitions

```text
no active session
  -> starting -> active/ready

active/ready
  -> generating -> committing -> active/ready
  -> generating -> awaiting-roll
  -> generating -> error -> active/ready
  -> ending -> archived

awaiting-roll
  -> recording-outcome -> ready-to-resolve
  -> dismissing -> active/ready

ready-to-resolve
  -> resolving-roll -> committing -> active/ready
  -> resolving-roll -> error/offline -> ready-to-resolve

archived
  -> read-only only
```

Only `committing`, `recording-outcome`, `dismissing`, starting, and ending
perform durable writes. Reactive state changes after the corresponding write
succeeds.
