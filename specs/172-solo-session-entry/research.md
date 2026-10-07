# Research: Start Solo Session

Every decision below was checked against the current code on `staging` (2026-10-07). Paths are relative to the repository root.

## R1. Where the solo session logic lives

**Decision**: A new framework-free workspace package, `packages/solo-session-engine`, holds the session record, its validation and the pure transitions (start, set scene, record a quick roll, end). A thin Svelte store, `apps/web/src/lib/stores/solo-session.svelte.ts`, wires it to storage, the active vault and the other stores.

**Rationale**: Constitution I puts major features in `packages/`. The precedents for a feature-sized slice are `session-journal-engine` and `adventure-engine`. The engine has no Svelte, DOM or IndexedDB imports, so it is quick to test fully (Constitution X asks for 70% on new packages). The store stays small because it only orchestrates calls the other stores already expose.

**Alternatives considered**: Logic inside the app store only. Rejected: it would mix validation and persistence with Svelte reactivity, and break Principle I for a user-facing feature. Adding the logic to `session-journal-engine`. Rejected: a solo session is not a journal (it can exist without one), so that would blur the package's responsibility.

## R2. Where the session is stored

**Decision**: `localStorage`, one key per vault, `codex-solo-session:<vaultId>`, through the existing injected `StorageLike` (`browserStorage` in `apps/web/src/lib/utils/runtime-deps.ts`). The value is a small JSON record, validated on read. An invalid or unreadable value reads as no session and is never thrown.

**Rationale**: The record is tiny and per device (spec Key Entities). It needs a synchronous read on load so the bar does not flicker in after the first paint. The map store already keeps per-vault page state in `localStorage` the same way (`getPageStateStorageKey`). No IndexedDB store is needed, so there is no schema migration.

**Alternatives considered**: IndexedDB `appSettings`. Rejected: it is asynchronous, so the bar would appear a beat late on every load, and that buys nothing for about 300 bytes. Storing it in the vault (OPFS). Rejected: a solo session is a device-local play state, not campaign knowledge (FR-022), and it must not sync or export with the vault.

## R3. Which map the setup preselects (FR-006)

**Decision**: `mapStore.activeMapId`, which the map store already restores per vault from its saved page state. If it is null or no longer in `vault.maps`, use the first entry of `vault.maps`, else no map. Resolution is a pure engine function, `resolveDefaultMap(lastMapId, mapIds)`.

**Rationale**: The map store already remembers the last open map per vault (`restorePageState`, `persistPageState`). Reading it costs nothing new.

**Alternatives considered**: A separate "last solo map" field. Rejected by the user in clarification (option C).

## R4. Turning SOLO on for the chosen map (FR-008, FR-021)

**Decision**: On start, call `mapStore.selectMap(mapId)` and then set `mapStore.soloFog = true`, then navigate to `/map`. `selectMap` applies that map's saved settings synchronously, and the store's existing settings effect persists `soloFog` for the now-active map. Resume never touches map settings.

**Rationale**: It reuses the shipped per-map setting from #3818 unchanged, with no new map API. Fog itself is left as the user set it. SOLO has no effect without fog (spec 171 edge case), and turning fog on for someone would hide a map they may not want hidden. The help article explains that fog has to be on.

**Alternatives considered**: Also turning fog on. Rejected: it changes the map's content visibility on the user's behalf, and the spec asks only for SOLO. Adding a `setSoloFog(mapId, on)` API that writes another map's settings without selecting it. Rejected as unneeded, since the player is about to open that map anyway.

## R5. Journal: continue, start and scenes (FR-007, FR-024)

**Decision**:

- `sessionJournalStore.start()` already resumes the vault's single active journal or creates one (`startOrResumeJournal`). Both "continue" and "start new" go through it, and the setup only changes its label based on `controlState`.
- A scene maps to a journal section. A new scene calls `createSection(name)`, which also makes it the active section. A rename calls `renameSection(sectionId, name)`. The session stores `sceneSectionId`.
- The journal's active section is held in memory only (`selectedSectionId`), so after a reload or resume the store calls `setActiveSection(sceneSectionId)`. If that section no longer exists, the scene name is kept in the bar and the next new scene starts a fresh section.
- If the journal ended elsewhere, `sceneSectionId` is ignored, and setting a scene only updates the bar until a journal is running again.

**Rationale**: It uses the journal's existing one-active-journal-per-vault rule and its section API, with no journal schema change.

**Alternatives considered**: Storing scenes as journal entries (clarification option B). Rejected by the user.

## R6. Quick roll (FR-015 to FR-018)

**Decision**: `SoloQuickRoll.svelte` calls `diceParser.parse(expr)`, `diceEngine.execute(command)` and `diceHistory.addResult(result, "modal", { label: "Quick roll" })`. The pure part, deciding what to roll from the input and the last expression, is `resolveQuickRoll(input, lastExpression)` in the engine. A parse error (the parser throws `Error`) shows inline and records nothing.

