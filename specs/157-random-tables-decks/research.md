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
**separate JSON file per deck**, also in the vault. Nothing about a table or
deck lives only in IndexedDB.

Draw state is a separate file rather than extra frontmatter on the deck so that
a draw — which happens constantly during play — never rewrites the deck
definition, keeping the authored file stable and diff-friendly.

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

## R3. Deck state is ordinary vault content — no merge rule needed

**Decision**: Deck state is a single JSON file per deck in the vault:

```
_decks/state/<deckId>.json
```

It is written by whichever device is being played on and travels with the vault
like any other file. There is no merge algorithm, no generation counter, and no
device identity.

**Rationale**: An earlier draft of this document specified per-device state
files with a grow-only union merge, on the assumption that two devices could
hold the same deck concurrently. That assumption was wrong. There is no live
cross-device sync in this product: `GDriveSyncService` exposes an explicit
`push(vaultId)` and `pull(vaultId)`, both user-initiated and whole-vault. A user
saves the vault to Drive on one device and loads it on another. The two are
never live at once, so there is no concurrent write to reconcile.

That makes ADR 006's file-level "last version wins" exactly the right
behaviour rather than a hazard to design around: pulling a vault replaces local
content wholesale, and deck state riding along with it is precisely what a user
expects — the deck is where they left it in the vault they just loaded.

Dropping the merge removes a device-id concept, a generation counter, a
multi-file read path, and the invariant tests guarding all three, in exchange
for no loss of user-visible behaviour (Constitution III).

**Alternatives rejected**:

- _Per-device files with union merge_ (the earlier draft): solves a concurrency
  problem this product does not have. Pure complexity.
- _Deck state inside the deck's frontmatter_: every draw would rewrite the
  authored definition file, churning diffs and risking a draw clobbering a
  concurrent edit to the deck's cards.
- _Deck state in IndexedDB only_: would not travel on a Drive push/pull, so a
  loaded vault would show a full deck the user had already drawn from.

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

**Correction found during implementation**: this document originally said the
"did you mean" suggestions for FR-040 would reuse "existing fuzzy matching in
`search-engine`". No such helper exists — `search-engine` wraps FlexSearch for
full-text document indexing and exposes nothing for comparing two short names.
The store therefore carries a small bigram-similarity function of its own.
That is not a Constitution III violation, because there was no existing
implementation to reuse; the original claim was simply wrong.

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

## R11. Host/guest sessions — host-only for now, and why decks cannot copy dice

**Decision**: Tables and decks are **host-only** in this feature. They are not
added to the guest vault snapshot, and guests cannot roll or draw. Guest support
is deferred to a follow-up (issue #2249) with the design below already settled.

**Rationale**: The guest surface is read-only by construction.
`GuestExporter.export` takes an explicit allow-list — entities, maps, canvases,
assetManifest — so a new content kind is simply absent from the published
snapshot. `GuestVaultStore` holds that snapshot, and the P2P protocol carries
vault mutations host→guest only (`ENTITY_UPDATE`, `GRAPH_SYNC`, `MAP_SYNC`).
Guests have no vault write path at all. Shipping as planned therefore degrades
cleanly: guests do not see tables or decks, and nothing breaks.

When guest support is built, tables and decks need **different** mechanisms, and
the codebase already contains both patterns:

- **Dice pattern (stateless).** `vtt-chat-manager.svelte.ts` resolves `/roll`
  locally on the sender's machine via `diceEngine.evaluate` and broadcasts only
  the result as a chat payload. Safe because a roll consumes nothing shared.
- **Token pattern (mutates shared state).** A guest sends `TOKEN_ADD_REQUEST`;
  the host validates, mutates, and broadcasts `TOKEN_STATE_UPDATE`. Guests
  request, the host decides.

**Rolling a table is stateless**, so it fits the dice pattern: publish tables
into the guest snapshot and let guests resolve locally. The wrinkle is nested
references — a guest can only resolve `{creature}` if that table was published
too, so the export must include the reference closure of every published table
or mark unresolved fragments.

**Drawing a card cannot use the dice pattern.** The discard pile is shared
mutable state and only the host has a vault to persist it to. Local guest
resolution would let two guests draw the same card while the host's `state.json`
learned of neither. Draws must be host-authoritative: `DECK_DRAW_REQUEST` →
host draws against its own state → host writes and broadcasts the result.

Worth recording explicitly: **this is the genuine concurrency case in this
feature.** The cross-device merge an earlier draft designed (see R3) was
imaginary, but two guests pressing draw in the same second is real. It is
resolved by host authority rather than by a merge — simpler, and already the
established pattern in this codebase.

**Alternatives rejected**:

- _Adding a seventh user story now_: needs protocol additions, a new handler,
  and `GuestExporter` changes, all sitting behind a P2 story. Expanding scope
  mid-feature for an audience that does not exist until decks ship.
- _Letting guests resolve draws locally_: silently duplicates cards across
  guests and loses every draw the host never hears about.

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
