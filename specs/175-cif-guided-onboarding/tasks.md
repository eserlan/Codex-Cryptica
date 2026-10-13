---
description: "Task list for Cif-Guided Onboarding, Phase 1"
---

# Tasks: Cif-Guided Onboarding, Phase 1 (Goal-Driven First Success)

**Input**: Design documents from `/specs/175-cif-guided-onboarding/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (journey-engine-api, first-run-orchestrator, guidance-shell-controls, ui-onboarding), quickstart.md

**Tests**: Required (Constitution II). Every changed behaviour gets a test written first that fails, covering the success path and at least one failure, cancellation or negative path. There is no manual verification step: every requirement is asserted by an automated test.

**Organization**: Tasks are grouped by user story. Stories 1 to 3 are all P1 and ship together. Story 4 (P2) is independently testable on top of them.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1 invitation, US2 journey runner and card, US3 the three journeys, US4 Getting Started

## Path Conventions

- New package: `packages/onboarding-journey-engine/` (sources in `src/`, tests in `tests/`, following `packages/solo-session-engine`)
- help-engine: `packages/help-engine/src/`, tests in `packages/help-engine/tests/`
- Web app: `apps/web/src/lib/...`, co-located Vitest `*.test.ts`, Playwright in `apps/web/tests/`

---

## Phase 1: Setup

**Purpose**: Create the new workspace package so everything else can import it.

- [x] T001 Create `packages/onboarding-journey-engine/package.json` modelled on `packages/solo-session-engine/package.json` (name `onboarding-journey-engine`, `"type": "module"`, `main`/`types` → `./src/index.ts`, scripts `test`, `test:coverage`, `lint`), with dependencies `help-engine: "workspace:*"` and `zod` (same version range as `packages/help-engine/package.json`), plus `packages/onboarding-journey-engine/bunfig.toml` copied from `packages/solo-session-engine/bunfig.toml` (ignore `src/index.ts`, `src/types.ts`, `src/journeys/index.ts` in coverage)
- [x] T002 Create `packages/onboarding-journey-engine/tsconfig.json` and an empty barrel `packages/onboarding-journey-engine/src/index.ts`, following `packages/solo-session-engine`
- [x] T003 Add `"onboarding-journey-engine": "workspace:*"` to `apps/web/package.json` dependencies (next to `solo-session-engine`) and run `bun install` from the repo root

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: Engine types, schema, reducer and persistence; help-engine shell controls; the runner pass-through. Every story depends on these.

**⚠️ CRITICAL**: No user story work starts until this phase is done.

### Tests first (write, see them fail)

- [x] T004 [P] Write schema tests in `packages/onboarding-journey-engine/tests/schema.test.ts`: `JourneyDefinitionSchema` rejects duplicate step ids; rejects `after` that references a later or unknown step; rejects a missing `fallback`; rejects `categories` without `anyEntryCopy`; rejects a `showMe` that fails help-engine `GuidanceActionSchema`; rejects a quickPrompt not present in `QUICK_PROMPT_SETS`; rejects fewer than 2 or more than 6 steps; rejects `title` > 60, `instruction` > 160, `fallback` > 200, `anyEntryCopy` > 160 chars; rejects a non-positive `version`; accepts a valid minimal definition
- [x] T005 [P] Write reducer tests in `packages/onboarding-journey-engine/tests/progress.test.ts` covering contract guarantees 1–7 and 6a (journey-engine-api.md): milestone with `at < startedAt` ignored; any milestone ignored when `outcome !== "running"`; repeated milestone is idempotent and returns the same reference; `after` eligibility judged on the before-state; one milestone completes several independent steps; out-of-order completion keeps `current` on the first step not done; `skipStep` adds to `skipped` only and never to `completed`; completing a skipped step moves it to `completed` (never in both lists); **Back**: `backStep` sets `viewing` to the step before the displayed one in definition order, repeated `backStep` walks further back, `backStep` on the first step is a no-op; `returnToCurrent` clears `viewing`; a completing milestone clears `viewing`; `skipStep` while viewing an already completed step changes nothing (same reference); `skipStep` while viewing a not-done step skips it and clears `viewing`; a completed step stays completed whatever happens next (6a); `exitJourney` sets `outcome: "exited"`; `resumeJourney` keeps `completed`/`skipped` and sets `running`; `outcome` becomes `"finished"` when no step is left; `stepPosition` returns `{ index, total }`
- [x] T006 [P] Write category tests in `packages/onboarding-journey-engine/tests/categories.test.ts`: a step requiring `[location]` matches only `location` when that id exists in `availableCategories`; matches any `entry-created` when none of its categories exist; `stepInstruction` returns `anyEntryCopy` in that case and `instruction` otherwise; a `connection-added` milestone never matches an `entry-created` matcher
- [x] T007 [P] Write persistence tests in `packages/onboarding-journey-engine/tests/persistence.test.ts` (guarantees 8–9): `parseProgress` discards malformed JSON, non-objects and unknown `schema`; never throws; drops step ids the definition no longer has; clears a dangling `viewing`; migrates an older `journeyVersion` to the current one; `serializeProgress` output key set is exactly `schema, journeyId, journeyVersion, startedAt, completed, skipped, viewing, outcome` (SC-008)
- [x] T008 [P] Write budget tests in `packages/onboarding-journey-engine/tests/budgets.test.ts` (guarantee 11): applying a 100-entity batch of `entry-created` milestones through `applyMilestone` takes < 16 ms (measured with `performance.now()`, median of 5 runs); `Bun.build` of `src/index.ts` with `minify: true` and `help-engine`/`zod` marked external, gzipped with `Bun.gzipSync`, is < 10 240 bytes
- [x] T009 [P] Write help-engine tests in `packages/help-engine/tests/actions.test.ts` (guidance-shell-controls.md): a `highlight` of `create-entry`/`open-search`/`activity-bar-graph` is rejected by `validateAction` without `extraAvailable` and accepted with `extraAvailable: SHELL_CONTROL_IDS`; `extraAvailable` is not written back into `ctx.availableActions`; `shell` area passes on any screen area; no shell id has a `requiresFlag` (accepted with every flag off); existing Cif actions behave exactly as before when `extraAvailable` is omitted; `sanitizeHelpContext` output never contains shell ids
- [x] T010 [P] Extend `apps/web/src/lib/services/help-assistant/help-action-runner.test.ts`: `run(action, { extraAvailable })` passes the list to `validateAction` and resolves `true` when the highlight target renders; resolves `false` when validation fails or `HelpHighlightService.show()` finds no rendered target; `run(action)` without options is unchanged

### Implementation

- [x] T011 [P] Define types in `packages/onboarding-journey-engine/src/types.ts` exactly as data-model.md: `Goal = "world" | "story" | "campaign"`, `InvitationChoice = Goal | "explore"`, `JourneyId = "worldbuilder" | "writer" | "rpg-gm"`, `JourneyDefinition`, `StepDefinition`, `Milestone` (with `at: number`; kinds `entry-created { category }`, `connection-added`, `generator-saved`, `entry-found`, `screen { area: "graph" }` — no name, text, entry id, connection id or label fields), `MilestoneMatcher`, `JourneyProgress` (`schema: 1`, `outcome: "running" | "exited" | "finished"`)
- [x] T012 Implement `JourneyDefinitionSchema` in `packages/onboarding-journey-engine/src/schema.ts` with the refinements from T004 (depends on T011; makes T004 pass)
- [x] T013 [P] Implement category resolution and `stepInstruction` in `packages/onboarding-journey-engine/src/categories.ts` (depends on T011; makes T006 pass)
- [x] T014 Implement `startJourney`, `resumeJourney`, `applyMilestone`, `skipStep`, `backStep`, `returnToCurrent`, `exitJourney`, `currentStep`, `stepPosition` in `packages/onboarding-journey-engine/src/progress.ts` (pure; same reference when nothing changes; depends on T011, T013; makes T005 and T008's timing case pass)
- [x] T015 [P] Implement `parseProgress` and `serializeProgress` in `packages/onboarding-journey-engine/src/persistence.ts` (depends on T011; makes T007 pass)
- [x] T016 Export the public API from `packages/onboarding-journey-engine/src/index.ts` (types, schema, progress functions, persistence; journeys added in US3) (makes T008's bundle case pass)
- [x] T017 Add `SHELL_CONTROL_IDS = ["create-entry", "open-search", "activity-bar-graph"] as const`, append them to `CONTROL_IDS`, add `"shell"` to `ControlSpec.area`, add catalogue entries `{ area: "shell" }` for each (no `requiresFlag`), and treat `"shell"` like `"solo"` in `controlIsOnScreen`, in `packages/help-engine/src/actions/catalogue.ts`; export `SHELL_CONTROL_IDS` from `packages/help-engine/src/actions/index.ts`
- [x] T018 Add optional `extraAvailable?: readonly string[]` to `ActionDeps` and merge it into the available set for that single call only, in `packages/help-engine/src/actions/validate.ts` (depends on T017; makes T009 pass)
- [x] T019 Add `options?: { extraAvailable?: readonly string[] }` to `HelpActionRunner.run` and pass it to `validateAction` in `apps/web/src/lib/services/help-assistant/help-action-runner.ts` (depends on T018; makes T010 pass)

**Checkpoint**: `cd packages/onboarding-journey-engine && bun test` and `cd packages/help-engine && bun test` pass.

---

## Phase 3: User Story 1 - Choose a goal or explore alone (Priority: P1) 🎯 MVP

**Goal**: Not-onboarded users get the goal invitation instead of the auto tour, through the single first-run decision point, and every other first-run prompt treats them correctly (FR-003a).

**Independent Test**: Fresh profile, empty vault → invitation appears alone; each of the four choices and Close behaves as specified; no AI request; the theme prompt still appears later for a user who answered the invitation.

### Tests for User Story 1

- [x] T020 [P] [US1] Rewrite `apps/web/src/lib/app/onboarding/onboarding-orchestrator.test.ts` for contracts/first-run-orchestrator.md: `isOnboarded` truth table (tour seen, invitation resolved, both, neither); one case per decision-table row 1–5; empty and populated vault both give `goal-invitation` (no `entityCount` input); `hasSeenTour` or `goalInvitationResolved` → never `goal-invitation`; guest, demo, `?demo=`, landing and vault switcher → `none`; `activeTour`/`anyModalOpen`/`journeyActive` while not onboarded → `none`; `journeyActive` defers `changelog`; converted demo (not demo mode, entries present, not onboarded) → `goal-invitation`; `tour` and `guided-empty` kinds no longer returned
- [x] T021 [P] [US1] Write `apps/web/src/lib/app/onboarding/vault-theme-prompt-gate.test.ts` for a pure `shouldConsiderVaultThemePrompt(state)` extracted from `(app)/+layout.svelte:382-397`: every existing condition still blocks (not initialised, hidden document, demo, guest, landing, world page not dismissed, changelog open, active tour, modal open); **a user who answered the invitation but never took the tour passes** (regression for FR-003a); a not-onboarded user is blocked; `firstRunGuidanceActive` blocks
- [x] T022 [P] [US1] Extend `apps/web/src/lib/stores/ui/onboarding.test.ts`: `goalInvitation` (`"goal" | "explore" | "dismissed" | null`) and `chosenGoal` (`Goal | null`) persist under `codex_goal_invitation` and `codex_chosen_goal`; default `null`; invalid stored values read as `null`; storage throwing on write keeps the in-memory value; transient `firstRunGuidanceActive` defaults to `false` and is never written to storage
- [x] T023 [P] [US1] Write `apps/web/src/lib/components/onboarding/GoalInvitation.test.ts`: renders heading "What would you like to do first?" and the Cif/Oracle sentence; four buttons in order plus Close with accessible names; goal tap sets `goalInvitation = "goal"` and `chosenGoal` and calls the injected start-journey callback; Explore sets `"explore"` and shows "Take the short tour" / "No thanks" with the Getting Started note, without starting the tour; "Take the short tour" starts `initial-onboarding`; Escape and Close set `"dismissed"`, start nothing, and return focus to the previously focused element (or main content when there was none); focus moves to the heading only when no editable element is focused (negative case: an input keeps focus); `role="dialog"`, `aria-modal="false"`; no copy promises AI when AI is disabled
- [x] T024 [P] [US1] Write `apps/web/src/lib/components/onboarding/OnboardingHost.test.ts`: `goal-invitation` mounts `GoalInvitation`, sets `onboardingStore.firstRunGuidanceActive = true`, and never starts the tour; closing the invitation sets it back to `false`; `changelog` behaves as the old layout effect did; `none` mounts nothing

### Implementation for User Story 1

- [x] T025 [US1] Update `apps/web/src/lib/app/onboarding/onboarding-orchestrator.ts`: export `isOnboarded`; `FirstRunAction` = `none | goal-invitation | changelog`; `FirstRunState` gains `goalInvitationResolved` and `journeyActive`, drops `entityCount`; implement the decision table top to bottom using `isOnboarded` (makes T020 pass)
- [x] T026 [P] [US1] Add `goalInvitation` and `chosenGoal` keys to `UI_STORAGE_KEYS` in `apps/web/src/lib/stores/ui/persistence.ts`, and the persisted fields with setters plus the transient `firstRunGuidanceActive = $state(false)` to `apps/web/src/lib/stores/ui/onboarding.svelte.ts` through the injected storage (makes T022 pass)
- [x] T027 [US1] Create `apps/web/src/lib/app/onboarding/vault-theme-prompt-gate.ts` with the pure `shouldConsiderVaultThemePrompt(state)` using `isOnboarded()` in place of `hasCompletedInitialGuide` and adding `!firstRunGuidanceActive`; in `apps/web/src/routes/(app)/+layout.svelte` replace the local arrow function and both call sites (~lines 382–397 and 557–580) with calls to it, passing `goalInvitationResolved: onboardingStore.goalInvitation !== null` (makes T021 pass)
- [x] T028 [US1] Create `apps/web/src/lib/components/onboarding/GoalInvitation.svelte` per contracts/ui-onboarding.md (non-modal card, bottom-centre desktop/tablet, bottom sheet on phone, polite live region, 44×44 px targets, focus return on close, testids `goal-invitation`, `goal-invitation-world|story|campaign|explore`, `goal-invitation-close`, `goal-invitation-tour`; Svelte 5 runes, semantic tokens, `icon-[lucide--…]`) (makes T023 pass)
- [x] T029 [US1] Create `apps/web/src/lib/components/onboarding/OnboardingHost.svelte`: move the first-run decision effect (~lines 501–549) out of `apps/web/src/routes/(app)/+layout.svelte` unchanged except for the new kind and state fields (`goalInvitationResolved = onboardingStore.goalInvitation !== null`, `journeyActive` from the journey store, initially `false`); mount `GoalInvitation`; keep `onboardingStore.firstRunGuidanceActive` equal to "invitation open or journey active"
- [x] T030 [US1] Replace the removed effect in `apps/web/src/routes/(app)/+layout.svelte` with `<OnboardingHost />` and delete now-unused imports (makes T024 pass)
- [x] T031 [US1] Add `!onboardingStore.firstRunGuidanceActive` to the existing `showCoachMarks` derivation in `apps/web/src/lib/components/GraphView.svelte` (~line 114). The flag is covered by T022/T024; the visible effect by E2E T058

**Checkpoint**: Invitation works on its own; choosing a goal records it (the journey card arrives in US2); the theme prompt still reaches users who answered the invitation.

---

## Phase 4: User Story 2 - Complete a guided first-success journey (Priority: P1)

**Goal**: One journey runner (store + milestone adapter + card) that advances only on real, content-free milestones, with Show me, Ask Cif, Back, Back to current step, Skip, Exit, finish, the reload rule and tour exclusivity.

**Independent Test**: Start any journey on an empty vault; each step advances only after the real action; Show me opens/highlights without vault changes; Back/Skip/Exit behave; starting the tour stops the journey; finish card shows one suggestion.

### Tests for User Story 2

- [x] T032 [P] [US2] Write `apps/web/src/lib/app/onboarding/journey/journey-milestones.test.ts` with fake buses: `BATCH_CREATED` with N entities emits N `entry-created` milestones carrying only `entity.type`; `CONNECTION_ADDED` emits `connection-added`; `JOURNAL:CAPTURE` with `payload.entryType === "generated-saved"` emits `generator-saved` and other entry types emit nothing; `codex-search-entity-focus` emits `entry-found`; `recordEntryFound()` emits `entry-found`; entity and connection delete events emit nothing; **privacy**: use Proxy-wrapped payloads that throw on access to `content`, `title`, `name`, `id`, `entityId`, `label`, `connectionType` and assert no throw; `dispose()` unsubscribes every source
- [x] T033 [P] [US2] Write `apps/web/src/lib/app/onboarding/journey/journey-store.test.ts` with injected `StorageLike`, session storage, clock, runner, categories and a fake tour (`activeTour`, `skipTour`): `start(goal)` writes `codex-onboarding-journey:<vaultId>` and the `codex-onboarding-journey-active` session marker; a milestone advances and persists; milestones before `startedAt` ignored; `screen graph` applied when the area changes and after every other transition; starting another goal exits the running one (only one running per vault); **tour exclusivity (FR-016)**: `start()` calls `skipTour()` when a tour is active, and a tour becoming active exits the running journey with progress kept; `exit()` stops guidance, clears the marker and never calls vault APIs; finishing clears the marker; reload with a matching marker restores the card; no marker or a marker for another vault → card hidden but progress kept; vault switch pauses; storage `setItem` throwing → journey keeps running in memory; malformed stored progress → treated as none; `back()`/`returnToCurrent()`/`skip()` delegate to the engine and persist; `showMe()` calls `runner.run(action, { extraAvailable: SHELL_CONTROL_IDS })` and switches to `fallback` text when it resolves `false`; `showMe()` is never called without a user action; `askCifAvailable` is false when AI is disabled or Cif is unavailable
- [x] T034 [P] [US2] Write `apps/web/src/lib/components/onboarding/JourneyCard.test.ts`: shows title, "Step n of N", instruction; Show me only when the step has `showMe`, fallback replaces the instruction on `false` and is announced; Ask Cif hidden without `quickPrompt` or when AI disabled, and when shown opens Cif and asks the prompt; Back disabled on the first step in journey order; `journey-return-current` shown only while viewing an earlier step and returns to the first step not done; Skip hidden on a step already done; Exit labelled "Stop guided setup"; finish state with at most one `journey-next` and `journey-done`; collapse to a "Guided setup · n/N" pill that stays keyboard reachable; **Escape** with focus inside the card collapses it and focuses the pill, never exits; Escape with focus outside the card does nothing; `aria-live="polite"` announces "Step done: …" without moving focus; never steals focus from a focused input; all targets ≥ 44×44 px; moves to the opposite corner when a highlight rect overlaps it; no backdrop
- [x] T035 [P] [US2] Write a test in `apps/web/src/lib/components/explorer/EntityExplorer.test.ts` (create if missing) asserting `handleSelect` calls the journey `recordEntryFound()` and passes no entity data

### Implementation for User Story 2

- [x] T036 [US2] Implement the milestone adapter in `apps/web/src/lib/app/onboarding/journey/journey-milestones.ts` (constructor DI: `vaultEventBus`, `appEventBus`, window target, clock; exported `recordEntryFound()`; reads only the fields listed in research R2) (makes T032 pass)
- [x] T037 [US2] Implement `JourneyStore` in `apps/web/src/lib/app/onboarding/journey/journey-store.svelte.ts` (constructor DI: storage, session storage, clock, milestone adapter, help context for `area`, `HelpActionRunner`, categories store, AI/Cif availability, tour (`helpStore` by default: `activeTour`, `skipTour`); production defaults via `browserStorage`/`browserSessionStorage` from `utils/runtime-deps.ts`; exported singleton; `$state` for progress, collapse and fallback flags; `active` getter for `journeyActive`) (makes T033 pass)
- [x] T038 [US2] Create `apps/web/src/lib/components/onboarding/JourneyCard.svelte` per contracts/ui-onboarding.md (bottom-right max-w 22rem desktop/tablet, bottom sheet above the activity bar on phone, Escape-to-collapse, testids `journey-card`, `journey-step-instruction`, `journey-show-me`, `journey-ask-cif`, `journey-back`, `journey-return-current`, `journey-skip`, `journey-exit`, `journey-finish`, `journey-next`, `journey-done`, `journey-collapse`) (makes T034 pass)
- [x] T039 [US2] Wire `OnboardingHost.svelte`: create/dispose the milestone adapter with the journey store, mount `JourneyCard` when a journey is active, pass `journeyStore.active` as `journeyActive` to the orchestrator and into `firstRunGuidanceActive`, and have `GoalInvitation`'s goal choice call `journeyStore.start(goal)`; extend `OnboardingHost.test.ts` for these wires
- [x] T040 [US2] Call `recordEntryFound()` from `handleSelect` in `apps/web/src/lib/components/explorer/EntityExplorer.svelte` (makes T035 pass)

**Checkpoint**: A journey (using a test fixture definition) runs end to end in unit/component tests.

---

## Phase 5: User Story 3 - Three goal journeys that match real workflows (Priority: P1)

**Goal**: Worldbuilder, Writer and RPG GM definitions, plus the `data-help-target` placements their Show me steps need at every width.

**Independent Test**: Each journey reaches its finish milestone on desktop, tablet and phone, AI on and off, using only rendered controls.

### Tests for User Story 3

- [x] T041 [P] [US3] Write `packages/onboarding-journey-engine/tests/journeys.test.ts`: every `JOURNEYS` entry passes `JourneyDefinitionSchema` (guarantee 10); `journeyForGoal` maps world→worldbuilder, story→writer, campaign→rpg-gm; step ids and `completeOn`/`after` exactly as the data-model "Journey content (P1)" table; scenario tests: Worldbuilder finishes after location, character, connection, then `screen graph`, and a `screen graph` before the others does nothing; Worldbuilder with character created first marks `add-character` done and keeps `current = add-place` (Story 3 scenario 6); Writer finishes with a `note` instead of a `location` and `entry-found` before its `after` steps does nothing; **RPG GM: one save (`entry-created` then `generator-saved`) does not finish, a second `entry-created [character|location]` does**; pre-existing entries (milestones before `startedAt`) never count; no copy names Cif as a content source
- [x] T042 [P] [US3] Write component tests for the new targets: `apps/web/src/lib/components/layout/AppHeader.test.ts` (create or extend) asserts `data-help-target="create-entry"` on `header-create-button` and `data-help-target="open-search"` on `search-input` and `mobile-search-button`, with Guided Mode on and off; `apps/web/src/lib/components/layout/ActivityBar.test.ts` (create or extend) asserts `data-help-target="activity-bar-graph"`; `apps/web/src/lib/components/ui/EmptyState.test.ts` (create or extend) asserts the optional `ctaHelpTarget` prop renders on the CTA and is absent when not passed

### Implementation for User Story 3

- [x] T043 [P] [US3] Author `packages/onboarding-journey-engine/src/journeys/worldbuilder.ts`: steps `add-place` → entry-created [location]; `add-character` → entry-created [character]; `connect` → connection-added (showMe highlight `add-connection-button`, which already opens `status-tab`); `see-graph` → screen graph, after [add-place, add-character, connect] (showMe highlight `activity-bar-graph`); create steps showMe highlight `create-entry`; finish `next` = `navigate map` labelled "Put your world on a map"; plain-language `fallback` and `anyEntryCopy` on every step
- [x] T044 [P] [US3] Author `packages/onboarding-journey-engine/src/journeys/writer.ts`: `add-character` → [character]; `add-place-or-note` → [location, note]; `connect` → connection-added; `find-again` → entry-found, after [add-character, add-place-or-note] (showMe highlight `open-search`); finish `next` = `openHelp` the canvas article, "Lay out your story on a canvas"; no beat-sheet or manuscript features
- [x] T045 [P] [US3] Author `packages/onboarding-journey-engine/src/journeys/rpg-gm.ts`: `generate` → generator-saved (showMe `openGenerator`, copy works with non-AI mode, FR-020); `add-related` → entry-created [character, location], after [generate] (copy points to **Generate related** on the first entry); finish `next` = `navigate map`, "Prepare a map for your table"; optional `quickPrompt` only from `QUICK_PROMPT_SETS`
- [x] T046 [US3] Create `packages/onboarding-journey-engine/src/journeys/index.ts` exporting `JOURNEYS` and `journeyForGoal`, and export them from `src/index.ts` (makes T041 pass; T008's bundle budget must still pass)
- [x] T047 [P] [US3] Add `data-help-target="create-entry"` to `header-create-button` and `data-help-target="open-search"` to `search-input` and `mobile-search-button` in `apps/web/src/lib/components/layout/AppHeader.svelte` (both Guided Mode variants)
- [x] T048 [P] [US3] Add `data-help-target="activity-bar-graph"` to the graph button in `apps/web/src/lib/components/layout/ActivityBar.svelte`
- [x] T049 [P] [US3] Add optional `ctaHelpTarget` prop to `apps/web/src/lib/components/ui/EmptyState.svelte` (rendered as `data-help-target` on the CTA only when set) and pass `ctaHelpTarget="create-entry"` from `apps/web/src/lib/components/graph/GraphEmptyState.svelte` (makes T042 pass)
- [x] T050 [US3] Add `data-help-target="create-entry"` to `graph-fab-create` in `apps/web/src/lib/components/GraphView.svelte` (same file as T031, so not parallel with it; asserted by the render contract in T060)

**Checkpoint**: All three journeys are selectable from the invitation and complete in component/unit tests.

---

## Phase 6: User Story 4 - Start or restart guided setup later (Priority: P2)

**Goal**: The Getting Started checklist starts, continues, restarts or switches journeys.

**Independent Test**: Dismiss the invitation, open Help, start Writer from Getting Started, exit, start again (offers Continue and Start over).

### Tests for User Story 4

- [x] T051 [P] [US4] Extend `apps/web/src/lib/app/onboarding/journey/journey-store.test.ts`: `resume()` on an exited journey sets `running` from the first step not done and writes the session marker; `startOver(goal)` resets `completed`/`skipped` with a fresh `startedAt`; `resume()` on a finished or missing journey does nothing
- [x] T052 [P] [US4] Extend `apps/web/src/lib/components/help/GettingStartedChecklist.test.ts`: "Guided setup" group (`guided-setup`) with `guided-setup-world|story|campaign`; tapping one starts that journey via the journey store and closes Help; `guided-setup-continue` shown only when the active vault's journey is exited and unfinished; `guided-setup-start-over` calls `startOver`; picking another goal while one runs exits it first; group hidden in the standalone `/help` window; works with AI disabled

### Implementation for User Story 4

- [x] T053 [US4] Add `resume()` and `startOver(goal)` to `apps/web/src/lib/app/onboarding/journey/journey-store.svelte.ts` (makes T051 pass)
- [x] T054 [US4] Add the "Guided setup" group to `apps/web/src/lib/components/help/GettingStartedChecklist.svelte` above existing items, using the same standalone-window check as `HelpHeader.svelte` (makes T052 pass)

**Checkpoint**: Guided setup reachable in ≤ 2 taps from opening Help (asserted in T059).

---

## Phase 7: Help, E2E and Polish

**Purpose**: User documentation (Constitution VII), the #4000 evaluation gate, and validation.

### User help

- [x] T055 [P] Write `apps/web/src/lib/content/help/guided-setup.md` (picked up automatically by `content/loader.ts`): what guided setup is, the three goals, that it never changes the vault and needs no AI, how to start/continue/stop it from Help → Getting Started, Cif vs the Oracle; plain language, British English, matching front-matter of sibling articles
- [x] T056 [P] Add `packages/help-engine/src/registry/features/guided-setup.ts` and register it in `packages/help-engine/src/registry/features/index.ts` so Cif can answer "How do I restart guided setup?"; extend `packages/help-engine/tests/help-corpus.test.ts` (or the registry test) to assert the entry and article resolve

### E2E (Playwright)

- [x] T057 Update `apps/web/tests/first-run-onboarding-e2e.spec.ts`: invitation replaces the auto tour; Explore → "Take the short tour" starts it, "No thanks" doesn't; Close/Escape never reappears after reload; returning user with `completedTours: ["initial-onboarding"]` sees nothing; guest, demo, `?demo=` see nothing; converted demo sees the invitation once; changelog and vault theme prompt never stack with the invitation or a journey (SC-005); **the vault theme prompt still appears for a user who chose Explore and closed the confirmation** (FR-003a regression)
- [x] T058 [P] Update `apps/web/tests/mobile-first-time-ux.spec.ts`: phone invitation as bottom sheet; graph coach marks hidden while invitation/journey active, shown after Explore
- [x] T059 [P] Update `apps/web/tests/help-onboarding.spec.ts`: Getting Started guided setup start, continue, start over, switch goal; assert starting a journey takes ≤ 2 taps after opening Help (SC-007)
- [x] T060 Create `apps/web/tests/guided-setup-journeys.spec.ts`: all three journeys on desktop (1280), tablet (820) and phone (390), AI enabled and disabled; out-of-order completion keeps the card on the first step not done; RPG GM needs two saves; assert the category id each create path writes; Show me highlights a visible `[data-help-target]` or shows fallback per a fallback table (render contract, SC-006); the card never overlaps the highlighted control on phone; Back, Back to current step, Escape-to-collapse; starting the tour from Help replay stops the journey and Getting Started then shows Continue (FR-016); reload in the same session restores the card, a new browser context doesn't and Getting Started shows Continue; **zero requests matching `help|oracle|generativelanguage`** across load, invitation, goal choice, steps, Show me and milestones (SC-003); vault contents after each journey equal only what the test created (SC-004); stored `codex-onboarding-journey:<vaultId>` holds only the allowed keys and no names/text/ids (SC-008); axe check on invitation, card and Getting Started with no serious/critical violations and a keyboard-only run of one journey (SC-009)

### Validation

- [x] T061 Run `cd packages/onboarding-journey-engine && bun test --coverage` (≥ 70% lines, budgets pass) and `cd packages/help-engine && bun test`
- [x] T062 Run `bun run lint:changed`, `bun run test:changed`, `bun scripts/affected-workspaces.mjs`, and `cd apps/web && bunx svelte-check --tsconfig ./tsconfig.json --threshold error`; fix to zero errors
- [x] T063 Run the onboarding Playwright specs listed in `specs/175-cif-guided-onboarding/quickstart.md`
- [ ] T064 Add a user-facing entry for guided setup to `apps/web/src/lib/content/changelog/releases.json` only when preparing the release (feature-focused, no internals)
- [x] T065 Run `bunx fallow audit --format json --quiet --explain --gate-marker agent` and the `codex-review` skill before opening the PR

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)** → **Foundational (Phase 2)** → user stories.
- **US1 (Phase 3)** depends on Phase 2 only.
- **US2 (Phase 4)** depends on Phase 2 and on US1's `OnboardingHost` (T029–T030) for wiring (T039). The store, adapter and card (T032–T038) can be built in parallel with US1.
- **US3 (Phase 5)** depends on Phase 2 for the engine (T041, T043–T046 can start right after T016) and on US2 for the end-to-end path. Target placements (T047–T049) are independent of everything except T017.
- **US4 (Phase 6)** depends on the US2 journey store.
- **Phase 7** E2E needs US1–US3 (US4 for T059). Help docs (T055–T056) can start any time.

### Within each story

- Tests first and failing, then types/schema → reducer → adapter/store → UI → wiring.
- Same-file tasks are sequential: T031 and T050 (`GraphView.svelte`); T027 and T030 (`+layout.svelte`); T029 and T039 (`OnboardingHost.svelte`); T037 and T053 (`journey-store.svelte.ts`); T033 and T051 (`journey-store.test.ts`).

### Story completion order

US1 → US2 → US3 (all P1, ship together) → US4 (P2).

## Parallel Example

```text
# Phase 2 tests together:
T004 schema | T005 progress | T006 categories | T007 persistence | T008 budgets | T009 help-engine actions | T010 runner

# US1 tests together:
T020 orchestrator | T021 theme-prompt gate | T022 onboarding store | T023 GoalInvitation | T024 OnboardingHost

# US2 tests together:
T032 milestones | T033 journey store | T034 JourneyCard | T035 EntityExplorer

# US3 content and targets together:
T043 worldbuilder | T044 writer | T045 rpg-gm | T047 AppHeader | T048 ActivityBar | T049 EmptyState
```

## Implementation Strategy

### MVP

1. Phases 1–2 (engine + help-engine + runner).
2. Phase 3 (US1): the invitation alone already replaces the unrequested tour with a choice, without losing the theme prompt. Validate independently.

### Incremental delivery

1. US2 runner and card with a fixture journey → validate.
2. US3 real journeys and targets → validate on all three widths. **Stories 1–3 ship together** per the plan.
3. US4 Getting Started → validate.
4. Phase 7 E2E gate (#4000), help docs, validation, PR.
