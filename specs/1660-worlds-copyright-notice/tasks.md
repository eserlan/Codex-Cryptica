# Tasks: Copyright and Fan-Content Notice for Public Worlds

**Input**: Design documents from `/specs/1660-worlds-copyright-notice/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/worker-api.md

**Tests**: Included as required by Constitution II (TDD) and spec requirements. All tests must follow exact setup/teardown and assertion rules.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (`[US1]`, `[US2]`, `[US3]`, `[US4]`, `[US5]`)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and shared configuration modules

- [x] T001 Create centralized notice, disclaimer, and reporting copy configuration module in `apps/web/src/lib/config/public-worlds-notice.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared schema contracts and data model definitions that block all user stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 [P] Add `PublishedNoticeSchema`, `CopyrightReportSchema`, and `SuspensionMarkerSchema` with TypeScript types in `packages/schema/src/publishing.ts`
- [x] T003 Extend `ListingDraftSchema` to require `rightsAcknowledged: literal(true)` plus optional `fanContent` and `fanContentDisclaimer`, and extend `PublicListingSchema` with optional `rightsAcknowledgedAt` and `fanContent` in `packages/schema/src/publishing.ts`
- [x] T004 Add comprehensive unit tests for new and extended publishing schemas (`PublishedNotice`, `ListingDraft` ack enforcement, `CopyrightReport`, `SuspensionMarker`) in `packages/schema/src/publishing.test.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel or sequentially

---

## Phase 3: User Story 1 - Visitor Sees Provenance Notice on the Public Listing (Priority: P1) 🎯 MVP

**Goal**: Display a compact legal expectation-setting and provenance notice on the public `/worlds` directory without obstructing browsing.

**Independent Test**: Open `http://localhost:5173/worlds` as a signed-out visitor and verify the notice is visible near the footer, unobtrusive, states author responsibility, and includes a report link.

### Tests for User Story 1

- [x] T005 [P] [US1] Add component tests for `WorldsProvenanceNotice.svelte` verifying unobtrusive rendering, exact notice copy, and report action link presence in `apps/web/src/lib/components/publishing/WorldsProvenanceNotice.test.ts`

### Implementation for User Story 1

- [x] T006 [US1] Create `WorldsProvenanceNotice.svelte` footer component displaying provenance notice, author responsibility, disclaimer that it is not rights-holder endorsed, and report link using `apps/web/src/lib/config/public-worlds-notice.ts` in `apps/web/src/lib/components/publishing/WorldsProvenanceNotice.svelte`
- [x] T007 [US1] Mount `WorldsProvenanceNotice.svelte` near the bottom of the public world directory page in `apps/web/src/routes/(marketing)/worlds/+page.svelte`
- [x] T008 [US1] Update the public directory entry in `apps/web/src/lib/config/help-content.ts` to document the legal expectation-setting and provenance notice

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Author Acknowledges Publishing Rights (Priority: P1)

**Goal**: Require authors to explicitly confirm publishing rights when enabling or updating public listing, and allow toggling third-party intellectual property / fan-content status.

**Independent Test**: In listing settings, verify saving is blocked until the rights acknowledgement checkbox is checked, and verify that the acknowledgement timestamp (`rightsAcknowledgedAt`) and fan-content boolean (`fanContent`) persist to R2.

### Tests for User Story 2

- [x] T009 [P] [US2] Add worker endpoint unit tests for notice GET/PUT and listing PUT (`rightsAcknowledged: true` requirement, 400 rejection when missing/false) in `apps/workers/oracle-proxy/src/notice.test.ts`
- [x] T010 [P] [US2] Add component and service unit tests verifying `PublicListingSettings.svelte` acknowledgement gating, toggle state persistence, and re-prompting on pre-existing listings in `apps/web/src/lib/components/settings/PublicListingSettings.test.ts`

### Implementation for User Story 2

