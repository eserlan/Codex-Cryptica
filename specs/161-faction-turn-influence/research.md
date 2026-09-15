# Phase 0 Research: Faction Turn — Influence Vertical Slice

**Feature**: 161-faction-turn-influence
**Date**: 2026-08-21

Purpose: resolve every unknown in the plan's Technical Context before design. Each item records what was chosen, why, and what was rejected.

---

## R1. Current world date — already exists, no new field needed

**Decision**: Reuse the existing `resolveCalendarCurrentDate()` chain rather than adding a `presentDate` field to `WorldCalendar`.

**Finding**: The spec's FR-007 asks for a current world date "expressible at a finer granularity than year alone", and the clarification session assumed this needed a new field. It does not. `packages/chronology-engine/src/calendar-view.ts:248` already resolves a full `{year, month, day}` through a three-tier chain:

1. **Entity title match** — the first exact-dated entity whose title is in `CURRENT_DATE_TITLES` (`"current date"`, `"today"`, `"present day"`, `"current day"`, `"now"`). This is exactly the convention the user described as "a bit abstract by having an event named something similar to current date" — it is a real, implemented tier, not a workaround.
2. **Vault setting** — `WorldCalendar.presentYear`, opening at month 1, no day.
3. **Real-world date** — the system clock.

The result is exposed as `calendarStore.calendarCurrentDate` (`apps/web/src/lib/stores/calendar.svelte.ts:25`), already populated by the timeline store (`timeline.svelte.ts:393`) and already consumed by `CalendarMonthView.svelte`.

**Consequence — the one real trap**: tier 3 returns the _real-world_ date. For a campaign set in year 640, that silently yields year 2026 and every faction becomes eligible forever. **The faction feature MUST treat `source === "realWorld"` as "no world date configured"** and surface US2 scenario 7's prompt instead of computing eligibility. Tiers 1 and 2 are both valid world dates; tier 3 is not.

**Rationale**: Avoids a schema change, a settings-UI change, and a migration, and inherits day precision plus the marker-event convention users already have. This deletes an entire workstream from the slice.

**Alternatives rejected**:

- _Add `presentDate: DateSelection` to `WorldCalendar`_ — duplicates a resolved value that already exists, creating two sources of truth for "now" and forcing a settings migration. Rejected outright once tier 1 was found.
- _Read the marker entity directly in the faction engine_ — reimplements tier logic the chronology engine owns, violating Principle III's reuse rule.

**Spec impact**: FR-007 and FR-008 are satisfied by existing behaviour. The Dependencies entry claiming the calendar would be "extended to carry a finer-grained current world date" was inaccurate and **has been corrected in `spec.md`** to reference the existing resolved date. The real-world-tier trap is now a first-class requirement, **FR-008a**, rather than only a plan-level note.

---

## R2. Faction stats storage — `entity.statSheet`

**Decision**: Faction stats are ordinary `StatSheetField` entries of type `"number"` on the faction entity's existing `statSheet`.

**Finding**: `StatSheetSchema` (`packages/schema/src/stat-sheet.ts:96`) is already on `EntitySchema` as an optional field, and `StatSheetFieldSchema` already carries `id`, `label`, `min`, `max`, `step`, and `value`. That is a precise match for FR-003 (named, scored, bounded) and FR-034 (clamping at GM-set bounds).

**Rationale**: Zero new storage, GM renaming for free, and the existing stat sheet editor already provides the authoring UI. Role mapping (FR-004a) stores field **ids**, so renaming a stat never breaks a mapping.

**Alternatives rejected**:

- _A dedicated `factionStats` record_ — reimplements bounded numeric fields the vault already has, and would need its own editor.

**Open tuning note**: A built-in "Faction" stat sheet template seeding the four roles would improve first-run experience, but is not required by any FR. Treated as optional polish, not slice scope.

---

## R3. Relationship writes — `EntityMutationService`

**Decision**: Use `EntityMutationService.addConnection` / `updateConnection` (`apps/web/src/lib/stores/vault/entity-mutations.ts:586,630`) for the single faction → target edge.

**Finding**: `ConnectionSchema` (`packages/schema/src/connection.ts`) is `{target, type, strength (0–1), label}`, stored on the source entity's `connections` array — directed and source-owned, matching the clarified FR-032 decision exactly. The mutation service emits `onConnectionAdded` / `onConnectionUpdated` callbacks that keep the inbound map and graph in sync, so writing through it (rather than mutating the entity blob) keeps every derived view correct for free.

