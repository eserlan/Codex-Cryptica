# Tasks: Hex Journey mode (#4148)

**Input**: [plan.md](./plan.md)
**Scope**: Release 2 implementation on the merged Hex Crawl foundation.
**Tests**: Write failing tests before each behaviour change, with a success path and a meaningful negative, failure or cancellation path. Documentation tasks need no application tests.

## Phase 1: Foundation

**Goal**: Establish the reusable route model and move completion contract before UI integration.

- [x] T001 Define immutable route, estimate, progress and result types in `packages/hex-crawl-engine/src/journey.ts`; document the origin-at-index-zero contract, 1,000-step cap, optional finite positive decimal hours per hex and explicit invalid-input results.
- [x] T002 Add failing route/estimate tests in `packages/hex-crawl-engine/tests/journey.test.ts`: endpoint-inclusive line, adjacent steps, negative coordinates, same-hex zero moves, counts/distance/time, decimal hours, invalid scale/coordinates, unsafe arithmetic/overflow and the exact length boundary.
- [x] T003 Implement the tested helpers in `packages/hex-crawl-engine/src/journey.ts` using existing `getHexLine` and `hexDistance`, checking route length before allocation, and export them from `packages/hex-crawl-engine/src/index.ts`.
- [x] T004 [P] Add regression tests with nonzero token sizes in `apps/web/src/lib/stores/hex-crawl/hex-crawl-move-observer.test.ts`, `apps/web/src/lib/components/map/solo-exploration-recorder.test.ts` and `apps/web/src/lib/components/map/token-vision-revealer.test.ts`; verify exploration, travel and fog reveal use token centres, preserve manual-move behaviour and ignore non-party tokens.
- [x] T005 Use existing `getTokenCenter` consistently in `apps/web/src/lib/stores/hex-crawl/hex-crawl-move-observer.ts`, `apps/web/src/lib/components/map/solo-exploration-recorder.svelte.ts` and `apps/web/src/lib/components/map/token-vision-revealer.ts`; align affected fixtures with real token geometry.
- [x] T006 Add failing completion-ownership tests in `apps/web/src/lib/components/map/map-move-coordinator.test.ts`: serial completion, reactive and explicit callbacks for one move, later return to the same position and release after failure. Stale map side effects are guarded in the movement adapter (T028).
- [x] T007 Implement injected `MapMoveCoordinator` in `apps/web/src/lib/components/map/map-move-coordinator.ts`, separating fog/vision updates from completion and giving managed journey moves exclusive completion ownership for their token.

**Checkpoint**: Bounded route maths is tested, token geometry is consistent, and duplicate callbacks cannot repeat a managed move's completion.

## Phase 2: US1 — Preview a journey

**Independent acceptance**: Preview from the party or a chosen hex, see the route/distance/time and dismiss it without moving, generating, saving or exploring anything.

- [x] T008 [US1] Add preview/store tests in `apps/web/src/lib/stores/hex-crawl/hex-journey.svelte.test.ts`: one eligible token, explicit choice among multiple tokens, selected origin without a token, same-hex preview, invalid routes, estimates and zero mutation side effects.
- [x] T009 [US1] Implement constructor-injected `HexJourneyStore` preview/origin/token/estimate state in `apps/web/src/lib/stores/hex-crawl/hex-journey.svelte.ts`, binding route identity to the map/vault/grid and deriving display progress from the engine helpers.
- [x] T010 [P] [US1] Add overlay tests in `apps/web/src/lib/components/map/hex-crawl/HexJourneyOverlay.test.ts`: pointy/flat geometry, pan/zoom projection, off-screen culling, completed/remaining sections and GM/guest visibility.
- [x] T011 [US1] Implement `apps/web/src/lib/components/map/hex-crawl/HexJourneyOverlay.svelte` with projected hex centres, bounded rendering, pointer-events disabled and distinct origin/current/destination markers.
- [x] T012 [P] [US1] Add preview-control tests in `apps/web/src/lib/components/map/hex-crawl/HexJourneyControls.test.ts`: token choice, optional valid/invalid hours per hex, zero-step Start disabled, dismissing a preview, keyboard labels and denied access.
- [x] T013 [US1] Implement the preview controls in `apps/web/src/lib/components/map/hex-crawl/HexJourneyControls.svelte`; keep numeric estimates in state and formatting in the UI, with a polite status region and semantic theme tokens.
- [x] T014 [US1] Add panel action tests in `apps/web/src/lib/components/map/hex-crawl/HexCrawlPanel.test.ts`, then wire callback-based **Set as journey start** and **Travel here** actions through `HexCrawlPanel.svelte`, `HexCrawlLayer.svelte` and `hex-crawl-services.svelte.ts`; keep journey controls alive when the panel closes.
- [x] T015 [US1] Update `apps/web/src/lib/content/help/hex-crawl-mode.md` with origin/destination selection, party token requirements, preview, distance and the optional hours-per-hex estimate.

