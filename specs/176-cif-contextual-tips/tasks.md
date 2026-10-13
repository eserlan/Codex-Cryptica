---
description: "Task list for Cif Contextual Tips (#3998)"
---

# Tasks: Cif Contextual Tips

**Input**: Design documents from `/specs/176-cif-contextual-tips/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/tips-contract.md](./contracts/tips-contract.md), [quickstart.md](./quickstart.md)

**Tests**: Required for changed behaviour (Constitution II). Every story writes its tests first, confirms they fail, then implements. Each story covers the success path and at least one negative path.

**User Help (Constitution VII)**: The Help task is in US1 (T016). It covers the setting, the one-time question and what tips never do.

**Validation scope** (AGENTS.md): impacted code only. Never run repository-wide tests, lint or type-check. Use `bun scripts/test-changed.mjs`, `bun scripts/lint-changed.mjs`, and the scoped `svelte-check` / `tsc --noEmit` commands in [quickstart.md](./quickstart.md).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1 to US5, from the spec
- Icons use the Iconify pattern `class="icon-[lucide--name] h-4 w-4"`. Colours use Tailwind 4 semantic tokens. Components use Svelte 5 Runes.

## Path Conventions

- Engine: `packages/onboarding-journey-engine/src/` and `packages/onboarding-journey-engine/tests/`
- App: `apps/web/src/lib/` (tests sit beside the code, as in `app/onboarding/journey/`)
- Help registry: `packages/help-engine/src/registry/features/`

---

## Phase 1: Setup

- [x] T001 Confirm branch `4019-cif-contextual-tips` is checked out and `bun install` is current; run the existing `packages/onboarding-journey-engine` tests once (`cd packages/onboarding-journey-engine && bun test`) to record a green baseline for the files this feature extends

---

## Phase 2: Foundational (blocks all user stories)

**Purpose**: The record shape, its safe parsing, and the store and wiring every story builds on. No tip is shown yet.

### Tests first

- [x] T002 [P] Write `packages/onboarding-journey-engine/tests/tips-record.test.ts`: `emptyTipsRecord()` is `{ schema: 1, enabled: false, optInAsked: false, dismissed: [], acted: [], dismissCounts: {}, silencedAreas: [] }`; `parseTipsRecord` round-trips `serializeTipsRecord`; negative: `null`, malformed JSON, wrong types, and `schema` other than `1` all return the empty record and never throw; unknown tip ids and unknown areas are dropped; `setTipsEnabled(record, true)` after `false` clears `silencedAreas` and `dismissCounts` but keeps `dismissed` and `acted`; `markOptInAsked` is idempotent
- [x] T003 [P] Write `apps/web/src/lib/app/onboarding/tips/tips-store.test.ts` (foundation cases): the store loads defaults when storage is empty, throws, or holds junk (tips off, no error); `enabled` is exposed only as `record.enabled && aiAvailable()`; writes go to `codex-cif-tips` through the injected `StorageLike`; a storage write that throws leaves the app working and tips off negative: with a stored `enabled = true`, `aiAvailable()` going false persists `enabled = false`, and `aiAvailable()` going true again leaves it `false`; if `sessionStorage` throws on read or write, `evaluate` shows no tip (FR-031).

### Implementation

- [x] T004 Create `packages/onboarding-journey-engine/src/tips.ts` with the types from data-model.md: `Tip` (`id` kebab-case unique, `goal: Goal`, `area: HelpArea`, `featureId`, `label` "string, 60 characters", `prompt`), `TipsRecord` (`schema: 1`, `enabled`, `optInAsked`, `dismissed: TipId[]`, `acted: TipId[]`, `dismissCounts: Record<HelpArea, number>` "only areas with a count above zero are stored", `silencedAreas: HelpArea[]`), `TipDecisionInput`, `TipDecision`, `NoTipReason`; export `emptyTipsRecord`, `parseTipsRecord` ("never throws"; unknown `schema` → defaults), `serializeTipsRecord`, `setTipsEnabled`, `markOptInAsked`. Use a `zod` schema consistent with `schema.ts` in the same package
- [x] T005 Export the tips API from `packages/onboarding-journey-engine/src/index.ts` (`export * from "./tips";`)
- [x] T006 Create `apps/web/src/lib/app/onboarding/tips/tips-store.svelte.ts`: class `TipsStore` with constructor-injected `{ storage: StorageLike; sessionStorage: StorageLike; aiAvailable: () => boolean }`; `$state` for the record; methods `load()`, `setEnabled(on)`, `answerOptIn(yes)`, `closeOptIn()`; the derived `enabled`; persist through `serializeTipsRecord` to `codex-cif-tips`. No shown, dismiss or act logic yet On construction and whenever `aiAvailable()` turns false, write `enabled = false` to storage so re-enabling AI never turns tips back on (FR-004).
- [x] T007 Create `apps/web/src/lib/app/onboarding/tips/tips-runtime.ts`: the production instance using `browserStorage`, `browserSessionStorage` from `$lib/utils/runtime-deps` and `isHelpAssistantAvailable` from `$lib/services/help-assistant/help-availability`, with the global-singleton pattern used by the other stores
- [x] T008 Run T002 and T003; make them pass

**Checkpoint**: Record and store exist and persist safely. Nothing is visible to users.

---

## Phase 3: User Story 1 - Turn tips on or off (Priority: P1) 🎯 MVP

**Goal**: A working, safe consent mechanism: the Settings switch and the one-time question. No tip chip yet, so turning tips on shows nothing, but consent is complete and testable.

**Independent Test**: Toggle the switch and reload; disable AI and see the switch vanish; finish a journey and answer the one-time question once.

### Tests first

- [x] T009 [P] [US1] Write `apps/web/src/lib/components/settings/CifTipsSetting.test.ts`: renders a labelled switch "Show tips from Cif", off by default; toggling updates the store and survives a reload (new store, same storage); negative: when `aiAvailable()` is false the component renders nothing (hidden, not disabled); negative: starting with `enabled = true`, disable AI, then re-enable it, and expect the switch to be off (FR-004).; the switch is a keyboard-operable checkbox and announces its state
- [x] T010 [P] [US1] Write `apps/web/src/lib/components/onboarding/TipsOptIn.test.ts`: shows the text "Want occasional tips from Cif?" with Yes, No and a close button; Yes sets `enabled` and `optInAsked`; No leaves `enabled` false and sets `optInAsked`; close sets `optInAsked` only; negative: makes zero `fetch` and zero `helpAssistant.ask` calls; does not take focus from a focused text field and announces instead; Escape closes it only when focus is inside it or nowhere
- [x] T011 [P] [US1] Extend `apps/web/src/lib/app/onboarding/tips/tips-store.test.ts`: `shouldAskOptIn` is true only when `goalInvitation === "goal"`, the active vault's setup has ended, `optInAsked` is false and AI is available; negative cases for each of those four conditions failing, and for any blocker active; after any answer it is never true again on this device (FR-006)
- [x] T012 [P] [US1] Extend `apps/web/src/lib/app/onboarding/journey/journey-store.test.ts`: new read-only getter `setupEnded` is true when `progress.outcome` is `"finished"` or `"exited"`, false for `"running"` and when there is no progress; unchanged behaviour elsewhere

### Implementation

- [x] T013 [US1] Add the read-only getter `setupEnded` to `apps/web/src/lib/app/onboarding/journey/journey-store.svelte.ts` (file is 419 lines; this adds under 10 and must keep it under 500)
- [x] T014 [US1] Add `shouldAskOptIn` to `tips-store.svelte.ts`, taking its inputs (goal invitation answer, `setupEnded`, blockers) through constructor-injected getters; wire the getters in `tips-runtime.ts` from `onboardingStore` and `journeyStore`
- [x] T015 [P] [US1] Create `apps/web/src/lib/components/settings/CifTipsSetting.svelte` (switch + the help text from the contract) and mount it after the existing controls in `apps/web/src/lib/components/settings/AISettings.svelte`
- [x] T016 [P] [US1] Update Help (Constitution VII): add a "Tips from Cif" section to `apps/web/src/lib/content/help/guided-setup.md` (what tips are, where the switch is, once per visit, never reads your vault, how to turn off) and the matching facts to `packages/help-engine/src/registry/features/guided-setup.ts`; British English, plain language; run the `help-engine` tests that validate registry entries
- [x] T017 [US1] Create `apps/web/src/lib/components/onboarding/TipsOptIn.svelte` (non-modal card in the journey-card dock position, focus handling copied from `GoalInvitation.svelte` via `focus.ts`) and mount it in `apps/web/src/lib/components/onboarding/OnboardingHost.svelte` behind `tipsStore.shouldAskOptIn`; the card must not render while the invitation, a journey card or a tour is showing
- [x] T018 [US1] Run T009 to T012; make them pass

**Checkpoint**: Consent works end to end. The feature is safe to ship even with no tips, because nothing appears without an explicit yes.

---

## Phase 4: User Story 2 - See one relevant next step (Priority: P1)

**Goal**: With tips on and a goal chosen, one chip suggests a catalogue tip; tapping it asks Cif.

**Independent Test**: Choose each goal, end setup, turn tips on, visit a screen with a tip: one chip; no request on show; tap opens Cif with the exact prompt.

### Tests first

- [x] T019 [P] [US2] Write `packages/onboarding-journey-engine/tests/tips-catalogue.test.ts`: every tip `id` is unique and kebab-case; `label` is at most 60 characters; `goal` is one of `world`, `story`, `campaign`; every `featureId` is in `FEATURE_REGISTRY` from `help-engine`; every `prompt` is exactly a string in the `QUICK_PROMPT_SETS` entry for the tip's `area` (so no tip can lead to "I don't know"); each goal has at least one tip; negative: a helper that mutates a tip's prompt or feature id makes the same assertions fail
- [x] T020 [P] [US2] Write `packages/onboarding-journey-engine/tests/tips.test.ts` (base decisions): `decideTip` returns `show` for an enabled, AI-available, goal-chosen, setup-ended input on an area with a tip; one `none` case per reason `disabled`, `ai-unavailable`, `no-goal`, `setup-not-ended`, `session-limit`, `no-eligible-tip`; reasons are checked in the order listed in data-model.md; the function is pure (same input twice gives equal output, input is not mutated) add `feature-unavailable` (an area listed in `unavailableAreas` returns `none("feature-unavailable")`, checked after `area-silenced` and before `no-eligible-tip`); and a case showing a tip for the same goal on an available area still shows.
- [x] T021 [P] [US2] Extend `tips-store.test.ts`: `evaluate(area)` sets the session marker `codex-cif-tips-session` only when a tip is actually shown; a second evaluation in the same session shows nothing (FR-008); a reload with the marker still present shows nothing; `act()` calls the injected `askCif(tip.prompt)` exactly once and records the tip in `acted`; showing a tip calls `fetch`, `askCif` and `helpAssistant.ask` zero times (FR-017) add: a failed or aborted `helpAssistant.ask` after a tap leaves Cif showing its fallback message with the static guide (FR-018); and when `sessionStorage` is unreadable no tip shows.
- [x] T022 [P] [US2] Write `apps/web/src/lib/components/onboarding/CifTipChip.test.ts`: renders the tip `label` with a visually hidden "Cif has a tip" prefix; announces once through a polite live region and does not move focus; tapping calls `act`; negative: renders nothing when no tip is current; no element has `role="dialog"` or `aria-modal`

### Implementation

- [x] T023 [US2] Add `TIP_CATALOGUE` to `packages/onboarding-journey-engine/src/tips.ts` with three tips per goal using the verified prompts listed in research D8 (world: generators, map, graph; story: canvas, graph, tables; campaign: map, tables, generators); `label` is fixed plain-language copy "never built from the vault"; skip any tip whose area is the same as the goal's journey `finish.next` target
- [x] T024 [US2] Implement `decideTip` base logic in `tips.ts` (reasons in order: `disabled`, `ai-unavailable`, `no-goal`, `setup-not-ended`, `session-limit`, `feature-unavailable` (driven by `unavailableAreas`), `no-eligible-tip`); a `no-goal` result for `goalInvitation` other than `"goal"` or a null goal
- [x] T025 [US2] Add `evaluate(area)`, `current` (the tip being shown or null), and `act()` to `tips-store.svelte.ts`; inject `askCif` and `now`-free dependencies; `act()` reuses the open-and-ask function already in `journey-runtime.ts` (extract it to a shared `askCif` helper if needed, keeping `journey-runtime.ts` behaviour and tests unchanged)
- [x] T026 [US2] Create `apps/web/src/lib/components/onboarding/CifTipChip.svelte`: a button with the label, polite live region, no focus change, Iconify icon, semantic tokens, tap target at least 44px; anchored beside the Cif button with Floating UI (fall back to a fixed bottom corner if the anchor is missing)
- [x] T027 [US2] Mount `CifTipChip` in `OnboardingHost.svelte` and call `tipsStore.evaluate(helpContext.current.area)` from an `$effect` keyed on the area (read the area inside `untrack` for everything else so unrelated state changes do not re-run it) also re-evaluate once when the setting turns on while the person is already on a screen (a pending evaluation for the current area, not a queue).
- [x] T028 [US2] Run T019 to T022; make them pass

**Checkpoint**: Tips work for a person who opted in. Quiet rules are not complete yet (US3), so do not release between T028 and T033.

---

## Phase 5: User Story 3 - Quiet by design (Priority: P1)

**Goal**: A tip never interrupts. It waits for a block to clear on the same screen only, never queues, never moves focus, respects reduced motion and phone widths.

**Independent Test**: Trigger each blocker; confirm no chip; clear it on the same screen; the chip may appear; leave the screen first; nothing appears later.

### Tests first

- [x] T029 [P] [US3] Extend `tips.test.ts`: `decideTip` returns `none("blocked")` for each blocker alone (`typing`, `dialogOpen`, `tourActive`, `journeyOrInvitationActive`, `cifOpen`) and for all together; `blocked` is checked after `session-limit` and before `area-silenced`
- [x] T030 [P] [US3] Extend `tips-store.test.ts`: a tip blocked on arrival becomes pending for that area; when the blocker clears on the same area it shows; when the area changes first, the pending tip is dropped and nothing shows on return unless the new arrival is itself eligible (research D3); a blocked tip does not set the session marker; no queue exists (two blocked arrivals produce at most one chip) add: turning the setting on while on a screen with a tip evaluates that screen once; leaving and returning does not show a second tip in the same session.
- [x] T031 [P] [US3] Extend `CifTipChip.test.ts`: under `prefers-reduced-motion: reduce` no transition class is applied; the dismiss button is a separate control with an accessible name "Dismiss tip" and at least a 44px target; Escape inside the chip dismisses it; the chip is removed when AI becomes unavailable (FR-002, invariant 6)
- [x] T032 [P] [US3] Write a Playwright smoke `apps/web/tests/cif-tips.spec.ts`: with tips on and a goal chosen, a chip appears at 375px and 1280px widths without horizontal overflow and without covering the Cif button; it does not appear while a modal dialog is open or while typing in an input also run at a tablet width (768px), run an axe accessibility scan on the page with a chip showing (as `a11y-workspace.spec.ts` does), and assert the chip text meets the contrast the app already enforces (FR-027, SC-007).

### Implementation

- [x] T033 [US3] Add the blocker checks to `decideTip` in `tips.ts` (`blocked` reason)
- [x] T034 [US3] Add pending-tip handling to `tips-store.svelte.ts`: `evaluate` records a pending area when blocked, and `reevaluate()` runs when a blocker clears; the pending area is cleared when the area changes
- [x] T035 [US3] In `tips-runtime.ts` and `OnboardingHost.svelte`, supply the blocker getters: `typing` from `isEditable(document.activeElement)` (`components/onboarding/focus.ts`), `dialogOpen` from `modalUIStore.isAnyModalOpen || modalUIStore.showZenMode`, `tourActive` from `helpStore.activeTour`, `journeyOrInvitationActive` from `journeyStore.active` and the invitation flag, `cifOpen` from `helpAssistant.isOpen || cifPopout.connected`; trigger `reevaluate()` from focus-out and from changes to those values, never from timers or pointer events also supply `unavailableAreas` from the Cif context (`generators` when `generatorsAvailable()` is false, for example in a guest vault; other areas from the same availability flags `helpContext` already computes), and add a store test that a generators tip is not shown in a guest vault.
- [x] T036 [US3] Add reduced-motion and phone-width handling to `CifTipChip.svelte` (`motion-safe:` transition classes only; bottom placement above the safe area on phones)
- [x] T037 [US3] Run T029 to T032; make them pass

**Checkpoint**: Tips are safe to ship. P1 stories are complete; this is the minimum releasable slice.

---

## Phase 6: User Story 4 - Dismissals are respected (Priority: P2)

**Goal**: A dismissed or used tip never returns; two dismissals silence a screen until the setting is cycled.

**Independent Test**: Dismiss, reload, confirm gone; dismiss twice on one screen, confirm silence; cycle the switch, confirm the screen can show tips again.

### Tests first

- [x] T038 [P] [US4] Extend `packages/onboarding-journey-engine/tests/tips.test.ts`: `dismissTip` adds the id to `dismissed` and increments `dismissCounts[area]`; a count of 2 adds the area to `silencedAreas`; `actOnTip` adds to `acted`; `decideTip` skips tips in `dismissed` or `acted` and returns `none("area-silenced")` for a silenced area; negative: dismissing the same tip twice does not double-count `dismissed` entries; a silenced area stays silent for other tips
- [x] T039 [P] [US4] Extend `tips-store.test.ts` and `CifTipChip.test.ts`: `dismiss()` removes the chip, persists to storage, and the tip does not show again after a new store loads the same storage; cycling `setEnabled(false)` then `setEnabled(true)` clears silenced areas and counts but a dismissed tip still does not return (FR-022, research D5)

### Implementation

- [x] T040 [US4] Implement `dismissTip` and `actOnTip` in `tips.ts` and the dismissed, acted and silenced filters in `decideTip`
- [x] T041 [US4] Add `dismiss()` to `tips-store.svelte.ts` and wire the chip's dismiss button in `CifTipChip.svelte`; `act()` also records `acted`
- [x] T042 [US4] Run T038 and T039; make them pass

**Checkpoint**: Tips no longer repeat or nag.

---

## Phase 7: User Story 5 - Nothing without a goal (Priority: P2)

**Goal**: People who chose "Explore on my own" or dismissed the invitation never get goal-based tips; changing the goal later changes the tips.

**Independent Test**: Choose "Explore on my own", turn tips on: no chip. Choose a goal later: tips follow that goal.

### Tests first

- [x] T043 [P] [US5] Extend `tips.test.ts`: `goalInvitation` of `"explore"`, `"dismissed"` and `null` each return `none("no-goal")` even with tips on and setup ended; a changed `goal` changes which tip is chosen without altering `dismissed` or `acted` (FR-025)
- [x] T044 [P] [US5] Extend `tips-store.test.ts`: with `goalInvitation = "explore"` and the switch on, `evaluate` never shows a tip and never asks the opt-in question; with a goal chosen later through Getting Started, the next eligible arrival uses the new goal

### Implementation

- [x] T045 [US5] Confirm `decideTip`'s `no-goal` rule and the `OnboardingHost` wiring read `onboardingStore.goalInvitation` and `onboardingStore.chosenGoal` (reactive), with no copy of the goal stored in the tips record
- [x] T046 [US5] Run T043 and T044; make them pass

**Checkpoint**: All five stories complete.

---

## Phase 8: Polish and cross-cutting

- [x] T047 [P] Add privacy regression tests in `apps/web/src/lib/app/onboarding/tips/tips-privacy.test.ts`: the tip modules import nothing from `vault`, `entities` or stores that hold vault content (assert on the module graph or a source scan like `help-privacy.test.ts`); nothing in `codex-cif-tips` or the session marker contains a name, text or vault id; no tip code references `fetch`, `sendBeacon` or analytics (SC-002, SC-008) Also extend `packages/onboarding-journey-engine/tests/budgets.test.ts`: `decideTip` over 1000 calls averages under 1 ms, and the existing 10 KB gzipped bundle test still passes with the tips code (F9).
- [x] T048 [P] Run the `help-engine` and `HelpAssistantPanel` tests to confirm the registry and Cif behaviour are unchanged: `bun scripts/test-changed.mjs`
- [ ] T049 Walk the ten manual scenarios in [quickstart.md](./quickstart.md) in a dev build, including a screen reader pass, reduced motion, a 375px phone width and blocked storage; fix anything found and add a test for each fix
- [ ] T050 Run the PR quality gate from AGENTS.md: `bun scripts/lint-changed.mjs`, `bun scripts/test-changed.mjs`, scoped `svelte-check` in `apps/web` and `tsc --noEmit` in `packages/onboarding-journey-engine`, then `bunx fallow audit --format json --quiet --explain --gate-marker agent`, then the `codex-review` specialist review; open a regular ready-for-review PR with `Closes #3998`
- [ ] T051 Defer the user-facing changelog line to the release (`write-release-entry`); do not add under-the-hood detail to `releases.json`

