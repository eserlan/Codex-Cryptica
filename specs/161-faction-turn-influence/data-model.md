# Phase 1 Data Model: Faction Turn — Influence Vertical Slice

**Feature**: 161-faction-turn-influence
**Date**: 2026-08-21

All new persisted state is additive and optional. No IndexedDB version bump (`DB_VERSION` stays 24) and no entity migration: the `factionTurn` block nests inside the existing entity blob, and every field is optional, so vaults written before this feature parse unchanged.

---

## 1. Entity extension

### `EntitySchema.factionTurn` (new, optional)

Added in `packages/schema/src/entity.ts`. Absent on every entity that has not opted in, which is what makes FR-002 and SC-008 true by construction.

| Field          | Type                          | Notes                                                                                                |
| -------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| `enabled`      | `boolean`                     | FR-001. Opting out sets this false; `history` is retained.                                           |
| `statRoles`    | `FactionStatRoles`            | FR-004a. Role → stat sheet **field id**. Ids, not labels, so renaming a stat never breaks a mapping. |
| `lastTurnDate` | `WorldDateStamp \| undefined` | FR-010. The date of the most recent turn **not undone**. Recomputed on undo.                         |
| `history`      | `FactionTurnRecord[]`         | FR-035, FR-041. Append-only, never pruned.                                                           |

```ts
export const FactionStatRolesSchema = z.object({
  power: z.string().optional(),
  influence: z.string().optional(),
  resources: z.string().optional(),
  stability: z.string().optional(),
});

export const FactionTurnStateSchema = z.object({
  enabled: z.boolean().default(false),
  statRoles: FactionStatRolesSchema.default({}),
  lastTurnDate: WorldDateStampSchema.optional(),
  history: z.array(FactionTurnRecordSchema).default([]),
});
```

**Validation rules**

- Every role is individually optional (FR-004a). Influence requires `influence` and, when the target is a turn-enabled faction, the target's `stability`.
- A role id that no longer matches a field on the sheet is treated as unmapped, surfacing FR-005's message rather than throwing.

---

## 2. Value types

### `WorldDateStamp`

A resolved point in world time, captured at commit. Mirrors the shape `resolveCalendarCurrentDate()` returns so no conversion is needed.

| Field              | Type                  | Notes                                                                                                 |
| ------------------ | --------------------- | ----------------------------------------------------------------------------------------------------- |
| `year`             | `number`              |                                                                                                       |
| `month`            | `number`              |                                                                                                       |
| `day`              | `number \| undefined` | Absent when the date came from the vault-setting tier.                                                |
| `calendarRevision` | `number`              | Lets history detect a reconfigured calendar and label the entry undated rather than mis-rendering it. |

### `FactionStatRoles`

`{ power?, influence?, resources?, stability? }` — each a stat sheet field id.

---

## 3. Resolution types (transient, `faction-engine`)

None of these are persisted except where copied into a turn record.

### `OppositionSource`

Which tier of FR-020 supplied the opposing value.

| Variant               | Meaning                                                     |
| --------------------- | ----------------------------------------------------------- |
| `"faction-stability"` | FR-020a — target is turn-enabled; its stability was used.   |
| `"existing-hold"`     | FR-020b — derived from other factions' holds on the target. |
| `"baseline"`          | FR-020c — target held by nobody; vault baseline used.       |

### `FactionResolution`

Everything needed to explain an outcome forever (FR-018, FR-035a).

| Field              | Type                                 | Notes                                                   |
| ------------------ | ------------------------------------ | ------------------------------------------------------- |
| `actingRole`       | `"influence"`                        | Fixed for this action (FR-019a).                        |
| `actingFieldId`    | `string`                             |                                                         |
| `actingLabel`      | `string`                             | Snapshot of the GM's stat name at resolution time.      |
| `actingValue`      | `number`                             |                                                         |
| `opposingValue`    | `number`                             |                                                         |
| `oppositionSource` | `OppositionSource`                   | FR-020 — displayed, not just stored.                    |
| `oppositionDetail` | `string`                             | Human-readable provenance, e.g. which faction's hold.   |
| `modifiers`        | `{ label: string; value: number }[]` |                                                         |
| `roll`             | `RollResult \| null`                 | `null` in no-randomness mode. Carries individual dice.  |
| `total`            | `number`                             |                                                         |
| `mechanicalBand`   | `OutcomeBandId`                      | Always computed (FR-021a).                              |
| `permittedBands`   | `OutcomeBandId[]`                    | At most one either side (FR-021a).                      |
| `finalBand`        | `OutcomeBandId`                      | Equals `mechanicalBand` whenever AI did not act.        |
| `aiUsed`           | `boolean`                            |                                                         |
| `aiReason`         | `string \| undefined`                | Present only when AI moved the band (FR-021b, FR-035a). |

### `OutcomeBandId`

Ordered, exactly five (FR-017):

`"decisive-success" | "success" | "mixed" | "failure" | "backfire"`

Ordering is load-bearing — FR-021a's permitted range and FR-017b's monotonicity both index into it.

### `FactionTurnProposal` — transient, never persisted (FR-022a)

