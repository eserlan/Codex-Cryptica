# Tasks: Guest Character Chat for Invited World Participants

**Input**: Design documents from `/specs/128-guest-character-chat/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Basic verification of workspace build integrity

- [x] T001 Verify workspace packages can be built after branch creation

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core schema extensions and storage mechanisms required by all user stories

- [x] T002 Extend `EntitySchema` with `guestChatConfig` object in packages/schema/src/entity.ts
- [x] T003 Create `GuestChatConfig` and `GuestChatTranscript` types in packages/schema/src/entity.ts
- [x] T004 Add unit test cases for new schemas in packages/schema/src/schema.test.ts
- [x] T005 Add `GuestChatTranscriptSyncMessage` message type definition in apps/web/src/lib/cloud-bridge/p2p/p2p-protocol.ts
- [x] T006 Initialize guest browser IndexedDB table `guest_chat_transcripts` in apps/web/src/lib/utils/idb.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Host Configures Character Availability (Priority: P1) 🎯 MVP

**Goal**: Allow hosts to toggle guest chat availability and settings for character entities.

**Independent Test**: Host edits a Character entity, enables guest chat, chooses hybrid context scope, saves, and verifies they are stored in the markdown file's frontmatter.

### Implementation for User Story 1

- [x] T007 [P] [US1] Add `editGuestChatConfig` state and save binding to apps/web/src/lib/components/EntityDetailPanel.svelte
- [x] T008 [US1] Implement guest chat edit panel inside apps/web/src/lib/components/entity-detail/DetailStatusTab.svelte
- [x] T009 [US1] Add unit tests for character guest chat settings binding and saving in apps/web/src/lib/components/entity-detail/DetailStatusTab.test.ts

**Checkpoint**: User Story 1 is fully functional and testable independently.

---

## Phase 4: User Story 2 - Guest Interacts with Enabled Character (Priority: P1) 🎯 MVP

**Goal**: Allow invited guests to view available characters and engage in in-character chats.

**Independent Test**: Invited guest accesses shared vault, navigates to the Guest Chat dashboard, opens conversation with an enabled character, sends a prompt, and receives an in-character response.

### Implementation for User Story 2

- [x] T010 [P] [US2] Implement `GuestChatExecutor` class in packages/oracle-engine/src/executors/guest-chat-executor.ts
- [x] T011 [US2] Add guest chat routing to dispatcher in packages/oracle-engine/src/oracle-executor.ts
- [x] T012 [P] [US2] Add unit tests for guest chat execution prompts and constraint enforcement in packages/oracle-engine/src/executors/guest-chat-executor.test.ts
- [x] T013 [P] [US2] Create reactive `GuestChatStore` using DI in apps/web/src/lib/stores/guest-chat.svelte.ts
- [x] T014 [US2] Implement `GuestChatPanel.svelte` and `GuestChatBubble.svelte` components in apps/web/src/lib/components/guest/
- [x] T015 [US2] Integrate `GuestChatPanel` into the guest layout shell inside apps/web/src/routes/(app)/+page.svelte

**Checkpoint**: User Stories 1 and 2 are fully functional together.

---

## Phase 5: User Story 3 - Host Reviews Transcripts and Promotes Content (Priority: P2)

**Goal**: Allow hosts to review synced guest transcripts and promote emergent details to rumors.

**Independent Test**: Host opens transcripts tab for character, views guest conversation logs, and clicks "Promote to Rumor" to pre-fill draft entity form.

### Implementation for User Story 3

- [x] T016 [P] [US3] Implement `GUEST_CHAT_TRANSCRIPT_SYNC` message handler in apps/web/src/lib/cloud-bridge/p2p/handlers/vault-handler.ts (originally planned in guest-presence-handler.ts)
- [x] T017 [US3] Add transcript save/write routines in apps/web/src/lib/stores/vault.svelte.ts
- [x] T018 [US3] Implement host-side transcripts view UI in apps/web/src/lib/components/entity-detail/DetailStatusTab.svelte
- [x] T019 [US3] Implement "Promote to Rumor" flow pre-filling drafts in apps/web/src/lib/stores/proposer.svelte.ts

**Checkpoint**: All user stories are independently functional and integrated.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final styling, help documentation, linting, and verification.

- [x] T020 [P] Add user-facing help guides to apps/web/src/lib/config/help-content.ts
- [x] T021 Run `bun run test` to verify all new unit tests pass
- [x] T022 Run `bun run lint` to verify code compliance

---

## Phase 7: Post-MVP Refinements (FR-012 – FR-018)

**Purpose**: Features added after the initial MVP ship to improve quality, trust fidelity, and security.

- [x] T023 [US1] Replace custom personality textarea in CCES with a `## Personality & Voice` status indicator and Generate button in `apps/web/src/lib/components/entity-detail/DetailStatusTab.svelte` (FR-017)
- [x] T024 [P] [US1] Auto-sync `## Personality & Voice` lore section to `guestChatConfig.extraInstructions` on every host save in `apps/web/src/lib/components/EntityDetailPanel.svelte` (FR-017)
- [x] T025 [P] [US2] Add `## Knowledge & Expertise` section to all 10 character templates (generic + all theme variants) in `apps/web/src/lib/services/EntityTemplateConstants.ts` (FR-016)
- [x] T026 [P] [US2] Add `## Knowledge & Expertise` requirement to AI entity creation prompts in `apps/web/src/lib/services/ai/prompts/entity-creation.ts` (FR-016)
- [x] T027 [P] [US2] Add `loreTemplate` support to entity revision prompt so revisions preserve all template sections in `apps/web/src/lib/services/ai/prompts/entity-revision.ts` (FR-016)
- [x] T028 [US2] Implement automatic trust resolution (`resolveTrust`) in `packages/oracle-engine/src/executors/guest-chat-executor.ts` — trusted/neutral/untrusted based on vault relationship data (FR-014)
- [x] T029 [US2] Infer guest character identity from login username in `GuestChatStore` and `HostCharChatHandler` — matches against character title, aliases, and labels (player name tags) in that order (FR-013)
- [x] T030 [US2] Route character chat through host via new P2P message types `GUEST_CHAR_CHAT_REQUEST` / `GUEST_CHAR_CHAT_CHUNK` / `GUEST_CHAR_CHAT_DONE` (FR-012)
  - New handler: `apps/web/src/lib/cloud-bridge/p2p/handlers/host-char-chat-handler.ts`
  - New handler: `apps/web/src/lib/cloud-bridge/p2p/handlers/guest-char-chat-response-handler.ts`
  - Registered in `host-service.svelte.ts` and `guest-session-context.ts`
  - Streaming callback wrapped with `Comlink.proxy` when oracle worker is active (guards `DataCloneError`)
- [x] T031 [US2] Add unit tests for `HostCharChatHandler` including Comlink.proxy regression guard in `apps/web/src/lib/cloud-bridge/p2p/handlers/host-char-chat-handler.test.ts`
- [x] T032 [P] [US1] Grant guests edit permissions (including Lore tab) for their own character entity and any entity tagged with their username in `apps/web/src/lib/components/EntityDetailPanel.svelte`, `DetailFooter.svelte`, and `DetailTabs.svelte` (FR-015)
- [x] T033 [US2] Add `OUTPUT FORMAT — STRICT` dialogue-only constraint to the executor system prompt — placed before role-play content to ensure model compliance (FR-018)
- [x] T034 [US2] Improve trusted-connection basisText to explicitly override formal/guarded personality with warmth and familiarity (FR-014)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories.
- **User Stories (Phases 3, 4, 5)**: All depend on Foundational completion.
- **Polish (Phase 6)**: Depends on all user stories being complete.

---

## Implementation Strategy

### MVP First (User Story 1 & 2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL)
3. Complete Phase 3: User Story 1 (Host configuration UI)
4. Complete Phase 4: User Story 2 (Guest chat UI and executor)
5. **STOP and VALIDATE**: Run unit and integration tests for in-character chat.