**Checkpoint**: A useful route preview is available without any persistent writes or AI requests.

## Phase 3: US2 — Advance one hex at a time

**Independent acceptance**: A solo GM and a VTT host can advance the chosen token through a multi-step route, one click per hex, with one movement capture per step and one exploration capture only for each newly explored arrival.

- [x] T016 [US2] Add failing step-state tests in `apps/web/src/lib/stores/hex-crawl/hex-journey.svelte.test.ts`: Start does not move, token must occupy the origin, one Next commits one index, rapid clicks do not queue, revisits still count as moves, and arrival prevents further stepping.
- [x] T017 [US2] Add adapter tests in `apps/web/src/lib/components/map/hex-crawl/hex-journey-movement.test.ts`: centre-to-top-left conversion, actual snapped position/size, map-edge mismatch, locked/missing/non-party tokens, host permission refusal and no automatic generation.
- [x] T018 [US2] Add explicit-journey capture tests in `apps/web/src/lib/components/map/solo-exploration-recorder.test.ts`: before/after snapshots, fog on/off, one movement capture and solo tally/undo integration. Journal enablement and active-journal filtering remain in the existing journal capture pipeline.
- [x] T019 [US2] Add `completeJourneyMove` in `apps/web/src/lib/components/map/solo-exploration-recorder.svelte.ts`, reusing existing travel/reveal/undo/capture logic while accepting explicit before/after snapshots for journeys; preserve the regular completion defaults. If the module crosses 500 lines, extract its measurement helper with its tests.
- [x] T020 [US2] Implement injected `HexJourneyMovement` in `apps/web/src/lib/components/map/hex-crawl/hex-journey-movement.ts`: acquire coordinator ownership before movement, check permission, call existing token movement, verify the returned centre, commit movement once, persist arrival through `HexCrawlStore.setExplored`, then open the current arrival panel and offer Explore once.
- [x] T021 [US2] Implement `start` and guarded `step` in `apps/web/src/lib/stores/hex-crawl/hex-journey.svelte.ts`, advancing the committed index only after the actual token reaches the next hex and using the movement adapter for all side effects.
- [x] T022 [US2] Wire the shared coordinator and movement adapter into `apps/web/src/lib/components/map/MapView.svelte`; delegate existing completion chains and prevent the reactive effect from separately settling a managed journey move. Add composition regression assertions in `apps/web/src/lib/components/map/map-move-coordinator.test.ts`.
- [x] T023 [US2] Extend `apps/web/src/lib/components/map/hex-crawl/HexJourneyControls.test.ts` and `HexJourneyControls.svelte` with Next, busy state, current/remaining distance and time, arrival, and the same host/GM access checks as action entry.
- [x] T024 [US2] Add arrival/discovery invitation integration tests in `apps/web/src/lib/components/map/hex-crawl/HexCrawlLayer.test.ts`, then update `HexCrawlLayer.svelte` so the arrival panel and one explicit Explore invitation work in both solo and host VTT without duplicate offers.
- [x] T025 [US2] Extend `apps/web/src/lib/content/help/hex-crawl-mode.md` and `apps/web/src/lib/content/help/vtt-solo-play.md` with one-step movement, fog, journal capture, arrival panels and the requirement to choose Explore explicitly.

