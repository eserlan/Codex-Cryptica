---
description: "Task list for Start Solo Session (Phase 1 of Solo Play Mode, #3839)"
---

# Tasks: Start Solo Session

**Input**: Design documents from `specs/172-solo-session-entry/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/solo-session.md](./contracts/solo-session.md), [quickstart.md](./quickstart.md)

**Tests**: Required for every changed behaviour (Constitution II). Write each test first and see it fail. Cover the success path and at least one failure, cancellation or negative path.

**User Help (Constitution VII)**: The `solo-session` help article is created in US1 and each later story adds its own section. US6 adds the Cif knowledge.

**Validation**: Impacted-only, per AGENTS.md. Use `bun run test:changed`, `bun run lint:changed` and a scoped `svelte-check`. Never run repository-wide suites.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1 to US6, matching spec.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffold the new workspace package.

- [x] T001 Create `packages/solo-session-engine/` mirroring `packages/session-journal-engine/`:
  - `package.json` with name `solo-session-engine`, `"type": "module"`, `main` and `types` set to `./src/index.ts`, scripts `test`, `test:coverage` and `lint`, and the same devDependencies;
  - `tsconfig.json` (copy);
  - `bunfig.toml` (copy);
  - an empty `src/index.ts`;
  - a `tests/` folder.
- [x] T002 Add `"solo-session-engine": "workspace:*"` to `dependencies` in `apps/web/package.json`, then run `bun install` at the repository root.

No discovery-registry task: `/play` is an app route, not a discovery page (plan, Discovery Intent Check).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The pure session rules, the store's load and save, and the solo-play guard's checks. Every story depends on them.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Tests (write first)

- [x] T003 [P] Write `packages/solo-session-engine/tests/session.test.ts` for `parseSoloSession`, `createSoloSession`, `withScene` and `withLastRoll`.
  - A valid record round-trips.
  - Each of these returns `null`:
    - `version` other than `1`;
    - empty `id`;
    - a `vaultId` that differs from the key's vault id;
    - `startedAt` that is not "Epoch milliseconds, finite, > 0";
    - a `sceneName` longer than 80 characters or not trimmed;
    - a `lastRoll` over 64 characters;
    - wrong types for `mapId`, `journalId` or `sceneSectionId` ("`string | null`");
    - `null`, a string or an array as input.
  - It never throws.
  - `createSoloSession` uses the injected `ids.uuid()` and `clock.now()`, and starts with `sceneName: ""`, `sceneSectionId: null` and `lastRoll: null`.
- [x] T004 [P] Write `packages/solo-session-engine/tests/defaults.test.ts`.
  - `resolveDefaultMap`:
    - the last map present returns it;
    - the last map missing returns the first id;
    - a `null` last map with maps returns the first id;
    - an empty list returns `null`.
  - `normaliseSceneName`:
    - trims;
    - rejects empty or whitespace-only input with `{ ok: false }`;
    - clamps to 80 characters.
  - `resolveQuickRoll`:
    - trims typed input;
    - empty input with a `lastRoll` returns it;
    - empty input with no `lastRoll` returns `null`;
    - whitespace-only input counts as empty.
- [x] T005 [P] Write `apps/web/src/lib/stores/solo-session.svelte.test.ts` for loading and saving, with an in-memory `StorageLike`, a fake vault registry, ids and clock injected.
  - It reads `codex-solo-session:<vaultId>` for the active vault and exposes `session` and `isActive`.
  - A malformed value reads as no session.
  - A storage `getItem` that throws reads as no session and logs a warning instead of throwing.
  - Changing `activeVaultId` reloads that vault's session.
  - A `storage` event for this vault's key (from an injected `storageEvents` source) reloads the session, so another tab's start, change or end shows straight away. An event for another key or another vault is ignored.
  - No vault means no session.
- [x] T006 [P] Write `apps/web/src/lib/stores/ui/solo-play-guard.test.ts`.
  - `isSharedPlayOn()` (in `apps/web/src/lib/stores/ui/shared-play-state.test.ts`) is true while `sessionModeStore.sharedMode` is on or `p2pHost.isHosting` is on, and false otherwise.
  - `soloStartBlockedReason()` returns `SHARED_SOLO_NOTE` while `isSharedPlayOn()` is true. Otherwise it returns `null`.
  - `sharedPlayBlockedReason()` returns `SOLO_SHARED_NOTE` while a solo session is active. Otherwise it returns `null`.
  - `toggleSharedMode()`:
    - turns shared mode on when not blocked and returns `true`;
    - refuses when blocked and returns `false`, leaving the mode unchanged;
    - always allows turning shared mode off.
  - `requestShare()` calls `modalUIStore.openShare()` and returns `true` when not blocked. While a solo session is active it shows `SOLO_SHARED_NOTE` through `notificationStore`, does not open Share and returns `false`.
  - Stores are injected through module-level setters or parameters, never through real singletons.

### Implementation

- [x] T007 [P] Implement `SoloSession` and `SoloSetup` in `packages/solo-session-engine/src/types.ts`, exactly as in data-model.md. `SoloSetup` is `{ mapId: string | null; journal: boolean }`.
- [x] T008 Implement `parseSoloSession`, `createSoloSession`, `withScene` and `withLastRoll` in `packages/solo-session-engine/src/session.ts` (depends on T007). Make T003 pass.
- [x] T009 [P] Implement `resolveDefaultMap`, `normaliseSceneName` and `resolveQuickRoll` in `packages/solo-session-engine/src/defaults.ts` (depends on T007). Make T004 pass.
- [x] T010 Export the public API from `packages/solo-session-engine/src/index.ts` (depends on T008, T009). Confirm coverage of at least 70% with `bun run test:coverage` in the package.
- [x] T011 Implement the loading and saving part of `SoloSessionStore` in `apps/web/src/lib/stores/solo-session.svelte.ts`:
  - constructor dependencies per contract §2, with production defaults: `browserStorage`, the vault registry, `systemIdGenerator`, `systemClock`, `sessionJournalStore`, a `mapStore` adapter whose `setSoloFog(on)` sets `mapStore.soloFog`, SvelteKit `goto`, a guest check `() => sessionModeStore.isGuestMode || vault.isGuest`, `isSharedPlayOn` from `stores/ui/shared-play-state.ts` (the store never imports the guard, to avoid an import cycle), and a `storageEvents` source defaulting to `window` `storage` events;
  - `$state` `session` re-read in an `$effect.root` when `activeVaultId` changes;
  - a reload when a `storage` event names this vault's key;
  - `isActive`;
  - a private `save()` and `clear()` that catch storage errors.
    Export the class and a `soloSessionStore` singleton. Make T005 pass.
- [x] T012 Implement `apps/web/src/lib/stores/ui/shared-play-state.ts` (`isSharedPlayOn()`, reading `sessionModeStore.sharedMode` and `p2pHost.isHosting`) and `apps/web/src/lib/stores/ui/solo-play-guard.ts` per contract §3 (`SOLO_SHARED_NOTE`, `SHARED_SOLO_NOTE`, `sharedPlayBlockedReason`, `soloStartBlockedReason`, `toggleSharedMode` and `requestShare`). The guard reads `soloSessionStore.isActive` and `isSharedPlayOn()`. `shared-play-state.ts` must import neither the store nor the guard (depends on T011). Make T006 pass.

**Checkpoint**: The engine, the store's loading and saving, and the guard checks pass their tests. Nothing is visible to users yet.

---

## Phase 3: User Story 1 - Start a solo session and play (Priority: P1) 🎯 MVP

**Goal**: The Play page offers Start Solo Session. A short setup turns SOLO on for the chosen map, starts or continues the journal, and lands the player on the map (or the graph) with the solo bar visible.

**Independent Test**: In a vault with one map, choose Play, start with the map and a journal, and confirm the map opens with SOLO on, a journal is running and the bar is shown (quickstart #1, #2, #11).

### Tests for User Story 1 ⚠️

- [x] T013 [P] [US1] Add `start()` tests to `apps/web/src/lib/stores/solo-session.svelte.test.ts`.
  - **With a map**: selects the map, then `setSoloFog(true)`, then navigates to `/map`. The stored record has that `mapId`.
  - **With no map**: navigates to `/`, with no `selectMap` or `setSoloFog` call.
  - **Journal option on**: calls `journal.start()` and stores its id as `journalId`.
  - **Journal option off**: no journal call, and `journalId: null`.
  - **Journal `start()` rejects**: the session still starts with `journalId: null` and a notification is shown.
  - **Refusals**: throws when the guest check is true, throws with `SHARED_SOLO_NOTE` when `isSharedPlayOn()` is true, and throws when a session is already active in this vault (FR-019). In every case nothing is written and the existing record is unchanged.
  - **No Oracle or Adventure Mode (FR-009)**: the store's constructor takes no Oracle or Adventure dependency, and `start()` never navigates to `/adventure` in any case above.
  - **Default map**: `defaultMapId(mapIds)` delegates to `resolveDefaultMap(maps.activeMapId, mapIds)`.
- [x] T014 [P] [US1] Write `apps/web/src/lib/components/solo/PlayPage.test.ts`.
  - With no session: `play-start-solo` is the main action and `play-adventure-mode` links to `/adventure`.
  - With `discoveryPolicyStore.aiDisabled`: there is no `play-adventure-mode`.
  - With a blocked reason: Start is disabled and the note is shown.
  - In guest mode: the page explains that solo sessions are not available for guests and shows no Start.
- [x] T015 [P] [US1] Write `apps/web/src/lib/components/solo/SoloSetupDialog.test.ts`.
  - The map choice lists the vault's maps plus "No map", preselected to `defaultMapId`. An empty vault shows only "No map".
  - The journal option is on by default. Its label reads "Continue the running Session Journal" when `sessionJournalStore.controlState` is not `"start"`, otherwise "Start a Session Journal".
  - Start calls `soloSessionStore.start` with the chosen values.
  - Cancel closes without starting.
- [x] T016 [P] [US1] Update `apps/web/src/lib/components/layout/nav-items.test.ts` (create it if missing).
  - The `adventure` item's `href` is `${base}/play`.
  - `isViewActive` is true for both `/play` and `/adventure`.
  - The title mentions both solo sessions and Adventure Mode.
- [x] T017 [P] [US1] Write `apps/web/src/lib/components/solo/SoloSessionBar.test.ts` (first part).
  - The bar renders only while `soloSessionStore.isActive`.
  - It does not render in guest mode.
  - It has `data-testid="solo-bar"`.

### Implementation for User Story 1

- [x] T018 [US1] Implement `start(setup)` and `defaultMapId(mapIds)` in `apps/web/src/lib/stores/solo-session.svelte.ts`, per the data-model.md `start` transition, using `createSoloSession` (depends on T011). Make T013 pass.
- [x] T019 [P] [US1] Change the `adventure` item in `apps/web/src/lib/components/layout/nav-items.ts`:
  - `href: \`${base}/play\``;
  - `alsoActiveFor: [\`${base}/adventure\`]`;
  - `title: "Play: start a solo session or an Oracle-run adventure"`.
    Keep the id and the label "Play". Make T016 pass.
