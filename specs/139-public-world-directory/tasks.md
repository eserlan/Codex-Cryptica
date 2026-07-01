# Tasks: Public World Directory

**Input**: Design documents from `/specs/139-public-world-directory/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.yaml, quickstart.md
**Tests**: Required by constitution and quickstart; write focused failing tests before implementation for schema, Worker routes, services, and UI flows.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently after the shared foundation is complete.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files and has no dependency on incomplete tasks
- **[Story]**: User story label for story phases only
- Every task includes an exact file path

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare shared files and test harnesses for the directory feature.

- [x] T001 Review existing guest snapshot publishing route behavior in `apps/workers/oracle-proxy/src/publish.ts`
- [x] T002 Review existing publishing client service behavior in `apps/web/src/lib/services/publishing/PublishingService.svelte.ts`
- [x] T003 [P] Create empty Worker directory module in `apps/workers/oracle-proxy/src/directory.ts`
- [x] T004 [P] Create empty Worker directory test file in `apps/workers/oracle-proxy/src/__tests__/directory.test.ts`
- [x] T005 [P] Create empty public directory client service in `apps/web/src/lib/services/publishing/PublicDirectoryService.ts`
- [x] T006 [P] Create empty public directory client service test file in `apps/web/src/lib/services/publishing/PublicDirectoryService.test.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define shared contracts, schemas, and routing primitives that every story depends on.

**CRITICAL**: No user story implementation should begin until this phase is complete.

- [x] T007 [P] Add failing public listing schema tests for valid metadata, missing required fields, overlong fields, zero labels, and extra private fields in `packages/schema/src/publishing.test.ts`
- [x] T008 Extend `packages/schema/src/publishing.ts` with ListingDraftSchema, PublicListingSchema, DirectoryQuerySchema, DirectoryResultSchema, DirectoryPageSchema, and exported types
- [x] T009 [P] Add failing Worker helper tests for listing object key generation, guest URL generation, cache headers, and safe directory result projection in `apps/workers/oracle-proxy/src/__tests__/directory.test.ts`
- [x] T010 Implement listing object key generation, guest URL generation, cache headers, and safe directory result projection helpers in `apps/workers/oracle-proxy/src/directory.ts`
- [x] T011 Wire directory route dispatch for `/api/directory/listings` and `/api/published/{publishId}/listing` in `apps/workers/oracle-proxy/src/index.ts`
- [x] T012 Add focused route-not-found and method-not-allowed coverage for new directory routes in `apps/workers/oracle-proxy/src/index.test.ts`

**Checkpoint**: Schemas and route shell exist; story work can begin.

---

## Phase 3: User Story 1 - List a Shared World Publicly (Priority: P1) MVP

**Goal**: A world owner can list an existing read-only guest snapshot in the public directory, and visitors can open the listing into the read-only guest view.

**Independent Test**: Starting from a world with an active guest snapshot, the owner enables public listing, confirms the public preview, and the world appears in the public directory with only safe listing metadata.

### Tests for User Story 1

- [x] T013 [P] [US1] Add failing Worker tests for PUT `/api/published/{publishId}/listing` success, missing snapshot 404, and missing or invalid write token 401 in `apps/workers/oracle-proxy/src/__tests__/directory.test.ts`
- [x] T014 [P] [US1] Add failing client service tests for enablePublicListing success and failure responses in `apps/web/src/lib/services/publishing/PublicDirectoryService.test.ts`
- [x] T015 [P] [US1] Add failing owner UI test for enabling a listing from an active guest snapshot in `apps/web/src/lib/components/settings/PublicListingSettings.test.ts`

### Implementation for User Story 1

- [x] T016 [US1] Implement snapshot existence and write-token authorization checks for listing mutations in `apps/workers/oracle-proxy/src/directory.ts`
- [x] T017 [US1] Implement PUT `/api/published/{publishId}/listing` to save owner-approved PublicListing records in `apps/workers/oracle-proxy/src/directory.ts`
- [x] T018 [US1] Implement enablePublicListing in `apps/web/src/lib/services/publishing/PublicDirectoryService.ts`
- [x] T019 [US1] Implement owner listing controls component with enable action in `apps/web/src/lib/components/settings/PublicListingSettings.svelte`
- [x] T020 [US1] Integrate PublicListingSettings into the publishing settings surface in `apps/web/src/lib/components/settings/PublishingSettings.svelte`

**Checkpoint**: User Story 1 is functional and independently testable.

---

## Phase 4: User Story 2 - Preview Public Listing Metadata (Priority: P1)

**Goal**: A world owner can preview and edit the exact saved listing metadata before enabling or updating public listing.