- [x] T011 [US2] Implement `GET /api/published/:publishId/notice` and `PUT /api/published/:publishId/notice` worker handlers in `apps/workers/oracle-proxy/src/notice.ts`
- [x] T012 [US2] Update `PUT /api/published/:publishId/listing` handler to validate `rightsAcknowledged: true`, stamp `rightsAcknowledgedAt` on listing object, and upsert notice sidecar (`notice.json`) in `apps/workers/oracle-proxy/src/directory.ts`
- [x] T013 [US2] Wire route endpoints (`GET/PUT /api/published/:publishId/notice`) in worker router in `apps/workers/oracle-proxy/src/index.ts`
- [x] T014 [US2] Add `getNotice(publishId)` and `saveNotice(publishId, payload)` methods, and ensure `saveListing` passes `rightsAcknowledged: true`, `fanContent`, and `fanContentDisclaimer` in `apps/web/src/lib/services/publishing/PublicDirectoryService.ts`
- [x] T015 [US2] Update `PublicListingSettings.svelte` UI to add unchecked-by-default publishing rights acknowledgement checkbox, optional fan-content toggle, and block listing submission until acknowledged in `apps/web/src/lib/components/settings/PublicListingSettings.svelte`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Fan-Content Disclaimer on Public Vault Pages (Priority: P2)

**Goal**: Display a specific unofficial fan-content disclaimer on public guest views (`/guest/[publishId]`) when the author enabled the fan-content toggle, with support for custom rights-holder wording.

**Independent Test**: Enable the fan-content toggle for a vault, save, open `/guest/{publishId}`, verify the default disclaimer appears; set custom rights-holder wording and confirm it replaces the default in plain text without active markup.

### Tests for User Story 3

- [x] T016 [P] [US3] Add component tests for `FanContentDisclaimer.svelte` and guest view rendering verifying default vs custom wording, plain-text escaping (no HTML injection), and absence when `fanContent` is false in `apps/web/src/lib/components/publishing/FanContentDisclaimer.test.ts`

### Implementation for User Story 3

- [x] T017 [US3] Create `FanContentDisclaimer.svelte` component displaying default or rights-holder-specific disclaimer in plain text with bounded length in `apps/web/src/lib/components/publishing/FanContentDisclaimer.svelte`
- [x] T018 [US3] Add custom rights-holder disclaimer wording textarea (`fanContentDisclaimer`, max 500 chars) conditional on `fanContent` toggle inside `apps/web/src/lib/components/settings/PublicListingSettings.svelte`
- [x] T019 [US3] Fetch `PublishedNoticeView` (`/api/published/:publishId/notice`) and render `FanContentDisclaimer.svelte` when `fanContent === true` on the guest view page in `apps/web/src/routes/(app)/guest/[publishId]/+page.svelte`

**Checkpoint**: All author- and visitor-facing notice flows should now be independently functional

---

## Phase 6: User Story 4 - Report a Copyright Concern (Priority: P2)

**Goal**: Provide a public, Turnstile-protected intake form to submit copyright concerns with required fields (vault URL, reporter contact) and optional supporting details, storing reports directly in R2.

**Independent Test**: Click "Report copyright concern" on a public vault page or `/worlds`, submit a valid report with Turnstile, verify receipt message (`reportId`, `receivedAt`), and confirm report JSON exists in R2 `moderation/reports/`.

### Tests for User Story 4

- [x] T020 [P] [US4] Add worker unit tests for `POST /api/reports/copyright` testing Turnstile validation, rate limiting, required field validation (400), and R2 JSON persistence in `apps/workers/oracle-proxy/src/__tests__/reports.test.ts`
- [x] T021 [P] [US4] Add component and service tests for `CopyrightReportModal.svelte` and `CopyrightReportService.ts` verifying field validation, pre-filled `vaultUrl`, error display, and success receipt rendering in `apps/web/src/lib/components/publishing/CopyrightReportModal.test.ts`

### Implementation for User Story 4

- [x] T022 [US4] Implement `POST /api/reports/copyright` worker handler validating `CopyrightReportSchema`, verifying Turnstile token (`turnstile.ts`), enforcing IP rate limiting (`reports` bucket), writing `moderation/reports/{reportId}.json` to R2, and returning receipt UUID in `apps/workers/oracle-proxy/src/reports.ts`
- [x] T023 [US4] Wire `POST /api/reports/copyright` in worker router in `apps/workers/oracle-proxy/src/index.ts`
- [x] T024 [US4] Create `CopyrightReportService.ts` DI class (and singleton export) wrapping `POST /api/reports/copyright` in `apps/web/src/lib/services/publishing/CopyrightReportService.ts`
- [x] T025 [US4] Create `CopyrightReportModal.svelte` form (`ModalShell`) capturing vault URL, rights holder, material, reporter contact (`required`), details (`optional`), and Turnstile widget, handling submission and showing receipt message in `apps/web/src/lib/components/publishing/CopyrightReportModal.svelte`
- [x] T026 [US4] Add triggers/buttons to open `CopyrightReportModal.svelte` from `WorldsProvenanceNotice.svelte` (`/worlds`) and from the guest page footer (`/guest/[publishId]`) in `apps/web/src/routes/(marketing)/worlds/+page.svelte` and `apps/web/src/routes/(app)/guest/[publishId]/+page.svelte`

