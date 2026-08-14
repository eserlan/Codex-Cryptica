# Quickstart: Random Roll Tables and Custom Card Decks

**Feature**: 157-random-tables-decks

How to work on this feature, and how to check it actually behaves.

---

## Layout

```
packages/random-source-engine/     # all logic lives here
  src/
    types.ts                       # RandomSource, TableEngine, Card, DeckState…
    engine.ts                      # RandomSourceEngine — roll, rollMany, rerollFragment
    resolver.ts                    # reference parsing, cycle + depth handling
    deck-service.ts                # DeckService, DeckStateStore interface
    parser.ts                      # parseRandomSource / serialiseRandomSource
    import/                        # lines | delimited | markdown-table parsers
    validation.ts                  # validateSource → Diagnostic[]
  tests/

apps/web/src/lib/
  stores/random-source-store.svelte.ts   # vault-backed CRUD
  stores/deck-state-store.ts             # DeckStateStore impl over the vault
  components/random/                     # editor, roller, deck, import UI
  routes/(app)/tables/                   # authoring + rolling routes
```

---

## Commands

```bash
bun run test --filter random-source-engine   # package unit tests
bun run lint                                 # required before done (Const. VI.3)
bun run test                                 # full suite
bun x playwright test apps/web/tests/random-tables.spec.ts
```

---

## Build order

Slices are independently shippable and map to the spec's user stories.

1. **US1 — author + roll a flat table** (P1, MVP). Package types, parser,
   weighted selection over `DiceEngine`, vault CRUD, editor, roll view, history
   write-through. Shippable alone.
2. **US2 — nested references** (P1). `resolver.ts` with visited-set cycle
   detection and depth cap, chain display, fragment re-roll.
3. **US3 — paste import** (P2). Three parsers, preview with per-row problems,
   column remap, name-collision prompt.
4. **US4 — decks + discard pile** (P2). `DeckService`, per-device state files,
   reset/shuffle, exhaustion handling.
5. **US5 — images, reversals, spreads** (P3). `AssetManager` wiring, bulk card
   import, spread definition and capacity pre-check.
6. **US6 — Oracle commands** (P3). `/table` and `/deck` intents plus
   `RandomSourceExecutor`.

Slices 1–2 both land before import: importing into a table system that cannot
yet resolve references would produce files needing a second pass.

---

## Manual verification

Each maps to a success criterion the automated tests cannot fully cover.

**SC-007 — deck state survives restart and sync**

1. Create a deck of 10 cards, draw 3.
2. Hard-reload. Remaining shows 7, discard shows the same 3.
3. With a second device (or a second browser profile on the same synced vault),
   draw 2 there, then sync both.
4. Both devices show 5 remaining and the same 5 discarded — **no card
   reappears** and neither device's draws are lost. This is the FR-024a union.
5. Reset on one device, sync. Both show 10 remaining — the reset generation wins
   over the other device's older draws rather than being re-unioned away.

**SC-006 — cycle safety**

Author `A` containing `{B}`, `B` containing `{A}`. Roll `A`. Expect a usable
result, a visible "reference loop" notice, and no hang. Then author a chain 9
deep and confirm it reports the _nesting limit_ — a different message.

**SC-009 — resolution chain readable**

Roll a table whose entry is `A {creature} guarding {treasure}`. Without leaving
the result view, confirm which sub-table produced each fragment.

**FR-012a — referenced decks do not deplete**

Put `{oracle-deck}` in a table entry. Roll it 20 times. The deck's discard pile
stays empty and its remaining count is unchanged.

**SC-010 — discoverability**

From the table editor, after adding entries, confirm a roll control is present
without navigating away.

---

## Gotchas

- **Never write another device's state file.** Single-writer-per-file is the
  whole reason deck state survives ADR 006's last-version-wins sync. See R3.
- **`/draw` is taken** by image generation. Use `/table` and `/deck`.
- **`Card.id` must be stable across edits** — DeckState references cards by id,
  so regenerating ids silently resets every deck.
- **Coverage diagnostics never block save** (FR-006). Only a duplicate name does.
- **Use `DiceEngine`, not `Math.random()`** — SC-008 is tested with a seeded
  provider and will fail otherwise.
- **"Labels", never "tags"** (Constitution XII); the vault frontmatter parser
  actively rejects a `tags` key.