**Independent Test**: The owner opens listing settings and sees a preview containing the exact title, description, labels, cover image, owner display name, and guest link behavior that directory visitors will see.

### Tests for User Story 2

- [x] T021A [P] [US2] Add failing Worker tests for GET `/api/published/{publishId}/listing` success and unlisted 404 in `apps/workers/oracle-proxy/src/__tests__/directory.test.ts`
- [x] T021 [P] [US2] Add failing client service tests for building a saved listing draft that does not auto-mirror later world/profile changes in `apps/web/src/lib/services/publishing/PublicDirectoryService.test.ts`
- [x] T021B [P] [US2] Add failing client service tests for fetching an existing saved public listing record for owner review and edit state hydration in `apps/web/src/lib/services/publishing/PublicDirectoryService.test.ts`
- [x] T022 [P] [US2] Add failing component tests for preview rendering, required metadata prompts, and confirmation language in `apps/web/src/lib/components/settings/PublicListingSettings.test.ts`

### Implementation for User Story 2

- [x] T022A [US2] Implement GET `/api/published/{publishId}/listing` to return the saved public listing record or 404 when unlisted in `apps/workers/oracle-proxy/src/directory.ts`
- [x] T023 [US2] Implement listing draft creation and validation helpers in `apps/web/src/lib/services/publishing/PublicDirectoryService.ts`
- [x] T023A [US2] Implement getPublicListing in `apps/web/src/lib/services/publishing/PublicDirectoryService.ts`
- [x] T024 [US2] Add editable title, description, labels, cover image state, owner display name state, and guest destination preview UI in `apps/web/src/lib/components/settings/PublicListingSettings.svelte`
- [x] T025 [US2] Add clear public-discoverability confirmation copy before save in `apps/web/src/lib/components/settings/PublicListingSettings.svelte`
- [x] T026 [US2] Ensure the listing UI hydrates from the saved public listing record when present and keeps the draft as an owner-approved record instead of live-mirroring world or profile changes in `apps/web/src/lib/components/settings/PublicListingSettings.svelte`

**Checkpoint**: User Story 2 is functional and independently testable.

---

## Phase 5: User Story 5 - Protect Public Data Boundaries (Priority: P1)

**Goal**: Public listings expose only safe discovery metadata and never leak private/editor-only data through listing records, preview, or search.

**Independent Test**: A listed world with private content, hidden notes, internal identifiers, and editor-only state exposes none of those values in the listing card, directory search index, or listing preview.

### Tests for User Story 5

- [x] T027 [P] [US5] Add failing schema tests that reject writeToken, local vault IDs, internal entity IDs, editable URLs, private notes, hidden relationship details, generation prompts, private metadata, and tag terminology in `packages/schema/src/publishing.test.ts`
- [x] T028 [P] [US5] Add failing Worker tests proving private fields are stripped or rejected from listing records and directory results in `apps/workers/oracle-proxy/src/__tests__/directory.test.ts`
- [x] T029 [P] [US5] Add failing owner UI tests proving private/editor-only values are absent from preview output in `apps/web/src/lib/components/settings/PublicListingSettings.test.ts`

### Implementation for User Story 5

- [x] T030 [US5] Harden PublicListingSchema with strict unknown-key rejection and labels-only classification constraints in `packages/schema/src/publishing.ts`
- [x] T031 [US5] Enforce safe-field projection before R2 writes and before directory responses in `apps/workers/oracle-proxy/src/directory.ts`
- [x] T032 [US5] Validate coverImageAssetId against the published snapshot assetManifest before saving listings in `apps/workers/oracle-proxy/src/directory.ts`
- [x] T033 [US5] Remove private/editor-only source values from preview view-model creation in `apps/web/src/lib/services/publishing/PublicDirectoryService.ts`
- [x] T034 [US5] Add safe fallback handling for missing, private, or failed cover images in `apps/web/src/lib/components/settings/PublicListingSettings.svelte`

**Checkpoint**: User Story 5 is functional and independently testable.

---

## Phase 6: User Story 3 - Discover Listed Worlds (Priority: P2)

**Goal**: Visitors can browse, search, filter, and open publicly listed worlds from a lightweight directory.

**Independent Test**: A visitor opens the directory, searches by title or description, filters by genre/theme labels, and opens a result into the read-only guest view.

### Tests for User Story 3

- [x] T035 [P] [US3] Add failing Worker tests for GET `/api/directory/listings` browse, title/description search, labels filter, pagination limit, deterministic ordering, and cache headers in `apps/workers/oracle-proxy/src/__tests__/directory.test.ts`
- [x] T036 [P] [US3] Add failing public route tests for `/worlds` browse/search/filter and read-only guest link navigation in `apps/web/src/routes/(marketing)/worlds/worlds.route.test.ts`

