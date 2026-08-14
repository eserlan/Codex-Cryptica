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

## DeckState

**Not** part of the RandomSource file. One JSON file per deck (R2, R3):

```
_decks/<deck-slug>/state.json
```

| Field       | Type       | Notes                                   |
| ----------- | ---------- | --------------------------------------- |
| `deckId`    | `string`   | Owning RandomSource id.                 |
| `drawn`     | `string[]` | Card ids currently in the discard pile. |
| `updatedAt` | `number`   | Epoch ms. Diagnostics only.             |

**Invariants**

- `drawn` only grows until a reset, which clears it (FR-025).
- Remaining deck = `cards.filter((c) => !drawn.includes(c.id))`.
- Card ids in `drawn` that no longer exist in the deck (a card was deleted) are
  ignored on read and pruned on the next write.

**Why a separate file, and why no merge rule**: draws happen constantly during
play, so keeping state out of the deck's authored Markdown avoids rewriting the
definition on every draw. And because Google Drive transfer is an explicit
whole-vault `push` / `pull` rather than live sync, two devices never hold the
same deck at once — the file needs no device identity, no generation counter,
and no merge (R3).

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
RandomSource (1) ──  DeckState         (one per deck, kind: deck)
TableEntry/Card   ──< Reference ──> RandomSource   (by name, resolved at roll time)
RollRecord        ──> ResolutionNode tree
```

Note the reference edge is **by name, not by id** (clarification 1) — which is
why FR-003a's uniqueness constraint and FR-042's rename warning are load-bearing
rather than conveniences.
