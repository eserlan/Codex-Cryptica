# Contract: `packages/faction-engine` public API

**Feature**: 161-faction-turn-influence

The engine is pure logic over plain data. It performs **no** storage access, no network calls, and no DOM work — every dependency arrives as an argument or through the constructor (Principle VIII). This is what makes the five-band × reversibility test matrix cheap to run.

---

## Package identity and imports

Published as **`@codex/faction-engine`** — the scope every recently added package uses. `chronology-engine` and `dice-engine` are unscoped for historical reasons only; do not copy that.

Runtime dependencies are `dice-engine` and `@codex/oracle-engine`, the latter **deep-imported only**:

```ts
// correct — a pure string hash, no runes in the import graph
import { entityContentHash } from "@codex/oracle-engine/src/lore-delta";

// WRONG — the barrel re-exports oracle-settings.svelte, chat-history.svelte
// and undo-redo.svelte, pulling Svelte runes into a package that is compiled
// and tested without the Svelte compiler
import { entityContentHash } from "@codex/oracle-engine";
```

## `Result<T, E>`

This package defines its own:

```ts
export type Result<T, E> = { ok: true; value: T } | { ok: false; errors: E };
```

Structurally identical to `packages/adventure-engine/src/types.ts:241` and **deliberately not imported from it**. Per research R7 this feature takes no dependency on `adventure-engine`; duplicating a one-line type alias is cheaper than coupling two unrelated packages, and Principle III's extraction trigger is three duplications, not two.

## Exports

```ts
// packages/faction-engine/src/index.ts
export * from "./types";
export * from "./eligibility";
export * from "./resolution";
export * from "./patches";
export * from "./narrative";
export { FactionTurnEngine, factionTurnEngine } from "./engine";
```

Per Principle VIII, both the class and a default singleton are exported.

---

## Eligibility

```ts
export type EligibilityState =
  "no-world-date" | "never-acted" | "eligible" | "too-soon" | "clock-behind";

export interface EligibilityResult {
  state: EligibilityState;
  canAct: boolean; // true only for never-acted | eligible
  canOverride: boolean; // true for too-soon | clock-behind; false for no-world-date
  lastTurnDate?: WorldDateStamp;
  nextEligibleDate?: WorldDateStamp;
  reason: string; // plain language, ready to display (Principle IX)
}

export function evaluateEligibility(
  faction: FactionTurnState | undefined,
  currentDate: CalendarCurrentDateSource | null,
  settings: FactionTurnSettings,
  calendar: WorldCalendar,
): EligibilityResult;
```

**Contract notes**

- `currentDate.source === "realWorld"` MUST yield `no-world-date` with `canOverride: false` (**FR-008a**). Real-world time is not campaign time (research R1); overriding into it would stamp history with the present-day year.
- Never throws. A malformed or missing `lastTurnDate` degrades to `never-acted`.

---

## Resolution

```ts
export interface ResolveInput {
  faction: Entity;
  target: Entity;
  allFactions: Entity[]; // turn-enabled factions, for FR-020b
  settings: FactionTurnSettings;
  worldDate: WorldDateStamp;
}

export interface ResolveFailure {
  kind: "role-unmapped" | "invalid-target" | "self-target";
  role?: FactionStatRole; // set when kind is role-unmapped (FR-005)
  message: string;
}

export function resolveInfluence(
  input: ResolveInput,
  deps?: { dice?: DiceEngine },
): Result<FactionResolution, ResolveFailure>;
```

**Contract notes**

- Returns a `Result`, never throws, so FR-005's "name the missing role" is a value rather than an exception.
- `deps.dice` defaults to the shared `diceEngine`; tests inject a fixed provider for determinism.
- With `settings.useRandomness === false`, the dice engine is not called at all and `roll` is `null`.
- Always sets `mechanicalBand` **and** `permittedBands` (FR-021a). At this point `finalBand === mechanicalBand` and `aiUsed === false`; AI adjustment is a separate step.
- `permittedBands` spans at most one band either side of `mechanicalBand`, truncated at the ends of the five-band scale.

## Opposition

```ts
export function computeOpposition(
  target: Entity,
  allFactions: Entity[],
  actingFactionId: string,
  settings: FactionTurnSettings,
): { value: number; source: OppositionSource; detail: string };
```

Implements FR-020a → FR-020b → FR-020c in that order. Holds belonging to the acting faction itself are excluded from FR-020b, and only relationships **directed at** the target count (FR-020b, clarified).

---

## AI adjustment

The engine never calls a provider. It exposes a pure applier that the caller feeds with whatever the AI returned.