**Checkpoint**: Reporting flow is now fully operational and end-to-end testable

---

## Phase 7: User Story 5 - Operator Delists a Reported Vault During Review (Priority: P3)

**Goal**: Enable operators to suspend public listings and guest access via R2 markers (`moderation/suspensions/{publishId}.json`), hiding vaults from `/worlds` (`delist`) or serving neutral `451` responses on `/guest/[publishId]` (`disable`), while displaying suspension status to owners in settings.

**Independent Test**: Place a `disable` marker in R2 for a listed `publishId`. Verify `/worlds` excludes it, `/guest/[publishId]` returns `451` with neutral message, and the owner sees "suspended pending review" in settings. Delete the marker and verify instant restoration.

### Tests for User Story 5

- [x] T027 [P] [US5] Add worker unit tests verifying `directory.ts` filtering of suspended `publishIds`, `publish.ts` `451` response for `disable` mode, and `notice.ts` `suspended` status flag in `apps/workers/oracle-proxy/src/suspension.test.ts`

### Implementation for User Story 5

- [x] T028 [US5] Update worker `GET /api/directory/listings` handler in `apps/workers/oracle-proxy/src/directory.ts` to check R2 for `moderation/suspensions/{publishId}.json` and filter out suspended (`delist` or `disable`) listings
- [x] T029 [US5] Update worker `GET /api/published/:publishId/listing` handler to return `404` when any suspension marker exists for public callers in `apps/workers/oracle-proxy/src/directory.ts`
- [x] T030 [US5] Update worker bundle, manifest, and asset GET handlers in `apps/workers/oracle-proxy/src/publish.ts` to return HTTP `451` with body `{ "error": { "message": "This world is temporarily unavailable." } }` when a suspension marker with `mode = "disable"` exists
- [x] T031 [US5] Update `GET /api/published/:publishId/notice` handler (`notice.ts`) to check for `moderation/suspensions/{publishId}.json` and return `suspended: true` to the owner in `apps/workers/oracle-proxy/src/notice.ts`
- [x] T032 [US5] Update `PublicListingSettings.svelte` to display a suspended/under-review warning banner when `notice.suspended === true` in `apps/web/src/lib/components/settings/PublicListingSettings.svelte`
- [x] T033 [US5] Update `/guest/[publishId]` route load/error handling to display a neutral unavailability message when catching a `451` error status in `apps/web/src/routes/(app)/guest/[publishId]/+page.svelte`

**Checkpoint**: Full moderation control loop complete and testable

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Quality gates, formatting, documentation verification, and final validation

- [x] T034 [P] Run all unit and integration tests across `schema`, `oracle-proxy`, and `web` with `bun run test` and fix any type or test regressions
- [x] T035 [P] Run code formatting and strict style linting (`bun run lint`) to verify YAGNI/constitution adherence across all modified files
- [x] T036 Verify quickstart test scenarios (`specs/1660-worlds-copyright-notice/quickstart.md`) and operator runbook commands against local wrangler dev environment

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3–7)**: All depend on Foundational phase completion
  - User Story 1 (`[US1]`) and User Story 2 (`[US2]`) can proceed in parallel once Phase 2 is complete
  - User Story 3 (`[US3]`) depends on User Story 2 (`[US2]`) notice sidecar and UI state
  - User Story 4 (`[US4]`) can proceed independently after Phase 2 or in parallel with US1/US2/US3
  - User Story 5 (`[US5]`) depends on notice sidecar structure (`[US2]`) and reporting context (`[US4]`)
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### Parallel Opportunities

- Within Phase 2: Schemas (`T002`) can be drafted concurrently before wiring tests (`T004`)
- User Story 1 (`[US1]`) and User Story 4 (`[US4]`) have zero dependencies on author settings (`[US2]`/`[US3]`) and can be implemented in parallel by separate team members
- Test tasks (`T005`, `T009`, `T010`, `T016`, `T020`, `T021`, `T027`) marked `[P]` can be written in parallel before implementation tasks begin