**Checkpoint**: The complete normal journey works through existing movement, fog, exploration and capture APIs.

## Phase 4: US3 — Stop, recover and leave safely

**Independent acceptance**: Stop after any step without losing completed exploration; recover a failed arrival save without moving twice; navigation, permission loss and stale discovery cannot affect another map or hex.

- [x] T026 [US3] Add lifecycle/retry tests in `apps/web/src/lib/stores/hex-crawl/hex-journey.svelte.test.ts` and `apps/web/src/lib/components/map/hex-crawl/hex-journey-movement.test.ts`: Stop before/during a step, failed arrival persistence, retry-only save, external token movement, lock/removal, map/vault/grid/measurement changes, disabled Hex Crawl, Player View and disposal during an awaited operation.
- [x] T027 [US3] Implement pending-arrival save state, `retryArrival`, `stop`, `dispose` and operation-generation guards in `apps/web/src/lib/stores/hex-crawl/hex-journey.svelte.ts`; preserve the committed index after successful movement, prevent the next move until recovery and suppress stale UI updates.
- [x] T028 [US3] Complete the failure paths in `apps/web/src/lib/components/map/hex-crawl/hex-journey-movement.ts`: use snapshotted original map/hex identities, re-check permission before later side effects, release ownership in `finally`, and make arrival retry repeat neither movement nor its capture.
- [x] T029 [US3] Add regression tests in `apps/web/src/lib/components/map/hex-crawl/HexCrawlPanel.test.ts`: switching hex aborts generation, and pending notes flush to the original hex without overwriting another hex's notes. Late-result abortion is additionally enforced by `HexDiscoveryController` signal checks.
- [x] T030 [US3] Make hex transitions safe in `apps/web/src/lib/components/map/hex-crawl/HexCrawlPanel.svelte` and `HexCrawlLayer.svelte`, reusing existing cancellation and note-flush helpers with stable map/hex identities; preserve pending drafts and clean up on destruction.
- [x] T031 [US3] Add Stop/retry/status assertions in `apps/web/src/lib/components/map/hex-crawl/HexJourneyControls.test.ts`, then finish the corresponding controls and invalidation wiring in `HexJourneyControls.svelte` and `HexCrawlLayer.svelte`; geometry and map measurement invalidate travel, while viewport/label changes only redraw it.
- [x] T032 [US3] Update `apps/web/src/lib/content/help/hex-crawl-mode.md` with stopping, partial progress, arrival-save retry, external token movement, GM visibility, and route clearing on reload/navigation.

**Checkpoint**: Completed progress survives cancellation and errors, while abandoned routes produce no future steps or stale view updates.

## Phase 5: Acceptance and handoff

