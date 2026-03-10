# Tasks: Die Rolling Support (066-die-rolling)

**Input**: Design documents from `/specs/066-die-rolling/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: This feature follows TDD per the implementation plan. Unit tests for `dice-engine` and E2E tests for `apps/web` are included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- [x] T001 Create `packages/dice-engine` directory structure and `package.json`
- [x] T002 [P] Configure `tsconfig.json` and `vitest.config.ts` for `packages/dice-engine`
- [x] T003 Initialize `packages/dice-engine/src/index.ts` with basic exports
- [x] T004 [P] Define shared types and interfaces in `packages/dice-engine/src/types.ts`
- [x] T005 Implement fair randomization utility using `crypto.getRandomValues` in `packages/dice-engine/src/roller.ts`
- [x] T006 [P] Create session-based history store in `apps/web/src/lib/stores/dice-history.svelte.ts`
- [x] T007 Initialize IndexedDB store for `dice_history` in `apps/web/src/lib/utils/idb.ts`
- [x] T008 [P] [US1] Unit tests for basic AdX parsing in `packages/dice-engine/tests/parser.test.ts`
- [x] T009 [P] [US1] Unit tests for basic rolling in `packages/dice-engine/tests/roller.test.ts`
- [x] T010 [US1] E2E test for `/roll` command in `apps/web/tests/dice-roll.spec.ts`
- [x] T011 [US1] Implement basic regex-based parser in `packages/dice-engine/src/parser.ts`
- [x] T012 [US1] Implement standard roll logic in `packages/dice-engine/src/roller.ts`
- [x] T013 [US1] Add `/roll` command detection in `apps/web/src/lib/stores/oracle.svelte.ts`
- [x] T014 [US1] Implement roll result rendering in Oracle chat via `apps/web/src/lib/components/OracleChat.svelte` (or equivalent message component)
- [x] T015 [P] [US2] Unit tests for modifiers and advanced logic in `packages/dice-engine/tests/parser.test.ts`
- [x] T016 [P] [US2] Unit tests for logic execution (`kh[N]/kl[N]/!`) and statistical fairness check in `packages/dice-engine/tests/roller.test.ts`
- [x] T017 [US2] Update parser to support numeric `kh[N]/kl[N]`, `!`, and `+/-` in `packages/dice-engine/src/parser.ts`
- [x] T018 [US2] Implement `kh`, `kl`, and `exploding` logic in `packages/dice-engine/src/roller.ts`
- [x] T019 [US2] Ensure individual die results and "dropped" dice are captured in `RollResult`
- [x] T020 [US3] E2E test for Modal UI and Log isolation (verifying modal rolls do not appear in Oracle chat messages) in `apps/web/tests/dice-modal.spec.ts`
- [x] T021 [P] [US3] Create `apps/web/src/lib/components/dice/RollLog.svelte` for rendering results
- [x] T022 [US3] Create `apps/web/src/lib/components/dice/DiceModal.svelte` with quick-roll buttons
- [x] T023 [US3] Add Dice Modal trigger to the sidebar/UI in `apps/web/src/routes/+layout.svelte`
- [x] T024 [US3] Integrate `dice-history.svelte.ts` to manage separate logs for Chat vs Modal
- [x] T025 [P] Add die rolling documentation to `apps/web/src/lib/config/help-content.ts`
- [x] T026 [P] Update `GEMINI.md` (or project root docs) with the new package information
- [x] T027 Final code cleanup and `dice-engine` export verification in `packages/dice-engine/src/index.ts`
- [x] T028 Run all tests across `packages/dice-engine` and `apps/web`
- [x] T029 Validate `quickstart.md` examples manually