```ts
export interface AiBandProposal {
  band: OutcomeBandId;
  reason: string;
}

export function applyAiBand(
  resolution: FactionResolution,
  proposal: AiBandProposal | null,
): FactionResolution;
```

**Contract notes**

- `null`, an unrecognised band, or a band outside `permittedBands` MUST return the resolution unchanged with `aiUsed: false` (FR-021c). This is the single enforcement point — a provider schema cannot express "within one band of a per-turn value".
- Never throws. Every invalid input is a fallback, not an error (FR-021d).

---

## Patches

```ts
export function buildChanges(
  faction: Entity,
  target: Entity,
  resolution: FactionResolution,
  optIntoTypeChange: boolean,
): { changes: FactionTurnChange[]; inverse: FactionTurnChange[] };

export function computeStateHash(faction: Entity, target: Entity): string;
```

**Contract notes**

- `inverse` MUST restore the exact prior values, including when the forward change was clamped (FR-034a). Clamping is recorded on the change, and the inverse carries the true original value rather than the clamped one.
- A relationship type change appears in `changes` only when `optIntoTypeChange` is true (FR-032b).
- No change is ever produced for an edge directed from the target back to the faction (FR-032c).

---

## Narrative fallback

```ts
export function buildTemplateNarrative(
  resolution: FactionResolution,
  factionTitle: string,
  targetTitle: string,
): string;
```

Local, synchronous, always available. This is the FR-021d fallback and the reason a turn can never be blocked by AI availability.

---

## Engine facade

```ts
export class FactionTurnEngine {
  constructor(deps?: { dice?: DiceEngine });

  evaluateEligibility(...): EligibilityResult;
  propose(input: ResolveInput, ai?: AiBandProposal | null): Result<FactionTurnProposal, ResolveFailure>;
  commit(proposal: FactionTurnProposal, faction: Entity, target: Entity): Result<CommitPlan, CommitFailure>;
  reverse(record: FactionTurnRecord, faction: Entity, target: Entity): Result<CommitPlan, CommitFailure>;
}

export interface CommitPlan {
  statUpdates: { fieldId: string; value: number }[];
  connectionWrite: { targetId: string; strength: number; type?: ConnectionType; create: boolean } | null;
  connectionRemove: { targetId: string } | null;
  /**
   * On `commit`: the new record to append to history.
   * On `reverse`: the existing record with `undone: true` — the caller replaces
   * the stored entry in place rather than appending, since FR-029 requires an
   * undone turn to stay visible in history rather than being deleted.
   */
  record: FactionTurnRecord;
  lastTurnDate: WorldDateStamp | undefined;
}

export type CommitFailure =
  | { kind: "stale"; message: string }
  | { kind: "target-missing"; message: string }
  | { kind: "not-most-recent"; message: string };
```

**Contract notes**

- `commit` returns a **plan**, not a mutation. The store performs the writes through `EntityMutationService`, keeping the engine storage-free and the write path callback-correct (research R3).
- **The store MUST apply a plan atomically** (FR-025a, research R10): capture prior values, apply stats → connection → history in that order, and on any failure replay the plan's `inverse` for the steps that completed, then report the turn as not applied. History is written **last** so a failure can never leave a record describing changes that did not happen. The engine supplies the `inverse` list; it does not perform the rollback.
- `commit` MUST return `{ kind: "stale" }` when `computeStateHash` no longer matches the proposal's `stateHash` (FR-026, SC-007).
- `reverse` MUST return `{ kind: "not-most-recent" }` for any record that is not the newest non-undone entry (FR-028, US4 scenario 7).
- `reverse` recomputes `lastTurnDate` from the remaining non-undone history, clearing it when none remain.

---

## Invariants the tests assert

| Invariant                                                                        | Source          |
| -------------------------------------------------------------------------------- | --------------- |
| A proposal never mutates its inputs                                              | FR-022          |
| `inverse` applied after `changes` restores exact prior values, all five bands    | SC-005          |
| Clamped forward change still reverses exactly                                    | FR-034a         |
| Randomness off + AI off ⇒ identical resolution for identical inputs              | SC-006          |
| Any invalid AI proposal leaves the band mechanical                               | FR-021c         |
| Band magnitude is monotonic across the ordered five                              | FR-017b         |
| Mixed band moves the world least                                                 | FR-017a         |
| Unclaimed target opposes at exactly the baseline                                 | FR-020c         |
| A real-world-derived date yields `no-world-date`, never eligibility              | FR-008a         |
| Same band always yields the same magnitude                                       | FR-032a         |
| A failed apply leaves the vault byte-identical                                   | FR-025a         |
| No function in the package touches storage, network, or DOM                      | Principle I     |
| The import graph contains no `.svelte.ts` module, so no rune enters this package | Principle I, VI |