| Field                                  | Type                          | Notes                                  |
| -------------------------------------- | ----------------------------- | -------------------------------------- |
| `factionId`, `targetId`, `targetTitle` | `string`                      | Title snapshotted for FR-040.          |
| `action`                               | `"influence"`                 |                                        |
| `worldDate`                            | `WorldDateStamp`              |                                        |
| `resolution`                           | `FactionResolution`           |                                        |
| `changes`                              | `FactionTurnChange[]`         | Forward patch.                         |
| `inverse`                              | `FactionTurnChange[]`         | Reverse patch (FR-027).                |
| `narrative`                            | `string`                      | AI or template; GM-editable (FR-021h). |
| `narrativeSource`                      | `"ai" \| "template"`          |                                        |
| `suggestedTypeChange`                  | `ConnectionType \| undefined` | Offered, never applied (FR-032b).      |
| `stateHash`                            | `string`                      | Staleness guard (FR-026).              |
| `isOverride`                           | `boolean`                     | Pacing rule overridden (FR-013).       |

### `FactionTurnChange`

One reversible mutation. Both directions use the same shape, so undo is "apply the inverse list".

| Variant               | Fields                                               |
| --------------------- | ---------------------------------------------------- |
| `stat-value`          | `fieldId`, `from`, `to`, `clamped: boolean`          |
| `connection-strength` | `targetId`, `from \| null`, `to`, `clamped: boolean` |
| `connection-created`  | `targetId`, `type`                                   |
| `connection-type`     | `targetId`, `from`, `to` — only when the GM opted in |

`from: null` on `connection-strength` means no edge existed; its inverse removes the edge rather than setting a strength.

---

## 4. Persisted history

### `FactionTurnRecord`

| Field                     | Type                  | Notes                                                          |
| ------------------------- | --------------------- | -------------------------------------------------------------- |
| `id`                      | `string`              |                                                                |
| `worldDate`               | `WorldDateStamp`      | FR-035.                                                        |
| `committedAt`             | `number`              | Epoch ms — real time, for stable ordering within a world date. |
| `action`                  | `"influence"`         |                                                                |
| `targetId`, `targetTitle` | `string`              | Title snapshotted so FR-040 survives target deletion.          |
| `resolution`              | `FactionResolution`   | Full detail retained forever (FR-041).                         |
| `changes`, `inverse`      | `FactionTurnChange[]` | FR-027, FR-028.                                                |
| `narrative`               | `string`              | As the GM left it (FR-021h).                                   |
| `narrativeSource`         | `"ai" \| "template"`  |                                                                |
| `isOverride`              | `boolean`             | FR-013.                                                        |
| `undone`                  | `boolean`             | FR-029 — marked, never deleted.                                |
| `promotedEventId`         | `string \| undefined` | FR-039.                                                        |

**Ordering**: chronological by `worldDate`, then `committedAt` (FR-036). Entries whose `calendarRevision` no longer validates sort last and render as undated, consistent with existing timeline behaviour.

---

## 5. Vault-level settings

Stored alongside existing calendar settings in the `settings` IDB store, keyed per vault. Not part of any entity.

### `FactionTurnSettings`

| Field                | Type                | Default  | Notes                               |
| -------------------- | ------------------- | -------- | ----------------------------------- |
| `turnIntervalUnit`   | `"year" \| "month"` | `"year"` | Units the vault's calendar defines. |
| `turnIntervalAmount` | `number`            | `1`      | FR-009.                             |
| `useRandomness`      | `boolean`           | `true`   | FR-019.                             |
| `aiBandSelection`    | `boolean`           | `true`   | FR-021f — independent of narration. |
| `aiNarration`        | `boolean`           | `true`   | FR-021f.                            |
| `baselineOpposition` | `number`            | tuned    | FR-020c.                            |

---

## 6. Eligibility — state transitions

Computed, never stored. Inputs: resolved current world date, `lastTurnDate`, settings, and the vault's `WorldCalendar` — the calendar is required because "one interval of world time" depends on the vault's own month lengths and days-per-year.

| State           | Condition                               | Behaviour                                                                                                                                                                    |
| --------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `no-world-date` | Resolver returned `source: "realWorld"` | **Not** eligible. Explain and offer to set a date (FR-008a, US2 scenarios 7–8). See research R1 — this tier is a real-world date and must never be treated as campaign time. |
| `never-acted`   | `lastTurnDate` absent                   | Eligible (FR-011).                                                                                                                                                           |
| `eligible`      | `current − lastTurnDate ≥ interval`     | Eligible (FR-010).                                                                                                                                                           |
| `too-soon`      | `current − lastTurnDate < interval`     | Not eligible; show last turn date and next eligible date (FR-012). Override available (FR-013).                                                                              |
| `clock-behind`  | `current < lastTurnDate`                | Not eligible, no error, no repair prompt (FR-014).                                                                                                                           |

**On undo**: `lastTurnDate` is recomputed from the newest non-undone record, or cleared if none remain (FR-010, edge case).

---

## 7. Relationships to existing models

| Existing model                 | How this feature uses it                                                                       |
| ------------------------------ | ---------------------------------------------------------------------------------------------- |
| `EntitySchema`                 | Gains optional `factionTurn`. Nothing else changes.                                            |
| `StatSheet` / `StatSheetField` | Holds the stat values. Bounds drive FR-034 clamping. Not modified.                             |
| `Connection`                   | The single faction → target edge. `strength` is the hold. Written via `EntityMutationService`. |
| `WorldCalendar`                | **Read only.** FR-006 — never written.                                                         |
| `RollResult` (dice-engine)     | Embedded in `FactionResolution`.                                                               |
| Event entity                   | Created only on promotion (FR-037, FR-038); linked back by `promotedEventId`.                  |
