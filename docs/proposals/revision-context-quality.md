# Proposal: Improving Related-Entity Context Quality for Revisions

**Status:** Done
**Date:** 2026-06-17
**Related:** Issue #1401, PR #1404 (related-entity context enrichment)
**Scope:** `buildRelatedEntityContext` (oracle-engine) + the revision-manager callback that feeds it.

## Problem

When an entity is revised, we assemble a `RELATED ENTITY CONTEXT` block so the
AI can ground titles, places, and relationships. Today that assembly is **pure
lexical title matching** with two concrete gaps that hurt response quality:

- **Recall (Gap A):** we ignore the entity `aliases` field (and the vault's
  `titleAndAliasIndex`). "Republic of Shas" with alias "Shas" only matches via
  the word-level fallback; abbreviations / nicknames are missed entirely.
- **Precision (Gap B):** the `getConsolidatedContext` callback returns
  **lore first, then content** (`context-retrieval.service.ts:21-23`). For a
  _related_ entity we only need a thumbnail; sending its full lore (e.g. the
  Great Library of Shas' two paragraphs) crowds the other entities out of the
  model's attention and removed the previous truncation safety net.

This plan implements levers **1, 2, 3, 4, 6** from the design discussion.
Lever 5 (semantic retrieval) is deferred — see Future Improvements.

## Goals

- Find the _right_ related entities (recall) and send a _clean, balanced_
  thumbnail of each (precision).
- Keep `@codex/oracle-engine` pure (no app imports); app-specific concerns
  (which field to send, DEV logging) stay in `revision-manager`.
- Keep all scoring weights as named, tunable constants.

## Non-goals

- Semantic / embedding retrieval (deferred, lever 5).
- Fuzzy / typo-tolerant matching ("hlauglar" → "hlaugar").
- Changing the shared `getConsolidatedContext` used by chat / art-style paths.

---

## Lever 1 — Match on aliases (recall)

**Rationale:** Entities carry `aliases: string[]` (schema `entity.ts:145`).
A direct alias match is higher confidence than the word-level title fallback.

**Implementation** (`packages/oracle-engine/src/revision-context.ts`):

- Replace `scoreTitleMentions(title, text)` with `scoreEntityMentions(entity, text)`
  that scores the title **and** each alias, returning the **max**:
  - full string match → `2`
  - word-level match on a significant word (≥ `MIN_TITLE_SCAN_LENGTH`) → `1`
  - else `0`
- Apply in both places that currently call `scoreTitleMentions`:
  - `addCandidate` (the connection passes — so a connected entity also named by
    alias scores higher).
  - the title-scan pass.
- The engine reads `related.aliases` directly from `vault.entities[id]`; no
  dependency on the app's `titleAndAliasIndex` (keeps the package pure). The
  index stays an app-side optimization we may wire later for large vaults.

**Tests** (`revision-context.test.ts`):

- Entity titled "Great Library of Shas" with alias "The Library" is found when
  the text says "the Library" but never says "Great Library of Shas".
- Alias match does not fire on a too-short alias (< `MIN_TITLE_SCAN_LENGTH`).

---

## Lever 2 — Send the chronicle, not full lore (precision)

**Rationale:** The related block should be a thumbnail. `entity.content`
(chronicle) is the always-hydrated short field; `entity.lore` is long and
lazily loaded.

**Implementation** (`apps/web/src/lib/stores/oracle/revision-manager.svelte.ts`):

- Change the `getConsolidatedContext` callback passed into
  `buildRelatedEntityContext` to prefer the chronicle:
  ```ts
  getConsolidatedContext: (related) =>
    related.content?.trim() ||
    s.contextRetrieval.getConsolidatedContext(related),
  ```
  Lore is used only as a fallback when an entity has no chronicle yet.
- The shared `contextRetrieval.getConsolidatedContext` is **unchanged** (chat,
  art-style, plot analysis keep current behaviour).

**Tests** (`revision-manager.test.ts`):

- Related entity with both content and lore contributes its **content** to the
  context summary, not its lore.

---

## Lever 3 — Budget the context set (precision)

**Rationale:** Even chronicles aren't always small (Great Library of Shas).
One verbose entry must not starve the other five.

**Implementation** (`packages/oracle-engine/src/revision-context.ts`):

- Add a total budget as a named constant:
  ```ts
  const MAX_TOTAL_CHARS = 1600; // overall related-context budget
  ```
- Chronicle content is typically short, so no per-entity cap is applied (the
  original `MAX_PER_ENTITY_CHARS = 320` was dropped after validation showed
  chronicles fit comfortably within budget). Any single entry that exceeds
  `MAX_TOTAL_CHARS` is truncated with an ellipsis as a hard safety cap.
- In the final, score-sorted map: accumulate summary length and stop including
  further candidates once `MAX_TOTAL_CHARS` is reached (highest-scoring entities
  claim their share first because the list is pre-sorted).

**Tests:**

- A single entry whose summary passes the total budget is capped with an ellipsis.
- Given many candidates, the returned set's combined summary length stays within
  `MAX_TOTAL_CHARS` and drops lowest-ranked entries first.

---

## Lever 4 — Rebalance scoring (ranking)

**Rationale:** Make the signal weights explicit and ensure an entity that is
**both** graph-connected **and** named in the current revision ranks at the top.

**Implementation** (`packages/oracle-engine/src/revision-context.ts`):

- Promote the magic numbers to named weights:
  ```ts
  const WEIGHT_CONNECTION = 3; // confirmed graph edge (was 2)
  const WEIGHT_NAMED_INCOMING = 6; // named in incoming passage / instructions
  const WEIGHT_NAMED_CURRENT = 2; // named in the existing record
  ```
- Scores still accumulate in `addCandidate`, so connected **and** named already
  sums (e.g. `3 + 6 = 9`) above name-only (`6`) and connection-only (`3`).
  Document this additive model in a comment so the ranking intent is explicit.
- Keep the deterministic tie-break (`score desc, then title asc`).

**Tests:**

- An entity that is connected and named in the incoming text outranks one that
  is only named, which outranks one that is only connected.

---

## Lever 6 — Observability (verify we send the right set)

**Rationale:** The cheapest way to _confirm_ quality is to see exactly what was
selected, with scores, on each revision.

**Implementation:**

- `buildRelatedEntityContext` accepts an optional `debug?` callback in its
  options:
  ```ts
  debug?: (selected: Array<{ title: string; score: number; chars: number }>) => void;
  ```
  Called once with the final, sorted, budgeted set (engine stays pure — it just
  invokes the callback if provided).
- `revision-manager.svelte.ts` passes a DEV-gated logger:
  ```ts
  debug: import.meta.env.DEV
    ? (sel) => console.log("[RevisionContext] selected related:", sel)
    : undefined,
  ```

**Tests:**

- When a `debug` callback is supplied, it is invoked with the selected set
  including per-entity score and char count.

---

## Implementation phases & tasks

Each phase is one lever, ordered so foundations land first and each phase ships
as its own reviewable commit. `[P]` marks tasks that can be done in parallel
(different files / no shared edits). Files:

- **ENGINE** = `packages/oracle-engine/src/revision-context.ts`
- **ENGINE-TEST** = `packages/oracle-engine/src/revision-context.test.ts`
- **MGR** = `apps/web/src/lib/stores/oracle/revision-manager.svelte.ts`
- **MGR-TEST** = `apps/web/src/lib/stores/oracle/tests/revision-manager.test.ts`

### Phase 1 — Named scoring weights (Lever 4) · foundation, no behaviour change

> Lands the constants every later phase references. Depends on: nothing.

- [x] **T101** ENGINE — add weight constants near `MIN_TITLE_SCAN_LENGTH`:
      `WEIGHT_CONNECTION = 3`, `WEIGHT_NAMED_INCOMING = 6`, `WEIGHT_NAMED_CURRENT = 2`.
- [x] **T102** ENGINE — replace the magic numbers in `addCandidate` (connection
      base) and both `scoreTitleMentions` multipliers with the constants.
- [x] **T103** ENGINE — add a comment documenting the **additive** model
      (connected + named sums above either signal alone).
- [x] **T104** ENGINE-TEST — add ordering test: connected+named ⟩ named-only ⟩
      connection-only.
- [x] **T105** Run `bun test ENGINE-TEST`; confirm the existing
      "prioritizes connected entities" test still passes (weights shift, order holds).

**Acceptance:** all scoring numbers are named constants; suite green; selection
order unchanged except the intended connected+named promotion.

### Phase 2 — Alias matching (Lever 1) · recall

> Depends on: Phase 1 (uses the weight constants).

- [x] **T201** ENGINE — replace `scoreTitleMentions(title, text)` with
      `scoreEntityMentions(entity, text)` that scores title **and** each alias,
      returning the max (full = 2, word-level = 1, else 0).
- [x] **T202** ENGINE — update `addCandidate` to call `scoreEntityMentions(related, …)`.
- [x] **T203** ENGINE — update the title-scan pass to use `scoreEntityMentions`
      and apply the `MIN_TITLE_SCAN_LENGTH` guard to aliases too.
- [x] **T204** [P] ENGINE-TEST — alias full match found ("The Library" → "Great
      Library of Shas"); too-short alias not matched; word-level alias match.
- [x] **T205** Run `bun test ENGINE-TEST` green.

**Acceptance:** an entity is found via any of its aliases; short aliases are
guarded; existing title-only behaviour preserved.

### Phase 3 — Chronicle over full lore (Lever 2) · precision · app-side only

> Depends on: nothing in the engine (independent of Phases 1–2); can run `[P]`.

- [x] **T301** MGR — change the `getConsolidatedContext` callback passed to
      `buildRelatedEntityContext` to prefer `related.content?.trim()`, falling
      back to `s.contextRetrieval.getConsolidatedContext(related)`.
- [x] **T302** [P] MGR-TEST — related entity with both fields contributes its
      **content**, not its lore.
- [x] **T303** Grep other `getConsolidatedContext` callers (chat, art-style,
      plot) to confirm the shared method is untouched.

**Acceptance:** related thumbnails are chronicles; lore only used when chronicle
empty; no other consumer changed.

### Phase 4 — Context budget (Lever 3) · precision

> Depends on: Phase 3 (budget is calibrated against chronicle-sized summaries).

- [x] **T401** ENGINE — add `MAX_PER_ENTITY_CHARS = 320`, `MAX_TOTAL_CHARS = 1600`.
- [x] **T402** ENGINE — restore `summarizeContext(value, max)` (normalise
      whitespace, trim, ellipsis) and apply the per-entity cap.
- [x] **T403** ENGINE — in the final score-sorted map, accumulate summary length
      and stop including candidates once `MAX_TOTAL_CHARS` is reached.
- [x] **T404** [P] ENGINE-TEST — per-entity truncation adds ellipsis; total
      budget drops lowest-ranked entries first.
- [x] **T405** Run `bun test ENGINE-TEST` green.

**Acceptance:** no single entity dominates; combined related context stays within
budget; highest-scoring entities are retained.

### Phase 5 — Observability hook (Lever 6) · validation aid

> Depends on: Phases 1–4 (logs the final, budgeted, scored set).

- [x] **T501** ENGINE — add optional `debug?(selected: {title; score; chars}[])`
      to `BuildRevisionContextOptions`; invoke once with the final set.
- [x] **T502** MGR — pass a DEV-gated logger:
      `debug: import.meta.env.DEV ? (sel) => console.log("[RevisionContext] selected related:", sel) : undefined`.
- [x] **T503** [P] ENGINE-TEST — when `debug` is supplied it is called with the
      selected set including per-entity `score` and `chars`.

**Acceptance:** in DEV, each revision logs exactly which related entities were
sent, with scores and sizes.

### Phase 6 — Validation & ship

> Depends on: all prior phases.

- [x] **T601** Run the full affected set:
      `bun test packages/oracle-engine/src/revision-context.test.ts apps/web/src/lib/services/ai/prompts/entity-revision.test.ts apps/web/src/lib/stores/oracle/tests/revision-manager.test.ts`.
- [x] **T602** Manual: revise "The Plains of Végtelen"; confirm the DEV log shows
      "Republic of Shas", "Kingdom of Rosintas", "High See of Hlaugar" with
      sensible scores, each a short chronicle thumbnail (not full lore).
- [x] **T603** Update this doc's **Status** → _Done_; commit per phase; extend
      PR #1404 or open a follow-up PR.

## Dependency summary

```
Phase 1 ─┬─▶ Phase 2 ─┐
         │            ├─▶ Phase 5 ─▶ Phase 6
Phase 3 ─┴─▶ Phase 4 ─┘
```

Phase 3 is independent of 1–2 and may proceed in parallel; Phases 4 and 5 each
join their upstreams before Phase 6.

## Risks

- **Budget too tight** drops a genuinely relevant entity. Mitigation: constants
  are tunable; the DEV log (lever 6) makes under/over-inclusion visible.
- **Chronicle-only** loses detail an entity only records in lore. Acceptable for
  a grounding thumbnail; lore fallback covers entities with empty chronicles.
- **Weight changes** reshuffle existing selections. Covered by deterministic
  ordering tests.

---

## Future improvements

- **Lever 5 — Semantic / embedding retrieval.** Catch descriptor references that
  name no entity ("the northern republic" → "Republic of Shas") by querying the
  existing `searchService` (or an embedding index) with the incoming text +
  instructions, and merging high-similarity hits into the candidate pool with
  their own weight. Higher effort; needs relevance-threshold tuning to avoid
  precision loss.
- **Wire `titleAndAliasIndex`.** For large vaults, use the vault's prebuilt
  title/alias index instead of scanning `Object.entries(vault.entities)` to keep
  candidate selection O(matches) rather than O(entities).
- **Fuzzy / typo tolerance.** Levenshtein or trigram match so "hlauglar" finds
  "Hlaugar". Guard carefully against false positives on short names.
- **Relation-type weighting.** Boost edges whose label implies containment or
  membership ("located in", "part of") over incidental "mentioned" links.
- **Per-entity field selection.** Let the lore template or entity type decide
  which field best summarises a related entity (e.g. a faction's leadership line).
