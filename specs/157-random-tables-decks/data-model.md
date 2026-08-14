# Phase 1 Data Model: Random Roll Tables and Custom Card Decks

**Feature**: 157-random-tables-decks | **Date**: 2026-08-14

Types live in `packages/random-source-engine/src/types.ts` unless noted.

---

## RandomSource

One user-authored collection of possible results. Persisted as a Markdown file
with YAML frontmatter in the vault (R2).

| Field         | Type                         | Notes                                                       |
| ------------- | ---------------------------- | ----------------------------------------------------------- |
| `id`          | `string`                     | UUID, stable across renames.                                |
| `name`        | `string`                     | **Unique per vault** (FR-003a). The reference key.          |
| `kind`        | `"table" \| "deck"`          | Selection + presentation mode.                              |
| `description` | `string \| undefined`        | Optional.                                                   |
| `labels`      | `string[]`                   | Organisation (FR-009). "Labels", never "tags" — Const. XII. |
| `selection`   | `SelectionMode \| undefined` | Tables only. Absent on decks.                               |
| `entries`     | `TableEntry[]`               | Tables only.                                                |
| `cards`       | `Card[]`                     | Decks only.                                                 |
| `deckOptions` | `DeckOptions \| undefined`   | Decks only.                                                 |
| `spreads`     | `Spread[]`                   | Decks only (FR-028).                                        |

**Validation**

- `name` non-empty, trimmed, unique per vault, and free of `{` / `}` so it can
  never collide with reference syntax.
- Exactly one of `entries` / `cards` is populated, matching `kind`.
- `kind: "table"` requires `selection`.

**File shape** — `_tables/<slug>.md` or `_decks/<slug>.md`:

```markdown
---
id: 0f3c…
kind: table
name: Forest Encounters
labels: [encounters, wilderness]
selection: { mode: weighted }
---

| weight | result                           |
| ------ | -------------------------------- |
| 3      | A {creature} guarding {treasure} |
| 1      | An abandoned shrine              |
```

The body is a Markdown table so the file round-trips through the paste-importer
(FR-033) and stays readable in exports.

---

## SelectionMode

Discriminated union; a table is in exactly one mode and never mixes (FR-004).

```ts
type SelectionMode =
  | { mode: "weighted" } // die derived from weight total
  | { mode: "ranged"; die: DieSpec }; // explicit die, entries carry ranges
```

**Transitions** (FR-004a) — both directions are total, no data loss:

- `weighted → ranged`: contiguous ranges allocated in entry order, each of width
  equal to its weight; `die` becomes `d<sum of weights>`.
- `ranged → weighted`: each entry's weight becomes its range width; `die` dropped.

---

## TableEntry

| Field    | Type                  | Notes                                       |
| -------- | --------------------- | ------------------------------------------- |
| `id`     | `string`              | Stable across reorder.                      |
| `text`   | `string`              | May embed `{reference}` tokens.             |
| `weight` | `number \| undefined` | Weighted mode. Defaults to 1. Positive int. |
| `range`  | `Range \| undefined`  | Ranged mode. `{ min, max }`, inclusive.     |

**Validation**

- Weighted mode: `weight >= 1`; `range` absent.
- Ranged mode: `range` present, `min <= max`, both within the table's die.
- Coverage validation (FR-006) applies to ranged mode only and is **reported,
  never blocking** — gaps, overlaps, and unreachable entries surface as warnings.

---

## Card

| Field             | Type                  | Notes                                    |
| ----------------- | --------------------- | ---------------------------------------- |
| `id`              | `string`              | Referenced by DeckState. Stable forever. |
| `title`           | `string`              |                                          |
| `body`            | `string`              | May embed `{reference}` tokens (FR-012). |
| `imagePath`       | `string \| undefined` | Vault-relative, via `AssetManager`.      |
| `reversedMeaning` | `string \| undefined` | Shown when drawn reversed (FR-027).      |

`Card.id` stability matters more than elsewhere: DeckState records draws by card
id, so regenerating ids on edit would silently reset every deck.

---

## DeckOptions

```ts
interface DeckOptions {
  drawMode: "with-replacement" | "without-replacement"; // FR-022
  allowReversals: boolean; // FR-027
}
```

---

## DeckState — the sync-critical type

