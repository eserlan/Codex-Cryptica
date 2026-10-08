---
description: "Task list for Solo Play Loop (Phase 2 of Solo Play Mode, #3884, epic #3839)"
---

# Tasks: Solo Play Loop

**Input**: Design documents from `specs/173-solo-play-loop/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/solo-play-loop.md](./contracts/solo-play-loop.md), [quickstart.md](./quickstart.md)

**Tests**: Required for every changed behaviour (Constitution II). Write each test first and see it fail; cover the success path and at least one failure, cancellation or negative path.

**User Help (Constitution VII)**: Each story adds its own section to `apps/web/src/lib/content/help/solo-session.md`. The Cif registry, catalogue, evaluation questions and embeddings are done once, in the Polish phase.

**Validation**: Impacted-only, per AGENTS.md: `bun run test:changed`, `bun run lint:changed`, a scoped `svelte-check`. Never run repository-wide suites.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1–US6, matching spec.md

---

## Phase 1: Setup

- [x] T001 Confirm the baseline on `feat/173-solo-play-loop`: run `bun test` in `packages/solo-session-engine` and `packages/session-journal-engine`, and `bunx vitest run src/lib/components/solo src/lib/stores/solo-session.svelte.test.ts` in `apps/web`. All must pass before any change.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The popover pattern and sheet grouping that every story's controls use.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 [P] Write `apps/web/src/lib/components/solo/SoloMenu.test.ts` for a small popover wrapper:
  - The trigger button has an accessible name and `aria-expanded`.
  - Clicking toggles the panel.
  - Escape closes it and returns focus to the trigger.
  - A click outside closes it.
  - A `disabled` trigger with a `reason` shows the reason as its title and does not open.
- [x] T003 Implement `apps/web/src/lib/components/solo/SoloMenu.svelte`:
  - props `label`, `icon`, `testId`, `disabled`, `reason`, and a `children` snippet;
  - Svelte 5 runes, semantic tokens, Iconify classes, `type="button"`.
    Make T002 pass.
- [x] T004 Restructure `apps/web/src/lib/components/solo/SoloSessionSheet.svelte` into labelled groups — "Play", "Story", "Tools" — then End (research R8), keeping every Phase 1 action. Update `SoloSessionBar.test.ts` sheet tests to find actions inside the groups, and confirm the Phase 1 bar and sheet tests still pass.

**Checkpoint**: Phase 1 behaviour is unchanged. `SoloMenu` is ready for the story menus.

---

## Phase 3: User Story 1 - Keep what I discover (Priority: P1) 🎯 MVP

**Goal**: Recent journal results in the bar, each savable as a draft vault entity without leaving the screen.

**Independent Test**: With a journal running, roll a table and quick-roll a die, then save each from Recent as a Character and a Note. Both drafts exist, link to their entries, and the screen never changes (quickstart #2, #3, #10).

### Tests for User Story 1 ⚠️

- [x] T005 [P] [US1] Write `packages/session-journal-engine/tests/recent.test.ts` for `recentResults(entries, limit = 10)`:
  - newest first;
  - "the running journal's 10 most recent captured results", including entries captured before the session;
  - excludes the bookkeeping entries `party-change` and `generated-saved`;
  - an empty journal gives `[]`;
  - `limit` is respected.
- [x] T006 [P] [US1] Add `suggestCategory` tests to `packages/solo-session-engine/tests/defaults.test.ts`:
  - `generated-result` with `npc` → `character`;
  - `rumour` → `note`;
  - `encounter` → `event`, or `note` if the vault has no Event category (the function takes the available category ids);
  - `table-result`, `dice-roll` and unknown types → `note`.
- [x] T007 [P] [US1] Add a `soloPromoter` test to `apps/web/src/lib/stores/session-journal-promoter.test.ts`:
  - built with no-op `openEntity` and `closePanel`, promoting `{ kind: "entry", entryId }` creates a draft;
  - it never calls `openEntity` or `closePanel`;
  - it calls `notify` with "Created a draft: …";
  - the draft's `discoverySource` refers to the promoted journal entry (FR-003);
  - an empty name or a failing `createEntity` returns `{ ok: false }` and creates nothing.
- [x] T008 [P] [US1] Write `apps/web/src/lib/components/solo/SoloRecentResults.test.ts`:
  - with a running journal it lists up to 10 results newest first, each with Save to Vault;
  - with no journal it shows the note and an offer to start or continue one;
  - an empty journal shows "Nothing captured yet."
- [x] T009 [P] [US1] Write `apps/web/src/lib/components/solo/SoloSaveResultDialog.test.ts`:
  - the category is preselected from `suggestCategory`, and the name is prefilled from the result title when there is one;
  - Save calls the promoter with the chosen category and name;
  - an empty name is refused with a message;
  - a failure shows the error and keeps the dialog open with the inputs intact;
  - Escape and Cancel close without saving.

### Implementation for User Story 1

- [x] T010 [P] [US1] Implement `recentResults` in `packages/session-journal-engine/src/recent.ts` and export it from `src/index.ts`. Make T005 pass.
- [x] T011 [P] [US1] Implement `suggestCategory(entryType, generatorId, categoryIds)` in `packages/solo-session-engine/src/defaults.ts` and export it. Make T006 pass.
- [x] T012 [US1] Add a `soloPromoter` instance to `apps/web/src/lib/stores/solo-session-instance.ts`. It is a `SessionJournalPromoter` with `createEntity` from the vault, `openEntity` and `closePanel` as no-ops, and `notify` through `notificationStore`. Make T007 pass.
- [x] T013 [P] [US1] Implement `apps/web/src/lib/components/solo/SoloSaveResultDialog.svelte`:
  - category select from the vault's categories, name input, Save and Cancel;
  - `role="dialog"` with a focus trap, as `SoloEndDialog` does;
  - a busy guard against double saves.
    Make T009 pass.
- [x] T014 [US1] Implement `apps/web/src/lib/components/solo/SoloRecentResults.svelte` inside a `SoloMenu` labelled "Recent", using `recentResults(sessionJournalStore.current.entries)` and opening `SoloSaveResultDialog` per item (depends on T013). Make T008 pass.
- [x] T015 [US1] Add `SoloRecentResults` to `apps/web/src/lib/components/solo/SoloActions.svelte` and to the sheet's "Story" group (`SoloSessionSheet.svelte`), with `data-help-target="solo-recent-results"`. Update `SoloSessionBar.test.ts` to find Recent in the bar and the sheet.
- [x] T016 [US1] Add a "Keep what you discover" section to `apps/web/src/lib/content/help/solo-session.md`. It covers the Recent list (the latest 10 results in the running journal), Save to Vault (category, name, a draft linked to its journal entry, and you stay where you are), and that results are kept only while a journal runs.

**Checkpoint**: US1 is shippable. Quickstart #2, #3 and #10 pass.

---

## Phase 4: User Story 2 - Generate what the story needs (Priority: P1)

**Goal**: Generate NPC, Encounter, Rumour, Complication or any generator from the bar, with each result journaled.

**Independent Test**: Open each Generate item. The matching generator opens, generated results are journaled, a save adds a follow-up entry, and closing without generating records nothing (quickstart #4, #5).

### Tests for User Story 2 ⚠️

- [x] T017 [P] [US2] Add formatter tests to `packages/session-journal-engine/tests/capture.test.ts`:
  - `formatGeneratedResult` gives "Generated NPC: Mara One-Eye — …" with `entryType: "generated-result"`, and a summary over 280 characters is clamped;
  - a blank title gives a payload `captureToEntryInput` rejects;
  - `formatGeneratedSaved` gives "Saved Mara One-Eye to the Vault as a Character." with `entryType: "generated-saved"`.
- [x] T018 [P] [US2] Write `apps/web/src/lib/services/generator-journal-capture.test.ts`:
  - `publishGeneratedCapture` and `publishGeneratedSaved` each emit one `JOURNAL:CAPTURE` on the injected bus, with no `metadata.sync`;
  - a bus that throws is caught and logged, and the function does not throw.
- [x] T019 [P] [US2] Extend `apps/web/src/lib/components/generators/CampaignGeneratorModal.test.ts`:
  - when a draft reaches review, `publishGeneratedCapture` is called once with the generator id, title and summary;
  - after a successful save, `publishGeneratedSaved` is called with the title and category;
  - a cancelled generation or a failed save does not call `publishGeneratedSaved`;
  - generation still works when the publisher throws.
- [x] T020 [P] [US2] Write `apps/web/src/lib/components/solo/SoloGenerateMenu.test.ts`:
  - NPC, Encounter, Rumour and Complication call `modalUIStore.openGeneratorWorkflow` with `npc`, `encounter`, `rumour` and `plot-twist`;
  - "All generators…" calls `openGeneratorWorkflow(null)`;
  - when `isVaultReadyForGenerators` is false the trigger is disabled with "Generators open once your vault has loaded.";
  - every item has an accessible name.

### Implementation for User Story 2

- [x] T021 [P] [US2] Implement `formatGeneratedResult` and `formatGeneratedSaved` in `packages/session-journal-engine/src/capture.ts`. Make T017 pass.
- [x] T022 [US2] Implement `apps/web/src/lib/services/generator-journal-capture.ts`, with an injected bus defaulting to the app's event bus and a clock (depends on T021). Make T018 pass.
- [x] T023 [US2] Add the two publisher calls to `apps/web/src/lib/components/generators/CampaignGeneratorModal.svelte`: where `stage = "review"` is set after a draft arrives, and after `svc.saveDraft` succeeds in `onSave`. Add no other logic to this 814-line file (Bounded Responsibility). Make T019 pass.
- [x] T024 [P] [US2] Implement `apps/web/src/lib/components/solo/SoloGenerateMenu.svelte` using `SoloMenu`. Make T020 pass.
- [x] T025 [US2] Add `SoloGenerateMenu` to `SoloActions.svelte` and the sheet's "Play" group, with `data-help-target="solo-generate-menu"`. Update `SoloSessionBar.test.ts`.
- [x] T026 [US2] Add a "Generate during play" section to `apps/web/src/lib/content/help/solo-session.md`. It covers the four quick generators, "All generators…", that every generated result is recorded in the journal, and that saving uses the generator's usual Save.

**Checkpoint**: US1 and US2 together make the first PR. Quickstart #2–#5 and #10 pass.

---

## Phase 5: User Story 3 - Roll my own tables without leaving play (Priority: P2)

**Goal**: Up to 3 pinned random tables in the bar, rolled inline and captured like rolls from the tables screen.

**Independent Test**: Pin two tables and roll each on the map. The results show inline, the map is unchanged, and both are journaled. Unpinning works, and deleting a pinned table removes its pin (quickstart #1, #12).

### Tests for User Story 3 ⚠️

- [x] T027 [P] [US3] Write `apps/web/src/lib/services/record-table-roll.test.ts`:
  - `recordTableRoll(history, source, outcome, clock)` calls `history.addResult(…, "table", { label: source.name, source: … })` with the same payload `TableRoller` builds today;
  - an outcome with no die value records `total: 0` and no parts.
- [x] T028 [P] [US3] Write `apps/web/src/lib/stores/solo-table-pins.svelte.test.ts`:
  - pins are stored per vault under `codex-solo-table-pins:<vaultId>`;
  - "At most 3", so `pin` returns false on a fourth;
  - unknown table ids return false;
  - duplicates are ignored, and `unpin` works;
  - ids no longer in the vault are hidden and pruned on the next write;
  - an unreadable value reads as `[]`;
  - a vault switch shows that vault's pins.
- [x] T029 [P] [US3] Write `apps/web/src/lib/components/solo/SoloPinnedTables.test.ts`:
  - each pin is a button that rolls via `randomSourceStore.roll` and `recordTableRoll`, showing the result in `solo-table-result` with no dialog and no screen change;
  - an empty table shows a short message and records nothing;
  - "Pin a table" lists the vault's tables, disabled when 3 are pinned;
  - with no tables it shows how to create one;
  - each pin can be unpinned.

### Implementation for User Story 3

- [x] T030 [US3] Extract `recordTableRoll` from `record()` in `apps/web/src/lib/components/random/TableRoller.svelte` into `apps/web/src/lib/services/record-table-roll.ts`, and make `TableRoller` call it. Make T027 pass, and confirm `TableRoller.test.ts` still passes unchanged.
- [x] T031 [P] [US3] Implement `apps/web/src/lib/stores/solo-table-pins.svelte.ts` (`SoloTablePinsStore` with injected storage, vault id and table ids), and wire a singleton in `apps/web/src/lib/stores/solo-session-instance.ts`. Make T028 pass.
- [x] T032 [US3] Implement `apps/web/src/lib/components/solo/SoloPinnedTables.svelte`: pin chips plus a "Pin a table" `SoloMenu` (depends on T030, T031). Make T029 pass.
- [x] T033 [US3] Add `SoloPinnedTables` to `SoloActions.svelte` after quick roll, and to the sheet's "Play" group, with `data-help-target="solo-pinned-tables"`. Update `SoloSessionBar.test.ts`.
- [x] T034 [US3] Add a "Your own tables" section to `apps/web/src/lib/content/help/solo-session.md`. It covers pinning up to 3 tables, rolling inline, journal capture, and that other tables stay in the dice window.

**Checkpoint**: Quickstart #1 and #12 (tables) pass.

---

## Phase 6: User Story 4 - Know who is in my party (Priority: P2)

**Goal**: Choose the session's party from Characters in setup or the bar. It shows in the bar and is journaled when it changes.

**Independent Test**: Choose two characters in setup, add one and remove one from the bar. The bar shows the current party, names open entries, each change is journaled, and the party survives a reload (quickstart #6, #12).

### Tests for User Story 4 ⚠️

- [x] T035 [P] [US4] Add party tests to `packages/solo-session-engine/tests/session.test.ts`:
  - a Phase 1 record without `partyIds` parses with `[]`;
  - "At most 12; each non-empty; no duplicates": 13 ids, an empty id or a duplicate reads as null;
  - `withParty` deduplicates and clamps to 12.
- [x] T036 [P] [US4] Add `formatPartyChange` tests to `packages/session-journal-engine/tests/capture.test.ts`: "Party: Kael joined. Brother Ivo left."; only joined or only left; and `null` when nothing changed.
- [x] T037 [P] [US4] Add party tests to `apps/web/src/lib/stores/solo-session.svelte.test.ts`:
  - `setParty` saves the ids, survives a reload, and is kept per vault across a vault switch (FR-017);
  - while the journal runs it publishes one `party-change` for the difference, and none when nothing changed or no journal runs;
  - `party` resolves names and drops ids no longer in the vault.
- [x] T038 [P] [US4] Write `apps/web/src/lib/components/solo/SoloPartyMenu.test.ts`:
  - chips show the party names, and a name opens the entry;
  - the picker lists only Character entities and toggles membership through `setParty`;
  - with no characters it shows "Party members are Character entries";
  - every control has an accessible name.
- [x] T039 [P] [US4] Extend `apps/web/src/lib/components/solo/SoloSetupDialog.test.ts`:
  - an optional party picker lists Character entities;
  - Start passes the chosen ids, and the session starts with that party;
  - choosing none still starts.

### Implementation for User Story 4

- [x] T040 [US4] Add `partyIds` to `SoloSession` in `packages/solo-session-engine/src/types.ts`, with parse defaults and validation in `src/session.ts` ("At most 12; each non-empty; no duplicates"), and `withParty`. Make T035 pass.
- [x] T041 [P] [US4] Implement `formatPartyChange` in `packages/session-journal-engine/src/capture.ts`. Make T036 pass.
- [x] T042 [US4] Add `setParty(ids)` and the `party` getter to `apps/web/src/lib/stores/solo-session.svelte.ts`:
  - publish through the store's injected capture port (a new `publishCapture` dependency, wired in `solo-session-instance.ts`);
  - extend `SoloSetup` and `start()` to accept `partyIds`.
    Make T037 pass.
- [x] T043 [P] [US4] Implement `apps/web/src/lib/components/solo/SoloPartyMenu.svelte` using `SoloMenu`. Make T038 pass.
- [x] T044 [US4] Add the optional party picker to `apps/web/src/lib/components/solo/SoloSetupDialog.svelte`. Make T039 pass.
- [x] T045 [US4] Add `SoloPartyMenu` to `SoloActions.svelte` and the sheet's "Story" group, with `data-help-target="solo-party-menu"`. Update `SoloSessionBar.test.ts`.
- [x] T046 [US4] Add a "Your party" section to `apps/web/src/lib/content/help/solo-session.md`. It covers choosing Characters in setup or from the bar, opening their entries, that changes are journaled, and that the party is used in Oracle shortcuts.

**Checkpoint**: Quickstart #6 and #12 (party) pass.

---

## Phase 7: User Story 5 - Ask the Oracle about what is happening now (Priority: P3)

**Goal**: Four Oracle shortcuts (AI only) that prefill an editable question with session context and send nothing by themselves.

**Independent Test**: With AI on, each shortcut opens the Oracle with an editable question containing the scene, place, party and recent results, and nothing is sent until Send. With AI off, no shortcut is shown (quickstart #8, #9).

### Tests for User Story 5 ⚠️

- [x] T047 [P] [US5] Add `buildOracleShortcutPrompt` tests to `packages/solo-session-engine/tests/defaults.test.ts`:
  - each kind (`npc-reaction`, `complication`, `place-knowledge`, `what-next`) starts with its question;
  - context lines appear only for the parts that are present;
  - recent items are "at most 10" and each is clamped to 120 characters;
  - the total is at most 1,200 characters;
  - no prompt contains "game master", "GM" or "run the game".
- [x] T048 [P] [US5] Add `pendingPrompt` tests to `apps/web/src/lib/stores/oracle/tests/ui-manager.test.ts`:
  - `setPendingPrompt` trims, and empty input sets null;
  - `takePendingPrompt` returns the text and then null.
- [x] T049 [P] [US5] Add a test for `OracleChat.svelte`'s prompt consumption, in a new `apps/web/src/lib/components/oracle/OracleChat.prefill.test.ts`:
  - when `pendingPrompt` is set, the textarea receives the text and focus, and the pending prompt is cleared;
  - nothing calls `oracle.ask` until the form is submitted.
- [x] T050 [P] [US5] Write `apps/web/src/lib/components/solo/SoloOracleMenu.test.ts`:
  - with AI on it shows "Open Oracle" and the four shortcuts;
  - a shortcut builds the prompt from the scene, map name, party names and `recentResults`, calls `setPendingPrompt`, and opens the Oracle sidebar;
  - with `discoveryPolicyStore.aiDisabled` the whole menu is absent.

### Implementation for User Story 5

- [x] T051 [P] [US5] Implement `buildOracleShortcutPrompt` and the `OracleShortcut` type in `packages/solo-session-engine/src/defaults.ts`. Make T047 pass.
- [x] T052 [P] [US5] Add `pendingPrompt`, `setPendingPrompt` and `takePendingPrompt` to `apps/web/src/lib/stores/oracle/ui-manager.svelte.ts`. Make T048 pass.
- [x] T053 [US5] Make `apps/web/src/lib/components/oracle/OracleChat.svelte` consume `takePendingPrompt()` into its `input` with an `$effect`, then focus the textarea. Make T049 pass.
- [x] T054 [US5] Implement `apps/web/src/lib/components/solo/SoloOracleMenu.svelte` using `SoloMenu`, with `data-help-target="solo-oracle-menu"` on its trigger, and replace Phase 1's "Ask Oracle" button in `SoloActions.svelte` with it (and in the sheet's "Tools" group). Make T050 pass, and update `SoloSessionBar.test.ts` (Ask Oracle is now the menu's "Open Oracle").
- [x] T055 [US5] Add an "Oracle shortcuts" section to `apps/web/src/lib/content/help/solo-session.md`. It covers the four shortcuts, that they only fill in the question for you to edit and send, what context is included, that they never make the Oracle the game master, and that they are hidden with AI off.

**Checkpoint**: Quickstart #8 and #9 pass.

---

## Phase 8: User Story 6 - Go back to an earlier scene (Priority: P3)

**Goal**: A scene list in the bar. Open a scene's journal section, or return to a scene as a numbered new visit.

**Independent Test**: Create three scenes, open the first in the journal (filtered), then return to it. "Arrival (2)" is appended with its own section, and the earlier section is unchanged (quickstart #7).

### Tests for User Story 6 ⚠️

- [x] T056 [P] [US6] Add scene tests to `packages/solo-session-engine/tests/session.test.ts`:
  - a Phase 1 record with a `sceneName` and no `scenes` parses as one scene;
  - "At most 100": 101 scenes reads as null;
  - a scene name over 80 characters reads as null;
  - `withSceneAdded` appends;
  - `withCurrentSceneRenamed` renames the last item;
  - `nextVisitName` gives "Arrival" → "Arrival (2)" → "Arrival (3)", a revisit of "Arrival (2)" also gives "Arrival (3)", and an out-of-range index gives null.
- [x] T057 [P] [US6] Add store tests to `apps/web/src/lib/stores/solo-session.svelte.test.ts`:
  - `setScene` appends to `scenes`, and `renameScene` updates the current item;
  - `returnToScene(index)` starts a numbered visit with a new section, leaving earlier sections untouched;
  - an out-of-range index returns false and changes nothing.
- [x] T058 [P] [US6] Add tests for `openJournal({ sectionId })` to `apps/web/src/lib/stores/quicknote.svelte.test.ts` (it sets the section filter, and `openJournal()` clears it). Add filter tests to `apps/web/src/lib/components/quicknote/SessionJournalView.test.ts`:
  - only that section's entries show, with "Show all";
  - a missing section shows "This scene's section is gone."
- [x] T059 [P] [US6] Write `apps/web/src/lib/components/solo/SoloSceneMenu.test.ts`:
  - it lists scenes in order with the current one marked;
  - Open calls `quickNoteStore.openJournal({ sectionId })`;
  - Return to scene calls `returnToScene(index)`;
  - Phase 1's `SoloSceneField` still works inside it.

### Implementation for User Story 6

- [x] T060 [US6] Add `scenes` to `SoloSession` in `packages/solo-session-engine/src/types.ts`, with parse defaults and validation in `src/session.ts` ("At most 100, in order. `name` trimmed, at most 80 characters"), plus `withSceneAdded`, `withCurrentSceneRenamed` and `nextVisitName`. Make T056 pass.
- [x] T061 [US6] Extend `setScene` and `renameScene`, and add `returnToScene(index)` and the `scenes` getter, in `apps/web/src/lib/stores/solo-session.svelte.ts` (depends on T060). Make T057 pass.
- [x] T062 [P] [US6] Add `openJournal(options?: { sectionId?: string })` and a `journalSectionFilter` state to `apps/web/src/lib/stores/quicknote.svelte.ts`. Add the filter and "Show all" to `apps/web/src/lib/components/quicknote/SessionJournalView.svelte`. Make T058 pass.
- [x] T063 [US6] Implement `apps/web/src/lib/components/solo/SoloSceneMenu.svelte`, wrapping `SoloSceneField` with a `SoloMenu` list, and swap it in for `SoloSceneField` in `SoloSessionBar.svelte` and the sheet's "Story" group, with `data-help-target="solo-scene-menu"`. Make T059 pass.
- [x] T064 [US6] Update the "Scenes" section of `apps/web/src/lib/content/help/solo-session.md`. It covers the scene list, opening a scene in the journal, and that returning to a scene starts a numbered new visit so the journal stays in time order.

**Checkpoint**: Quickstart #7 passes.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [x] T065 [P] Add the six controls to `packages/help-engine/src/actions/catalogue.ts`: `solo-generate-menu`, `solo-recent-results`, `solo-pinned-tables`, `solo-party-menu`, `solo-scene-menu` and `solo-oracle-menu`, each with `area: "solo"` and `requiresFlag: "solo-session"`. List them in `soloActionsFor` in `apps/web/src/lib/stores/help-assistant/help-context.svelte.ts` while a session runs, and list `solo-oracle-menu` only while AI is on. Extend `packages/help-engine/tests/context.test.ts` and `apps/web/src/lib/stores/help-assistant/help-context.test.ts`: the controls are accepted with the flag, refused without it, and absent for guests.
- [x] T066 [P] Add workflows to `packages/help-engine/src/registry/features/solo-session.ts`: "Save a discovery to the Vault", "Generate during play", "Roll a pinned table", "Set your party" and "Return to an earlier scene". Add five evaluation questions to `packages/help-engine/tests/eval/phase-a-questions.ts`, expecting `solo-session`, in the in-scope array: "How do I save an NPC I made up during play?", "How do I roll my own table in a solo session?", "How do I add characters to my party?", "Can I go back to an earlier scene?" and "How do I generate a rumour while playing?".
- [x] T067 Regenerate embeddings with `bun scripts/sync-help-embeddings.ts`, after confirming `bunx wrangler whoami`. Run `bun run eval` in `packages/help-engine` and confirm the T066 questions retrieve `solo-session` in the top three.
- [x] T068 [P] Add a source-scan test to `apps/web/src/lib/stores/ui/solo-play-guard.test.ts` (FR-027, SC-005). New solo modules must not call `fetch(`, `sendBeacon`, `XMLHttpRequest` or `WebSocket`. Scan `components/solo/*`, `stores/solo-*`, `services/generator-journal-capture.ts` and `services/record-table-roll.ts`.
- [x] T069 Run `bun run test:changed`, `bun run lint:changed`, and `bunx svelte-check --tsconfig ./tsconfig.json --threshold error` in `apps/web`, plus `bun test` with coverage in both engine packages (each at least 70%). Also re-run the Phase 1 suites explicitly: `apps/web/src/lib/stores/ui/solo-play-guard.test.ts`, `shared-play-state.test.ts`, `stores/solo-session.svelte.test.ts` and `components/solo` (FR-028). Fix everything to 0 errors.
- [x] T070 Run `bunx fallow audit --format json --quiet --explain --gate-marker agent` and fix any introduced findings. Watch for complexity in `SoloActions.svelte` and the session store.
- [ ] T071 Walk through every scenario in [quickstart.md](./quickstart.md) in the dev app: desktop and phone width (390 px), AI on and AI off. Record any failure as a new task. **Status (run in the dev app, Solo Play Loop vault):** passed: 1 (pinned table rolls to the bar, map unchanged, journal captures it), 2 (save to Vault), 3 (empty name refused), 4 (NPC generated and saved, journal notes both; run with AI off, so the AI-on path is not verified), 5 (rumour closed without generating records nothing), 6 (party add/remove journaled, chip opens entry, party survives reload), 7 (shared-mode controls disabled with the reason), 8 (AI on: shortcut prefills and opens the Oracle sidebar, nothing sent), 9 (AI off: Ask Oracle gone, everything else works), 10 (scene and journal capture), 11 (phone sheet at 390 px, every action present; checked in an iframe, not visually), 12 (deleted pinned table and party member leave the bar without errors). Not run or not possible here: the AI-on generation path; the `p` shortcut (no live binding exists in the app, so there is nothing to explain); a visual check at phone width. Fixes found and made during the walk-through are in the branch commits: party chips now come from the saved ids, the Oracle shortcut opens a closed sidebar, shared-mode refusals now say why, and scene visits, New scene, menu placement and menu item closing were fixed earlier.
- [x] T072 Run the `codex-review` specialist review and fix its findings.
- [x] T073 Open ready-for-review PRs to `staging` that reference #3884. Suggested split: Opened as PR #3908 (one PR, not the three-way split; see the PR notes).
  - PR 1: Phases 1–4 (Setup, Foundational, US1, US2);
  - PR 2: US3 and US4;
  - PR 3: US5, US6 and Polish.
    Each PR must pass the AGENTS.md quality gate before it opens.

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)**: none.
- **Foundational (Phase 2)**: `SoloMenu` and the sheet groups. Every story's controls depend on it.
- **US1 and US2 (P1)**: depend on Foundational only, and are independent of each other.
- **US3 (P2)**: depends on Foundational. Independent of US1 and US2.
- **US4 (P2)**: depends on Foundational.
- **US5 (P3)**: depends on Foundational. It uses `recentResults` (T010, US1) and the party (T042, US4) for context. Without them the prompt simply omits those parts.
- **US6 (P3)**: depends on Foundational.
- **Polish**: after the stories in each PR.

### Shared files (sequence these)

- `SoloActions.svelte` and `SoloSessionSheet.svelte`: T015, T025, T033, T045, T054, T063.
- `SoloSessionBar.test.ts`: the same tasks.
- `solo-session.svelte.ts` and its test: T037, T042, T057, T061.
- `packages/solo-session-engine` `session.ts` and its tests: T035, T040, T056, T060.
- `defaults.ts` and its tests: T006, T011, T047, T051.
- `session-journal-engine` `capture.ts` and its tests: T017, T021, T036, T041.
- `solo-session.md`: one section per story.

### Within each story

Tests come first, then engine, then store or service, then component, then composition into the bar and sheet, then help.

---

## Parallel Examples

- **Foundational**: T002, then T003, while T004 runs on its own.
- **US1**: T005–T009 together; then T010 and T011 together; T012; T013; T014; T015; T016.
- **US2**: T017–T020 together; then T021, T024 in parallel; T022; T023; T025; T026.
- **US1 and US2 can be built side by side**: their engine and component files differ; only `SoloActions.svelte` (T015 and T025) needs ordering.

---

## Implementation Strategy

### First PR (MVP of Phase 2)

1. Setup and Foundational.
2. US1 (save discoveries) and US2 (generate).
3. **Stop and validate** quickstart #2–#5 and #10, then open PR 1.

### Then

1. US3 and US4, as PR 2.
2. US5, US6, the Cif registry and embeddings, as PR 3.

Each PR must leave the Phase 1 quickstart (spec 172) passing unchanged (SC-006).