**Rationale**: It is exactly what the dice window does (`DiceVault.svelte` `executeRoll`). The `"modal"` context means the roll shows in the dice window's history (`diceHistory` filters `modal | table`). `addResult` already publishes `JOURNAL:CAPTURE`, so journal capture comes for free.

**Alternatives considered**: A new `"solo"` roll context. Rejected: it would need a schema change and changes to the history filters, and the spec wants the same history.

## R7. Keeping shared play out of solo sessions (FR-028)

**Decision**: Two small modules. `apps/web/src/lib/stores/ui/shared-play-state.ts` exports `isSharedPlayOn()` (shared mode or hosting), and imports neither the solo store nor the guard. The guard, `apps/web/src/lib/stores/ui/solo-play-guard.ts`, exports:

- `sharedPlayBlockedReason()`, which returns a note when a solo session is active in this vault;
- `toggleSharedMode()`, which only enters shared mode when that returns nothing;
- `soloStartBlockedReason()`, which returns a note while `isSharedPlayOn()` is true;
- `requestShare()`, which opens Share (`modalUIStore.openShare()`) only when `sharedPlayBlockedReason()` returns nothing, and otherwise shows the note.

The guard imports the solo store, but the store does not import the guard: its start check uses `isSharedPlayOn()` directly. That avoids an import cycle between the two.

Today's call sites change to use it:

- the three shared-mode toggles (`useGlobalShortcuts.ts` key `p`, `GraphToolbar.svelte` and `MapVTTControlsHUD.svelte`) call `toggleSharedMode()`, and their buttons are disabled with the note as their title;
- the two ways to open Share and start hosting both call `requestShare()`: `map-page-controller.svelte.ts` `openShareModal()` and `components/layout/VaultActionsMenu.svelte` (the vault menu's Share item).

Leaving shared mode is always allowed.

**Rationale**: `sessionModeStore.sharedMode` is a plain field written from three places. Making `SessionModeStore` aware of solo sessions would create an import cycle, and three plain writes are easy to miss. One guard keeps the rule in a single tested place. A source-scan test makes sure no new direct `sharedMode` write or `openShare()` call slips in.

**Alternatives considered**: Hiding the bar during shared play (the original draft). Rejected by the user ("its solo for a reason"). A getter/setter on `sharedMode` that refuses when solo is active. Rejected: it hides a rule inside an assignment, so the button cannot explain why it did nothing.

## R8. Where the bar mounts (FR-010, FR-013)

**Decision**: `SoloSessionBar.svelte` mounts in `apps/web/src/routes/(app)/+layout.svelte` directly after `AppHeader` (and the demo banner), inside the same `!isPopup && !isMapFullscreen && !isZenPopout` condition. It is a normal flex row, so content below shrinks and nothing overlays. On `layoutUIStore.isMobile` it renders one compact button in the same row, which opens `SoloSessionSheet.svelte` with all actions. Minimised is a per-device preference through the same storage.

**Rationale**: This is the clarified placement (a strip below the header). It is hidden in the same states as the header, such as the full-screen map and pop-outs, where there is no header to sit under.

## R9. The Play page and navigation (FR-001 to FR-004)

**Decision**:

- A new route, `apps/web/src/routes/(app)/play/+page.svelte`.
- The `adventure` nav item keeps its id and label "Play", changes `href` to `/play`, adds `alsoActiveFor: ["/adventure"]` and updates its title.
- `/adventure` is unchanged.
- `/play` is added beside `/adventure` in `service-worker/routing.ts` (app shell, offline) and in `seo/crawler-access.ts` (non-indexed app route).

**Rationale**: It keeps one rail slot, keeps old links working (FR-004) and lights Play for both pages. The Play page is an app route, not a discovery page (Constitution XIII does not apply), but the two lists must name it the same way they name `/adventure`.

## R10. Cif (FR-030)

**Decision**: In `packages/help-engine`:

- a new feature entry, `registry/features/solo-session.ts`, with routes `/(app)/play` and areas `other`, `map`, `graph`;
- `/(app)/play` added to `HELP_ROUTE_TEMPLATES`;
- a `solo-session` flag in a new `SESSION_FLAGS` group inside `HELP_FLAGS`, with `MAX_FLAGS` raised by one;
- a new control area, `solo`, with the controls `solo-quick-roll`, `solo-end-session` and `play-start-solo-session`.

`solo-adventure.ts` is updated to say Adventure Mode is chosen from the Play page. The app's `help-context.svelte.ts` reports the flag. The help bundle regenerates and the Worker is redeployed, as in #3843.

**Rationale**: This is the pattern every recent feature used (`explorer-open`, `vtt-solo-fog`). Cif stays product help only: the entry describes product steps, and the guide states that in-game questions belong to the Oracle.

## R11. The end dialog (FR-026)

**Decision**: A small `SoloEndDialog.svelte` with three buttons, Cancel, End session and End session and journal, the last shown only while the session's journal is running. Without a journal, the existing `notificationStore.confirm` two-button dialog is used.

**Rationale**: `notificationStore.confirm` resolves to a boolean, but the spec needs three outcomes. A dedicated dialog is clearer than chaining two confirms.