- [x] T020 [P] [US1] Implement `apps/web/src/lib/components/solo/SoloSetupDialog.svelte` using Svelte 5 runes, semantic tokens and Iconify classes. It must be keyboard-reachable and close on Escape. Make T015 pass.
- [x] T021 [US1] Implement `apps/web/src/lib/components/solo/PlayPage.svelte` (depends on T020). Make T014 pass.
  - Main card: "Start Solo Session" (or "Resume Solo Session", added in US3), which opens the setup.
  - Secondary card: "Let the Oracle run the game", linking to `/adventure`, shown only when AI is not disabled.
  - The blocked note from `soloStartBlockedReason()`.
- [x] T022 [US1] Create `apps/web/src/routes/(app)/play/+page.svelte`:
  - it renders `PlayPage` inside a flex column like `routes/(app)/adventure/+page.svelte`;
  - `<title>Play | Codex Cryptica</title>`;
  - a plain description meta.
- [x] T023 [P] [US1] Add `/play` beside `/adventure` in `apps/web/src/lib/service-worker/routing.ts` and in both `/adventure` lists in `apps/web/src/lib/seo/crawler-access.ts`. Update their existing tests if they enumerate the lists.
- [x] T024 [US1] Implement a minimal `apps/web/src/lib/components/solo/SoloSessionBar.svelte`: a single-line strip with `data-testid="solo-bar"` showing "Solo session" and the session's map name, if any. Make T017 pass.
- [x] T025 [US1] Mount `<SoloSessionBar />` in `apps/web/src/routes/(app)/+layout.svelte` directly after `AppHeader` and the demo banner, inside the same `!isPopup && !isMapFullscreen && !isZenPopout` block. It is a normal flex row (no absolute positioning), so content below shrinks (FR-010). Make no other layout changes. The bar is therefore hidden on the full-screen map, pop-outs and Zen view, matching FR-010.
- [x] T026 [US1] Create the help article `apps/web/src/lib/content/help/solo-session.md`:
  - front matter: `id: solo-session`, `title: Solo Sessions`, a description and tags `[solo, play, session, dice, journal, scene]`;
  - sections for what a solo session is (one person as GM and player, no AI needed), opening Play, the setup and its defaults (the last open map, the journal on or continued), what Start does (SOLO on for that map, and fog must be on to hide anything), and Adventure Mode as the optional alternative.