**Not** part of the RandomSource file. One JSON file per device per deck (R3):

```
_decks/<deck-slug>/state/<deviceId>.json
```

| Field        | Type       | Notes                                                    |
| ------------ | ---------- | -------------------------------------------------------- |
| `deckId`     | `string`   | Owning RandomSource id.                                  |
| `deviceId`   | `string`   | Writer identity. This device only ever writes this file. |
| `generation` | `number`   | Monotonic. Bumped by reset (FR-024a).                    |
| `drawn`      | `string[]` | Card ids drawn by this device at this generation.        |
| `updatedAt`  | `number`   | Epoch ms; diagnostics only, never merge input.           |

**Effective state** is derived, never stored:

```ts
function resolveDeckState(files: DeckState[]): {
  generation: number;
  drawn: Set<string>;
} {
  const generation = Math.max(0, ...files.map((f) => f.generation));
  const drawn = new Set(
    files.filter((f) => f.generation === generation).flatMap((f) => f.drawn),
  );
  return { generation, drawn };
}
```

**Invariants**

- Union is over the maximum generation only; older-generation files are ignored
  and may be garbage-collected on next write.
- `drawn` is grow-only within a generation. Nothing but a reset removes an id.
- A device mutates only the file whose `deviceId` is its own — the property that
  makes ADR 006's last-version-wins safe here.
- Remaining deck = `cards.filter((c) => !drawn.has(c.id))`.

---

## Reference

Parsed from entry/card text, never stored separately.

```ts
interface Reference {
  raw: string; // "{creature}"
  name: string; // "creature" — matched against RandomSource.name, case-insensitive
  start: number; // offsets into the source text, for highlighting + fragment re-roll
  end: number;
}
```

Unmatched or empty braces are literal text (spec Assumptions), not parse errors.

---

## ResolutionNode

The chain FR-018 and SC-009 require. A tree, flattened for display.

| Field        | Type                                               | Notes                                |
| ------------ | -------------------------------------------------- | ------------------------------------ |
| `sourceName` | `string`                                           | Which source produced this fragment. |
| `sourceKind` | `"table" \| "deck"`                                |                                      |
| `dieValue`   | `number \| undefined`                              | Tables only.                         |
| `text`       | `string`                                           | Resolved fragment.                   |
| `children`   | `ResolutionNode[]`                                 | Nested resolutions, in text order.   |
| `status`     | `"ok" \| "cycle" \| "depth-limit" \| "unresolved"` | Drives the user-facing notice.       |

`status` carries the three failure modes as data rather than exceptions, so
FR-014/FR-015/FR-016 all yield a usable result with a visible marker instead of
a thrown error.

---

## RollRecord

Extends the existing `ContextualRollResult` (R6) rather than replacing it.

```ts
interface RandomSourceRollPayload {
  sourceId: string;
  sourceName: string;
  kind: "table" | "deck";
  finalText: string;
  chain: ResolutionNode[];
  drawnCards?: Array<{ cardId: string; title: string; reversed: boolean }>;
  spreadPositions?: Array<{ label: string; cardId: string }>;
}
```

Attached as `ContextualRollResult.source`, with `context` widened to include
`"table"`. No IndexedDB migration needed — `dice_history` is keyed by `id` with
no index over the new field.

---

## Spread

| Field       | Type       | Notes                                     |
| ----------- | ---------- | ----------------------------------------- |
| `id`        | `string`   |                                           |
| `name`      | `string`   | e.g. "Situation / Complication / Outcome" |
| `positions` | `string[]` | Ordered labels; length = cards drawn.     |

Drawing a spread whose length exceeds the remaining deck warns **before**
drawing (FR-028 / US5 scenario 5), so no partial spread is ever dealt.

---

## Entity relationships

```
RandomSource (1) ──< TableEntry        (kind: table)
RandomSource (1) ──< Card              (kind: deck)
RandomSource (1) ──< Spread            (kind: deck)
RandomSource (1) ──< DeckState         (one per device, kind: deck)
TableEntry/Card   ──< Reference ──> RandomSource   (by name, resolved at roll time)
RollRecord        ──> ResolutionNode tree
```

Note the reference edge is **by name, not by id** (clarification 1) — which is
why FR-003a's uniqueness constraint and FR-042's rename warning are load-bearing
rather than conveniences.