**Strength semantics**: `strength` is a bounded 0–1 magnitude. "How firmly this faction holds this target" maps onto it directly, and FR-034's clamping is the existing schema bound rather than new logic.

**FR-020b query**: "which other factions hold this target" is answered by scanning turn-enabled faction entities' outgoing `connections` for one pointing at the target. Faction counts are small (single digits to low tens), so a scan is correct and cheap; no index needed.

**Alternatives rejected**:

- _Mutate `entity.connections` directly and save_ — bypasses the callbacks, leaving the inbound map and graph stale.
- _Build an inbound index for FR-020b_ — premature at this scale (Principle III).

---

## R4. Dice — `DiceEngine`, already injectable

**Decision**: Use `diceEngine` from `packages/dice-engine`, injected per Principle VIII.

**Finding**: `DiceEngine` (`packages/dice-engine/src/roller.ts:7`) takes `cryptoProvider` and `clock` as constructor parameters with production defaults — already DI-shaped, so tests inject a deterministic provider without mocking globals. It uses rejection sampling for unbiased results, and returns `RollResult { total, parts, formula, timestamp }` where `parts` carries individual die values.

**Consequence**: FR-018's requirement to display "the random result if any" is satisfied by storing the `RollResult` — individual dice included — in the turn record. No custom randomness, satisfying FR-021.

**Determinism (FR-019)**: With randomness off, the resolver skips the engine entirely and compares values directly. With randomness on, tests inject a fixed `cryptoProvider`.

---

## R5. AI participation — `aiClientManager`, mirroring the adventure precedent

**Decision**: Model the faction AI call on `packages/ai-engine/src/adventure-turn-generation.service.ts`, which is the closest existing analogue: a turn-shaped request, a JSON schema forwarded to the provider, and a parse step that throws on malformed output.

**Finding**: `aiClientManager` (`packages/ai-engine/src/client-manager.ts:238`) is the single choke point for every oracle-proxy call and already supports forwarding a response schema so the provider returns structured JSON. The adventure service demonstrates the full pattern including `AbortSignal` and a typed client interface for test injection.

**Design consequence for FR-021c**: The adventure service _throws_ `invalid-adventure-response` on unparseable output. The faction feature must **not** propagate a throw — FR-021c and FR-021d require the mechanical band to stand and the turn to resolve regardless. The AI call is therefore wrapped so that every failure mode (network, timeout, rate limit, malformed JSON, out-of-range band) collapses to the same benign result: `{ band: mechanical, narration: template, aiUsed: false }`.

**Timeout (checklist open item)**: 8 seconds, then fall back. Chosen because the oracle-proxy provider timeout is 60s for long generative work, which is far too long to block a GM mid-turn; a band choice plus two sentences is a small completion, and 8s covers a normal round trip with headroom while keeping the interaction feeling synchronous.

Exposed as the named export `FACTION_AI_TIMEOUT_MS`, not an inline default, so retuning it is a one-line edit that grep locates immediately — plus a constructor override for tests. Deliberately **not** a per-vault setting: a millisecond dial is implementation jargon in a GM-facing panel (Principle IX), and if 8s proves wrong the honest fix is changing the value rather than delegating it to users.

**Validation**: The returned band must be checked against the permitted range (FR-021a) before use — a schema alone cannot enforce "within one band of the mechanical result", since the range is computed per turn.

**Alternatives rejected**:

- _Reuse `adventure-turn-generation.service` directly_ — its request/response shape is adventure-session specific; sharing it would couple two unrelated features.
- _Let AI failures surface as errors_ — directly contradicts FR-021d.

---

## R6. Package placement — new `packages/faction-engine`

**Decision**: A new workspace package `packages/faction-engine` holds eligibility, resolution, band mapping, patch building and reversal. The AI call lives in `packages/ai-engine` alongside its siblings. Svelte components and the store live in `apps/web`.

**Rationale**: Principle I requires major features to be standalone packages with the web app as a thin UI layer. Faction resolution is pure logic over plain data — no DOM, no storage — so it is straightforwardly unit-testable in isolation, which also serves Principle X's 70% bar for new packages.

