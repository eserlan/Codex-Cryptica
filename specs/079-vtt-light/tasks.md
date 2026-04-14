# Tasks: Lightweight VTT Functionality

**Input**: Design documents from `/specs/079-vtt-light/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/p2p-protocol.md, quickstart.md

**Implementation note**: The VTT feature set is implemented in the current codebase. This checklist is retained as the original delivery plan; all items below are completed, and several entries landed in the existing web app architecture rather than the exact file layout shown here.

**Tests**: Unit tests for stores, services, and types. E2E test for shared session flow.

**Organization**: Tasks grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Web app: `apps/web/src/`, tests in `apps/web/tests/`
- Shared map engine: `packages/map-engine/src/`
- Schema types: `packages/schema/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization — minimal, most infrastructure already exists

- [x] T001 [P] Define VTT types (Token, EncounterSession, P2P messages) in `apps/web/src/types/vtt.ts`
- [x] T002 [P] Add VTT help content entries in `apps/web/src/lib/config/help-content.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Create MapSession store in `apps/web/src/lib/stores/map-session.svelte.ts` with $state for tokens, initiative, turn, round, selection, mode
- [x] T004 Add token rendering function `renderTokens()` in `packages/map-engine/src/renderer.ts` following existing `drawPins()` pattern
- [x] T005 [P] Write unit tests for MapSession store (CRUD, initiative, mode transitions) in `apps/web/tests/unit/stores/map-session.test.ts`
- [x] T006 [P] Write unit tests for renderTokens (coordinate transforms, frustum culling) in `apps/web/tests/unit/renderer/render-tokens.test.ts`
- [x] T006a [P] Make VTT mode reachable from the map page without starting a share session in `apps/web/src/routes/(app)/map/+page.svelte`
- [x] T007 Extend P2P message handlers in `apps/web/src/lib/cloud-bridge/p2p/host-service.svelte.ts` to accept and broadcast VTT message types
- [x] T008 Extend P2P message handlers in `apps/web/src/lib/cloud-bridge/p2p/guest-service.ts` to receive and apply VTT state updates
- [x] T009 Add typed P2P message union in `apps/web/src/lib/cloud-bridge/p2p/p2p-protocol.ts` for compile-time safety
- [x] T010 [P] Write unit tests for P2P VTT message round-trip in `apps/web/tests/unit/services/vtt-session.test.ts`
- [x] T011 [P] Ensure session state is ephemeral by default (no auto-persist to vault on session end)

**Checkpoint**: Foundation ready — session store, rendering pipeline, and P2P sync infrastructure in place

---

## Phase 3: User Story 1 — Place and Move Tokens on a Map (Priority: P1) 🎯 MVP

**Goal**: GM enters VTT mode, places tokens, drags them with grid snapping. Token display with entity linking and freeform labels.

**Independent Test**: Open a map, enter VTT mode, add 3 tokens, drag them around, verify grid snapping, verify token labels render. Works entirely in single-player mode.

### Tests for User Story 1

- [x] T012 [P] [US1] Unit test for token placement logic in `apps/web/tests/unit/stores/map-session.test.ts` (extend existing)
- [x] T013 [P] [US1] Unit test for grid snapping math in `apps/web/tests/unit/lib/vtt-helpers.test.ts`
- [x] T014 [US1] Integration test: token drag + render cycle in `apps/web/tests/e2e/vtt-token-drag.spec.ts`

### Implementation for User Story 1

- [x] T015 [US1] Add token add/remove methods to MapSession store in `apps/web/src/lib/stores/map-session.svelte.ts`
- [x] T016 [US1] Implement grid snapping helper in `apps/web/src/lib/utils/vtt-helpers.ts` (snap to `mapStore.gridSize`)
- [x] T017 [US1] Create VTTControls.svelte with an always-visible VTT mode toggle in `apps/web/src/lib/components/map/VTTControls.svelte`
- [x] T018 [US1] Wire VTT mode toggle to MapView.svelte draw() loop to enable token overlay rendering
- [x] T019 [US1] Add token placement UI (click to place + dialog for name/entity link) in `apps/web/src/lib/components/map/TokenAddDialog.svelte`
- [x] T020 [US1] Implement pointer-based token drag in MapView.svelte (pointer down/move/up with coordinate transform)
- [x] T021 [US1] Add grid snapping to token drag using vtt-helpers.ts (snap only when `mapStore.showGrid` is true; free placement otherwise)
- [x] T022 [US1] Render token labels as canvas text in `renderTokens()` for freeform tokens
- [x] T023 [US1] Render token images from linked entities in `renderTokens()` using entity image blob URLs
- [x] T024 [US1] Clamp token positions to map bounds to prevent off-map placement
- [x] T025 [US1] Handle deleted vault entity gracefully (token displays cached name as freeform)
- [x] T026 [US1] Persist session tokens within the tab via sessionStorage (survives page refresh; distinct from vault persistence per FR-017)

**Checkpoint**: GM can place tokens, drag them with grid snapping, see labels and images. Fully functional single-player VTT.

---

## Phase 4: User Story 2 — Select Tokens and View Details (Priority: P2)

**Goal**: Click to select a token, view details in a side panel. Deselect by clicking empty space.

**Independent Test**: Place 3 tokens, click one to select, verify highlight and detail panel, click empty space to deselect.

### Tests for User Story 2

- [x] T027 [P] [US2] Unit test for selection state management in `apps/web/tests/unit/stores/map-session.test.ts` (extend existing)
- [x] T028 [US2] Unit test for token hit-testing math in `apps/web/tests/unit/lib/vtt-helpers.test.ts` (extend existing)

### Implementation for User Story 2

- [x] T029 [US2] Add token hit-testing in MapView.svelte pointer handler (detect click on token bounds)
- [x] T030 [US2] Wire token click to MapSession store selection state
- [x] T031 [US2] Create TokenDetail.svelte side panel in `apps/web/src/lib/components/vtt/TokenDetail.svelte` with ownership assignment and selected-token removal actions
- [x] T032 [US2] Render token selection highlight (glow/border) in `renderTokens()` canvas function
- [x] T033 [US2] Implement deselect on empty-space click in MapView.svelte

**Checkpoint**: Token selection and detail view work independently. Can select, view details, and deselect.

---

## Phase 5: User Story 3 — Manage Turn Order and Initiative (Priority: P2)

**Goal**: Turn order panel with add tokens, edit initiative values, advance turns, highlight active token, round counter, drag-reorder.

**Independent Test**: Add 5 tokens to initiative, set values, advance through all turns, verify active token highlights, verify round counter increments on cycle.

### Tests for User Story 3

- [x] T034 [P] [US3] Unit test for initiative cycling logic in `apps/web/tests/unit/stores/map-session.test.ts` (extend existing)
- [x] T035 [US3] Unit test for turn advancement and round counting in `apps/web/tests/unit/stores/map-session.test.ts` (extend existing) — verify round starts at 1, increments on full cycle, never decrements

### Implementation for User Story 3

- [x] T036 [US3] Add initiative management methods to MapSession store (addToken, removeToken, reorder, advanceTurn)
- [x] T037 [US3] Create InitiativePanel.svelte in `apps/web/src/lib/components/vtt/InitiativePanel.svelte` as the docked initiative sidebar, with optional pop-out window support
- [x] T038 [US3] Add drag-reorder capability to initiative list entries in InitiativePanel.svelte
- [x] T039 [US3] Render active token highlight in `renderTokens()` when session is in combat mode
- [x] T040 [US3] Add round counter display in InitiativePanel.svelte
- [x] T041 [US3] Implement mode toggle (exploration ↔ combat) in MapSession store and VTTControls.svelte — mode values are `"exploration"` (free movement) and `"combat"` (turn-locked movement)
- [x] T042 [US3] Lock token movement to active token when in combat mode (non-active tokens cannot be moved)

**Checkpoint**: Full turn order system works. Can manage initiative, advance turns, see active token highlight, track rounds.

---

## Phase 6: User Story 4 — Measure Distance on the Map (Priority: P3)

**Goal**: Activate measurement tool, click two points, display distance in map units. Line overlay visible, disappears on tool deactivate.

**Independent Test**: Activate measurement tool, click start and end points, verify distance matches expected map scale. Deactivate tool, verify line disappears.

### Tests for User Story 4

- [x] T043 [P] [US4] Unit test for distance calculation math in `apps/web/tests/unit/lib/vtt-helpers.test.ts` (extend existing)

### Implementation for User Story 4

- [x] T044 [US4] Add measurement tool state to MapSession store (startPoint, endPoint, active)
- [x] T045 [US4] Create MeasurementTool.svelte overlay in `apps/web/src/lib/components/map/MeasurementTool.svelte`
- [x] T046 [US4] Implement measurement click handler in MapView.svelte (pointer events on measurement tool active)
- [x] T047 [US4] Draw measurement line and distance label on canvas in `renderTokens()` or dedicated `renderMeasurement()` function
- [x] T048 [US4] Display distance using map scale if defined, otherwise pixel distance
- [x] T049 [US4] Add measurement tool toggle to VTTControls.svelte

**Checkpoint**: Distance measurement works independently. Can measure between any two points and see accurate results.

---

## Phase 7: User Story 5 — Shared Session: Guests See Token Positions (Priority: P3)

**Goal**: GM hosts shared session, guests see token positions/turns/fog in near real-time. Guests cannot move unowned tokens.

**Independent Test**: Host from browser tab A, join from tab B, move token in tab A, verify it appears in tab B within 1 second. Attempt to move token in tab B without ownership — verify it is rejected.

### Tests for User Story 5

- [x] T050 [P] [US5] Unit test for host token move broadcast in `apps/web/tests/unit/services/vtt-session.test.ts` (extend existing)
- [x] T051 [P] [US5] Unit test for guest permission rejection in `apps/web/tests/unit/services/vtt-session.test.ts` (extend existing)
- [x] T052 [US5] E2E test: host joins, guest joins, host moves token, guest sees update within 1 second in `apps/web/tests/e2e/vtt-session.spec.ts`

### Implementation for User Story 5

- [x] T053 [US5] Implement SESSION_SNAPSHOT broadcast on guest join in host-service.svelte.ts
- [x] T054 [US5] Implement TOKEN_MOVE handler in host-service.svelte.ts (validate ownership for movement only, update, broadcast TOKEN_STATE_UPDATE)
- [x] T055 [US5] Implement TOKEN_MOVE sender in guest-service.ts (send to host, handle timeout revert)
- [x] T056 [US5] Implement TOKEN_ADD_REQUEST handler in host-service.svelte.ts (host assigns id, ownerPeerId, broadcasts TOKEN_ADDED)
- [x] T057 [US5] Implement TURN_ADVANCE broadcast from MapSession store through host-service when host advances turn
- [x] T058 [US5] Add token ownership assignment and removal UI in TokenDetail.svelte (GM assigns move permission to connected guests and can delete selected tokens without affecting visibility)
- [x] T059 [US5] Implement guest permission enforcement in MapView.svelte drag handler (check ownerPeerId before allowing drag; do not use ownership as a visibility filter)
- [x] T060 [US5] Implement session fog reveal sync (host paints fog using existing MapFogPainter brush → broadcasts FOG_REVEAL stroke deltas → guests apply to in-memory session mask)
- [x] T061 [US5] Implement MAP_PING broadcast for guest/host cursor pings
- [x] T062 [US5] Handle host disconnection (detect peer disconnect, broadcast SESSION_ENDED to guests so they see a disconnected UI state, then clear session state immediately)

**Checkpoint**: Multiplayer VTT works. Host and guests share token positions, turn order, and fog state in real-time.

---

## Phase 8: Encounter Snapshot Persistence (FR-018, FR-019)

**Goal**: Save current session state to vault as encounter snapshot. Load previously saved snapshot to restore session.

**Independent Test**: Place 5 tokens, set initiative, save encounter. Clear session. Load encounter. Verify all tokens, positions, and initiative restored.

- [x] T063 [P] Write unit tests for encounter save/load serialization in `apps/web/tests/unit/stores/map-session.test.ts` (extend existing)
- [x] T064 Create encounter snapshot save/load methods in MapSession store (serialize to OPFS JSON)
- [x] T065 Create EncounterManager.svelte in `apps/web/src/lib/components/vtt/EncounterManager.svelte` (save/load UI)
- [x] T066 Implement OPFS storage for encounter snapshots at `maps/{mapId}_encounter_{encounterId}.json`
- [x] T067 Add encounter list display in EncounterManager.svelte (load previously saved encounters)
- [x] T068 Add encounter snapshot deletion from EncounterManager.svelte and OPFS storage
- [x] T069 Implement session fog mask serialization (compress PNG blob → store in encounter JSON)

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T070 [P] Update user documentation with VTT feature help entries in `apps/web/src/lib/config/help-content.ts`
- [x] T071 [P] Add FeatureHint for first-time VTT mode entry
- [x] T072 Run full test suite and verify coverage meets 70% goal for new VTT code
- [x] T073 Performance: verify 60fps token rendering with 20 tokens, optimize if needed
- [x] T074 [P] E2E test: full combat round flow (place tokens → initiative → advance turns → end) in `apps/web/tests/e2e/vtt-combat-round.spec.ts`
- [x] T075 Performance: verify encounter snapshot loads within 3 seconds (SC-006)
- [x] T076 Verify VTT mode toggle does not alter saved map state — pins, fog, grid unchanged after toggle on/off (SC-007)
- [x] T077 Quickstart.md validation: follow the quickstart guide and verify all steps work
- [x] T078 Code cleanup: remove any TODO comments, unused imports, debug logs

---

## Phase 10: VTT Chat, Dice, and Sidebar UX

**Purpose**: Delivered chat and command-flow improvements that keep VTT coordination in the sidebar layout.

- [x] T079 [P] Add a dedicated left-side VTT chat sidebar in `apps/web/src/lib/components/vtt/VTTChatSidebar.svelte`
- [x] T080 [P] Move VTT help text above the token controls and keep sidebar hints wrapped in `apps/web/src/lib/components/map/VTTControls.svelte` and `apps/web/src/lib/components/help/FeatureHint.svelte`
- [x] T081 Wire VTT chat `/roll` autocomplete to the Oracle-style command menu flow in `apps/web/src/lib/components/vtt/VTTChat.svelte`
- [x] T082 Extract shared dice-roll rendering into `apps/web/src/lib/components/dice/DiceRollResult.svelte` and reuse it in Oracle and VTT chat message rendering
- [x] T083 Add the dice modal entry button to the VTT chat input row in `apps/web/src/lib/components/vtt/VTTChat.svelte`
- [x] T084 Broadcast resolved dice rolls from the shared modal into VTT chat and the P2P transcript path in `apps/web/src/lib/components/dice/DiceModal.svelte` and `apps/web/src/lib/stores/map-session.svelte.ts`
- [x] T085 Guard map zoom shortcuts while typing in VTT chat by ignoring editable targets in `apps/web/src/lib/components/map/MapView.svelte` and `apps/web/src/lib/components/map/map-view-helpers.ts`
- [x] T086 Convert primary VTT controls to icon buttons in `apps/web/src/lib/components/map/VTTControls.svelte`
- [x] T087 Keep the shared modal provider mounted in VTT fullscreen so the dice modal can open from the chat sidebar in `apps/web/src/routes/(app)/+layout.svelte`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — **BLOCKS all user stories**
- **User Stories (Phases 3–7)**: All depend on Foundational phase completion
  - US1 (P1) → No dependencies on other stories
  - US2 (P2) → Depends on token rendering from US1 but independently testable
  - US3 (P2) → Depends on token existence from US1 but independently testable
  - US4 (P3) → No dependencies on other stories (measurement is standalone)
  - US5 (P3) → Depends on US1 (token movement) + US3 (turn order) broadcast
- **Encounter Persistence (Phase 8)**: Depends on US1 (tokens exist) and Foundational (session store)
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

```
Phase 1 (Setup) → Phase 2 (Foundational) → Phase 3 (US1: Token P1)
                                                    ↓
                                        Phase 4 (US2: Selection P2)
                                        Phase 5 (US3: Initiative P2)
                                                    ↓
                                        Phase 6 (US4: Measurement P3)
                                        Phase 7 (US5: Shared Session P3)
                                                    ↓
                                        Phase 8 (Encounter Persistence)
                                                    ↓
                                        Phase 9 (Polish)
