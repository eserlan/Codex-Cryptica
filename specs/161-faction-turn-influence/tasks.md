# Tasks: Faction Turn — Influence Vertical Slice

**Input**: Design documents from `/specs/161-faction-turn-influence/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Test tasks are included throughout. This is not optional here — Constitution Principle II (TDD) states no code logic may be committed without corresponding unit tests, and Principle X sets a 70% coverage bar for new packages.

**Organization**: Tasks are grouped by user story. Note the honest caveat in **Dependencies** below: this is a vertical slice, so the stories chain rather than being fully independent.

**Revision note (post-`/speckit-analyze`)**: This file was regenerated to remedy fourteen analysis findings. Two ordering inversions were fixed — `patches.ts` moved into US3 because a proposal cannot be assembled without it, and the preview component is now created in US3 and extended in US4 rather than referenced before it exists. Nine coverage gaps gained tasks, the largest being atomic commit (FR-025a), which was a design gap rather than merely a missing test.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task serves (US1–US5)
- Exact file paths are given in every task

## Path Conventions

Monorepo per plan.md: `packages/*` for libraries, `apps/web/src/lib` for the thin UI layer.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffold the new package so every later task has somewhere to land.

- [x] T001 Create `packages/faction-engine/package.json` named **`@codex/faction-engine`** — the scope every recently added package uses (`@codex/adventure-engine`, `@codex/oracle-engine`, `@codex/ai-engine`, `@codex/stat-sheet-engine`); `chronology-engine` and `dice-engine` are unscoped only for historical reasons, so mirror that file's _structure_, not its name. `main`/`types` at `./src/index.ts`, scripts for `test` (bun test), `test:coverage`, `lint`, and `workspace:*` dependencies on `dice-engine` and `@codex/oracle-engine`
- [x] T002 Create `packages/faction-engine/tsconfig.json` matching the sibling package convention
- [x] T003 [P] Create `packages/faction-engine/src/index.ts` with the barrel exports listed in `contracts/faction-engine.md`
- [x] T004 [P] Register `@codex/faction-engine` in the workspace so `bun run --filter '*' test` picks it up; verify with `bun run --filter @codex/faction-engine test`

**Checkpoint**: `bun test` runs (vacuously) in the new package.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Types and schemas every user story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T005 Create `packages/schema/src/faction-turn.ts` with `FactionStatRolesSchema`, `WorldDateStampSchema`, `FactionTurnChangeSchema`, `FactionResolutionSchema`, `FactionTurnRecordSchema`, `FactionTurnStateSchema` per `data-model.md` sections 1–4
- [x] T006 Export the new schemas from `packages/schema/src/index.ts`
- [x] T007 Add optional `factionTurn: FactionTurnStateSchema.optional()` to `EntitySchema` in `packages/schema/src/entity.ts`
- [x] T008 [P] Write test in `packages/schema/src/faction-turn.test.ts` asserting an entity JSON written before this feature still parses, and that `factionTurn` is absent rather than defaulted
- [x] T009 [P] Create `packages/faction-engine/src/types.ts` re-exporting the schema types plus the transient `FactionTurnProposal`, `EligibilityResult`, `ResolveInput`, `CommitPlan`, `CommitFailure` shapes from `contracts/faction-engine.md`
- [x] T010 Create `packages/faction-engine/src/bands.ts` with the five ordered band ids, their labels, threshold table, and per-band magnitude table
- [x] T011 [P] Write tests in `packages/faction-engine/src/bands.test.ts` asserting magnitude monotonicity across the ordered five (FR-017b), that `mixed` produces the smallest movement of any band (FR-017a), and that **the same band always yields the same magnitude across repeated lookups** (FR-032a)
- [x] T012 [P] Create `packages/faction-engine/src/narrative.ts` with `buildTemplateNarrative()` and tests in `narrative.test.ts` covering all five bands

**Checkpoint**: Schemas parse, bands are ordered and monotonic, a local narration fallback exists. User stories can begin.

---

## Phase 3: User Story 1 — Give a faction a mechanical layer (Priority: P1) 🎯 MVP

**Goal**: A faction can opt in, own named bounded stats, and map roles to them — while every other faction in the vault stays exactly as it is today.

**Independent Test**: Enable the layer on one faction, name and score its stats, map the roles, reload, confirm persistence — and confirm a second faction shows no turn affordances anywhere.

### Tests for User Story 1

- [x] T013 [P] [US1] Write test in `packages/faction-engine/src/roles.test.ts` asserting a role mapped to a field id survives the stat being renamed, and that a mapping pointing at a deleted field reads as unmapped rather than throwing
- [ ] T014 [P] [US1] Write test in `apps/web/src/lib/stores/faction-turn.test.ts` asserting an entity without `factionTurn` reports the layer as off and exposes no stats or history (FR-002, SC-008)

### Implementation for User Story 1

- [x] T015 [US1] Create `packages/faction-engine/src/roles.ts` with `resolveRole(faction, role)` returning the stat sheet field, its label and value, or an unmapped marker (FR-004a, FR-005)
- [ ] T016 [US1] Create `apps/web/src/lib/stores/faction-turn.svelte.ts` with constructor DI (`vault`, `calendarStore`, `mutations`, `engine`) per Principle VIII, exporting both class and singleton — enable/disable the layer and read/write `statRoles`
- [ ] T017 [US1] Add `"faction"` to the tab array in `apps/web/src/lib/components/entity-detail/detail-tabs.ts`
- [ ] T018 [US1] Create `apps/web/src/lib/components/entity-detail/DetailFactionTurnTab.svelte` — shown only for `type === "faction"`, with the opt-in control when the layer is off
- [ ] T019 [US1] Wire the new tab into `apps/web/src/lib/components/EntityDetailPanel.svelte` following the `DetailTimelineTab` precedent at line 569 (hidden/`{#if}` pattern)
- [ ] T020 [US1] Create `apps/web/src/lib/components/entity-detail/faction-turn/FactionStatRoleMapper.svelte` — four role dropdowns listing the faction's number-type stat sheet fields, using Svelte 5 runes and Tailwind semantic tokens per STYLE_GUIDE
- [ ] T021 [US1] Verify opt-out retains history (FR-001) and that disabling hides controls without data loss

**Checkpoint**: A faction can be opted in and role-mapped. Nothing can act yet.

---

## Phase 4: User Story 2 — Know whether a faction may act yet (Priority: P1)

**Goal**: The world clock decides whether a faction may act, and the feature never writes that clock.

**Independent Test**: Set a world date and interval, act, confirm ineligibility with a clear reason, advance the date, confirm eligibility returns — verifying the world date only ever changed because the GM changed it.

### Tests for User Story 2

- [ ] T022 [P] [US2] **Write this test first.** In `packages/faction-engine/src/eligibility.test.ts`, assert `source === "realWorld"` yields state `no-world-date` with `canAct: false` and `canOverride: false` (FR-008a) — this tier returns the actual present-day date and would otherwise make every faction eligible forever with history stamped in the wrong millennium
- [ ] T023 [P] [US2] Extend `eligibility.test.ts` covering `never-acted` (FR-011), `eligible`, `too-soon` with `nextEligibleDate` (FR-012), and `clock-behind` returning ineligible with no error or repair prompt (FR-014)
- [ ] T024 [P] [US2] Write test asserting eligibility is computed from the most recent **non-undone** turn (FR-010, edge case)
- [ ] T025 [P] [US2] Write test asserting a vault with only `presentYear` set resolves to `source: "vaultSetting"` and gates eligibility correctly with an absent `day` (FR-008)

### Implementation for User Story 2

- [ ] T026 [US2] Create `packages/faction-engine/src/eligibility.ts` implementing `evaluateEligibility()` per `contracts/faction-engine.md`, never throwing, with plain-language `reason` strings (Principle IX)
- [ ] T027 [US2] Create `FactionTurnSettings` persistence in `apps/web/src/lib/stores/faction-turn.svelte.ts` — interval unit/amount, randomness, two AI switches, baseline opposition — stored per vault in the existing `settings` IDB store alongside `calendar_${vaultId}` (no `DB_VERSION` bump)
- [ ] T028 [US2] Add a Faction Turn settings section to `apps/web/src/lib/components/settings/VaultSettings.svelte`. The two AI toggles MUST carry inline text stating what leaves the device when they are on — the faction's and target's names and short descriptions — not bare labels (Principle V, Principle IX)
- [ ] T029 [US2] Surface eligibility state in `DetailFactionTurnTab.svelte` — the reason, last turn date, next eligible date, and a "run anyway" override for `too-soon`/`clock-behind` only (FR-013)
- [ ] T030 [US2] Add the "set a current world date" prompt for the `no-world-date` state (US2 scenarios 7–8), pointing at the existing calendar setting and never substituting the real-world date

**Checkpoint**: Eligibility gates correctly and the clock is provably untouched.

---

## Phase 5: User Story 3 — Take an Influence action and see why (Priority: P1)

**Goal**: An Influence action resolves against a target with a fully inspectable breakdown, with or without dice, with or without AI, producing a complete proposal.

**Independent Test**: Resolve against a target and confirm the outcome, the numbers behind it, and the resulting change are displayed together and consistent.

**Ordering note**: `patches.ts` lives in this phase, not US4. A `FactionTurnProposal` carries `changes` and `inverse` (data-model.md §3), so `buildChanges()` must exist before a proposal can be assembled.

### Tests for User Story 3

- [ ] T031 [P] [US3] Write `packages/faction-engine/src/opposition.test.ts` covering all three FR-020 tiers, asserting an unclaimed target opposes at exactly the baseline (FR-020c), that only relationships **directed at** the target count (FR-020b), and that the acting faction's own hold is excluded
- [ ] T032 [P] [US3] Write `packages/faction-engine/src/resolution.test.ts` asserting identical inputs produce identical band and changes with randomness and AI both off (SC-006, FR-019)
- [ ] T033 [P] [US3] Extend `resolution.test.ts` asserting `permittedBands` never extends more than one band either side and is truncated at the scale ends (FR-021a)
- [ ] T034 [P] [US3] Write `packages/faction-engine/src/ai-band.test.ts` asserting `null`, an unknown band, and an out-of-range band each leave the resolution unchanged with `aiUsed: false` (FR-021c)
- [ ] T035 [P] [US3] Extend `ai-band.test.ts` with a hostile response — extra fields, a magnitude, a stat value, an eligibility hint — asserting only `band` and `narrative` are ever consumed and no other value is touched (FR-021e)
- [ ] T036 [P] [US3] Extend `ai-band.test.ts` asserting a band change carrying a missing or empty reason is rejected and falls back to the mechanical band (FR-021b)
- [ ] T037 [P] [US3] Write `packages/ai-engine/src/faction-turn-generation.service.test.ts` asserting the service **never rejects** — unreachable provider, timeout, malformed JSON, and out-of-range band all resolve to all-null with `aiUsed: false` (SC-012, FR-021d), and that both flags false makes no network call (Principle V)
- [ ] T038 [P] [US3] Write test asserting self-target and unmapped-role return typed `ResolveFailure` values rather than throwing (FR-005, US3 scenario 7)
- [ ] T039 [P] [US3] Write `packages/faction-engine/src/patches.test.ts` covering `buildChanges()` output shape and `computeStateHash()` stability — identical inputs hash equal, and any touched stat value or connection strength hashes differently (FR-026). Written **before** T043, so `patches.ts` is not implemented ahead of its tests (Principle II)

### Implementation for User Story 3

- [ ] T040 [US3] Create `packages/faction-engine/src/opposition.ts` implementing `computeOpposition()` — FR-020a → FR-020b → FR-020c in order, returning value, source and human-readable detail
- [ ] T041 [US3] Create `packages/faction-engine/src/resolution.ts` implementing `resolveInfluence()` returning `Result<FactionResolution, ResolveFailure>`, with `diceEngine` injected per Principle VIII and skipped entirely when randomness is off
- [ ] T042 [US3] Create `packages/faction-engine/src/ai-band.ts` implementing `applyAiBand()` — the single enforcement point for the permitted range and the FR-021e value boundary, since a provider schema can express neither
- [ ] T043 [US3] Create `packages/faction-engine/src/patches.ts` — `buildChanges()` producing forward and inverse lists, and `computeStateHash()` scoped to the touched stat values and connection, using `entityContentHash` imported **deep** from `@codex/oracle-engine/src/lore-delta`. Do **not** import the package barrel: `oracle-engine/src/index.ts` re-exports `oracle-settings.svelte`, `chat-history.svelte` and `undo-redo.svelte`, which would pull Svelte runes into this rune-free package and break `bun test`
- [ ] T044 [US3] Create `packages/ai-engine/src/faction-turn-generation.service.ts` per `contracts/faction-ai.md`, exporting `FACTION_AI_TIMEOUT_MS = 8000` as a **named constant** (the one place to retune it) plus a constructor `timeoutMs` override
- [ ] T045 [US3] Implement the provider schema and prompt in the AI service — state the mechanical band, the at-most-one-step rule, the roll and margin, and forbid inventing entities, dates or numbers
- [ ] T046 [US3] Wrap every AI failure mode in the service so none escapes as a rejection (FR-021d)
- [ ] T047 [US3] Export the service from `packages/ai-engine/src/index.ts`
- [ ] T048 [US3] Create `apps/web/src/lib/components/entity-detail/faction-turn/FactionTurnAction.svelte` — target picker excluding the acting faction (FR-016), reusing the existing entity search component
- [ ] T049 [US3] Add `propose()` orchestration to the store: resolve mechanically, call AI when enabled, apply the band, build changes and inverse, compute the state hash, assemble the proposal
- [ ] T050 [US3] Create `apps/web/src/lib/components/entity-detail/faction-turn/FactionTurnPreview.svelte` with the resolution breakdown — acting stat and value, opposition with its tier and provenance, modifiers, individual dice, total, permitted range, mechanical band, final band, and the AI's reason when they differ (FR-018, FR-021g)

**Checkpoint**: Turns resolve, explain themselves, and produce a reversible proposal. Nothing is written yet.

---

## Phase 6: User Story 4 — Review before anything changes, and undo after (Priority: P1)

**Goal**: Nothing touches the vault until commit, commit is all-or-nothing, and a committed turn can be put back.

**Independent Test**: Resolve and discard — confirm nothing changed. Resolve and commit — confirm changes landed. Undo — confirm the vault matches its pre-turn state.

### Tests for User Story 4

- [ ] T051 [P] [US4] Write `packages/faction-engine/src/patches.test.ts` asserting across **all five bands** that applying `changes` then `inverse` restores exact prior values (SC-005)
- [ ] T052 [P] [US4] Extend `patches.test.ts` with the clamped case — a change capped at a stat bound still reverses to the true original value, not the clamped one (FR-034a)
- [ ] T053 [P] [US4] Write test asserting a proposal never mutates its inputs (FR-022) and that discarding leaves no stat, relationship, entity or history change across all five bands (SC-004)
- [ ] T054 [P] [US4] Write `packages/faction-engine/src/engine.test.ts` asserting commit returns `{kind: "stale"}` when the state hash no longer matches (FR-026, SC-007)
- [ ] T055 [P] [US4] Extend `engine.test.ts` asserting `reverse()` on a non-most-recent record returns `{kind: "not-most-recent"}` (US4 scenario 7) and that a missing target returns `{kind: "target-missing"}`
- [ ] T056 [P] [US4] Write test asserting no change is ever produced for an edge directed from the target back to the faction (FR-032c)
- [ ] T057 [P] [US4] Write test asserting that committing **without** opting into a suggested type change leaves the relationship type exactly as the GM authored it, moving only strength (FR-032b, US4 scenario 3a)
- [ ] T058 [P] [US4] Write test asserting the first turn against a target with no existing edge creates one at neutral type (FR-033)
- [ ] T059 [P] [US4] Write store test forcing a failure on the connection write and on the history append, asserting in each case that already-applied writes are rolled back, the vault matches its pre-commit state, and the result reports the turn as not applied (FR-025, FR-025a)

### Implementation for User Story 4

- [ ] T060 [US4] Create `packages/faction-engine/src/engine.ts` with `FactionTurnEngine` (class + singleton) implementing `propose`, `commit` and `reverse`, all returning **plans** rather than performing mutations
- [ ] T061 [US4] Implement atomic plan application in the store per research R10 — capture prior values, apply stats → connection → history **in that order**, and on any failure replay the plan's `inverse` for completed steps in reverse order before reporting failure. History is written last so a failure can never leave a record describing changes that did not happen (FR-025a)
- [ ] T062 [US4] Apply connection writes through `EntityMutationService.addConnection` / `updateConnection` (`entity-mutations.ts:586,630`) — never by mutating the entity blob, so inbound-map and graph callbacks fire
- [ ] T063 [US4] Implement stat writes in the store, respecting min/max bounds and recording clamping (FR-034)
- [ ] T064 [US4] Extend `FactionTurnPreview.svelte` with the change summary and actions — every stat change with before/after, the strength shift with before/after, the opt-in relationship type change, and Commit / Discard (FR-023)
- [ ] T065 [US4] Make the narrative editable before commit, with the edited text stored (FR-021h), and discard the edit on re-resolve (edge case)
- [ ] T066 [US4] Implement the navigate-away confirmation for an unreviewed preview (FR-022b), and confirm no preview state is persisted or restored (FR-022a)
- [ ] T067 [US4] Implement undo in the store, including the FR-030 warning when affected entities changed since commit, marking the record undone rather than deleting it (FR-029), and recomputing `lastTurnDate` from remaining non-undone history

**Checkpoint**: The full write path is safe, atomic and reversible. This is the first point the feature is genuinely usable.

---

## Phase 7: User Story 5 — Look back at what a faction has done (Priority: P2)

**Goal**: Permanent, chronological, explainable history, with optional promotion into the campaign chronicle.

**Independent Test**: Take several turns across different world dates, open history, confirm order and detail — and confirm the campaign timeline stays untouched until something is promoted.

### Tests for User Story 5

- [ ] T068 [P] [US5] Write `packages/faction-engine/src/history.test.ts` asserting chronological ordering by world date then commit time (FR-036), and that entries whose calendar revision no longer validates sort last and render as undated
- [ ] T069 [P] [US5] Write test asserting a history entry remains readable after its target entity is deleted, displaying the snapshotted title (FR-040)
- [ ] T070 [P] [US5] Write test asserting no event entity is created anywhere without explicit promotion (FR-037, SC-009)
- [ ] T071 [P] [US5] Write test asserting an already-promoted entry cannot be promoted twice (FR-038)
- [ ] T072 [P] [US5] Write test appending 600 records and asserting every one survives a save/load round trip with full resolution detail intact — nothing is pruned, capped or trimmed (FR-041)

### Implementation for User Story 5

- [ ] T073 [US5] Create `packages/faction-engine/src/history.ts` with ordering and undated-entry handling
- [ ] T074 [US5] Create `apps/web/src/lib/components/entity-detail/faction-turn/FactionTurnHistory.svelte` with **windowed rendering** — 500 entries must open in under 200 ms (SC-011); follow the `2147-timeline-agenda-bounded-rendering` prior art
- [ ] T075 [US5] Display each entry with world date, action, target, outcome band and expandable full resolution detail, including whether the band was mechanical or AI-selected and the reason (FR-035a)
- [ ] T076 [US5] Add the empty state explaining what history will contain (US5 scenario 7)
- [ ] T077 [US5] Implement promotion — create an event entity carrying the turn's date, narrative and participants via `EntityMutationService.createEntity`, and store `promotedEventId` on the record (FR-038, FR-039)
- [ ] T078 [US5] On undo of a promoted turn, tell the GM the event exists and offer to remove it (US5 scenario 6)
- [ ] T079 [US5] Mark undone entries visibly in the list without removing them (FR-029)

**Checkpoint**: All five stories complete.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T080 Write a cross-cutting test asserting `calendarStore.config` is unchanged before and after **every** operation the feature offers — propose, commit, discard, undo and promote (FR-006, SC-003). This is the feature's headline promise and its only other coverage is the manual step T091
- [ ] T081 [P] Write the help article as `apps/web/src/lib/content/help/faction-turns.md` — markdown with frontmatter `id / title / description / icon / rank / tags`, glob-loaded by `loadHelpArticles()` (`apps/web/src/lib/content/loader.ts:94`); follow `help/entity-timeline.md` as the model. **Required by Constitution Principle VII**, not optional. It MUST cover: opting a faction in, mapping stats to roles, why a faction may not be eligible yet, reading the outcome breakdown, and undo. It MUST also disclose in plain language (Principle IX) that when AI is enabled the faction's and target's names and short descriptions are sent to the configured AI provider, and that both AI switches can be turned off with no loss of function — a contract file is not user disclosure (Principle V)
- [ ] T082 [P] Add a `FEATURE_HELP_ARTICLES` key in `apps/web/src/lib/config/help-content.ts` pointing at `"faction-turns"`, and link it from the Faction Turn tab so the article is reachable from the feature itself
- [ ] T083 [P] Add a `FeatureHint` in `FEATURE_HINTS` (`help-content.ts:177`) plus a `HINT_KEYS` entry, covering the opt-in flow and the eligibility gate
- [ ] T084 Write the marketing blog post as `apps/web/src/lib/content/blog/faction-turns.md` — frontmatter `id / slug / title / description / keywords / publishedAt / image / imageAlt`, following `blog/vtt-introduction.md` as the model. Lead with the problem (a world that stays frozen between sessions), not the mechanics. Cover the dice-decide/AI-narrates split, why the world clock stays under GM control, and preview-then-commit. Capture screenshots, upload to R2 under `assets.codexcryptica.com/images/blog/faction-turns/`, and follow the repo's blog workflow (draft on the `blog` branch, merge to `main`, `deploy-blog-content`). **Publish only after the feature ships** — `publishedAt` goes live on the marketing site
- [ ] T085 [P] Verify `@codex/faction-engine` meets the 70% coverage bar for new packages (Principle X) via `bun run --filter @codex/faction-engine test:coverage`
- [ ] T086 [P] Confirm no function in `packages/faction-engine` touches storage, network or DOM (Principle I) — grep for `fetch`, `idb`, `document`, `window` — and that its import graph contains no `.svelte.ts` module, so no Svelte rune is ever pulled into a package compiled and tested without the Svelte compiler
- [ ] T087 [P] Tune per-band magnitudes against a real vault (plan.md open item 1)
- [ ] T088 [P] Tune the baseline opposition default (plan.md open item 2)
- [ ] T089 Add a Playwright end-to-end spec covering opt-in → map roles → take turn → commit → undo
- [ ] T090 Run `bun run lint` and `bun run test` across the workspace; fix all findings
- [ ] T091 **Manual verification in the running app** — opt a faction in, map roles, take a turn with AI on, take one with AI off, commit, undo, promote to an event, and confirm the world clock never moved. Green unit tests are **not** sufficient evidence for this feature
- [ ] T092 Add a user-facing changelog entry to `apps/web/src/lib/content/changelog/releases.json` — feature-level only, no implementation detail

---

## Dependencies

**Honest caveat**: the template assumes stories are independently deliverable. In this vertical slice they are not — that is the point of a vertical slice. Each story is independently _testable_, but only US1 stands alone as shippable value.

```
Setup (T001–T004)
   ↓
Foundational (T005–T012)  ⚠️ blocks everything
   ↓
US1 (T013–T021) ──┐   opt-in + stats + roles
                  ↓
US2 (T022–T030) ──┤   eligibility  [needs US1's factionTurn block]
                  ↓
US3 (T031–T050) ──┤   resolution + proposal  [needs US1 roles, US2 world date]
                  ↓
US4 (T051–T067) ──┤   atomic commit/undo     [needs US3 proposals]
                  ↓
US5 (T068–T079) ──┘   history                [needs US4 committed records]
   ↓
Polish (T080–T092)
```

**US2 is partially parallel with US1**: eligibility logic (T022–T026) is pure and depends only on Foundational, so it can be written alongside US1's UI work. Only its UI tasks (T029, T030) need US1.

**T080 depends on US4 and US5**: it exercises commit, undo and promote, so it cannot run earlier despite being the highest-value cross-cutting test.

---

## Parallel Execution Opportunities

**Phase 2**: T008, T009, T011, T012 are independent files.

**Phase 4**: All eligibility tests (T022–T025) are one file's worth of independent cases and can be written before any implementation — this is the TDD red step.

**Phase 5**: T031–T039 span five test files with no shared state. The AI service (T044–T047) and the engine's pure modules (T040–T043) touch different packages and can proceed in parallel.

**Phase 6**: T051–T059 are independent cases across three files. T059 is the exception — it needs T061's store path, so write it as a failing test first and satisfy it with T061.

**Phase 8**: T081–T083 and T085–T088 are fully independent. T084 (blog post) depends on the feature being visually complete enough to screenshot.

**Cross-package**: `packages/faction-engine` and `packages/ai-engine` work never touches the same files, so those tracks can run concurrently once Foundational is done.

---

## Implementation Strategy

### MVP scope

**US1 alone is the MVP** — a faction can opt into a mechanical layer with named, bounded, role-mapped stats. That is demonstrable and independently valuable even with nothing else built, and it is the point at which the system-neutrality principle is either honoured or lost.

### Recommended increments

1. **Increment 1** — Setup + Foundational + US1. A faction has stats. Ship-able.
2. **Increment 2** — US2. Pacing works and the clock is provably read-only.
3. **Increment 3** — US3 + US4. **The first genuinely useful increment** — turns resolve, commit atomically and reverse. If the branch has to stop early, stop here rather than mid-US4; a commit path without undo is worse than no commit path.
4. **Increment 4** — US5 + Polish. History and promotion.

### Order-sensitive advice

- **Write T022 first** of all the story tasks. The `realWorld` date tier is the single trap most likely to produce a plausible-looking but wrong feature.
- **T061 is the highest-consequence task in the feature.** A partial commit leaves stats changed with no history entry to undo them and no surviving inverse patch — the vault is silently wrong with no recovery path. Write T059 red before implementing it.
- **Do not split US4.** Commit without undo violates the premise that made review and reversal P1 in the first place.
- **T089 is not a formality.** Most of this feature's requirements are of the form "nothing was written" or "everything was restored". The unit matrix can be entirely green while commit-then-undo still corrupts a hand-edited entity.

---

## Task Summary

| Phase                            | Tasks     | Count  |
| -------------------------------- | --------- | ------ |
| Setup                            | T001–T004 | 4      |
| Foundational                     | T005–T012 | 8      |
| US1 — Mechanical layer (P1)      | T013–T021 | 9      |
| US2 — Eligibility (P1)           | T022–T030 | 9      |
| US3 — Resolution + proposal (P1) | T031–T050 | 20     |
| US4 — Atomic commit/undo (P1)    | T051–T067 | 17     |
| US5 — History (P2)               | T068–T079 | 12     |
| Polish                           | T080–T092 | 13     |
| **Total**                        |           | **92** |

Test tasks: 32 of 92 (35%), consistent with Principle II and the 70% coverage bar.