**Package conventions** (from `packages/chronology-engine/package.json`): `main`/`types` point at `./src/index.ts`, `test` runs `bun test`, coverage via vitest, plus a `lint` script. The new package follows the same shape.

**Naming**: the monorepo is split — `chronology-engine`, `dice-engine`, `schema` and `graph-engine` are unscoped, while everything added more recently (`@codex/adventure-engine`, `@codex/oracle-engine`, `@codex/ai-engine`, `@codex/stat-sheet-engine`) carries the `@codex/` scope. A new package takes the scope: **`@codex/faction-engine`**. Copy chronology-engine's file structure, not its name.

**Alternatives rejected**:

- _Put it in `apps/web/src/lib/services`_ — violates Principle I and makes the logic harder to test without app scaffolding.
- _Extend `chronology-engine`_ — unrelated responsibility; faction turns only _read_ calendar output.

---

## R7. Preview/commit/reverse — build locally, do not extract yet

**Decision**: Implement the proposal → patch → commit → reverse cycle inside `faction-engine`. Do **not** extract a shared primitive from `adventure-engine` in this slice.

**Finding**: `adventure-engine` has a strikingly similar shape — `AdventureTurnProposal`, `CollectionPatch<T>`, `VisibleStatePatch`, `CommittedAdventureTurn`, and a `stale-revision` outcome. The clarification checklist flagged that Principle III's DRY rule might point at generalising.

**Why not yet**: Principle III's extraction trigger is "the same non-trivial logic duplicated in **three or more** places". This would be the second. Extracting a shared abstraction from two samples — one of which (adventure) is shaped by conversational AI turns and the other (faction) by dice resolution — risks an abstraction that fits neither. The honest read is that the _concepts_ rhyme while the _payloads_ differ entirely.

**Revisit trigger**: When a third preview/commit consumer appears (the World Turn screen is the likely candidate), extract then, with three real samples to generalise from.

**What is borrowed**: the shape and naming, so a later extraction is mechanical rather than archaeological.

---

## R8. Staleness detection — content hashing over the touched entities

**Decision**: A proposal records a hash of the acting faction's stat values plus the target's relevant connection at build time. Commit recomputes and compares.

**Finding**: `entityContentHash` already exists at `packages/oracle-engine/src/lore-delta.ts:41` for exactly this class of problem.

**Import constraint**: it MUST be deep-imported from `@codex/oracle-engine/src/lore-delta`, never from the package barrel. `oracle-engine/src/index.ts` re-exports `oracle-settings.svelte`, `chat-history.svelte` and `undo-redo.svelte` — barrel-importing would pull Svelte runes into `faction-engine`, which is compiled and tested without the Svelte compiler, breaking `bun test` and contradicting the package's stated purity. The adventure service gets away with the barrel import only because it lives in `@codex/ai-engine`, which is Svelte-adjacent.

**Rationale**: Satisfies FR-026 and SC-007 without a revision-counter migration on entities. Scoped to what the turn actually touches, so unrelated edits elsewhere in the vault do not spuriously invalidate a preview.

**Alternatives rejected**:

- _Entity-level `updatedAt` comparison_ — too coarse; any unrelated edit to the faction invalidates the preview.
- _Add a revision counter_ — schema change plus migration for a problem hashing already solves.

---

## R9. Turn history storage and growth

**Decision**: Turn records live on the faction entity inside the new `factionTurn` block. No pruning (FR-041).

**Finding**: Entities are stored as blobs and synced whole. The spec's stated scale is tens of records per faction per campaign year, order-of-hundreds lifetime.

**Sizing check**: A turn record carrying the resolution detail, the applied changes, the inverse patch, and a short narrative is on the order of 1–2 KB. Five hundred records is therefore roughly 0.5–1 MB on a single entity — large for an entity blob, but well within IndexedDB and OPFS limits, and it is the _ceiling_ rather than the typical case.

**Consequence for SC-011**: The history list must not render 500 rows eagerly. Windowed rendering is required; `2147-timeline-agenda-bounded-rendering` is prior art in this repo for exactly that problem.

**No IDB version bump needed**: The `factionTurn` block is nested inside the entity blob, and `EntitySchema` uses optional fields, so existing vaults parse unchanged. `DB_VERSION` stays at 24.

