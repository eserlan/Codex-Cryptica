# Tasks: Campaign Sharing (Read-only)

**Input**: Design documents from `specs/021-share-campaigns/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel
- **[Story]**: Which user story this task belongs to

## Phase 1: Setup (Shared Infrastructure)

- [x] T001 Create `specs/021-share-campaigns/checklists/` directory for validation
- [x] T002 Ensure `VITE_GOOGLE_API_KEY` is added to `.env.example`
- [x] T003 [P] Define `CampaignMetadata` extensions in `packages/schema/src/campaign.ts` (if applicable, or `apps/web/src/lib/types/`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Define `IStorageAdapter` and `ICloudShareProvider` interfaces in `apps/web/src/lib/cloud-bridge/types.ts`
- [x] T005 Implement `MemoryAdapter` in `apps/web/src/lib/cloud-bridge/memory-adapter.ts` for Guest Mode
- [x] T005a [P] Implement unit tests for `MemoryAdapter` in `apps/web/src/lib/cloud-bridge/memory-adapter.test.ts`
- [x] T006 Implement `PublicGDriveAdapter` in `apps/web/src/lib/cloud-bridge/google-drive/public-adapter.ts` for fetching with API Key
- [x] T006a [P] Implement unit tests for `PublicGDriveAdapter` in `apps/web/src/lib/cloud-bridge/google-drive/public-adapter.test.ts`
- [x] T007 Modify `VaultStore` in `apps/web/src/lib/stores/vault.svelte.ts` to support conditional adapter initialization (Guest vs Owner)

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Owner Shares Campaign via Link (Priority: P1) 🎯 MVP

**Goal**: Owner can generate and revoke a public share link.

**Independent Test**: Generate a link and verify it exists in GDrive with correct permissions.

### Implementation for User Story 1

- [x] T008 [US1] Extend `GoogleDriveAdapter` in `apps/web/src/lib/cloud-bridge/google-drive/adapter.ts` to implement `shareFilePublicly` and `revokeShare`
- [x] T009 [US1] Add "Share" button and status UI to `apps/web/src/lib/components/VaultControls.svelte` or a new `ShareModal.svelte`
- [x] T010 [US1] Implement sharing logic in UI: call adapter, update metadata, show link to user
- [x] T010a [US1] Implement visual distinction (badge/icon) for shared campaigns in the dashboard
- [x] T011 [US1] Implement revoke logic in UI: call adapter, clear metadata

**Checkpoint**: Owner flow complete.

---

## Phase 4: User Story 2 - Recipient Views Shared Campaign (Priority: P1)

**Goal**: Guest can enter a name and view the campaign in read-only mode.

**Independent Test**: Navigate to `/?shareId=XYZ`, enter name, see graph.

### Implementation for User Story 2

- [x] T012 [US2] Implement `GuestLoginModal.svelte` in `apps/web/src/lib/components/modals/` to capture temporary username
- [x] T013 [US2] Implement "Guest Entry" logic in `apps/web/src/routes/+layout.svelte` or `+page.svelte`: detect `shareId` in URL, show modal, init Guest Mode
- [x] T013a [US2] Update Service Worker configuration to cache fetched Guest content for offline resilience
- [x] T014 [US2] Implement read-only UI enforcement: Disable all inputs and action buttons when `vault.isGuest` is true
- [x] T015 [US2] Update `EntityDetailPanel.svelte` and `MarkdownEditor.svelte` to respect the read-only flag

**Checkpoint**: Recipient flow complete.

---

## Phase 5: User Story 3 - Owner Revokes Access (Priority: P2)

**Goal**: Old links stop working.

**Independent Test**: Revoke a link and verify the Guest flow fails with an error message.

### Implementation for User Story 3

- [x] T016 [US3] Implement error handling in Guest entry flow for "File Not Found", "Access Denied", or "Malformed Token"
- [x] T017 [US3] Update UI to show revoked/expired link status clearly to the visitor

---

## Phase N: Polish & Cross-Cutting Concerns

- [x] T018 [P] Documentation updates in `README.md` and `GEMINI.md`
- [x] T019 Run `quickstart.md` validation
- [x] T020 **Offline Functionality Verification**: Ensure Guest Mode works offline IF the data was already fetched once (Memory cache check).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup. BLOCKS all user stories.
- **User Stories (Phase 3+)**:
  - **US1 (Owner)**: Depends on Foundation. Can run parallel to US2.
  - **US2 (Guest)**: Depends on Foundation. Can run parallel to US1.
  - **US3 (Revoke)**: Depends on US1 (need sharing logic first).

### Implementation Strategy

1. **MVP**: Complete Phase 1 + 2, then Phase 3 (Owner Share) and Phase 4 (Guest View).
2. **Refinement**: Add Phase 5 (Revoke error handling) and Polish.
