# Phase 0 Research: Random Roll Tables and Custom Card Decks

**Feature**: 157-random-tables-decks | **Date**: 2026-08-14

All items the spec deferred to planning are resolved below, plus the unknowns
surfaced while reading the existing code. No `NEEDS CLARIFICATION` remains.

---

## R1. Randomness source — reuse `dice-engine`, do not reimplement

**Decision**: Weighted selection and card shuffling both go through
`DiceEngine` (`packages/dice-engine/src/roller.ts`). Add a `selectIndex(weights: number[])`
capability rather than calling `Math.random()` anywhere in the new code.

**Rationale**: `DiceEngine.getRandomInt()` already implements rejection sampling
against `crypto.getRandomValues` with an explicit no-modulo-bias guarantee, and
buffers 256 words at a time. SC-008 requires observed distribution to match
configured weights across 1,000 rolls — that is exactly the property this
existing code was written and tested to provide. Its constructor already takes an
injectable `CryptoProvider` and `Clock`, which is what makes SC-008 testable with
a seeded provider (Constitution VIII).

**Alternatives rejected**: `Math.random()` (biased, untestable, would fail SC-008
under a fixed seed); a fresh sampler in the new package (duplicates solved logic,
violates Constitution III).

---

## R2. Storage split — definitions in the vault, draw state beside it

**Decision**: A Random Source definition is a Markdown file with YAML
frontmatter in the vault, exactly like an entity. Deck draw state is a
**separate per-device JSON file**, also in the vault. Nothing about a table or
deck lives only in IndexedDB.

**Rationale**: FR-002 requires tables and decks to be saved, exported, backed
up, and synced by the same mechanisms as other vault content. The vault is
Markdown-plus-frontmatter parsed by `packages/vault-engine/src/parser.ts`, so a
table stored this way inherits export, sync, backup, and full-text search for
free, and stays human-readable — which FR-031–FR-033 (paste-import) and the
spec's readability assumption both want.

The `canvases` IndexedDB store is the counter-precedent: canvases are app data
that deliberately does _not_ travel with the vault. Tables must travel, so they
are not modelled that way.

**Alternatives rejected**: IndexedDB-only (breaks FR-002 export/sync); a single
binary vault file (breaks readability and diffability).

---

## R3. Deck state across devices — per-device files, not a merge algorithm

**Decision**: Deck state is stored one file per device per deck:

```
_decks/<deck-slug>/state/<deviceId>.json
```

Each device writes **only its own file, ever**. Effective deck state is computed
by reading every `state/*.json` for that deck, taking the maximum `generation`
across them, and unioning the `drawn` arrays of only those files at that maximum
generation. Reset bumps the local file's `generation` and clears its `drawn`.

**Rationale**: This is the single most consequential finding of Phase 0. ADR 006
committed the sync engine to file-level **"last version wins"** with no
per-file merge hook — `SyncActionExecutor` copies whole files, and
`SyncContentComparator` only decides _which_ whole file survives. So FR-024a's
union-merge cannot be implemented as a merge strategy; there is nowhere to put
one without reopening ADR 006.

Making each file single-writer sidesteps this entirely: two devices never write
the same path, so "last version wins" never has a conflict to resolve, and the
union FR-024a requires emerges from _reading_ the set of files rather than from
merging them. The generation counter gives reset a total order, so a reset on
one device wins over concurrent draws on another instead of being silently
re-unioned away.

File count stays bounded at devices × decks (a handful), unlike an
append-one-file-per-draw log, which would also work but would litter the vault
and slow every sync scan.

**Alternatives rejected**:

- _Single shared state file per deck_: last-version-wins would drop a device's
  draws wholesale and resurrect drawn cards — the exact failure SC-007 forbids.
- _Append-only draw log (one file per draw)_: correct, but unbounded file growth
  in a vault that syncs on every pass; ADR 006 explicitly optimised for not
  re-scanning thousands of files.
- _Teaching `sync-engine` a per-type merge hook_: reopens an accepted ADR and
  makes a general-purpose change to serve one feature (Constitution III, XI.3).

---

## R4. Package boundary — a new `random-source-engine`

**Decision**: New workspace package `packages/random-source-engine`, depending
on `dice-engine`. It owns the content model, parse/serialise, the resolution
engine, weighted selection, deck draw semantics, and the paste-import parsers.
`apps/web` contributes only Svelte UI, stores, and routes.

**Rationale**: Constitution I requires every major feature to be a standalone
package with the web app as a thin UI layer. The feature is also mostly pure
logic over plain data, which is where the coverage goals (Constitution X, 70%
for new packages) are cheapest to hit.

