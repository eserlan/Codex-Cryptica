# Implementation Plan: Faction Turn — Influence Vertical Slice

**Branch**: `161-faction-turn-influence` | **Date**: 2026-08-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/161-faction-turn-influence/spec.md`

## Summary

Give a faction the ability to take one **Influence** action against any entity in the vault: gated by the campaign's world clock, resolved by dice against a role-mapped stat, optionally nudged one band and narrated by AI, previewed before anything is written, committed as a reversible change to a single directed relationship, and recorded in permanent turn history.

The technical approach is deliberately **additive and reuse-first**. Phase 0 research found that most of the substrate already exists: the current world date resolves at day precision today, stat sheets already provide bounded named numerics, connections already carry a 0–1 strength, and the dice engine is already DI-shaped and unbiased. The only genuinely new artefact is `packages/faction-engine`, a pure-logic package with no storage, network, or DOM access. Everything persisted nests inside the existing entity blob, so there is **no IndexedDB version bump and no entity migration**.

The single biggest simplification came from research: **FR-007 needs no new field.** `resolveCalendarCurrentDate()` already returns `{year, month, day}` via a three-tier chain whose first tier is the marker-entity convention the user described. The one trap is that its third tier returns the _real-world_ date, which must be treated as "no world date configured" rather than as campaign time.

## Technical Context

**Language/Version**: TypeScript 6.0.3 (pinned — TS 7 is on hold), Svelte 5 (runes)
**Primary Dependencies**: `zod` (schema), `chronology-engine` (world date), `dice-engine` (randomness), `ai-engine` → oracle-proxy (band nudge + narration), `stat-sheet` schema (stat storage)
**Storage**: IndexedDB via `idb` — entity blobs (`DB_VERSION` stays **24**; no bump) plus the existing per-vault `settings` store for `FactionTurnSettings`
**Testing**: `bun test` for `faction-engine` and `ai-engine`; vitest for the web store and components; Playwright for the end-to-end path
**Target Platform**: Browser, local-first. Every mechanical step works offline.
**Project Type**: Monorepo — `packages/*` libraries with `apps/web` as a thin UI layer
**Performance Goals**: Resolution is synchronous and instant. AI adjustment is bounded before mechanical fallback by `FACTION_AI_TIMEOUT_MS` (default **8 s**, a named export so retuning is a one-line edit, with a constructor override for tests). History renders windowed — **under 200 ms to open at 500 entries** (SC-011).
**Constraints**: FR-006 — the world clock is read-only, never written. FR-021d — a turn must never be blocked by AI. FR-002 — factions that have not opted in must be visually and behaviourally identical to today.
**Scale/Scope**: Single-digit-to-low-tens turn-enabled factions per vault; tens of turn records per faction per campaign year, order-of-hundreds lifetime (~1–2 KB per record).

## Constitution Check

_GATE: evaluated before Phase 0 and re-evaluated after Phase 1 design._

| Principle                      | Assessment                                                                                                                                                                                                                                                                                                                                                                       | Verdict                                 |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| **I. Library-First**           | Resolution, eligibility, patches and reversal live in a new `@codex/faction-engine`. `apps/web` holds only the store and Svelte components. Purity is enforced by T084, which checks both for storage/network/DOM access and that no `.svelte.ts` module enters the import graph.                                                                                                | ✅ Pass                                 |
| **II. TDD**                    | Contract file enumerates the invariants before implementation. Red-Green-Refactor per module: eligibility → resolution → patches → engine facade → store → UI.                                                                                                                                                                                                                   | ✅ Pass                                 |
| **III. Simplicity & YAGNI**    | Research deleted three would-be workstreams: no `presentDate` field (R1), no faction stat store (R2), no inbound index (R3). Shared preview/commit primitive deliberately **not** extracted — this is the second consumer, and the rule triggers at three (R7). Ruleset stays in code; the GM-authored table is Out of Scope.                                                    | ✅ Pass                                 |
| **IV. AI-First Extraction**    | AI is bounded to band-within-range plus narration, both provider-neutral through `aiClientManager`, both structured-output-validated.                                                                                                                                                                                                                                            | ✅ Pass                                 |
| **V. Privacy & Client-Side**   | Every mechanical step is local. AI is opt-outable in two independent switches and the feature is fully functional with both off. Titles and short summaries leave the device only when enabled, and that is **disclosed to the GM** in the help article (T081) and inline on the settings toggles (T028) — a contract file is documentation for developers, not user disclosure. | ✅ Pass                                 |
| **VI. Clean Implementation**   | Svelte 5 runes, Tailwind semantic tokens, Iconify `icon-[lucide--*]` classes per STYLE_GUIDE. `bun run lint` and `bun run test` before completion.                                                                                                                                                                                                                               | ✅ Pass                                 |
| **VII. User Documentation**    | Help article at `apps/web/src/lib/content/help/faction-turns.md`, a `FEATURE_HELP_ARTICLES` link, and a `FeatureHint` — the opt-in flow and the eligibility gate both need first-run explanation. **Required, not optional.** A marketing blog post follows the repo's one-per-major-feature pattern.                                                                            | ✅ Pass (tracked as build steps 14/14a) |
| **VIII. Dependency Injection** | `FactionTurnEngine` takes `{ dice }`; the AI service takes `{ client, timeoutMs }`; the store takes its vault/calendar/mutation deps. Class + singleton exported from each.                                                                                                                                                                                                      | ✅ Pass                                 |
| **IX. Natural Language**       | `EligibilityResult.reason` is display-ready plain language. Band labels are plain ("decisive success", not "critical"). Narration capped at 2–3 sentences.                                                                                                                                                                                                                       | ✅ Pass                                 |
| **X. Quality & Coverage**      | New package meets the **70%** new-code bar. The five-band × reversibility matrix and the AI failure-mode matrix carry most of it.                                                                                                                                                                                                                                                | ✅ Pass                                 |
| **XI. Karpathy Rules**         | Scope is one action, surgical additions only. Assumptions and the real-world-date trap stated explicitly rather than guessed.                                                                                                                                                                                                                                                    | ✅ Pass                                 |
| **XII. Labels Over Tags**      | No new categorization vocabulary introduced.                                                                                                                                                                                                                                                                                                                                     | ✅ N/A                                  |

**Gate result: PASS.** No violations to justify, so Complexity Tracking is omitted.

**Post-Phase-1 re-evaluation**: Design introduces one new package, one new schema block, one new service, one store and one tab. No principle regressed; Principle III strengthened by the three deletions research produced. **Still PASS.**

## Project Structure

### Documentation (this feature)

```text
specs/161-faction-turn-influence/
├── plan.md              # This file
├── spec.md              # Feature specification (12 clarifications)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── checklists/
│   └── requirements.md
└── contracts/
    ├── faction-engine.md
    └── faction-ai.md
```

### Source Code (repository root)

```text
packages/faction-engine/          # NEW — "@codex/faction-engine"; pure logic, no storage/network/DOM, no runes
├── package.json
├── src/
│   ├── index.ts
│   ├── types.ts                  # bands, resolution, proposal, changes, record
│   ├── bands.ts                  # the five ordered bands + magnitude table
│   ├── eligibility.ts            # FR-010..FR-014
│   ├── opposition.ts             # FR-020a/b/c
│   ├── resolution.ts             # FR-017..FR-019a, FR-021a
│   ├── ai-band.ts                # applyAiBand — FR-021c enforcement point
│   ├── patches.ts                # changes + inverse + state hash (deep-import lore-delta)
│   ├── narrative.ts              # local template fallback
│   ├── engine.ts                 # FactionTurnEngine facade
│   └── *.test.ts
│
packages/schema/src/
├── entity.ts                     # + optional factionTurn block
└── faction-turn.ts               # NEW — zod schemas for the block
│
packages/ai-engine/src/
└── faction-turn-generation.service.ts   # NEW — never throws
│
apps/web/src/lib/
├── stores/
│   └── faction-turn.svelte.ts    # NEW — orchestrates engine + mutations
├── components/entity-detail/
│   ├── DetailFactionTurnTab.svelte      # NEW
│   └── faction-turn/
│       ├── FactionStatRoleMapper.svelte
│       ├── FactionTurnAction.svelte
│       ├── FactionTurnPreview.svelte     # roll breakdown + editable narrative
│       └── FactionTurnHistory.svelte     # windowed
├── components/settings/
│   └── VaultSettings.svelte      # + faction turn settings section
├── components/EntityDetailPanel.svelte   # + tab wiring
├── components/entity-detail/detail-tabs.ts  # + "faction" tab id
└── config/help-content.ts        # + help article (Principle VII)
```

**Structure Decision**: Standard monorepo split. Pure resolution logic goes in a new `packages/faction-engine` per Principle I; the AI call joins its siblings in `packages/ai-engine`; the store and Svelte components stay in `apps/web`. The faction turn UI is a **new tab in the existing entity detail panel** rather than a new route, following the precedent set by the Timeline tab (`DetailTimelineTab.svelte`, wired at `EntityDetailPanel.svelte:569`) — the tab list is a typed array in `detail-tabs.ts:1`, so adding one is additive and keyboard navigation comes free.

## Build Sequence

Ordered so each step is independently testable and the risky parts land early.

1. **Schema block** — `packages/schema/src/faction-turn.ts`, wired into `EntitySchema` as optional. Tests: existing vaults parse unchanged; opted-out factions are indistinguishable (FR-002, SC-008).
2. **Bands and magnitudes** — the five ordered ids plus the magnitude table. Tests: monotonicity (FR-017b), mixed-is-smallest (FR-017a).
3. **Eligibility** — including the `realWorld` trap. Tests: all five states, undo recomputation, clock-behind (FR-010–FR-014).
4. **Opposition** — all three tiers. Tests: unclaimed equals baseline exactly (FR-020c), direction matters (FR-020b), self excluded.
5. **Resolution** — dice or deterministic, permitted range. Tests: determinism with both switches off (SC-006).
6. **AI band applier** — pure. Tests: null, unknown, and out-of-range all fall back (FR-021c).
7. **Patches and inverse** — built in the _resolution_ story, not the commit story: a proposal carries `changes` and `inverse`, so `buildChanges()` must exist before a proposal can be assembled. Tests: the full five-band × reversibility matrix, plus the clamped case (SC-004, SC-005, FR-034a).
8. **Engine facade** — `propose` / `commit` / `reverse` returning plans. Tests: stale detection (SC-007), not-most-recent (US4 s7).
   8a. **Atomic apply** — the store applies a plan with compensating rollback per research R10: capture, apply stats → connection → history, and on any failure replay the inverse for completed steps. History is written **last** so a failure never leaves a record describing changes that did not happen. Tests: forced mid-commit failure leaves the vault byte-identical and reports the turn as not applied (FR-025, FR-025a).
9. **AI service** — `packages/ai-engine`. Tests: every failure mode resolves rather than rejects (SC-012).
10. **Store** — applies `CommitPlan` through `EntityMutationService`. Tests: connection written through the service so callbacks fire.
11. **Settings UI** — interval, randomness, two AI switches, baseline.
12. **Tab UI** — role mapper, action, preview with roll breakdown and editable narration, windowed history.
13. **Event promotion** — creates the event entity, links `promotedEventId` (FR-038, FR-039).
14. **Help article + FeatureHint** — Principle VII. The article is markdown at `apps/web/src/lib/content/help/faction-turns.md` (glob-loaded by `loader.ts:94`), _not_ an entry in `help-content.ts`; that file only holds the hint registry and the `FEATURE_HELP_ARTICLES` link map.
    14a. **Marketing blog post** — `apps/web/src/lib/content/blog/faction-turns.md`, following the one-post-per-major-feature pattern (`vtt-introduction.md`, entity shelf, adventure mode). Needs screenshots on the CDN and goes out via the `blog` branch → `main` → `deploy-blog-content` flow. Published only after the feature ships.
15. **End-to-end verification in the running app** — see below.

## Risks and Mitigations

| Risk                                                                                                                              | Mitigation                                                                                                                                                                       |
| --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The `realWorld` date tier silently makes every faction eligible in year 2026                                                      | Explicit `no-world-date` state with `canOverride: false`; called out in research R1, the data model, and the engine contract. First eligibility test written.                    |
| Undo cannot restore an entity the GM has since hand-edited                                                                        | FR-030 warns and lets the GM proceed; the inverse patch carries true prior values including under clamping (FR-034a).                                                            |
| **Partial commit corrupts a vault with no way to undo it** — stats written, history entry not, so the GM has no record to reverse | Compensating rollback reusing the inverse patch (research R10, FR-025a); history written last; forced-failure test. This is the highest-consequence failure mode in the feature. |
| AI failure blocks a turn                                                                                                          | The AI service never rejects; every mode collapses to mechanical + template. SC-012 asserts the whole path with AI unreachable.                                                  |
| History bloats the entity blob                                                                                                    | Stated ceiling ~1 MB at 500 records; windowed rendering; separate-store escape hatch recorded but not built.                                                                     |
| Premature abstraction of preview/commit with `adventure-engine`                                                                   | Deliberately deferred to the third consumer (R7), with naming aligned so a later extraction is mechanical.                                                                       |
| Green tests mistaken for a working feature                                                                                        | Step 15 is mandatory — drive commit and undo against a real vault in the running app before pushing.                                                                             |

## Verification

Per Principle VI.3, and the standing instruction that green tests are not sufficient evidence:

- `bun run lint` and `bun run test` must pass.
- New package must meet the 70% coverage bar (Principle X).
- **Manual verification in the running app before push**: opt a faction in, map roles, take a turn with AI on, take one with AI off, commit, undo, promote to an event, and confirm the world clock is unchanged throughout.

## Open Items for Implementation

Neither blocks the build; both are recorded so they are decided deliberately rather than by accident.

1. **Magnitude values per band** — the spec fixes ordering and determinism but not the numbers. Tune during step 7 against a real vault.
2. **Baseline opposition default** — needs one play session to calibrate. Ships with a placeholder that is easy to change in settings.