```

### Within Each User Story

- Tests MUST be written and fail before implementation
- Store methods before UI components
- Core rendering before interaction handling
- Story complete before moving to next priority

### Parallel Opportunities

- T001 + T002 (Setup) can run in parallel
- T005 + T006 (Foundational tests) can run in parallel
- T011 + T012 (US1 tests) can run in parallel
- T026 + T027 (US2 tests) can run in parallel
- T033 + T034 (US3 tests) can run in parallel
- T042 (US4 test) + T043 (US4 implementation) can be sequential within US4
- T048 + T049 (US5 tests) can run in parallel
- T061 + T062 (Encounter save/test) can run in parallel
- T067 + T068 (Polish docs) can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch both test files in parallel:
npx vitest run apps/web/tests/unit/stores/map-session.test.ts --testNamePattern "token placement"
npx vitest run apps/web/tests/unit/lib/vtt-helpers.test.ts --testNamePattern "grid snapping"

# Launch store + rendering in parallel:
# Task T014: Add token add/remove methods to MapSession store
# Task T015: Implement grid snapping helper
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: Foundational (T003–T010)
3. Complete Phase 3: User Story 1 (T011–T025)
4. **STOP AND VALIDATE**: Test token placement and drag independently
5. Deploy/demo the single-player token map

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add US1 (Token Placement) → Test independently → Demo (MVP: tactical map with tokens)
3. Add US2 (Selection) → Test independently → Demo (select and view token details)
4. Add US3 (Initiative) → Test independently → Demo (combat rounds)
5. Add US4 (Measurement) → Test independently → Demo (distance tool)
6. Add US5 (Shared Session) → Test independently → Demo (multiplayer VTT)
7. Add Encounter Persistence → Test independently → Demo (save/load encounters)
8. Polish → Full test suite, docs, performance

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US1 (Token Placement) + US2 (Selection)
   - Developer B: US4 (Measurement) + US3 (Initiative)
   - Developer C: US5 (Shared Session) + Phase 8 (Persistence)
3. Stories complete and integrate independently
4. Phase 9 (Polish) done together

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Constitution requirement: 70%+ coverage for new VTT code (Phase 9 task T069 enforces this)
- Constitution requirement: constructor DI for all stores and services
- Constitution requirement: Svelte 5 `$derived` for computed state (not `$state(prop)`)
- Constitution requirement: Tailwind 4 CSS syntax
