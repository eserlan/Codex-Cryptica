# Tasks: Free Oracle Use (Advanced Tier)

**Input**: Design documents from `/specs/075-free-oracle-use/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md

**Tests**: Unit tests for detection logic and E2E for UI status switching are included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and core configuration

- [X] T001 [P] Configure environment detection constants in `apps/web/src/lib/config/index.ts` (Hostname + Pathname)
- [X] T002 [P] Create unit tests for `IS_STAGING` config logic in `apps/web/src/lib/config/index.test.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure required for both user stories

- [X] T003 Update `EntityDb` to include `appSettings` table in `apps/web/src/lib/utils/entity-db.ts`
- [X] T004 Migrate `OracleSettingsService` to use Dexie for persistence and remove legacy `idb` dependency in `packages/oracle-engine/src/oracle-settings.svelte.ts`
- [X] T005 Create unit test for `OracleSettingsService` Dexie persistence in `packages/oracle-engine/src/oracle-settings.test.ts`
- [X] T006 Update `bootSystem` to initialize `OracleSettingsService` with Dexie in `apps/web/src/lib/app/init/app-init.ts`
- [X] T006a [P] [US1] Implement Cloudflare Worker at `apps/workers/oracle-proxy/src/index.ts` to forward requests to Google API
- [X] T006b [P] [US1] Configure CORS restrictions in Cloudflare Worker for authorized domains only
- [X] T006c [P] [US1] Add unit tests for Cloudflare Worker request forwarding in `apps/workers/oracle-proxy/src/index.test.ts`
- [X] T006d [P] Define `ConnectionMode` type in `packages/oracle-engine/src/types.ts` as `"system-proxy" | "custom-key"`
- [X] T006e [P] Create deployment configuration (`wrangler.toml`) and scripts for Cloudflare Worker
- [X] T006f [P] Set up GitHub Actions workflow for automated worker deployment

**Checkpoint**: Foundation ready - Oracle state correctly tracks connection modes using Dexie storage.

---

## Phase 3: User Story 1 - Frictionless Advanced Oracle Access (Priority: P1) 🎯 MVP

**Goal**: Enable Advanced Tier Oracle access via system proxy when no API key is provided.

**Independent Test**: Remove API key, open Oracle, and send a message. Verify it uses the proxy and responds with advanced capabilities.

### Tests for User Story 1

- [ ] T007 [P] [US1] Create E2E test for proxy-path visibility and status in `apps/web/tests/oracle-status.spec.ts`
- [ ] T008 [P] [US1] Unit test for dual-path switching in `apps/web/src/lib/services/ai/text-generation.service.test.ts`
- [X] T008a [P] [US1] Security test: verify API key is never exposed in client-side network traffic in `apps/web/tests/security/api-key-leak.spec.ts`

### Implementation for User Story 1

- [X] T009 [P] [US1] Create `OracleStatus.svelte` component showing "System Proxy" in `apps/web/src/lib/components/oracle/OracleStatus.svelte`
- [X] T010 [US1] Integrate `OracleStatus` into the Oracle sidebar in `apps/web/src/lib/components/oracle/OracleSidebarPanel.svelte`
- [X] T011 [US1] Implement proxy-path logic in `DefaultTextGenerationService` in `apps/web/src/lib/services/ai/text-generation.service.ts`
- [X] T012 [US1] Implement proxy-path logic in `DefaultImageGenerationService` in `apps/web/src/lib/services/ai/image-generation.service.ts`

**Checkpoint**: User Story 1 complete - Users have free advanced access via proxy.

---

## Phase 4: User Story 2 - Power User "Custom API Key" (Priority: P1)

**Goal**: Allow users to use their own Gemini API key for direct access.

**Independent Test**: Enter API key in settings, verify status changes to "Custom API Key", and check network for direct Google API calls.

### Tests for User Story 2

- [X] T013 [P] [US2] Update E2E test to verify real-time switching to Custom API Key in `apps/web/tests/oracle-status.spec.ts`

### Implementation for User Story 2

- [X] T014 [US2] Update `AISettings.svelte` to remove lite-mode specific toggles and simplify tier selection in `apps/web/src/lib/components/settings/AISettings.svelte`
- [X] T015 [US2] Implement direct-path logic (Custom API Key) when API key is present in `apps/web/src/lib/services/ai/client-manager.ts`
- [X] T016 [US2] Ensure `OracleStatus` reflects "Direct Connection: Custom Key" badge when key is present in `apps/web/src/lib/components/oracle/OracleStatus.svelte`

**Checkpoint**: User Story 2 complete - Users can successfully "Bring Your Own Key".

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup and final validation

- [ ] T017 [P] Remove all unused "Lite Mode" UI elements and logic across the app
- [ ] T018 Final code cleanup and Tailwind 4 syntax verification
- [ ] T019 [P] Run all project tests to ensure no regressions: `npm test`
- [ ] T020 Verify 0ms CLS impact for `OracleStatus` component
- [X] T021 [P] Update `apps/web/src/lib/config/help-content.ts` with Oracle access mode documentation
- [X] T022 [P] Add `FeatureHint` component for first-time Oracle users in `apps/web/src/lib/components/oracle/OracleSidebarPanel.svelte`
- [X] T023 [P] Verify proxy call overhead is <200ms in `apps/web/tests/performance/oracle-proxy.spec.ts`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Can start immediately.
- **Foundational (Phase 2)**: Depends on T001. BLOCKS all user stories.
- **User Stories (Phase 3+)**: All depend on Phase 2.
- **Polish (Final Phase)**: Depends on all user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Foundation for general AI access.
- **User Story 2 (P1)**: Enhances the established AI access with custom keys.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 & 2.
2. Complete Phase 3 (System Proxy).
3. **STOP and VALIDATE**: Verify free access works without a key.

### Incremental Delivery

1. Foundation ready.
2. US1 adds the Proxy access (MVP).
3. US2 adds the Custom API Key access.
4. Polish removes legacy "Lite" logic.
