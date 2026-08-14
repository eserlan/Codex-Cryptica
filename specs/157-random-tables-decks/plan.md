# Implementation Plan: Random Roll Tables and Custom Card Decks

**Branch**: `157-random-tables-decks` | **Date**: 2026-08-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/157-random-tables-decks/spec.md`

## Summary

Make random tables and card decks first-class user-authored vault content:
authored in-app, rolled or drawn in one action, resolvable through nested
`{reference}` tokens, and importable in bulk from pasted text.

The approach is a new `packages/random-source-engine` workspace package holding
the entire content model and all selection logic, with `apps/web` as a thin UI
layer (Constitution I). Sources are Markdown-plus-frontmatter files so they
inherit vault export, sync, backup, and search for free. Randomness comes from
the existing `DiceEngine`, whose rejection sampling already provides the
unbiased distribution SC-008 demands.

Deck draw state is a plain JSON file per deck, sitting beside the deck's
definition so it travels with the vault but does not rewrite the authored file on
every draw. It needs no merge rule: Google Drive transfer is an explicit
whole-vault `push` / `pull`, never live sync, so two devices are never holding
the same deck at once and ADR 006's file-level last-version-wins is exactly the
behaviour a user expects when loading a vault.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 Runes, SvelteKit 2, Bun 1.3.14
**Primary Dependencies**: `dice-engine` (selection), `vault-engine` (file CRUD, `AssetManager` for card images), `oracle-engine` (chat commands), `search-engine` (name matching for FR-040)
**Storage**: Vault Markdown + YAML frontmatter for definitions; one JSON file per deck for draw state; existing `dice_history` IndexedDB store for history (no version bump)
**Testing**: Vitest with an injected deterministic `CryptoProvider`; Playwright for authoring→roll and deck-persistence journeys
**Target Platform**: Browser, local-first, fully offline
**Project Type**: Web application — workspace package + SvelteKit UI
**Performance Goals**: p95 roll under 50 ms in-process for a 1,000-entry table at full depth; authoring stays inside the 16 ms frame budget at 1,000 entries via list virtualisation (resolves SC-003, R7)
**Constraints**: No network and no AI on any path (FR-020/030/038); deck state must survive a restart and travel with the vault on a Drive push/pull
**Scale/Scope**: 1,000 entries per table (SC-004); ~78 cards per deck; one state file per deck

## Constitution Check

_GATE: passed before Phase 0; re-checked after Phase 1 design._

| Principle                      | Status | How                                                                                                                                                                           |
| ------------------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Library-First               | PASS   | All logic in `packages/random-source-engine`; `apps/web` holds only UI, stores, routes.                                                                                       |
| II. TDD                        | PASS   | Package is pure functions over plain data; Red-Green-Refactor per slice. Seeded RNG makes SC-006/SC-008 deterministic.                                                        |
| III. Simplicity & YAGNI        | PASS   | Reuses `DiceEngine`, `AssetManager`, `dice_history`, `search-engine` matching. No new sampler, no new history surface. #2033 explicitly not folded in (R9).                   |
| IV. AI-First Extraction        | N/A    | Feature is deliberately AI-free (spec Assumptions). Does not weaken the Oracle path; adds two non-AI intents beside it.                                                       |
| V. Privacy & Client-Side       | PASS   | Entirely client-side and offline by requirement.                                                                                                                              |
| VI. Clean Implementation       | PASS   | Svelte 5 Runes, Tailwind 4 tokens per `docs/STYLE_GUIDE.md`; `bun run lint` + `bun run test` gate every slice.                                                                |
| VII. User Documentation        | PASS   | Help article in `apps/web/src/lib/config/help-content.ts` plus a `FeatureHint` for first-run — reference syntax is exactly the kind of complex interaction that clause names. |
| VIII. Dependency Injection     | PASS   | `RandomSourceEngine(diceEngine?, maxDepth?)`, `DeckService(store, diceEngine?)`; `DeckStateStore` is an injected seam. Class + default singleton exported.                    |
| IX. Natural Language           | PASS   | "Table", "Deck", "Draw", "Reset", "Shuffle". Diagnostics phrased plainly ("This entry can never be rolled").                                                                  |
| X. Quality & Coverage          | PASS   | New package targets the 70% introduction goal; pure-logic design makes that cheap.                                                                                            |
| XI. Agent Operational Protocol | PASS   | Slices are surgical and independently shippable; no unrelated refactors. Deferred items named rather than silently guessed.                                                   |
| XII. Labels Over Tags          | PASS   | `RandomSource.labels`; no "tags" anywhere — the vault frontmatter parser rejects that key outright.                                                                           |

**Post-Phase 1 re-check**: still passing. The design adds no new dependency, no
new persistence layer, and no change to shared infrastructure. An earlier draft
carried a per-device deck-state merge scheme; it was removed once the sync model
turned out to be explicit whole-vault push/pull rather than live sync, which
makes the merge unnecessary (III, XI.2).

## Project Structure

### Documentation (this feature)

```text
specs/157-random-tables-decks/
├── plan.md              # This file
├── spec.md              # Feature spec (5 clarifications recorded)
├── research.md          # Phase 0 — R1–R10
├── data-model.md        # Phase 1 — entities, invariants, file shapes
├── quickstart.md        # Phase 1 — build order, manual verification, gotchas
├── contracts/
│   └── random-source-engine.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 — created by /speckit-tasks, NOT here
```

### Source Code (repository root)

```text
packages/random-source-engine/
├── src/
│   ├── index.ts
│   ├── types.ts              # RandomSource, TableEntry, Card, DeckState, ResolutionNode
│   ├── engine.ts             # RandomSourceEngine: roll, rollMany, rerollFragment
│   ├── resolver.ts           # reference parsing, visited-set cycles, depth cap
│   ├── deck-service.ts       # DeckService + DeckStateStore interface
│   ├── parser.ts             # parseRandomSource / serialiseRandomSource
│   ├── validation.ts         # validateSource → Diagnostic[]
│   └── import/
│       ├── detect.ts
│       ├── lines.ts
│       ├── delimited.ts
│       └── markdown-table.ts
└── tests/