### Implementation for User Story 3

- [x] T037 [US3] Implement GET `/api/directory/listings` browse, search, labels filter, pagination, and newest-updated ordering in `apps/workers/oracle-proxy/src/directory.ts`
- [x] T038 [US3] Add listPublicDirectory method with query serialization in `apps/web/src/lib/services/publishing/PublicDirectoryService.ts`
- [x] T039 [US3] Implement `/worlds` route loader for directory queries in `apps/web/src/routes/(marketing)/worlds/+page.ts`
- [x] T040 [US3] Implement public directory browse/search/filter UI using Svelte 5 runes, Tailwind semantic tokens, and Iconify icons in `apps/web/src/routes/(marketing)/worlds/+page.svelte`
- [x] T041 [US3] Ensure directory result links resolve only to read-only guest routes in `apps/web/src/routes/(marketing)/worlds/+page.svelte`

**Checkpoint**: User Story 3 is functional and independently testable.

---

## Phase 7: User Story 4 - Delist a World (Priority: P2)

**Goal**: A world owner can remove public directory discoverability without deleting the underlying guest snapshot, and unpublishing a snapshot removes any listing.

**Independent Test**: The owner disables public listing and the world disappears from directory search and browse results while the guest snapshot remains available by direct link if guest sharing remains enabled.

### Tests for User Story 4

- [x] T042 [P] [US4] Add failing Worker tests for DELETE `/api/published/{publishId}/listing`, guest snapshot preservation, and directory disappearance within cache bounds in `apps/workers/oracle-proxy/src/__tests__/directory.test.ts`
- [x] T043 [P] [US4] Add failing Worker tests that unpublishing a guest snapshot deletes `directory/listings/{publishId}.json` in `apps/workers/oracle-proxy/src/__tests__/publish.test.ts`
- [x] T044 [P] [US4] Add failing Worker tests that stale listing records are hidden or deleted when the underlying snapshot bundle is unavailable during listing fetch or directory browse in `apps/workers/oracle-proxy/src/__tests__/directory.test.ts`
- [x] T045 [P] [US4] Add failing owner UI tests for delist confirmation and guest link preservation copy in `apps/web/src/lib/components/settings/PublicListingSettings.test.ts`

### Implementation for User Story 4

- [x] T046 [US4] Implement DELETE `/api/published/{publishId}/listing` without deleting the guest snapshot in `apps/workers/oracle-proxy/src/directory.ts`
- [x] T047 [US4] Delete any matching public listing when a snapshot is unpublished in `apps/workers/oracle-proxy/src/publish.ts`
- [x] T048 [US4] Hide or delete stale listing records when the underlying snapshot bundle is unavailable during listing fetch or directory browse in `apps/workers/oracle-proxy/src/directory.ts`
- [x] T049 [US4] Implement disablePublicListing in `apps/web/src/lib/services/publishing/PublicDirectoryService.ts`
- [x] T050 [US4] Add delist action, confirmation copy, and post-delisting state in `apps/web/src/lib/components/settings/PublicListingSettings.svelte`

**Checkpoint**: User Story 4 is functional and independently testable.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, documentation, and cleanup across all stories.

- [x] T051 [P] Add user-facing help content explaining "share by link" versus "list publicly" in `apps/web/src/lib/config/help-content.ts`
- [x] T052 [P] Add public directory manual verification notes to `specs/139-public-world-directory/quickstart.md`
- [x] T053 Add Worker performance fixture coverage for browse/search over 1,000 listing records returning within the planned 500ms target in `apps/workers/oracle-proxy/src/__tests__/directory.test.ts`
- [x] T054 Add client performance coverage for listing draft preview creation within the planned 200ms target in `apps/web/src/lib/services/publishing/PublicDirectoryService.test.ts`
- [x] T055 Add manual copy validation checklist for distinguishing "share by link" from "list publicly" in `specs/139-public-world-directory/quickstart.md`
- [x] T056 [P] Verify no user-facing "tags" terminology was introduced in `apps/web/src/lib/components/settings/PublicListingSettings.svelte`
- [x] T057 [P] Verify no user-facing "tags" terminology was introduced in `apps/web/src/routes/(marketing)/worlds/+page.svelte`
- [x] T058 Run focused schema tests with `bun test packages/schema/src/publishing.test.ts`
- [x] T059 Run focused Worker tests with `bun test apps/workers/oracle-proxy/src/__tests__/directory.test.ts apps/workers/oracle-proxy/src/__tests__/publish.test.ts`
- [x] T060 Run focused web service and route tests with `bun test apps/web/src/lib/services/publishing/PublicDirectoryService.test.ts apps/web/src/lib/components/settings/PublicListingSettings.test.ts apps/web/src/routes/(marketing)/worlds/worlds.route.test.ts`
- [x] T061 Run full validation with `bun run lint` and `bun run test`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; can start immediately.
- **Foundational (Phase 2)**: Depends on Setup; blocks all user story implementation.
- **User Story 1 (Phase 3)**: Depends on Foundational; MVP listing enable flow.
- **User Story 2 (Phase 4)**: Depends on Foundational; can run in parallel with US1 if coordination avoids `PublicListingSettings.svelte` conflicts.
- **User Story 5 (Phase 5)**: Depends on Foundational; should complete before public launch because it validates privacy boundaries.
- **User Story 3 (Phase 6)**: Depends on Foundational and benefits from US1 listings existing.
- **User Story 4 (Phase 7)**: Depends on Foundational and benefits from US1 listings existing.
- **Polish (Phase 8)**: Depends on all desired user stories.