**Alternatives rejected**: extending `dice-engine` (conflates a dice notation
evaluator with a content system); living in `apps/web/src/lib` (violates I).

---

## R5. Oracle command naming — `/draw` is already taken

**Decision**: Add two intents, `roll-table` and `draw-deck`, exposed as
`/table <name>` and `/deck <name>`. Do **not** use `/draw`.

**Rationale**: `OracleCommandParser` already routes `draw` to
`visualizationExecutor` for image generation (`oracle-executor.ts:118`).
Reusing the word would either break image generation or force an ambiguity
prompt mid-session, which is precisely what FR-039's "no navigation mid-sentence"
goal is trying to avoid. `/table` and `/deck` are unclaimed and read naturally
(Constitution IX).

`RandomSourceExecutor` follows the `DiceExecutor` shape exactly: extend
`BaseExecutor`, emit `COMMAND_STARTED` / `COMMAND_COMPLETED` / `COMMAND_FAILED`,
push a typed message onto `chatHistory`, and write through to history.

---

## R6. Roll history — extend, do not fork

**Decision**: Extend `ContextualRollResult` in
`apps/web/src/lib/stores/dice-history.svelte.ts` with an optional
`source` payload carrying the Random Source name, the resolution chain, and any
drawn cards. Widen `context` to `"chat" | "modal" | "table"`. Reuse the existing
`dice_history` IndexedDB store; no new history store, no new surface.

**Rationale**: The spec assumes one chronological record of everything
randomised in a session, and FR-018/FR-029 require rolls and draws to land in the
same history. `DiceHistoryStore` already persists to `dice_history` and takes an
injected `IdGenerator`. Adding an optional field is additive and needs no
IndexedDB version bump, since the store has no indexes over the new field.

**Alternatives rejected**: a parallel `table_history` store (two histories to
reconcile; contradicts the spec assumption).

---

## R7. Performance budget for SC-003

**Decision**: A roll of a 1,000-entry table resolving up to the depth limit
completes in **under 50 ms** on the p95 path, measured in-process excluding
render. Authoring interactions on a 1,000-entry table stay under the 16 ms frame
budget by virtualising the entry list.

**Rationale**: SC-003 was deliberately left as "feels instantaneous"; the spec's
checklist assigned the concrete number to this document. 50 ms is well inside
the ~100 ms threshold for perceived instantaneity and is trivially achievable —
resolution is array indexing plus a bounded recursion, with no I/O on the hot
path once the source is loaded. The real risk is list _rendering_ at 1,000
entries (SC-004), not sampling, which is why the budget names virtualisation.

---

## R8. Reference resolution depth limit

**Decision**: Fixed constant `MAX_RESOLUTION_DEPTH = 8`, exported from the
package. Cycle detection is a visited-set on the resolution path, not a depth
counter alone.

**Rationale**: FR-014 and FR-015 are distinct failures needing distinct
messages: a cycle (`A→B→A`) should say "reference loop", while legitimate deep
nesting should say "nesting limit". A depth counter alone cannot tell them
apart, so it would report cycles as depth failures and mislead the user. Eight
is far past any realistic hand-authored chain while keeping worst-case fan-out
bounded.

---

## R9. Issue #2033 (VTT random room tile decks) — keep separate for now

**Decision**: Do not fold VTT room tile decks into Random Source in this
feature. Re-evaluate once decks ship.

**Rationale**: The spec flagged this for a planning decision. Room tiles are
spatial objects consumed by `map-engine`/`spatial-engine` placement code, not
text results rendered into chat and history; the only genuinely shared part is
"pick one at random without replacement", which is one function, not a content
model. Coupling them now would drag map concerns into the content model to serve
a feature that is not being built in this branch (Constitution III / XI.2).

**Revisit trigger**: if #2033 starts needing authoring, import, or reset UI, that
is the signal it wants to be a Random Source mode.

---

## R10. Testing approach

**Decision**: Vitest unit tests in `packages/random-source-engine` with an
injected deterministic `CryptoProvider`; Playwright specs in `apps/web/tests/`
for the authoring → roll journey and for deck persistence across reload.

**Rationale**: Constitution II and X. A seeded provider makes SC-008's
distribution check and SC-006's cycle-safety check deterministic rather than
flaky. Deck persistence (SC-007) is only meaningful across a real reload, which
is a Playwright concern — the existing `apps/web/tests/dice-roll.spec.ts` is the
pattern to follow.