apps/web/src/lib/
├── stores/
│   ├── random-source-store.svelte.ts   # vault-backed CRUD, name-uniqueness check
│   ├── deck-state-store.ts             # DeckStateStore over the per-deck state file
│   └── dice-history.svelte.ts          # EXTENDED: optional `source` payload
├── components/random/
│   ├── TableEditor.svelte              # virtualised entry list
│   ├── TableRoller.svelte              # result + resolution chain + re-roll
│   ├── ResolutionChain.svelte          # SC-009
│   ├── DeckView.svelte                 # draw, discard, reset, spreads
│   ├── CardEditor.svelte
│   └── ImportWizard.svelte             # paste → preview → remap → save
├── config/help-content.ts              # EXTENDED: help article (Const. VII)
└── routes/(app)/tables/

packages/oracle-engine/src/
├── types.ts                            # EXTENDED: roll-table, draw-deck intents
├── oracle-parser.ts                    # EXTENDED: /table, /deck
├── oracle-executor.ts                  # EXTENDED: route both intents
└── executors/random-source-executor.ts # NEW, mirrors dice-executor.ts
```

**Structure Decision**: Workspace package plus thin SvelteKit UI, per
Constitution I and matching the existing `dice-engine` / `chronology-engine`
precedent. Oracle integration is additive — three extended files and one new
executor built to the shape of `dice-executor.ts`.

## Key Design Decisions

Full reasoning in [research.md](./research.md).

1. **Reuse `DiceEngine` for all randomness** (R1). Its rejection sampling is
   what makes SC-008 achievable and its injectable `CryptoProvider` is what makes
   SC-008 _testable_.
2. **Definitions are vault Markdown files** (R2), giving export, sync, backup,
   and search for free, and keeping files hand-editable and import-round-trippable.
3. **Deck state is one plain JSON file per deck** (R3), needing no merge rule
   because Drive transfer is explicit whole-vault push/pull, not live sync.
4. **New package rather than extending `dice-engine`** (R4).
5. **`/table` and `/deck`, never `/draw`** (R5) — `/draw` already routes to image
   generation.
6. **Extend `dice_history`, don't fork it** (R6). Additive field, no migration.
7. **Cycle detection is a visited set, not just a depth counter** (R8), because
   FR-014 and FR-015 require _different_ messages for loops and deep nesting.
8. **#2033 VTT room tile decks stay separate** (R9), with a named revisit trigger.

## Risks

| Risk                                              | Mitigation                                                                                                    |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Two rapid draws interleave and lose one           | `DeckStateStore` serialises writes; covered by a unit test for back-to-back draws                             |
| Name-based references break on rename             | FR-042 warns and offers to rewrite referencing entries; `duplicate-name` is the only save-blocking diagnostic |
| 1,000-entry authoring jank (SC-004)               | Virtualised entry list; the budget in R7 names rendering, not sampling, as the real risk                      |
| Card id churn silently resetting decks            | Ids assigned once at creation, preserved through edit and re-import; called out in quickstart gotchas         |
| Import ambiguity between weight and range columns | `detectFormat` is only a suggestion; the preview always allows remapping before save (FR-034)                 |

## Complexity Tracking

No constitution violations to justify, and no non-obvious mechanism left. An
earlier draft of this plan introduced per-device deck-state files with a
grow-only union merge; that was removed once the sync model proved to be
explicit whole-vault push/pull rather than live sync, taking a device-id
concept, a generation counter, and a multi-file read path with it. R3 records
the reversal and its rejected alternatives.
