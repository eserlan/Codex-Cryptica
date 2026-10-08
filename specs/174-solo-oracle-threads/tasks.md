# Tasks: Solo Oracle and Threads

**Input**: Design documents from `specs/174-solo-oracle-threads/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/solo-oracle-threads.md](./contracts/solo-oracle-threads.md), [quickstart.md](./quickstart.md)

**Tests**: Required for every changed behaviour (Constitution II). Each story writes its tests first, sees them fail, then implements. Every test group covers the success path and at least one failure or negative path.

**Organisation**: Tasks are grouped by user story, so each story can be built, tested and shipped on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1 to US5, matching spec.md

## Path Conventions

Monorepo: engines in `packages/*/src` and `packages/*/tests`; the web app in `apps/web/src/lib`, with component and store tests beside their files.

---

## Phase 1: Setup

- [x] T001 Confirm the baseline on `feat/174-solo-oracle-threads`: run `bun test` in `packages/oracle-engine`, `packages/solo-session-engine` and `packages/session-journal-engine`, and `bunx vitest run src/lib/components/solo src/lib/stores/solo-session.svelte.test.ts src/lib/stores/session-journal-capture.test.ts` in `apps/web`. Record any existing failures in this file before changing code.

No discovery task: this feature adds no public, indexable page (Constitution XIII).

---

## Phase 2: Foundational (blocking)

**Purpose**: The capture kinds and the new entry types are used by every story's journal notes, so they come first.

- [x] T002 [P] Write `packages/session-journal-engine/tests/capture-kinds.test.ts`:
  - `captureKindOf` maps every existing entry type (`dice-roll`, `table-result`, `card-draw`, `map-move`, `party-change`, `generated-result`, `generated-saved`) and the four new types (`oracle-answer`, `random-event`, `tension-change`, `thread-change`) to a kind;
  - manual notes and unknown types return `null` and are always captured;
  - `isCaptured` honours `captureOff`, and still blocks map moves when `captureMapMoves: false`;
  - `withCaptureChoice` turns a kind on and off without duplicates.
- [x] T003 [P] Add formatter tests to `packages/session-journal-engine/tests/capture.test.ts` for `formatOracleAnswer`, `formatRandomEvent`, `formatTensionChange` (returns `null` when unchanged) and `formatThreadChange` (opened, closed with a note, reopened), using the contents in data-model.md.
- [x] T004 Implement `packages/session-journal-engine/src/capture-kinds.ts` (`CaptureKind` = `"dice" | "tables" | "decks" | "map-moves" | "scenes" | "oracle" | "tension" | "threads" | "party" | "generated"`, `captureKindOf`, `isCaptured`, `withCaptureChoice`), add `captureOff?: CaptureKind[]` to `SessionJournal` in `src/types.ts`, and export from `src/index.ts`. Make T002 pass.
- [x] T005 Implement the four formatters in `packages/session-journal-engine/src/capture.ts` and export them. Make T003 pass.

**Checkpoint**: The journal engine knows the new entry types and capture kinds. Nothing in the app has changed yet.

---

## Phase 3: User Story 1 - Ask the oracle a yes/no question (P1) 🎯 MVP

**Goal**: A yes/no answer by dice at five likelihoods, shown in the bar and journaled, with optional AI interpretation.

**Independent Test**: With AI off and a journal running, ask at each likelihood and confirm an answer appears in the bar and the journal, and nothing leaves the device.

### Tests for User Story 1 ⚠️

- [x] T006 [P] [US1] Add tests to `packages/oracle-engine/tests/quick-oracle.test.ts` (create the file if missing):
  - `"very_likely"` and `"very_unlikely"` return valid tiers;
  - for fixed rolls, yes tiers become at least as likely from "unlikely" to "very likely";
  - the existing three odds give the same tiers as before for rolls 1, 15, 50, 66, 81, 91 and 98 (no regression).
- [x] T007 [P] [US1] Write `packages/solo-session-engine/tests/oracle.test.ts` for `askOracle` and `answerLabel`:
  - every likelihood returns one of "Yes, and", "Yes", "Yes, but", "No, but", "No" or "No, and";
  - the question is trimmed and clamped to 200 characters, and an empty question is allowed;
  - an injected rng gives deterministic results;
  - tension does not change the answer odds.
- [x] T008 [P] [US1] Write `apps/web/src/lib/components/solo/SoloYesNoMenu.test.ts` for the question part:
  - the question field limits input to 200 characters and shows how many are left;
  - every control has an accessible name and works by keyboard (Tab to reach, Enter or Space to act);
  - the likelihood choice defaults to "Even";
  - Roll shows the answer and the roll;
  - a store error shows a message and no answer;
  - "Interpret with the Oracle" is shown only when AI is on, and sets the pending prompt and opens the Oracle sidebar without calling ask.
- [x] T009 [P] [US1] Add `ask` tests to `apps/web/src/lib/stores/solo-session.svelte.test.ts`:
  - it returns the answer and publishes an `oracle-answer` capture while the session's journal runs;
  - it publishes nothing without a journal;
  - it never calls any network or AI dependency.

### Implementation for User Story 1

- [x] T010 [US1] Widen `OracleOdds` in `packages/oracle-engine/src/quick-oracle.ts` with `"very_likely"` and `"very_unlikely"`, adding their tier thresholds. Keep the existing three unchanged. Make T006 pass.
- [x] T011 [US1] Implement `packages/solo-session-engine/src/oracle.ts` with the `Likelihood` type, the answer scale wording (original text), `answerLabel` and `askOracle`, which returns an `OracleAnswer` with no event yet. Export from `src/index.ts`. Make T007 pass.
- [x] T012 [US1] Add `ask(question, likelihood)` to `apps/web/src/lib/stores/solo-session.svelte.ts`, publishing `formatOracleAnswer` through the existing `publishCapture`. Make T009 pass.
- [x] T013 [US1] Add the `"interpret-answer"` kind to `buildOracleShortcutPrompt` in `packages/solo-session-engine/src/defaults.ts`, with the answer and question in its context. Add a test to `tests/defaults.test.ts`.
- [x] T014 [US1] Implement `apps/web/src/lib/components/solo/SoloYesNoMenu.svelte` (question with remaining-characters count, likelihood, Roll, answer, Interpret) using `SoloMenu`, with `data-help-target="solo-yes-no-menu"`. Make T008 pass.
- [x] T015 [US1] Add `SoloYesNoMenu` to `apps/web/src/lib/components/solo/SoloActions.svelte` and to the "Play" group of `SoloSessionSheet.svelte`. Update `SoloSessionBar.test.ts`.
- [x] T016 [US1] Add a "Yes or no" section to `apps/web/src/lib/content/help/solo-session.md`. It covers asking a question, the five likelihoods, the answer scale, that it works without AI, and that "Interpret" only prefills the Oracle.

**Checkpoint**: US1 works on its own with AI off.

---

## Phase 4: User Story 2 - Let the dice surprise me (P1)

**Goal**: Random events from our own tables, with frequency driven by a tension level from 1 to 9.

**Independent Test**: At tension 9 events appear far more often than at 1. Each event names a focus, an action and a subject, and lands in the journal.

### Tests for User Story 2 ⚠️

- [x] T017 [P] [US2] Add to `packages/solo-session-engine/tests/oracle.test.ts`:
  - `eventHappens(roll, t)` is true at `2 × t` and false at `2 × t + 1`, for t = 1 and t = 9;
  - over 2,000 seeded questions, events at tension 9 are at least three times as frequent as at tension 1;
  - `rollRandomEvent` returns a focus, an action, a subject and a sentence;
  - the thread focus with no open threads falls back, the party focus with no party falls back, and a closed thread is never chosen.
- [x] T018 [P] [US2] Add tension tests to `packages/solo-session-engine/tests/session.test.ts`:
  - a Phase 2 record parses with tension 5;
  - tension 0, 10 and 4.5 make the record invalid;
  - `withTension` clamps to 1 to 9.
- [x] T019 [P] [US2] Add store tests to `apps/web/src/lib/stores/solo-session.svelte.test.ts`:
  - `raiseTension` and `lowerTension` stop at 9 and 1, persist across a reload, and publish a `tension-change` capture;
  - `randomEvent()` publishes a `random-event` capture;
  - `ask` attaches an event when the event roll meets the condition, using an injected rng.
- [x] T020 [P] [US2] Extend `apps/web/src/lib/components/solo/SoloYesNoMenu.test.ts`:
  - the event line shows under an answer that has an event;
  - the "Random event" button shows an event;
  - tension − and + are disabled at 1 and 9 and show the current level;
  - the event and tension controls have accessible names and work by keyboard.

### Implementation for User Story 2

- [x] T021 [US2] Write `packages/solo-session-engine/src/event-tables.ts` with 10 foci, 30 actions and a subject resolver. All text must be original and genre-neutral (FR-008). Include a short header comment stating the tables are original to Codex Cryptica.
- [x] T022 [US2] Implement `eventHappens` and `rollRandomEvent` in `packages/solo-session-engine/src/oracle.ts`, and make `askOracle` roll the event die and attach an event. Make T017 pass.
- [x] T023 [US2] Add `tension?: number` to `SoloSession` in `packages/solo-session-engine/src/types.ts`, with the parse default and validation in `src/session.ts` ("An integer from 1 to 9. Missing reads as 5."), and `withTension`. Make T018 pass.
- [x] T024 [US2] Add `tension`, `raiseTension`, `lowerTension` and `randomEvent` to `apps/web/src/lib/stores/solo-session.svelte.ts`, and pass the event context (open threads come in US3; until then an empty list, the party names and the map name). Make T019 pass.
- [x] T025 [US2] Add the event line, "Random event" and the tension controls to `SoloYesNoMenu.svelte`. Make T020 pass.
- [x] T026 [US2] Add a "Random events and tension" section to `apps/web/src/lib/content/help/solo-session.md`. It covers when events happen, what a focus, action and subject are, and how tension changes their frequency.

**Checkpoint**: US1 and US2 together let a player run a session by dice alone.

---

## Phase 5: User Story 3 - Keep track of open threads (P1)

**Goal**: Threads that persist with the vault, link to entries, and are journaled when they open and close.

**Independent Test**: Add three threads, link one, reload, switch vaults and back, end and start a session, and confirm they are still listed. Close one and confirm it moves and is journaled.

### Tests for User Story 3 ⚠️

- [x] T027 [P] [US3] Write `packages/solo-session-engine/tests/threads.test.ts`:
  - `createThread` refuses an empty title or one over 120 characters, and a note over 500;
  - the 201st thread is refused;
  - close and reopen keep the closing note;
  - `parseThreadsFile` with a wrong `version` returns `valid: false`, and invalid items are skipped while valid ones stay;
  - `linkEntity` ignores duplicates and stops at 20 links;
  - `pruneLinks` drops ids not in the vault;
  - `filterThreads` handles status, kind and search;
  - `pickOpenThread` never returns a closed thread and returns `null` when none are open.
- [x] T028 [P] [US3] Write `apps/web/src/lib/services/vault-threads-file.test.ts` with fake directory handles:
  - read returns `null` when the file is missing;
  - write then read round-trips;
  - a write error is thrown to the caller.
- [x] T029 [P] [US3] Write `apps/web/src/lib/stores/solo-threads.svelte.test.ts`:
  - load on a vault change, with each vault's threads kept separate;
  - add, edit, close, reopen and remove persist and publish `thread-change` captures (not on edit);
  - writes are serialised, so two quick edits both survive;
  - a write failure keeps the in-memory change and notifies the player;
  - a read-only vault refuses edits;
  - deleted entries are pruned from links;
  - a bad file version is not overwritten.
- [x] T030 [P] [US3] Write `apps/web/src/lib/components/solo/SoloThreadsMenu.test.ts` and `SoloThreadDialog.test.ts`:
  - the open list is the default, with closed one choice away;
  - kind filter and search work;
  - add opens the dialog, and an empty title shows a message;
  - a linked entry opens on choice;
  - delete asks for confirmation;
  - the empty state explains threads;
  - title (120) and note (500) fields show how many characters are left;
  - adding a 201st thread shows "This vault has 200 threads. Close or delete one to add another.";
  - every control has an accessible name and works by keyboard.
- [x] T031 [P] [US3] Add a test to `apps/web/src/lib/stores/solo-session.svelte.test.ts` that random events use the threads store's open threads as subjects.

### Implementation for User Story 3

- [x] T032 [US3] Implement `packages/solo-session-engine/src/threads.ts` (the `Thread` and `ThreadsFile` types and the functions in the contract) and export them. Make T027 pass.
- [x] T033 [US3] Implement `apps/web/src/lib/services/vault-threads-file.ts` (read and write `.codex/threads.json` through `getVaultDir`, `readOpfsBlob` and `writeOpfsFile`, with an injected root directory). Make T028 pass.
- [x] T034 [US3] Implement `apps/web/src/lib/stores/solo-threads.svelte.ts` (`SoloThreadsStore` with the deps in the contract) and wire a singleton in `apps/web/src/lib/stores/solo-session-instance.ts`, loading on vault change. Make T029 pass.
- [x] T035 [US3] Implement `SoloThreadDialog.svelte` (with remaining-characters counts) and `SoloThreadsMenu.svelte` (with the 200-thread message) in `apps/web/src/lib/components/solo/`, with `data-help-target="solo-threads-menu"`. Make T030 pass.
- [x] T036 [US3] Pass the threads store's open threads into the event context in `solo-session.svelte.ts` and `solo-session-instance.ts`. Make T031 pass.
- [x] T037 [US3] Add `SoloThreadsMenu` to `SoloActions.svelte` and the sheet's "Story" group. Update `SoloSessionBar.test.ts`.
- [x] T037a [US3] Add `SoloThreadsMenu` to `apps/web/src/lib/components/solo/PlayPage.svelte`, so threads can be viewed and edited with no session running (FR-020). Add a test to `PlayPage.test.ts` (create it if missing): Threads is shown with and without a running session, and is absent for a read-only vault.
- [x] T037b [US3] Add a folder round-trip test to `apps/web/src/lib/services/vault-threads-file.test.ts` or the vault sync tests: a vault with `.codex/threads.json` saved through `syncCoordinator.push` and loaded back keeps the file. If the walk skips `.codex/`, fix it in `packages/vault-engine` with a test.
- [x] T038 [US3] Add a "Threads" section to `apps/web/src/lib/content/help/solo-session.md`. It covers the four kinds, linking entries, closing and reopening, that threads are saved with the vault (so they are in backups and exports), the 200-thread limit, that threads are on the Play page too, and that CC Cloud Backup does not include them yet.

**Checkpoint**: The issue's acceptance criteria hold: a session can be run with oracle tables, threads and the journal with AI off, and threads persist.

---

## Phase 6: User Story 4 - Choose what the journal records (P2)

**Goal**: Per-journal on/off switches for each capture kind.

**Independent Test**: Turn dice off, roll 5 times and ask once, and confirm only the oracle answer is journaled. A new journal has everything on.

### Tests for User Story 4 ⚠️

- [x] T039 [P] [US4] Add tests to `apps/web/src/lib/stores/session-journal-capture.test.ts`: each kind switched off blocks its entries, other kinds still pass, and `captureMapMoves: false` still blocks map moves.
- [x] T040 [P] [US4] Add `setCaptureChoice` tests to `apps/web/src/lib/stores/session-journal.svelte.test.ts`: the choice persists per journal across a reload, and a new journal starts with everything on.
- [x] T041 [P] [US4] Write `apps/web/src/lib/components/quicknote/JournalCaptureMenu.test.ts`: one switch per kind with plain labels, the current state shown, toggling calls `setCaptureChoice`, and keyboard operation works.
- [x] T042 [P] [US4] Add a test to `apps/web/src/lib/stores/solo-session.svelte.test.ts`: with scenes off, `setScene` changes the scene but creates no journal section.

### Implementation for User Story 4

- [x] T043 [US4] Replace the map-move check in `apps/web/src/lib/stores/session-journal-capture.ts` with `isCaptured(journal, entryType)` (both places). Make T039 pass.
- [x] T044 [US4] Add `setCaptureChoice(kind, on)` to `apps/web/src/lib/stores/session-journal.svelte.ts`, saving `captureOff` through the existing journal save. Make T040 pass.
- [x] T045 [US4] Implement `apps/web/src/lib/components/quicknote/JournalCaptureMenu.svelte` with `data-help-target="journal-capture-menu"`, and replace the "Map moves" toggle in `JournalHeader.svelte` with it. Update `JournalHeader` tests. Make T041 pass.
- [x] T046 [US4] Check the scenes kind before creating a section in `setScene` and `returnToScene` in `solo-session.svelte.ts`. Make T042 pass.
- [x] T047 [US4] Update the "Session Journal" section of `apps/web/src/lib/content/help/quicknote.md`: replace the "Map moves" sentence with a "Choose what the journal records" paragraph covering the Capture menu and its switches.

---

## Phase 7: User Story 5 - Hand over to the Oracle when I want to (P3)

**Goal**: An explicit, AI-only entry into Adventure Mode from the solo session.

**Independent Test**: With AI on, the entry opens Adventure Mode and continues an existing adventure. With AI off it is absent.

- [x] T048 [P] [US5] Extend `apps/web/src/lib/components/solo/SoloOracleMenu.test.ts`:
  - "Let the Oracle run a scene" (`solo-adventure-entry`) navigates to `/adventure`;
  - it is absent when AI is off;
  - nothing navigates without the click.
- [x] T049 [US5] Add the item to `apps/web/src/lib/components/solo/SoloOracleMenu.svelte`, navigating with the app's base path. Make T048 pass.
- [x] T050 [US5] Add one paragraph on the Adventure Mode entry to the Oracle shortcuts section of `apps/web/src/lib/content/help/solo-session.md`.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [x] T051 [P] Add the controls `solo-yes-no-menu`, `solo-threads-menu` and `journal-capture-menu` to `packages/help-engine/src/actions/catalogue.ts` (solo area for the first two, gated by the solo-session flag; the journal panel for the third). Update `packages/help-engine/tests/context.test.ts` and `apps/web/src/lib/stores/help-assistant/help-context.svelte.ts` (`soloActionsFor`), with tests.
- [x] T052 [P] Add workflows to `packages/help-engine/src/registry/features/solo-session.ts`: "Ask the dice a yes or no question", "Get a random event", "Keep track of threads". Add "Choose what the journal records" to the session journal feature. Add five evaluation questions to `packages/help-engine/tests/eval/phase-a-questions.ts`.
- [x] T053 Regenerate the help bundle (`bun run --cwd packages/help-engine bundle`) and embeddings (`bun scripts/sync-help-embeddings.ts`, after confirming `bunx wrangler whoami`). Run the help evaluation and confirm the new questions retrieve `solo-session` or the session journal article.
- [x] T054 [P] Extend the source-scan test in `apps/web/src/lib/stores/ui/solo-play-guard.test.ts` to cover `SoloYesNoMenu`, `SoloThreadsMenu`, `SoloThreadDialog`, `solo-threads.svelte.ts` and `vault-threads-file.ts` (no `fetch(`, `sendBeacon`, `XMLHttpRequest` or `WebSocket`; FR-007, SC-006).
- [x] T055 [P] Add an originality check to `packages/solo-session-engine/tests/oracle.test.ts`: the event tables and answer wording contain none of a small list of known published-system terms (FR-008).
- [x] T056 Run the impacted checks required by constitution VI.3 (1.8.0): `bun run test:changed`, `bun run lint:changed` and `bunx svelte-check --tsconfig ./tsconfig.json --threshold error` in `apps/web`, plus `bun test --coverage` in the three engine packages (each at least 70%). Re-run the Phase 1 and 2 suites explicitly: `components/solo`, `stores/solo-session.svelte.test.ts` and `stores/ui/solo-play-guard.test.ts` (FR-031, FR-032). Fix everything to 0 errors.
- [x] T057 Run `bunx fallow audit --format json --quiet --explain --gate-marker agent` and fix any introduced findings.
- [ ] T058 Walk through every scenario in [quickstart.md](./quickstart.md) in the dev app, desktop and phone width (390 px), with AI on and off. Also time SC-002 (an answer within 10 seconds and at most 3 actions from the bar) and note the threads write time with 200 threads (plan goal: under 100 ms). Record any failure as a new task.
- [x] T059 Run the `codex-review` specialist review and fix its findings.
- [x] T060 Open ready-for-review PRs to `staging` that reference #3885. Suggested split: PR1 Phases 1 to 4 (US1 and US2); PR2 US3; PR3 US4, US5 and Polish.

---

## Dependencies & Execution Order

- **Setup (T001)** comes first.
- **Foundational (T002–T005)** blocks every story's journal notes.
- **US1 (T006–T016)** depends on Foundational.
- **US2 (T017–T026)** depends on US1 (it extends `oracle.ts` and `SoloYesNoMenu`).
- **US3 (T027–T038)** depends only on Foundational. T036 links it to US2's event context.
- **US4 (T039–T047)** depends only on Foundational.
- **US5 (T048–T050)** is independent.
- **Polish (T051–T060)** comes after the stories it documents.

US3, US4 and US5 can run in parallel with US1 and US2 after Foundational.

## Parallel Examples

- **Foundational**: T002 and T003 together, then T004 and T005.
- **US1 tests**: T006, T007, T008 and T009 together.
- **US3 tests**: T027, T028, T029 and T030 together. Then T032 and T033 in parallel, then T034 and T035.
- **US4 tests**: T039, T040, T041 and T042 together.

## Implementation Strategy

- **MVP**: Foundational, then US1 and US2. A player can ask questions, get events and set tension with AI off. This is the first PR.
- **Then US3**: threads. Together with the MVP, this meets the issue's acceptance criteria.
- **Then US4 and US5**, then Polish (help, Cif, checks, review, PRs).
- Each checkpoint is a shippable increment. Keep the Phase 1 and Phase 2 suites green at every step.