**Deferred**: If real vaults exceed the stated scale, moving history to its own store is the escape hatch — recorded, not built (Principle III).

---

## R10. Atomic commit — compensating rollback, not a transaction

**Decision**: The store applies a `CommitPlan` by capturing the prior values first, applying writes in a fixed order, and on any failure replaying the already-captured inverse to restore the pre-commit state. Failure is reported to the GM as "the turn was not applied".

**Finding**: A commit touches three places — the acting faction's stat values, the faction→target connection, and the history entry. `EntityMutationService` exposes per-operation async methods (`updateEntity`, `addConnection`, `updateConnection`); it has **no** multi-entity transaction boundary, and IndexedDB transactions do not span the service's scheduling and persistence layers. So atomicity cannot be delegated downward — it must be constructed here.

**Why this matters more than it looks**: a partial commit is worse than a failed one. If stats are written but the history entry is not, the GM has no record to undo, and the inverse patch that would have restored them exists only in the discarded proposal. The vault is left silently wrong with no recovery path — which defeats the reason review and reversal were made P1 in the first place.

**Mechanism**: `buildChanges()` already produces an `inverse` list (R7, FR-027). Commit reuses it as the compensating action rather than inventing a second rollback path:

1. Capture prior values and build `changes` + `inverse`.
2. Apply stat updates, then the connection write, then append the history record.
3. On failure at any step, apply the `inverse` entries for the steps that succeeded, in reverse order, then surface a `commit-failed` result.

**Ordering rationale**: the history entry is written **last**. If it fails, only two writes need reversing; if it were written first, a later failure would leave a record describing changes that never happened — which is a worse lie than no record at all.

**Rationale**: Reuses the inverse patch the feature already needs, so there is exactly one description of "how to undo this turn" rather than two that can drift.

**Alternatives rejected**:

- _Wrap in an IndexedDB transaction_ — the mutation service's scheduling means writes do not share a transaction; forcing one would mean bypassing the service and losing its callbacks (R3).
- _Write history first as a journal, then apply_ — recovering a partial apply on next load adds a replay path and a new failure mode for a scenario that is already rare.
- _Accept partial commits and let the GM fix it by hand_ — directly contradicts FR-025 and the feature's core promise.

**Spec impact**: Recorded as **FR-025a**, with an edge case and acceptance scenario 5a in User Story 4.

---

## R11. Testing approach

**Decision**: `bun test` in `faction-engine` and `ai-engine`; vitest for the web store and components. Run `bun run lint` and `bun run test` before completion per Principle VI.

**Coverage target**: 70% for the new package (Principle X, new-code bar).

**Test matrix implied by the spec**:

- Five bands × discard leaves vault untouched (SC-004)
- Five bands × undo restores exactly (SC-005), including a clamped case
- Determinism with randomness and AI both off (SC-006)
- Every AI failure mode falls back mechanically (SC-012, FR-021c/d)
- Eligibility across never-acted, within-interval, past-interval, clock-moved-backwards, and undone-turn cases
- Opposition across all three tiers of FR-020

**Verification note per Principle VI.3 and the user's standing instruction**: green unit tests are not sufficient evidence for this feature. The commit/undo path must be exercised in the running app against a real vault before the branch is pushed.

---

## Resolved unknowns summary

| Unknown                         | Resolution                                                                          |
| ------------------------------- | ----------------------------------------------------------------------------------- |
| Current world date field        | Already exists; reuse `resolveCalendarCurrentDate`, treat `realWorld` tier as unset |
| Stat storage                    | `entity.statSheet` number fields; roles map to field ids                            |
| Relationship writes             | `EntityMutationService.addConnection/updateConnection`                              |
| Randomness source               | `diceEngine`, DI-injectable, unbiased                                               |
| AI transport                    | `aiClientManager` with forwarded schema; adventure service as pattern               |
| AI failure handling             | All modes collapse to mechanical band + template narration                          |
| AI timeout                      | 8 seconds                                                                           |
| Package location                | New `packages/faction-engine`                                                       |
| Shared preview/commit primitive | Not extracted; revisit at third consumer                                            |
| Staleness                       | Content hash of touched values                                                      |
| History growth                  | Unbounded on entity; windowed rendering; no DB version bump                         |
| Commit atomicity                | Compensating rollback reusing the inverse patch; history written last               |
