# Tasks: Published Guest Vault Snapshots via Cloudflare R2

**Input**: Design documents from `/specs/135-guest-vault-r2/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and R2/manifest structure setup

- [x] T001 Configure Cloudflare R2 bucket binding in `apps/workers/oracle-proxy/wrangler.toml` for local development and deployment.
- [x] T002 Initialize type definitions for `PublishRegistry` and `GuestHistory` inside `packages/schema/src/types/publishing.ts`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core serverless routes and client storage setups that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Implement Cloudflare Worker R2 endpoints: multiplex GET/POST/DELETE for published snapshots in `apps/workers/oracle-proxy/src/index.ts` and `apps/workers/oracle-proxy/src/publish.ts`.
- [x] T004 Write unit tests for R2 Worker endpoints using Miniflare/Mock-Fetch under `apps/workers/oracle-proxy/src/__tests__/publish.test.ts`.
- [x] T005 Configure IndexedDB storage for `PublishRegistry` in host stores under `apps/web/src/lib/stores/vault/registry.ts`.
- [x] T006 Configure `localStorage` storage utilities for `GuestHistory` inside `apps/web/src/lib/services/publishing/guest-history.ts`.

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Publish Guest Snapshot (Priority: P1) 🎯 MVP

**Goal**: Host can compile, preview, and upload a sanitized snapshot of a campaign to Cloudflare R2 via background sync.

**Independent Test**: GM clicks "Publish Guest Snapshot" from campaign settings, views the preview counts modal, confirms, and receives a copied public URL while the upload finishes in the background.

### Tests for User Story 1

- [ ] T007 [P] [US1] Write unit tests for client-side exporter logic `GuestExporter.test.ts` verifying GM secrets are physically deleted and dangling links are redacted with `[Redacted]` in `packages/vault-engine/src/services/GuestExporter.test.ts`.
- [ ] T008 [P] [US1] Write unit tests for client-side publishing service `PublishingService.test.ts` under `apps/web/src/lib/services/publishing/PublishingService.test.ts`.

### Implementation for User Story 1

- [ ] T009 [US1] Implement client-side exporter logic `GuestExporter.ts` under `packages/vault-engine/src/services/GuestExporter.ts`.
- [ ] T010 [US1] Implement host-side publishing service `PublishingService.svelte.ts` under `apps/web/src/lib/services/publishing/PublishingService.svelte.ts` supporting background uploads.
- [ ] T011 [US1] Create Publish Preview modal component `PublishPreviewModal.svelte` and integrate the publishing trigger in campaign settings (`apps/web/src/lib/components/settings/PublishingSettings.svelte`).

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently.

---

## Phase 4: User Story 2 - Browse Published Guest Vault (Priority: P1) 🎯 MVP

**Goal**: Guest can open a public URL, fetch the R2 bundle, and explore the campaign lore in a read-only shell.

**Independent Test**: Opening `http://localhost:5173/guest/[publishId]` loads the campaign lore with search and navigation active and all edit capabilities disabled.

### Tests for User Story 2

- [ ] T012 [P] [US2] Write unit tests for guest vault store `guest-vault.test.ts` verifying read-only behavior and data mapping in `apps/web/src/lib/stores/guest-vault.test.ts`.

### Implementation for User Story 2

- [ ] T013 [US2] Implement `guest-vault.svelte.ts` store in `apps/web/src/lib/stores/guest-vault.svelte.ts` to manage in-memory snapshot state.
- [ ] T014 [US2] Create SvelteKit route `apps/web/src/routes/(app)/guest/[publishId]/+page.svelte` and route preloader `+page.ts` to fetch snapshot bundle and render it using the main Codex shell with `isGuestMode = true`.
- [ ] T015 [US2] Update navigation and sidebar components to disable edit buttons, settings panels, and AI actions when `isGuestMode` is active.

**Checkpoint**: At this point, User Stories 1 and 2 should both work independently.

---

## Phase 5: User Story 3 - Unpublish Guest Snapshot (Priority: P2)

**Goal**: Host can delete the published snapshot and all associated assets from Cloudflare R2.

**Independent Test**: GM clicks "Unpublish" in Settings, confirms the warning modal, and verifying the guest URL now returns a 404 error page.

### Tests for User Story 3

- [ ] T016 [P] [US3] Write unit tests for unpublish deletion request logic in `apps/web/src/lib/services/publishing/PublishingService.test.ts`.

### Implementation for User Story 3

- [ ] T017 [US3] Implement the "Unpublish" action in `PublishingService.svelte.ts` which calls the Worker's DELETE endpoint with the `writeToken`.
- [ ] T018 [US3] Add warning confirmation modal dialog (`UnpublishConfirmModal.svelte`) for GMs before executing the unpublish action.

**Checkpoint**: Host can successfully retract any published world.

---

## Phase 6: User Story 4 - Manage Published Snapshots Dashboard (Priority: P2)

**Goal**: Host can see and manage all their published campaigns in a single dashboard screen.

**Independent Test**: Host opens Settings -> Published Worlds and sees all active links, publish times, and sizes with quick delete actions.

### Implementation for User Story 4

- [ ] T019 [US4] Create the "Published Snapshots" dashboard view in global settings page `apps/web/src/lib/components/settings/PublishingDashboard.svelte`.
- [ ] T020 [US4] Integrate the dashboard list to read from local IndexedDB `PublishRegistry` and display status, URL copying, and quick update/unpublish actions.

**Checkpoint**: GMs can monitor all shared lore links centrally.

---

## Phase 7: User Story 5 - Guest Vault History (Priority: P2)

**Goal**: Remember guest vaults visited by a player, displaying recent worlds list with self-healing 404 cleanup.

**Independent Test**: Player visits a guest link, closes the browser, reopens `http://localhost:5173/guest` and clicks their campaign in "Recent Shared Worlds" to load it.

### Tests for User Story 5

- [x] T021 [P] [US5] Write unit tests for guest history and self-healing localstorage logic in `apps/web/src/lib/services/publishing/guest-history.test.ts`.

### Implementation for User Story 5

- [ ] T022 [US5] Implement visited vault history recording in `localStorage` inside the guest page loading logic.
- [ ] T023 [US5] Render the "Recent Shared Worlds" navigation list on the guest landing route page `apps/web/src/routes/(app)/guest/+page.svelte` and implement self-healing history cleanup if loading returns a 404/410.

**Checkpoint**: All user stories are complete.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Documentation updates, final code reviews, and validation tests.

- [ ] T024 [P] Write user-facing help documentation guide for the publishing feature in `apps/web/src/lib/config/help-content.ts`.
- [ ] T025 Run validation commands: check build, run linting (`bun run lint`), and run vitest tests (`bun run test`) to verify all tests pass.
- [ ] T026 [P] Update the changelog file `apps/web/src/lib/content/changelog/releases.json` with highlights of the new guest snapshots feature.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories.
- **User Stories (Phases 3 to 7)**: All depend on Foundational phase completion.
  - US1 and US2 are priority P1 (Must be built first).
  - US3, US4, US5 are priority P2 (Can be built sequentially after MVP).
- **Polish (Phase 8)**: Depends on all desired user stories being complete.

---

## Parallel Opportunities

- T001 and T002 can run in parallel (wrangler setup vs type definitions).
- T004 and T005/T006 can run in parallel once the Worker API interface is defined.
- Once Foundational phase is complete, US1 and US2 implementation can be started concurrently.
- Within US1, writing exporter tests (T007) and publishing tests (T008) can run in parallel.
