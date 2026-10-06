# Tasks: Solo Map Play

**Input**: Design documents from `specs/3841-solo-map-play/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/solo-exploration.md](./contracts/solo-exploration.md), [quickstart.md](./quickstart.md)

**Tests**: Required for every change in behaviour (Constitution II). Each test task comes before its implementation, and covers the success path and at least one negative path.

**Organisation**: By user story, so each story can be built, tested and shipped on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1–US4 from spec.md
- Paths are from the repository root. App paths are under `apps/web/src/lib/`, written in full below.

## Validation (every phase)

Impacted-only, per AGENTS.md:

- `bun run lint:changed`
- `bun run test:changed`
- `bunx svelte-check --tsconfig ./tsconfig.json --threshold error` in `apps/web`
- `bunx fallow audit --format json --quiet --explain --gate-marker agent`

Never run repository-wide suites.

---

## Phase 1: Setup

**Purpose**: None needed. The workspace packages, test runners and stores all exist, and there is no new dependency or discovery page (Constitution XIII does not apply).

- [ ] T001 Confirm the branch `feat/3841-solo-map-play` is rebased on `origin/staging`, and that `bunx vitest run src/hex.test.ts` passes in `packages/map-engine` as a baseline

---

## Phase 2: Foundational (blocking)

**Purpose**: Pin today's reveal-on-move behaviour before US2 moves it out of `MapView.svelte` (plan risk 2). US1 does not depend on this phase; US2 and US3 do.

- [ ] T002 Write characterisation tests for today's vision reveal in `apps/web/src/lib/components/map/token-vision-revealer.test.ts`. Cover: hex map reveals whole hexes around each vision source token; square or gridless map reveals a circle; nothing happens when there is no mask, no image or no active map; no undo is pushed (the existing #2414 behaviour)
- [ ] T003 Write tests for the shared undo helper in `apps/web/src/lib/components/map/mask-undo-recorder.test.ts`, from contract §2. `snapshot()` copies the live mask; `commit(label, before)` pushes one undo that restores `before` and one redo that restores the current mask; both save the mask; nothing is restored when the active map has changed; `snapshot()` returns `null` with no mask
- [ ] T004 Implement `MaskUndoRecorder` in `apps/web/src/lib/components/map/mask-undo-recorder.ts` by extracting the snapshot and `pushMaskUndo` logic from `apps/web/src/lib/components/map/map-fog-painter.ts`, with constructor-injected `getMaskCanvas`, `createCanvas`, `mapStore` (`activeMapId`, `saveMask`) and `oracle.pushUndoAction`
- [ ] T005 Switch `MapFogPainter.finish()` and `MapFogPainter.paintHex()` in `apps/web/src/lib/components/map/map-fog-painter.ts` to use `MaskUndoRecorder`; existing tests in `apps/web/src/lib/components/map/map-fog-painter.test.ts` must pass unchanged

**Checkpoint**: Undo behaviour shared and unchanged; reveal-on-move pinned by tests.

---

## Phase 3: User Story 1 – Explore my own map without seeing what lies ahead (P1) 🎯 MVP

**Goal**: With SOLO on, nothing inside a fogged area is visible, including while the fog is still loading (FR-001 to FR-007).

**Independent test**: Quickstart §1. Stock a fogged hex with a token marked Hide from Guests, a note and a labelled pin; with SOLO on nothing shows until the hex is revealed; every GM tool still works.

### Tests for User Story 1

- [ ] T006 [P] [US1] Change the expectation in `apps/web/src/lib/components/map/map-fog-painter.test.ts` (describe "revealed check"): with no mask, `isRevealedAt` returns **false** (FR-006); off the mask it still returns **true** (outside the image there is no fog); opaque mask is revealed, clear mask is fogged
- [ ] T007 [P] [US1] Add to `apps/web/src/lib/components/map/MapOverlays.test.ts`: a pin label stays hidden while the mask has not loaded and fog is opaque; it appears once the painter reports the spot revealed and `fogRevision` changes
      Also: after an undo restores the fog (the mask is saved again), the label hides again immediately (FR-005).
- [ ] T008 [P] [US1] Add a draw-order guard in `packages/map-engine/src/renderer.test.ts`: with fog shown, the fog layer is drawn after the map image, tiles, tokens (including note faces and collapsed note markers), token labels, pins and the grid with hex coordinate labels, so solid fog covers all of them (FR-002)
- [ ] T009 [P] [US1] Add to `apps/web/src/lib/stores/vtt/vtt-token-manager.test.ts`: a token marked Hide from Guests is visible to the GM (FR-007: shown once its area is revealed; fog alone conceals). `fogOpaque` with `soloFog` is already covered in `apps/web/src/lib/stores/map.svelte.test.ts`

### Implementation for User Story 1

- [ ] T010 [US1] Make `isRevealedAt` fail safe in `apps/web/src/lib/components/map/map-fog-painter.ts`: return `false` when there is no mask or no 2D context, keep `true` for points outside the mask; update its doc comment to say so (FR-006)
- [ ] T011 [US1] If T008 finds anything drawn after the fog other than the user's own measurement overlay, move it before the fog in `packages/map-engine/src/renderer.ts`; otherwise no change

**Checkpoint**: US1 shippable on its own. SOLO conceals everything, fails safe, and every GM tool works.

---

## Phase 4: User Story 2 – Explore a hex map by moving my party (P2)

**Goal**: Moving a vision source token reveals whole hexes within sight set in hexes, each move is one undo step, and travel shows in the map's units (FR-008 to FR-012).

**Independent test**: Quickstart §2. Three one-hex moves reveal the neighbours and show "Last: 1 hex (6 mi) · Total: 3 hexes (18 mi)"; undo hides the last move's reveal; a square grid behaves as before.

### Tests for User Story 2

- [ ] T012 [P] [US2] Write `packages/map-engine/src/hex-travel.test.ts` for contract §1.
  - `hexTravel` returns `{ from, to, hexes }` with `hexes = hexDistance(from, to)`, pointy and flat; 0 within one hex.
  - `visionRangeInHexes(visionRange, gridDistance)` returns `round(visionRange / gridDistance)`, `0` when `gridDistance <= 0`, never negative.
  - `newlyRevealedHexes(center, radius, isRevealed)` returns only fogged hexes in range, empty when all are revealed.
- [ ] T013 [P] [US2] Write `apps/web/src/lib/components/map/solo-exploration-recorder.test.ts` for contract §3, with injected fakes.
  - SOLO off: reveal exactly as today (no undo, no travel, no capture).
  - Not allowed to reveal (player view or guest): nothing.
  - SOLO on, hex map: one reveal per call; radius `visionRangeInHexes`; one "Map Exploration" undo only when a hex was newly revealed.
  - Travel `lastMove` and `total` update for each token whose hex changed; a first placement counts no travel; moving within a hex counts nothing.
  - Square or gridless map: straight-line distance in `gridUnit`, no hex count.
  - `reset()` clears totals.
  - **Drag (I1)**: many `onVisionChanged` calls during a drag reveal live but push no undo and count no travel; one `onMoveSettled` then pushes exactly one undo (restoring the snapshot taken at the first change), counts travel from the start hex to the end hex, not every hex crossed.
  - A position change made outside a drag settles immediately.
  - Tokens that are not vision sources count no travel (I2).
- [ ] T014 [P] [US2] Write `apps/web/src/lib/components/map/SoloTravelReadout.test.ts`. Shown only with SOLO on and a vision source token. Text "Last: 3 hexes (18 mi) · Total: 12 hexes (72 mi)", singular "1 hex". Reset clears it. A polite live region announces each move. Hidden when SOLO is off.
- [ ] T015 [P] [US2] Add to `apps/web/src/lib/components/map/MapVTTControlsHUD.test.ts`: on a hex grid the vision control reads "Vision: N hexes" and steps by one hex (`gridDistance`) over a range of 0–10 hexes, where 0 means the token's own hex only; on a square grid it is unchanged

### Implementation for User Story 2

- [ ] T016 [P] [US2] Implement `packages/map-engine/src/hex-travel.ts` (`hexTravel`, `visionRangeInHexes`, `newlyRevealedHexes`) using `pointToHex`, `hexDistance` and `getHexRange` from `packages/map-engine/src/hex.ts`, and export it from `packages/map-engine/src/index.ts`
- [ ] T017 [US2] Add an exact hex-radius path to `apps/web/src/lib/components/map/token-vision-revealer.ts`. Accept `radiusInHexes` for hex maps instead of deriving it from pixels; keep the pixel path for square and gridless maps. T002 must stay green.
- [ ] T018 [US2] Add an injected `onMoveSettled(tokenIds)` callback to `TokenDragHandler` in `apps/web/src/lib/components/map/interactions/token-drag-handler.ts`, called once from `end()` after the final snap when the token moved, and never when the drag did not move it. Test both in `apps/web/src/lib/components/map/interactions/token-drag-handler.test.ts` first. Wire it in `apps/web/src/lib/components/map/interactions/map-interaction-handler-factory.ts` through `MapInteractionHandlerOverrides`.
- [ ] T019 [US2] Implement `SoloExplorationRecorder` in `apps/web/src/lib/components/map/solo-exploration-recorder.svelte.ts` per contract §3.
  - Constructor-injected `revealer`, `undo: MaskUndoRecorder`, `isRevealedAt`, `publishCapture`, `getState`.
  - Reactive `lastMove` and `total`; `onVisionChanged(tokens)` (live reveal only), `onMoveSettled(tokens)` (one undo, travel, capture); `reset()`.
  - In-memory travel tally per data-model "Travel tally". `lastHexByToken`; `hexes = hexDistance(from, to)`; `distance = hexes * gridDistance` in `gridUnit`; cleared on map switch.
- [ ] T020 [US2] Wire the recorder in `apps/web/src/lib/components/map/MapView.svelte`. Replace the vision reveal `$effect` with a call to `recorder.onVisionChanged(visionSourceTokens)`, route the drag handler's `onMoveSettled` (T018) to `recorder.onMoveSettled`, and settle immediately for position changes outside a drag, keeping the existing fog sync broadcast when VTT is on. Pass `getState` from `mapStore` (`soloFog && showFog`, `isGMMode`, hex config, `visionRange`, `showHexCoordinates`, `activeMapId`), `mapSession` (`gridDistance`, `gridUnit`) and `sessionModeStore.isGuestMode`. Net lines in this file must go down (Constitution XIV).
- [ ] T021 [P] [US2] Create `apps/web/src/lib/components/map/SoloTravelReadout.svelte` with `data-help-target="vtt-travel-readout"`, a Reset button (`type="button"`), semantic tokens and a polite `aria-live` region
- [ ] T022 [US2] Mount `SoloTravelReadout` beside the vision controls in `apps/web/src/lib/components/map/MapVTTControlsHUD.svelte` and show the vision control in hexes on hex grids. If the template exceeds the complexity gate, extract the vision controls into `apps/web/src/lib/components/map/MapVisionControls.svelte`.
- [ ] T023 [US2] Update the "Playing solo" section of `apps/web/src/lib/content/help/vtt-fog-player-view.md` and the hex fog steps in `apps/web/src/lib/content/help/hexcrawl-maps.md`. Cover exploring by moving, vision in hexes, travel readout and Reset, and undo per move (Constitution VII).

**Checkpoint**: US1 and US2 both work alone; with SOLO off, multiplayer GM vision is unchanged (T002 green).

---

## Phase 5: User Story 3 – Keep a record of the expedition (P3)

**Goal**: While a journal runs, each move becomes one `map-move` entry, switchable per journal, promotable like any entry (FR-013 to FR-017).

**Independent test**: Quickstart §3. Three moves with a roll between them give three map entries in order; switching "Record map moves" off stops map entries but not the roll; nothing is recorded with no active journal.

### Tests for User Story 3

- [ ] T024 [P] [US3] Add to `packages/session-journal-engine/tests/capture.test.ts` for `formatMapMove`.
  - Builds `{ entryType: "map-move", content, sourceRef: { mapId, toHex, hexes, distance, unit, revealed } }`.
  - `content` like "Moved 3 hexes (18 mi) to 04.07, revealing 5 new hexes."; coordinates only when shown; "1 hex" singular; no reveal clause when `revealed` is 0.
  - The result passes `captureToEntryInput` within the existing 4 KB `sourceRef` bound.
  - `sourceRef` holds no names or text.
- [ ] T025 [P] [US3] Add engine tests for `captureMapMoves` in `packages/session-journal-engine/tests/engine.test.ts`: absent field reads as on; a setter turns it off and on; an ended journal is unchanged by the setter
- [ ] T026 [P] [US3] Add to `apps/web/src/lib/stores/session-journal-capture.test.ts`:
  - a `map-move` event is saved when the active journal has `captureMapMoves` absent or true, and skipped when false;
  - a `dice-roll` event is still saved when it is false (FR-015);
  - nothing is saved with no active journal (FR-017).
- [ ] T027 [P] [US3] Add to `apps/web/src/lib/components/map/solo-exploration-recorder.test.ts`: with SOLO on, one `publishCapture` per **completed** move (a drag across four hexes gives one capture, on settle) with the formatted payload; none when SOLO is off; none for a move inside the same hex
- [ ] T028 [P] [US3] Add a component test for the "Record map moves" switch in `apps/web/src/lib/components/quicknote/JournalHeader.test.ts` (create if absent). Shown only while a journal is active; reflects `captureMapMoves`; toggling calls the store.
- [ ] T029 [P] [US3] Add a promote test for a `map-move` entry in `packages/session-journal-engine/tests/promote.test.ts` and `apps/web/src/lib/stores/session-journal-promoter.test.ts`: it promotes to a vault entry (for example a Location note) like any other entry, and the promoted text carries no `sourceRef` internals (FR-016)

### Implementation for User Story 3

- [ ] T030 [US3] Add `captureMapMoves?: boolean` ("treated as `true` when absent", no migration) to `SessionJournal` in `packages/session-journal-engine/src/types.ts`, and a pure `setCaptureMapMoves(journal, on)` in `packages/session-journal-engine/src/engine.ts`, exported from `packages/session-journal-engine/src/index.ts`
- [ ] T031 [US3] Implement `formatMapMove(...)` in `packages/session-journal-engine/src/capture.ts` per data-model "Journal entry type `map-move`"
- [ ] T032 [US3] Skip `map-move` events when `journal.captureMapMoves === false` in `apps/web/src/lib/stores/session-journal-capture.ts`. Extend `JournalCaptureTarget.current` with the optional `captureMapMoves`. No other listener change.
- [ ] T033 [US3] Expose `setCaptureMapMoves` through `apps/web/src/lib/stores/session-journal.svelte.ts`, persisted with the journal in the existing `session_journals` store
- [ ] T034 [US3] Publish `map-move` captures from `SoloExplorationRecorder` in `apps/web/src/lib/components/map/solo-exploration-recorder.svelte.ts` via the injected `publishCapture`. Wire it in `apps/web/src/lib/components/map/MapView.svelte` to the app event bus `JOURNAL:CAPTURE` without `metadata.sync`.
- [ ] T035 [US3] Add the "Record map moves" switch to `apps/web/src/lib/components/quicknote/JournalHeader.svelte` (or the journal view's existing settings row), using semantic tokens and `type="button"` / `aria-pressed`
- [ ] T036 [US3] Document map entries and the switch in `apps/web/src/lib/content/help/quicknote.md` (Session Journal section) (Constitution VII)

**Checkpoint**: The journal records the route; dice, table and deck capture is unaffected.

---

## Phase 6: User Story 4 – Find solo play and get help with it (P3)

**Goal**: SOLO is self-explaining, a complete solo guide exists without AI, and Cif can answer and point (FR-018 to FR-020).

**Already met by #3838**: Cif knows whether SOLO and fog are on (`vtt-solo-fog`, `vtt-fog-on`) and can point at the SOLO switch (`vtt-solo-fog-toggle`, "Show me solo fog"), with regression tests in `packages/help-engine/tests/vtt-context.test.ts` and `packages/help-engine/tests/vtt-actions.test.ts`. This phase adds only what FR-019 and FR-020 still need.

**Independent test**: Quickstart §4. The SOLO tooltip shows on hover and focus; Cif answers "How do I play this map solo?" from the solo guide and offers to show SOLO; the guide is in Help with AI off.

### Tests for User Story 4

- [ ] T037 [P] [US4] Add to `apps/web/src/lib/components/map/MapVTTControlsHUD.test.ts`: the SOLO switch's explanation is reachable on keyboard focus (accessible description or tooltip) as well as hover (FR-018)
      Also: on a phone, with the map controls opened from the controls button, SOLO is present and usable (FR-018).
- [ ] T038 [P] [US4] Add to `packages/help-engine/tests/vtt-actions.test.ts`:
  - `vtt-travel-readout` is a known control on the map that requires `vtt-solo-fog`;
  - a "Show me the travel readout" registry action validates for the GM with SOLO on, and is rejected for a player and with SOLO off.
- [ ] T039 [P] [US4] Add to `apps/web/src/lib/services/help-assistant/vtt-help-actions.test.ts`: `vtt-travel-readout` is reachable for the GM only
- [ ] T040 [P] [US4] Add at least five solo-play evaluation questions to `packages/help-engine/tests/eval/phase-a-questions.ts` expecting `vtt-solo-play` (SC-006). Examples: "How do I play this map solo?", "How do I explore a hexcrawl on my own?", "Why can't I see anything on my map?", "How far has my party travelled?", "Can moves go into my session journal?"

### Implementation for User Story 4

- [ ] T041 [US4] Write the new Help article `apps/web/src/lib/content/help/vtt-solo-play.md` (title "Solo Map Play"). Cover:
  - What solo play is: one person, the GM.
  - Turning on FOG then SOLO.
  - What stays hidden and what appears on reveal.
  - Exploring by moving the party, vision in hexes, travel and Reset, undo per move.
  - Recording moves in the Session Journal and switching it off.
  - Limits: fog must be on; GM view only.
  - Link it from `apps/web/src/lib/content/help/vtt-session.md`, `apps/web/src/lib/content/help/vtt-fog-player-view.md` and `apps/web/src/lib/content/help/hexcrawl-maps.md`.
- [ ] T042 [US4] Register the guide.
  - Add `vtt-solo-play` to the `vtt-map` feature's `helpIds` in `packages/help-engine/src/registry/features/vtt-map.ts`.
  - Add `vtt-travel-readout` to `VTT_CONTROL_IDS` and `CONTROL_CATALOGUE` (`requiresFlag: "vtt-solo-fog"`) in `packages/help-engine/src/actions/catalogue.ts`.
  - Add a "Show me the travel readout" action (open `vtt-map-controls`, then highlight) and link it from the "reveal-the-map" workflow.
  - Update `packages/help-engine/tests/fixtures/help-article-ids.ts`, the article list in `packages/help-engine/tests/scenario-connections.test.ts`, and the `vtt-map` rows in `docs/help-assistant-coverage.md`.
- [ ] T043 [US4] Add `["vtt-travel-readout", "gm", "vtt"]` to the reachability table in `apps/web/src/lib/services/help-assistant/vtt-help-actions.ts`
- [ ] T044 [US4] Make the SOLO switch's explanation available on keyboard focus in `apps/web/src/lib/components/map/MapFogToggles.svelte` (for example `aria-describedby` with visually hidden text alongside the existing `title`)
- [ ] T045 [US4] Regenerate embeddings with `bun scripts/sync-help-embeddings.ts`, after refreshing the Wrangler token with `bunx wrangler whoami`. Confirm with a scratch evaluation that each T040 question retrieves `vtt-solo-play`, then delete the scratch file.

**Checkpoint**: All four stories done; Cif and Help cover solo play.

---

## Phase 7: Polish & cross-cutting

- [ ] T046 Run quickstart §1–§4 manually on the dev server, and note in the PR anything not exercised by a real browser
- [ ] T047 Run the five-person usability check for SC-005 after release: each person who plays solo opens a fogged map and is timed finding SOLO and explaining it. Record the result on #3841. SC-005 is a post-launch measure, so this does not block the PR.
- [ ] T048 Run the validation commands above. Run the `codex-review` skill and fix its findings.
- [ ] T049 Open a ready-for-review PR to `staging` that closes #3841. After merge: redeploy the Worker locally from `staging` (checkout and `TMPDIR` under `/home`, not `/tmp`), then promote with an explicit `staging_run_id`.

---

## Dependencies & execution order

- **Phase 1** → **Phase 2** → US2, US3.
- **US1** (Phase 3) depends only on Phase 1. It can ship first and on its own.
- **US2** (Phase 4) depends on Phase 2 (T002–T005).
- **US3** (Phase 5) depends on US2's recorder and move settling (T018, T019, T020), because moves are published on settle. T024–T026, T030–T033 and T035–T036 can start in parallel with US2.
- **US4** (Phase 6) depends on US2 for the travel readout target (T042–T043). The guide (T041) needs US2 and US3 behaviour settled. T037 and T044 can run any time after #3838.
- **Polish** last. T047 (usability check) runs after release and does not block the PR.

## Parallel examples

- **US1**: T006, T007, T008, T009 together; then T010, T011.
- **US2**: T012, T013, T014, T015 together; T016 and T021 in parallel; then T017 → T018 → T019 → T020 → T022.
- **US3**: T024, T025, T026, T027, T028, T029 together; T030 → T031 in the engine while T032–T033 proceed in the app; then T034, T035.
- **US4**: T037–T040 together; T041 and T042 in parallel; then T043, T044, T045.

## Implementation strategy

1. **MVP**: Phases 1 and 3 (US1). A small PR that makes SOLO fail safe and pins the draw order. Ship it.
2. **Exploration**: Phase 2 and US2 in a second PR, with today's reveal behaviour pinned first.
3. **Record**: US3 in a third PR.
4. **Help**: US4 last, or folded into each PR's help task, then one Worker redeploy.

## Notes

- `MapView.svelte` (572 lines) must get shorter, not longer. `map.svelte.ts` (945 lines) gains no behaviour.
- Never send solo-play state anywhere. Journal `sourceRef` holds hex numbers and distances only.
- Commit after each task or logical group, with a gitmoji commit message.
