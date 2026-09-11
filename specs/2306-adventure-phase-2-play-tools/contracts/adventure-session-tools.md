# Contract: Recap, Correction, Presets, Roll History, and Resource Counters

Extends `specs/160-solo-adventure-mode/contracts/adventure-engine.md`. Only
the new/changed surface is documented here.

## Recap and inspection (pure functions, `adventure-engine`)

```ts
function buildAdventureRecap(session: AdventureSession): AdventureRecap;
function getRollHistory(session: AdventureSession): Array<{
  turn: CommittedAdventureTurn;
  resolvedRoll: NonNullable<CommittedAdventureTurn["resolvedRoll"]>;
}>;
```

### Guarantees

- `buildAdventureRecap` reads only `visibleState` and `turns` narration; its
  return type has no field capable of holding `hiddenState` data, so a
  hidden-state leak here is a type error, not just a runtime bug (FR-006).
- `getRollHistory` returns entries in the same order as `session.turns`
  (commit order); it never re-sorts or deduplicates, since each entry maps
  1:1 to the turn that produced it (FR-012).
- Both functions are pure and synchronous — no I/O, no AI call.

## State correction (pure function + repository call)

```ts
function applyStateCorrection(
  session: AdventureSession,
  patch: VisibleStatePatch,
): AdventureSession; // pure, in adventure-engine — reuses applyVisiblePatch

// AdventureManager orchestration:
async function submitCorrection(
  patch: VisibleStatePatch,
): Promise<"applied" | "stale-revision">;
```

### Guarantees

- `applyStateCorrection` MUST reject (throw or return an error `Result`,
  matching the existing `applyVisiblePatch` failure shape) a patch that
  targets any field outside `VisibleStatePatch`'s existing shape — there is
  no parameter through which hidden state could be passed in the first
  place (FR-009).
- `submitCorrection` MUST call `repository.save(session.revision, updated)`;
  a `stale-revision` result from the repository (because a turn committed
  concurrently) MUST propagate as `"stale-revision"` to the caller rather
  than retrying automatically or discarding the user's correction input
  (FR-010) — the UI is responsible for offering the user a re-review-and-
  retry path with their correction text preserved.
- A committed turn that arrives while a correction is in flight, and vice
  versa, MUST NOT both apply against the same `expectedRevision`; the
  second writer to reach `save` always loses the race and receives
  `stale-revision`/an equivalent commit failure, never a silent merge.

## Dice presets (pure functions, `adventure-engine`)

```ts
function addDicePreset(
  session: AdventureSession,
  preset: Omit<DicePreset, "id" | "createdAt">,
): AdventureSession;
function removeDicePreset(
  session: AdventureSession,
  presetId: string,
): AdventureSession;
```

### Guarantees

- Presets are pure convenience data; adding/removing one MUST NOT affect
  `pendingRoll`, `turns`, or any other session field (FR-011, FR-014).
- Presets carry no game-system validation of `expression` beyond it being a
  non-empty string — interpretation remains Oracle's, exactly as in Phase 1.

## Resource counters (pure functions, `adventure-engine`)

```ts
function addResourceCounter(
  session: AdventureSession,
  label: string,
  initialValue: number,
): AdventureSession;
function adjustResourceCounter(
  session: AdventureSession,
  counterId: string,
  newValue: number,
): AdventureSession;
function removeResourceCounter(
  session: AdventureSession,
  counterId: string,
): AdventureSession;
```

### Guarantees

- `newValue` MUST be a finite number; a non-finite value (NaN/Infinity) is
  rejected, but any finite value — including negative — is accepted, since
  the engine applies no game-system meaning to it (FR-013, Edge Cases).
- An adventure with zero resource counters or dice presets behaves
  identically to a Phase 1 session in every other respect (FR-014, SC-007) —
  none of these functions run implicitly; they only run when the user
  explicitly invokes them.

## Offline behavior

All functions and repository methods in this contract operate purely on
already-loaded/local OPFS state; none require network access. `AdventureManager`
MUST route archive management, recap, inspection, correction, presets, roll
history, and resource-counter actions through these local paths even when
`navigator.onLine` is `false`, consistent with FR-018 and Phase 1's existing
offline-read guarantee.