**Checkpoint**: A solo session can be started from Play and the bar appears on every screen. Quickstart #1, #2 and #11 pass.

---

## Phase 4: User Story 2 - Roll and reach my tools without leaving what I'm doing (Priority: P1)

**Goal**: Quick roll in the bar, plus one-action access to the dice window, the Oracle, the journal, the map and a quick note, on desktop and phone.

**Independent Test**: With a session and journal active, roll `d20`, `2d6+1` and `xyz` from the bar on the map. The valid rolls show inline, appear in roll history and the journal, the invalid one shows an inline message, and the map never changes (quickstart #3, #4, #9).

### Tests for User Story 2 ⚠️

- [x] T027 [P] [US2] Add a `recordRoll(expression)` test to `apps/web/src/lib/stores/solo-session.svelte.test.ts`.
  - It stores `lastRoll`, and the value survives a reload.
  - An expression over 64 characters is not stored ("at most 64 characters").
- [x] T028 [P] [US2] Write `apps/web/src/lib/components/solo/SoloQuickRoll.test.ts`, with `diceParser`, `diceEngine` and `diceHistory` injected or mocked.
  - Enter on `d20` calls `diceHistory.addResult(result, "modal", { label: "Quick roll" })` and shows the total in `solo-quick-roll-result`.
  - Enter on an empty box repeats `lastRoll`, and does nothing when there is none.
  - An expression the parser rejects (it throws) shows `solo-quick-roll-error`, makes no `addResult` call and leaves `lastRoll` unchanged.
  - No dialog or window opens and focus stays in the input.
  - With the real `diceHistory` and a spy on the `JOURNAL:CAPTURE` event, one quick roll publishes exactly one capture, the same as a dice window roll (FR-016).
  - The input has an accessible name.
- [x] T029 [P] [US2] Extend `apps/web/src/lib/components/solo/SoloSessionBar.test.ts`.
  - "More dice" sets `modalUIStore.showDiceModal = true`.
  - "Ask Oracle" sets `layoutUIStore.activeSidebarTool = "oracle"`, and is absent when `discoveryPolicyStore.aiDisabled`.
  - "Journal" calls `sessionJournalStore.open()` when `controlState === "resume"`, then `quickNoteStore.openJournal()`.
  - "Map" selects the session map and goes to `/map`. With no map, or a map no longer in `vault.maps`, it shows "Choose map", which opens the setup's map choice.
  - "Add note" calls `quickNoteStore.open()`.
  - Minimise stores `codex-solo-bar-minimised` and collapses to one control. Expand restores the bar, and the preference survives remount.
  - Every control has an accessible name.
- [x] T030 [P] [US2] Write `apps/web/src/lib/components/solo/SoloSessionSheet.test.ts`.
  - With `layoutUIStore.isMobile`, the bar renders only `solo-bar-mobile-trigger`.
  - Activating it opens `solo-sheet`, which contains quick roll and every bar action.
  - Escape and the close button close it.

### Implementation for User Story 2

- [x] T031 [US2] Implement `recordRoll(expression)` in `apps/web/src/lib/stores/solo-session.svelte.ts` using `withLastRoll`. Make T027 pass.
- [x] T032 [P] [US2] Implement `apps/web/src/lib/components/solo/SoloQuickRoll.svelte`. Make T028 pass.
  - An input with a placeholder such as "d20, 2d6+1".
  - On Enter: `resolveQuickRoll`, then `diceParser.parse`, then `diceEngine.execute`, then `diceHistory.addResult(..., "modal", { label: "Quick roll" })`, then `soloSessionStore.recordRoll`.
  - The last expression and total are shown inline in a polite live region.
- [x] T033 [US2] Extend `apps/web/src/lib/components/solo/SoloSessionBar.svelte` with:
  - quick roll;
  - more dice, Ask Oracle, Journal, Map / Choose map and Add note, as Iconify-icon buttons with labels;
  - minimise and expand, stored as `codex-solo-bar-minimised` = `"1"` or absent, through the injected `StorageLike`.
    Make T029 pass.
- [x] T034 [US2] Implement `apps/web/src/lib/components/solo/SoloSessionSheet.svelte` and use it from `SoloSessionBar.svelte` when `layoutUIStore.isMobile`. It is a bottom sheet with the same actions, following existing responsive sheet patterns. Make T030 pass.
- [x] T035 [US2] Add sections to `apps/web/src/lib/content/help/solo-session.md`:
  - the solo bar and where it sits (minimising it, the phone sheet);
  - quick roll (expressions, an empty roll repeats the last, rolls appear in roll history and the journal);
  - the other actions (more dice for tables and decks, Ask Oracle only when AI is on, Journal, Map, Add note).

**Checkpoint**: US1 and US2 together are the MVP. Quickstart #1 to #4, #9 and #11 pass.

---

## Phase 5: User Story 3 - Pick up where I left off (Priority: P2)

**Goal**: An active session survives reload and vault switches, and Play offers Resume.

**Independent Test**: Start a session, reload, and confirm the bar, map and journal link are restored and Play shows Resume. Switch vaults and back (quickstart #6, #8).

### Tests for User Story 3 ⚠️

- [x] T036 [P] [US3] Add `resume()` tests to `apps/web/src/lib/stores/solo-session.svelte.test.ts`.
  - Navigates to `/map` after `selectMap(mapId)` when the map exists, otherwise to `/`.
  - Never calls `setSoloFog` (FR-021).
  - Rejects with no active session.
  - With two vaults' records stored, each vault sees only its own session.
- [x] T037 [P] [US3] Extend `apps/web/src/lib/components/solo/PlayPage.test.ts`: with an active session, `play-resume-solo` is the main action and calls `soloSessionStore.resume()`, and Start is not offered.

### Implementation for User Story 3

- [x] T038 [US3] Implement `resume()` in `apps/web/src/lib/stores/solo-session.svelte.ts`, per the data-model.md `resume` transition. The section re-apply is added in US5. Make T036 pass.
- [x] T039 [US3] Add the Resume state to `apps/web/src/lib/components/solo/PlayPage.svelte`. Make T037 pass.
- [x] T040 [US3] Add a "Resume a session" section to `apps/web/src/lib/content/help/solo-session.md`. It covers what is kept across reloads and vault switches, and that resuming does not change map settings.

**Checkpoint**: Quickstart #6 and #8 pass.

---

## Phase 6: User Story 4 - End the session cleanly (Priority: P2)

**Goal**: End a session safely, optionally ending the journal. While a session is active, Player View and hosting are unavailable, with a note.

**Independent Test**: End with the journal kept and with it ended. The bar is gone and nothing is deleted. During a session, `p`, both shared-mode toggles and Share each refuse with the note (quickstart #7, #10).

### Tests for User Story 4 ⚠️

- [x] T041 [P] [US4] Add `end()` tests to `apps/web/src/lib/stores/solo-session.svelte.test.ts`.
  - `end({ endJournal: false })` removes only `codex-solo-session:<vaultId>` (a storage spy confirms no other write) and makes no journal call.
  - `end({ endJournal: true })` calls `journal.end()` only when that journal is the session's `journalId` and is active.
  - A rejected `journal.end()` still ends the session and shows a notification.
  - `journalRunning` is true only when the current journal is active and its id equals `journalId`.
- [x] T042 [P] [US4] Write `apps/web/src/lib/components/solo/SoloEndDialog.test.ts`.
  - With the journal running, it shows Cancel, End session and End session and journal.
  - Cancel changes nothing.
  - Each end button calls `end()` with the matching `endJournal`.
  - Without a running journal, ending uses `notificationStore.confirm`, and a `false` result changes nothing.
- [x] T043 [P] [US4] Update the shared-mode tests to run with an injected active solo session. In each case the toggle is disabled, its title is `SOLO_SHARED_NOTE`, and shared mode does not change. With no session, existing behaviour is unchanged.
  - `apps/web/src/lib/actions/useGlobalShortcuts.test.ts` (key `p`);
  - `GraphToolbar.test.ts`;
  - `MapVTTControlsHUD.test.ts`.
- [x] T044 [P] [US4] Test both ways to open Share. With a solo session active, each shows `SOLO_SHARED_NOTE` through `notificationStore` and does not open the share modal. With no session, each opens it as before.
  - `openShareModal()` in `apps/web/src/lib/stores/map/map-page-controller.svelte.test.ts` (create it if missing);
  - the Share item in `apps/web/src/lib/components/layout/VaultActionsMenu.test.ts`.
- [x] T045 [P] [US4] Add a guard test to `apps/web/src/lib/stores/ui/solo-play-guard.test.ts`. It scans `apps/web/src` source files (not tests) for:
  - direct `sessionModeStore.sharedMode =` assignments, allowing only `solo-play-guard.ts` and `components/vtt/GuestSessionBootstrap.svelte` (the guest-only path);
  - direct `.openShare()` calls, allowing only `solo-play-guard.ts`.

### Implementation for User Story 4

- [x] T046 [US4] Implement `end({ endJournal })` and `journalRunning` in `apps/web/src/lib/stores/solo-session.svelte.ts`. Make T041 pass.
- [x] T047 [P] [US4] Implement `apps/web/src/lib/components/solo/SoloEndDialog.svelte`. Wire End from `SoloSessionBar.svelte` and `SoloSessionSheet.svelte`: the dialog when `journalRunning`, otherwise `notificationStore.confirm`. Make T042 pass.
- [x] T048 [US4] Replace the direct `sharedMode` toggles with `toggleSharedMode()` in:
  - `apps/web/src/lib/actions/useGlobalShortcuts.ts`;
  - `apps/web/src/lib/components/graph/GraphToolbar.svelte`;
  - `apps/web/src/lib/components/map/MapVTTControlsHUD.svelte`.
    Disable the two buttons while `sharedPlayBlockedReason()` is set (unless shared mode is already on) and use the reason as their title. Make T043 and T045 pass.
- [x] T049 [US4] Replace the direct `openShare()` calls with `requestShare()` in `openShareModal()` in `apps/web/src/lib/stores/map/map-page-controller.svelte.ts` and in the Share item of `apps/web/src/lib/components/layout/VaultActionsMenu.svelte`. Make T044 pass.
- [x] T050 [US4] Add sections to `apps/web/src/lib/content/help/solo-session.md`:
  - "End a session" (the journal choice; nothing is deleted);
  - "Solo means solo" (sharing, hosting and Player View are unavailable during a solo session; end it first; and Start is unavailable while shared play is on).

**Checkpoint**: Quickstart #7 and #10 pass. With no solo session, every existing shared-mode test passes unchanged (SC-006).

---

## Phase 7: User Story 5 - Know which scene I'm in (Priority: P3)

**Goal**: A scene name in the bar. With a journal running, each new scene is a journal section.

**Independent Test**: With a journal running, set the scene to "Arrival", then "The flooded crypt". The bar shows the latest name and the journal has a section for each (quickstart #5).

### Tests for User Story 5 ⚠️

- [x] T051 [P] [US5] Add scene tests to `apps/web/src/lib/stores/solo-session.svelte.test.ts`.
  - **`setScene` with the session journal running**: calls `journal.createSection(name)` and stores `sceneName` and `sceneSectionId`.
  - **`setScene` with no running journal**: stores `sceneName` only, with `sceneSectionId: null` and no journal call.
  - **`setScene("   ")`**: rejected, and nothing changes.
  - **`createSection` rejects**: the name is kept and `sceneSectionId` is `null`.
  - **`renameScene`**: calls `journal.renameSection(sceneSectionId, name)` only when that section exists in the active journal.
  - **`resume()`**: calls `journal.setActiveSection(sceneSectionId)` when the section exists, and skips it otherwise.
- [x] T052 [P] [US5] Write `apps/web/src/lib/components/solo/SoloSceneField.test.ts`.
  - It shows the current scene, or the placeholder "Name this scene".
  - Editing offers "New scene" and "Rename", which call `setScene` and `renameScene`.
  - Enter confirms and Escape cancels.
  - An empty name is not submitted.

### Implementation for User Story 5

- [x] T053 [US5] Implement `setScene`, `renameScene` and the `setActiveSection` re-apply in `resume()` in `apps/web/src/lib/stores/solo-session.svelte.ts`, using `normaliseSceneName` and `withScene` ("Trimmed, at most 80 characters"). Re-apply the section on load as well, when the session's journal is active. Make T051 pass.
- [x] T054 [US5] Implement `apps/web/src/lib/components/solo/SoloSceneField.svelte` and add it to `SoloSessionBar.svelte` and `SoloSessionSheet.svelte`. Make T052 pass.
- [x] T055 [US5] Add a "Scenes" section to `apps/web/src/lib/content/help/solo-session.md`: naming a scene, new versus rename, and that each new scene starts a journal section while a journal is running.

**Checkpoint**: Quickstart #5 passes.

---

## Phase 8: User Story 6 - Get help with solo play (Priority: P3)

**Goal**: Cif knows about solo sessions, can point at the Play page and bar controls, and stays product help only.

**Independent Test**: Ask Cif "how do I start a solo session?" and "what's the solo bar for?" (answered from `solo-session` and able to point at controls), and an in-game question (directed to the Oracle) (quickstart #12).

### Tests for User Story 6 ⚠️

- [x] T056 [P] [US6] Extend `packages/help-engine/tests/context.test.ts`.
  - `/(app)/play` is an accepted route template.
  - The `solo-session` flag is accepted.
  - A context listing `solo-quick-roll` without the `solo-session` flag is rejected or stripped, per the catalogue's `requiresFlag` rules.
  - `MAX_FLAGS` still holds every flag at once.
- [x] T057 [P] [US6] Extend `packages/help-engine/tests/actions.test.ts` (or the registry schema test) so that:
  - the `solo-session` feature entry validates;
  - its `actionIds` resolve;
  - `solo-adventure` steps mention Play and "Let the Oracle run the game".
- [x] T058 [P] [US6] Extend `apps/web/src/lib/stores/help-assistant/help-context.svelte.test.ts` (create it if missing).
  - With a solo session active, the context carries `solo-session` and lists `solo-quick-roll` and `solo-end-session`.
  - On `/play` with no session it lists `play-start-solo-session`.
  - With no session and off `/play`, none of them are listed.
- [x] T059 [P] [US6] Add at least five evaluation questions to `packages/help-engine/tests/eval/phase-a-questions.ts` expecting `solo-session`:
  - "How do I play solo?"
  - "How do I start a solo session?"
  - "What is the solo bar?"
  - "How do I roll dice quickly while playing alone?"
  - "How do I end my solo session?"
    Add one in-game question ("What would the goblin chief do next?") that must not retrieve `solo-session` as a product answer and whose expected guidance points to the Oracle.

### Implementation for User Story 6

- [x] T060 [US6] In `packages/help-engine/src/actions/catalogue.ts`:
  - add `SESSION_FLAGS = ["solo-session"] as const` and include it in `HELP_FLAGS`;
  - add `"solo"` to `ControlSpec.area`;
  - add the controls:
    - `play-start-solo-session` (`area: "solo"`);
    - `solo-quick-roll` (`area: "solo"`, `requiresFlag: "solo-session"`);
    - `solo-end-session` (`area: "solo"`, `requiresFlag: "solo-session"`).
      Make the T056 catalogue part pass.
- [x] T061 [US6] In `packages/help-engine/src/context/index.ts`, add `"/(app)/play"` to `HELP_ROUTE_TEMPLATES` and raise `MAX_FLAGS` by one. Make T056 pass.
- [x] T062 [US6] Create `packages/help-engine/src/registry/features/solo-session.ts` (a `FeatureEntry`, modelled on `solo-adventure.ts`) and register it in `registry/features/index.ts`. Make T057 pass. The entry has:
  - id `solo-session`;
  - title "Solo Sessions";
  - a summary saying one person plays as GM and player, starting from Play, with a solo bar of quick roll, dice, Oracle, journal, map, note and scene, and no AI needed;
  - `channel: "production"`, `routes: ["/(app)/play"]`, `areas: ["other", "map", "graph"]`;
  - workflows "Start a solo session", "Roll from the solo bar" and "End a solo session";
  - `helpIds: ["solo-session"]` and `related: ["solo-adventure", "session-journal", "dice-roller", "vtt-map"]`;
  - an `openHelp` action.
- [x] T063 [US6] Update `packages/help-engine/src/registry/features/solo-adventure.ts`: its steps start with "Open Play from the activity bar, then choose Let the Oracle run the game." Keep `routes: ["/(app)/adventure"]`.
- [x] T064 [US6] Report the solo state in `apps/web/src/lib/stores/help-assistant/help-context.svelte.ts`: the `solo-session` flag from `soloSessionStore.isActive`, plus the reachable solo controls (contract §6). Add matching `data-help-target` attributes to the Play start button, quick roll and End in the solo components. Make T058 pass.
- [x] T065 [P] [US6] Add a final section, "Asking for help", to `apps/web/src/lib/content/help/solo-session.md`: Cif answers questions about the app, and the Oracle (optional, AI) or your own oracle tables answer in-game questions. Then add links to `solo-session`:
  - from `vtt-solo-play.md` (starting a solo session turns SOLO on);
  - from `adventure-mode.md` (Adventure Mode is now opened from Play);
  - from `dice-roller.md` (quick roll in the solo bar).
- [x] T066 [US6] Regenerate the help bundle and embeddings with `bun scripts/sync-help-embeddings.ts`, after refreshing the Wrangler token with `bunx wrangler whoami`. Confirm with a scratch evaluation that each T059 question retrieves `solo-session`, then delete the scratch file. Make T059 pass.

**Checkpoint**: Quickstart #12 passes. The Worker redeploy happens after merge (T071).

---

## Phase 9: Polish & Cross-Cutting Concerns

- [x] T067 Run `bun run test:changed`, `bun run lint:changed`, and scoped type-checks for every workspace listed by `bun scripts/affected-workspaces.mjs` (for example `cd apps/web && bunx svelte-check --tsconfig ./tsconfig.json --threshold error`, and `bunx tsc --noEmit -p packages/solo-session-engine`). Fix everything to 0 errors.
- [x] T068 Run `bunx fallow audit --format json --quiet --explain --gate-marker agent` and fix any `fail` findings, such as unused exports in the new package, unreached components or an import cycle between the solo store and the guard. Then check FR-031: a scan of the new and changed files for `fetch(`, `sendBeacon`, `XMLHttpRequest`, `WebSocket` and analytics or telemetry calls finds none.
- [ ] T069 Walk through every scenario in [quickstart.md](./quickstart.md) in the dev app, on desktop and at phone width, with AI on and with AI off. Record any failure as a new task.
- [x] T070 Run the `codex-review` specialist review on the branch and resolve its findings (AGENTS.md PR quality gate).
- [x] T071 Open a ready-for-review PR to `staging` that references #3839 ("Phase 1 of #3839"; do not close it). Do not merge until the PR's CI lint and test jobs (`deploy.yml` on `pull_request`) are green; that is how Constitution VI.3 is met alongside the impacted-only local checks. After merge, redeploy the help Worker from `staging` (checkout and `TMPDIR` under `/home`, not `/tmp`), then promote with an explicit `staging_run_id`.

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)**: no dependencies.
- **Foundational (Phase 2)**: depends on Setup and blocks every story.
- **US1 (Phase 3)**: depends on Foundational.
- **US2 (Phase 4)**: depends on US1, because the bar is mounted there.
- **US3 (Phase 5)**: depends on US1, since it needs `start()` and PlayPage. It is independent of US2.
- **US4 (Phase 6)**: depends on US1 (the bar, for its End button) and on Foundational (the guard). It is independent of US2 and US3.
- **US5 (Phase 7)**: depends on US1 (the bar) and on US3 (`resume()`, for the section re-apply).
- **US6 (Phase 8)**: depends on the components existing for the control markers (US1, US2, US4). Its help-engine tasks T056, T057 and T059 to T063 can start right after Foundational.
- **Polish (Phase 9)**: after the stories you intend to ship.

### Shared files

`solo-session.svelte.ts` and its test file are edited by every story, so store tasks across stories run one after another (T018, T031, T038, T046, T053). `SoloSessionBar.svelte` is likewise edited in US1, US2, US4 and US5. `solo-session.md` gains a section in each story.

### Within each story

Tests come before implementation. Store work comes before components, and components before help.

---

## Parallel Examples

**Foundational**: T003, T004, T005 and T006 (four test files) together; then T007; then T008 and T009 together.

**US1**: T013, T014, T015, T016 and T017 (tests) together; then T019, T020 and T023 together; T018 can run alongside them.

**US2**: T027, T028, T029 and T030 together; then T032 alongside T031.

**US4**: T041 to T045 together; then T047 alongside T046.

**US6 (after Foundational)**: T056, T057 and T059 together; then T060 to T063 in order (catalogue, context, registry).

---

## Implementation Strategy

### MVP first

1. Phase 1 and Phase 2.
2. US1: start a session.
3. US2: quick roll and the bar's tools.
4. **Stop and validate** with quickstart #1 to #4, #9 and #11. This is shippable on its own: a session can be started, played and left running. Before shipping without US4, make sure a session can still be ended, or ship US4 in the same PR.

### Incremental delivery

1. MVP (US1 and US2), with US4 strongly recommended in the same PR so a session can be ended.
2. US3 (resume) and US5 (scenes).
3. US6 (Cif), then one Worker redeploy.

### Note on ending in the MVP

The spec puts ending (US4) at P2, but a session that cannot be ended leaves the bar on permanently. Ship US4 with the MVP, or at least the `end()` store method and the End button (T041, T042, T046, T047), in the same PR.