- [x] T033 Add a Playwright route-preview scenario in `apps/web/tests/hex-journey.spec.ts`: chosen origin, destination, no token, disabled Start action and no automatic discovery request.
- [x] T038 Extend `apps/web/tests/hex-journey.spec.ts` with full movement acceptance using a vision-source token: multi-step solo travel with AI disabled, partial Stop, retained exploration after reload, no restored route, host VTT stepping and a Player View negative path.
- [x] T034 Add journey privacy/composition assertions in `apps/web/src/lib/components/map/hex-crawl/HexCrawlLayer.test.ts` and the affected VTT snapshot tests under `apps/web/src/lib/stores/vtt/`: no route UI for guests/players and no journey state in snapshots.
- [x] T035 Validate keyboard/focus and responsive behaviour in `HexJourneyControls.svelte` and `HexCrawlPanel.svelte`; visually inspect the pointy overlay in all three themes at low/high zoom, and verify pointy/flat projection, pan/zoom and culling in overlay component tests. Record results in `docs/plans/4148-hex-journey-mode/tasks.md`.
- [x] T036 Run focused engine/web/Playwright tests for the paths above, changed-file lint/tests, affected-workspace type checks, changed-module coverage, Fallow audit and `codex-review`; record commands/results in `docs/plans/4148-hex-journey-mode/tasks.md` and keep `plan.md` aligned with implemented decisions.
- [x] T037 Run the pre-commit/pre-push Fallow gate, commit the reviewed implementation, and open ready-for-review PR [#4173](https://github.com/eserlan/Codex-Cryptica/pull/4173) to `staging` with `Closes #4148`; include the validation from `docs/plans/4148-hex-journey-mode/tasks.md`.

### Implementation validation so far

- Passed: focused web tests for journey store, movement adapter, coordinator, recorder, hex observer, fog reveal, crawl panel/layer and VTT snapshot; `bun run test:changed`; focused `hex-crawl-engine` route tests with 100% statement/function coverage for `src/journey.ts`.
- Passed: Playwright route-preview scenario in `apps/web/tests/hex-journey.spec.ts` on a fresh port; `bun run lint:changed`; ESLint on new untracked modules; web `svelte-check` with 0 errors (85 warnings across 31 files).
- Passed after adding narrowly scoped complexity suppressions with rationale to cohesive state-machine boundaries and templates: `bunx fallow audit --format json --quiet --explain --gate-marker agent`. The three remaining complexity findings in `MapView.svelte` are pre-existing; `overflow-y-auto` is an existing Tailwind utility advisory.
- Passed focused journey-store/control/overlay/movement/coordinator coverage run (5 files, 34 tests; 83.9% statements, 79.25% branches, 90.38% functions, 87.07% lines across the three state/movement modules), engine journey coverage (6 tests; 100% statements/functions), changed-file tests (95 tests across 12 files including the engine package), changed-file lint/format, scoped Svelte check (0 errors, 84 warnings across 30 files), `git diff --check`, and the complete Playwright spec (4 tests).
- Passed: full Playwright journey acceptance (preview/no discovery, solo one-step travel with Stop and explored-state reload retention, no route restoration, host VTT stepping and Player View hiding); keyboard dismissal and the 390px control bounds check also pass. Screenshot review covered Fantasy Dark, Modern Light, and Cyberpunk at low/high zoom on pointy grids; flat-grid projection, pan/zoom, and culling are covered by overlay component tests. The toolbar overlap was corrected and rechecked across all three themes.
- Passed specialist review. The review caught and fixed mutable-token before-pose capture in `MapMoveCoordinator`; the added regression test verifies the original position is preserved when the map store mutates its token object in place.
- Complete: pre-commit and pre-push Fallow gates passed; commit `21a1f9e9c` was pushed and ready-for-review PR #4173 is open against `staging`.
- Follow-up after merge: reassess epic #1957.

## Dependencies and execution order

- T001 → T002 → T003 establishes the domain contract. T004–T005 align real token coordinates; T006–T007 establish completion ownership. All are prerequisites for step integration.
- US1 depends on the route helpers. Its overlay and controls work can proceed independently once the state contract in T009 is settled.
- US2 depends on US1, centre-based geometry and the coordinator. Write T016–T018 first; recorder and adapter implementation then precede store/composition wiring.
- US3 builds on a working step. The panel cancellation/note tests and fixes (T029–T030) can proceed independently of the store/adapter retry work after US2's contracts settle.
- Acceptance and handoff depend on all three stories. A preview-only checkpoint is useful for review; the release needs all three stories.

Parallel markers identify independent files after their stated prerequisites. They do not require additional agents.

## Completion criteria

All 38 tasks are complete; success and failure paths pass; no new persistence schema, storage key or dependency exists; the ordinary manual movement tests still pass; journey controls are documented and accessible; and the PR meets the repository quality gate. No repository-wide validation commands are run locally.
