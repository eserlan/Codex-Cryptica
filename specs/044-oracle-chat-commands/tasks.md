# Tasks: Oracle Chat Commands

**Input**: Design documents from `/specs/044-oracle-chat-commands/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: We follow TDD as per the project Constitution. Unit tests in `packages/` and Vitest/Playwright in `apps/web`.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create `apps/web/src/lib/config/chat-commands.ts` with the `ChatCommand` registry interface
- [x] T001a Install `@floating-ui/dom` in `apps/web` for slash menu positioning
- [x] T002 Register default commands (`/draw`, `/create`, `/connect`) in `apps/web/src/lib/config/chat-commands.ts`
- [x] T003 [P] Add unit tests for command registration in `apps/web/tests/unit/chat-commands.test.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure in `packages/proposer` and `OracleStore`

- [x] T004 Implement `parseConnectionIntent` in `packages/proposer/src/service.ts` (Parses "/connect A to B")
- [x] T005 Implement `generateConnectionProposal` in `packages/proposer/src/service.ts` (AI semantic analysis)
- [x] T006 [P] Add unit tests for AI connection methods in `packages/proposer/tests/connection.test.ts`
- [x] T007 Extend `OracleStore` in `apps/web/src/lib/stores/oracle.svelte.ts` to support interactive wizard messages
- [x] T008 [P] Implement `Autocomplete.svelte` in `apps/web/src/lib/components/ui/Autocomplete.svelte` using the existing Search Engine

**Checkpoint**: Foundation ready - UI components can now be built on top of these services and stores.

---

## Phase 3: User Story 1 - Slash Command Menu (Priority: P1) 🎯 MVP

**Goal**: Show a discoverable menu of commands when the user types "/"

**Independent Test**: Focus chat, type "/", verify menu appears with commands. Use arrow keys to navigate and Enter to select.

### Tests for User Story 1

- [x] T009 [P] [US1] Create Playwright E2E test for slash menu discovery in `apps/web/tests/e2e/oracle-slash-menu.test.ts`

### Implementation for User Story 1

- [x] T010 [P] [US1] Implement `CommandMenu.svelte` in `apps/web/src/lib/components/oracle/CommandMenu.svelte`
- [x] T011 [US1] Integrate `CommandMenu` into `apps/web/src/lib/components/oracle/OracleChat.svelte` (monitors textarea input)
- [x] T012 [US1] Implement command filtering logic in `CommandMenu.svelte` based on user typing
- [x] T013 [US1] Implement keyboard navigation (Up/Down/Enter) for command selection in `CommandMenu.svelte`
- [x] T014 [US1] Implement command insertion logic: selecting a command fills the chat input and focuses it

**Checkpoint**: User Story 1 is functional. Users can discover and pick commands via the slash menu.

---

## Phase 4: User Story 2 - Connection Wizard & Direct Parsing (Priority: P1)

**Goal**: Link entities via a guided wizard or a direct natural language command.

**Independent Test**: Type `/connect oracle` to start wizard, OR type `/connect A is the leader of B` to create a link directly.

### Tests for User Story 2

- [x] T015 [P] [US2] Create unit tests for connection parsing in `apps/web/tests/unit/connection-parsing.test.ts`
- [x] T016 [P] [US2] Create Playwright E2E test for connection wizard in `apps/web/tests/e2e/connection-wizard.test.ts`

### Implementation for User Story 2

- [x] T017 [US2] Implement `ConnectionWizard.svelte` in `apps/web/src/lib/components/oracle/ConnectionWizard.svelte`
- [x] T018 [US2] Implement wizard state transitions in `OracleStore` (`SELECT_SOURCE` -> `SELECT_TARGET` -> `PROPOSING` -> `REVIEW`)
- [x] T019 [US2] Integrate `Autocomplete.svelte` into `ConnectionWizard.svelte` for source/target selection
- [x] T020 [US2] Implement direct parsing of `/connect` arguments in `OracleStore.ask()` using `AIService.parseConnectionIntent` (bridging to `ProposerService`)
- [x] T021 [US2] Implement "Proposing" step: call `AIService.generateConnectionProposal` (bridging to `ProposerService`) to analyze both entities (Lore + Chronicle)
- [x] T022 [US2] Finalize connection: call `vault.createConnection` with the identified/proposed parameters
- [x] T022a [US2] Implement FR-008 validation in `ConnectionWizard.svelte` (prevent Source ID === Target ID)

**Checkpoint**: Users can now create connections via the wizard or direct natural language commands.

---

## Phase 5: User Story 3 - Customization & Polish (Priority: P2)

**Goal**: Allow overriding AI suggestions and ensure full keyboard accessibility.

**Independent Test**: In the Review step of the wizard, edit the connection type and verify the saved link reflects the change. Verify Tab navigation through the entire wizard.

### Implementation for User Story 3

- [x] T023 [US3] Add editable input fields for "Type" and "Label" in `ConnectionWizard.svelte` (Review step)
- [x] T024 [US3] Implement full keyboard Tab-index management for the wizard components
- [x] T025 [US3] Add "Dismiss/Cancel" functionality to close the wizard without creating a connection
- [x] T026 [US3] Create `apps/web/src/lib/content/help/chat-commands.md` with documentation for the slash menu and oracle commands

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T027 [P] Performance optimization: Ensure slash menu and autocomplete meet the < 200ms latency goals
- [x] T028 [P] Security: Sanitize all AI-generated strings before rendering or saving to vault
- [x] T029 [P] Run all E2E tests with `--reporter=list` to verify final build integrity
- [x] T030 [P] Conductor - User Manual Verification 'Oracle Chat Commands' (Protocol in workflow.md)