---

## Dependencies and execution order

- **Phase 1 → Phase 2** first. **Phase 2 blocks everything.**
- **US1** needs Phase 2 only. It can ship alone: consent without tips is safe.
- **US2** needs Phase 2 and the consent from US1 to be useful, but its engine tasks (T019, T020, T023, T024) have no dependency on US1.
- **US3** extends US2 (`decideTip`, the store and the chip). **Do not release US2 without US3.**
- **US4** extends US2 and US3 (`decideTip` filters, `dismiss`).
- **US5** is mostly assertions on US2's `no-goal` rule; it can run any time after US2.
- **Polish** is last.

```text
Phase 1 → Phase 2 → US1 ──────────────┐
                 └→ US2 → US3 → US4   ├→ Polish
                          └──→ US5 ───┘
```

## Parallel opportunities

- Phase 2: T002 and T003 together.
- US1: T009 to T012 together, then T015 and T016 together.
- US2: T019 to T022 together.
- US3: T029 to T032 together.
- US4: T038 and T039 together; US5: T043 and T044 together.
- Different developers: one on the engine (`tips.ts` and its tests), one on the components, once T004 and T006 are in.

## Implementation strategy

1. **MVP**: Phases 1 to 5 (T001 to T037). This is the smallest slice that is safe and useful: consent, one relevant tip, and the quiet rules.
2. **Increment**: add US4 (dismissals) before announcing the feature widely; without it a person can only get rid of a tip by turning tips off.
3. **Finish**: US5 and Polish. US5 is largely tests, because the no-goal rule is already in `decideTip` from US2.
4. Keep every commit green: tests first, then implementation, with the Fallow gate before each commit.