### User Story Dependencies

- **US1 List a Shared World Publicly (P1)**: Required MVP; no dependency on other stories after foundation.
- **US2 Preview Public Listing Metadata (P1)**: No dependency on US1 after foundation, but shares owner UI files.
- **US5 Protect Public Data Boundaries (P1)**: No dependency on other stories after foundation; should be complete before accepting public traffic.
- **US3 Discover Listed Worlds (P2)**: Needs listing records from US1 for end-to-end verification.
- **US4 Delist a World (P2)**: Needs listing records from US1 for end-to-end verification.

### Within Each User Story

- Write failing tests first.
- Implement schema/service logic before UI integration.
- Implement Worker endpoint behavior before client service calls.
- Validate each story at its checkpoint before moving to the next priority.

---

## Parallel Opportunities

- Setup tasks T003-T006 can run in parallel.
- Foundational tests T007 and T009 can run in parallel.
- Story test tasks marked [P] can run in parallel inside each story.
- US2 and US5 can run in parallel after Phase 2 if file ownership is coordinated.
- US3 route UI work can run in parallel with US4 owner delist tests after US1 endpoint behavior exists.
- Polish tasks T051-T057 can run in parallel where they touch different files.

---

## Parallel Example: User Story 1

```bash
Task: "T013 [P] [US1] Add failing Worker tests for PUT /api/published/{publishId}/listing success, missing snapshot 404, and missing or invalid write token 401 in apps/workers/oracle-proxy/src/__tests__/directory.test.ts"
Task: "T014 [P] [US1] Add failing client service tests for enablePublicListing success and failure responses in apps/web/src/lib/services/publishing/PublicDirectoryService.test.ts"
Task: "T015 [P] [US1] Add failing owner UI test for enabling a listing from an active guest snapshot in apps/web/src/lib/components/settings/PublicListingSettings.test.ts"
```

---

## Parallel Example: User Story 3

```bash
Task: "T035 [P] [US3] Add failing Worker tests for GET /api/directory/listings browse, title/description search, labels filter, pagination limit, deterministic ordering, and cache headers in apps/workers/oracle-proxy/src/__tests__/directory.test.ts"
Task: "T036 [P] [US3] Add failing public route tests for /worlds browse/search/filter and read-only guest link navigation in apps/web/src/routes/(marketing)/worlds/worlds.route.test.ts"
```

---

## Implementation Strategy

### MVP First

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational schemas, route shell, and safe projection helpers.
3. Complete Phase 3: US1 listing enable flow.
4. Complete Phase 5: US5 privacy boundaries before exposing the directory publicly.
5. Stop and validate US1 plus US5 independently.

### Incremental Delivery

1. Setup + Foundation: schemas, routes, and safe projection ready.
2. US1: owners can list an existing guest snapshot.
3. US2: owners can preview and explicitly approve saved listing metadata.
4. US5: privacy boundary tests and safe projections are complete.
5. US3: visitors can browse/search/filter listings.
6. US4: owners can delist and snapshot unpublish removes listings.

### Validation Gates

1. Run focused tests for each story before moving to the next story.
2. Run `bun run lint` and `bun run test` before considering implementation complete.
3. Manually verify quickstart scenarios against a published guest snapshot.

---

## Notes

- [P] tasks touch different files and can run independently.
- [US#] labels map directly to user stories in `spec.md`.
- Keep all public classification language as "labels"; do not introduce "tags".
- Keep listing metadata as a saved owner-approved record; do not auto-mirror editable world or owner profile fields.
- Do not add moderation, reporting, featured listings, comments, ratings, social networking, or search-engine indexing in this feature.
