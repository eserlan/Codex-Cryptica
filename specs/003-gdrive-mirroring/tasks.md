---
description: "Task list template for feature implementation"
---

# Tasks: Google Drive Cloud Bridge

**Input**: Design documents from `/specs/003-gdrive-mirroring/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: The examples below include test tasks. Tests are OPTIONAL - only include them if explicitly requested in the feature specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `apps/web/src/`

<!--
  ============================================================================
  IMPORTANT: The tasks below are SAMPLE TASKS for illustration purposes only.

  The /speckit.tasks command MUST replace these with actual tasks based on:
  - User stories from spec.md (with their priorities P1, P2, P3...)
  - Feature requirements from plan.md
  - Entities from data-model.md
  - Endpoints from contracts/

  Tasks MUST be organized by user story so each story can be:
  - Implemented independently
  - Tested independently
  - Delivered as an MVP increment

  DO NOT keep these sample tasks in the generated tasks.md file.
  ============================================================================
-->

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create cloud-bridge library structure in apps/web/src/lib/cloud-bridge/
- [x] T002 Install dependencies (`idb`, `@types/gapi`, `@types/gapi.auth2`, `@types/gapi.client.drive`) in apps/web/package.json
- [x] T003 [P] Configure environment variables (`VITE_GOOGLE_CLIENT_ID` only, no API Key required) in apps/web/.env and create .env.example

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Implement ICloudAdapter and SyncState interfaces in apps/web/src/lib/cloud-bridge/index.ts
- [x] T005 [P] Create MockDriveAdapter for testing in apps/web/src/lib/cloud-bridge/google-drive/mock-adapter.ts
- [x] T006 Implement CloudConfig store with localStorage persistence in apps/web/src/stores/cloud-config.ts
- [x] T007 Implement SyncMetadata store using idb in apps/web/src/lib/cloud-bridge/sync-engine/metadata-store.ts
- [x] T008 [P] Create SyncStats store for UI observability in apps/web/src/stores/sync-stats.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Secure Cloud Link (Priority: P1) 🎯 MVP

**Goal**: Securely connect personal Google Drive to Codex Cryptica.

**Independent Test**: Initiate "Enable Cloud Bridge", complete Auth, verify "Connected" state.

### Tests for User Story 1 (OPTIONAL - only if tests requested) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T009 [P] [US1] Unit test for GoogleDriveAdapter auth flow (mocked) in apps/web/src/lib/cloud-bridge/google-drive/adapter.test.ts

### Implementation for User Story 1

- [x] T010 [US1] Implement GoogleDriveAdapter (connect/disconnect via GIS) in apps/web/src/lib/cloud-bridge/google-drive/adapter.ts
- [x] T011 [US1] Implement "Cloud Bridge" Settings UI component in apps/web/src/lib/components/settings/CloudBridgeSettings.svelte
- [x] T012 [US1] Integrate CloudConfig store with Settings UI to toggle connection in apps/web/src/lib/components/settings/CloudBridgeSettings.svelte
- [x] T013 [US1] Handle OAuth2 callback/implicit flow response in apps/web/src/routes/+layout.svelte (or appropriate handler)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Seamless Background Sync (Priority: P2)

**Goal**: Mirror local changes to Google Drive in the background.

**Independent Test**: Modify local lore, verify update in Google Drive.

### Tests for User Story 2 (OPTIONAL - only if tests requested) ⚠️

- [x] T014 [P] [US2] Unit test for SyncEngine diff logic in apps/web/src/lib/cloud-bridge/sync-engine/engine.test.ts

### Implementation for User Story 2

- [x] T015 [US2] Implement SyncEngine scanning logic (Local OPFS vs Remote GDrive) in apps/web/src/lib/cloud-bridge/sync-engine/engine.ts
- [x] T029 [US2] Implement SyncEngine diffing and application logic (Upload/Download) in apps/web/src/lib/cloud-bridge/sync-engine/engine.ts
- [x] T016 [P] [US2] Implement File System Adapter (OPFS wrapper) in apps/web/src/lib/cloud-bridge/sync-engine/fs-adapter.ts
- [x] T017 [US2] Update sync.worker.ts to host SyncEngine and handle messages in apps/web/src/workers/sync.ts
- [x] T018 [US2] Implement main thread bridge to communicate with worker in apps/web/src/lib/cloud-bridge/worker-bridge.ts
- [x] T019 [US2] Connect file modification events (from editor) to trigger sync in apps/web/src/lib/index.ts
- [x] T030 [US2] **Constitutional Requirement**: Ensure incoming files from GDrive trigger graph re-indexing in apps/web/src/workers/sync.ts

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Cross-Device Resumption (Priority: P3)

**Goal**: Pull latest changes from Google Drive on startup.

**Independent Test**: Update on Device A, open Device B, verify updates appear.

### Tests for User Story 3 (OPTIONAL - only if tests requested) ⚠️

- [x] T020 [P] [US3] Unit test for Conflict Resolution (Last-Write-Wins) in apps/web/src/lib/cloud-bridge/sync-engine/conflict.test.ts

### Implementation for User Story 3

- [x] T021 [P] [US3] Implement Conflict Resolution logic (Last-Write-Wins) in apps/web/src/lib/cloud-bridge/sync-engine/conflict.ts
- [x] T022 [US3] Implement Startup Sync routine in apps/web/src/lib/cloud-bridge/sync-engine/engine.ts
- [x] T023 [US3] Configure periodic sync interval (e.g. 5 mins) in apps/web/src/workers/sync.ts
- [x] T024 [US3] Add "Sync Now" button to Settings UI in apps/web/src/lib/components/settings/CloudBridgeSettings.svelte

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T025 [P] Add error handling for Network Offline states in apps/web/src/lib/cloud-bridge/sync-engine/engine.ts
- [x] T026 [P] Add optimistic UI updates (Syncing spinner) in apps/web/src/lib/components/settings/CloudBridgeSettings.svelte
- [x] T027 Run quickstart.md validation manually
- [x] T028 **Offline Functionality Verification** (Constitutional Requirement: Verify Service Worker caching and offline behavior)

---

## Phase 7: Performance & Reliability (Added Jan 2026)

**Purpose**: Hardening the sync engine for large vaults and verifying correctness.

- [x] T031 Implement Metadata-based change detection (fixes "Sync Loop") in apps/web/src/lib/cloud-bridge/sync-engine/engine.ts
- [x] T032 Implement Parallel File Transfers (concurrency=5) in apps/web/src/lib/cloud-bridge/sync-engine/engine.ts
- [x] T033 Implement Batched Metadata Updates in apps/web/src/lib/cloud-bridge/sync-engine/metadata-store.ts
- [x] T034 Implement "Reconnect" flow for expired tokens in apps/web/src/lib/components/settings/CloudStatus.svelte

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - May integrate with US1 but should be independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Extends US2 sync logic

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation
- Models before services
- Services before endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- All tests for a user story marked [P] can run in parallel
- Models within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 2

```bash
# Launch all tests for User Story 2 together (if tests requested):
Task: "Unit test for SyncEngine diff logic in apps/web/src/lib/cloud-bridge/sync-engine/engine.test.ts"

# Launch all models/adapters for User Story 2 together:
Task: "Implement File System Adapter (OPFS wrapper) in apps/web/src/lib/cloud-bridge/sync-engine/fs-adapter.ts"
Task: "Implement main thread bridge to communicate with worker in apps/web/src/lib/cloud-bridge/worker-bridge.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
3. Stories complete and integrate independently
