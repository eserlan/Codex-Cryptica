# Tasks: Community Stat Sheet Template Directory

**Input**: Design documents from `/specs/150-stat-sheet-marketplace/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story. All implementation logic
must follow the repository's TDD, library-first, privacy, DI, Svelte 5 Runes,
semantic-token, Iconify, and documentation requirements.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the new workspace package and shared test fixtures.

- [x] T001 [P] Create `packages/stat-sheet-engine/package.json`, `src/index.ts`, `tsconfig.json`, and `vitest.config.ts` using existing workspace package conventions
- [x] T002 [P] Add `packages/stat-sheet-engine` to the workspace dependency graph and configure `apps/web/package.json` and worker imports to consume it without duplicating domain logic
- [x] T003 [P] Add shared Stat Sheet package/version and controlled-category types to `packages/schema/src/stat-sheet.ts` and export them from `packages/schema/src/index.ts`
- [x] T004 [P] Add reusable package fixtures for valid, private-data-containing, malformed, legacy-version, and future-version templates in `packages/stat-sheet-engine/src/__fixtures__/template-packages.ts`

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the shared domain and transport foundation required by all
three user stories.

- [x] T005 [P] Write failing canonical package schema and privacy-projection tests in `packages/stat-sheet-engine/src/template-package.test.ts` covering field order, supported types, bounds, labels terminology, and removal of values/collapsed/entity/vault data
- [x] T006 [P] Write failing migration tests in `packages/stat-sheet-engine/src/migrations.test.ts` for the current version, each supported older version, and unsupported future versions
- [x] T007 Implement strict versioned package schemas, safe structural projection, metadata normalization, and typed validation errors in `packages/stat-sheet-engine/src/template-package.ts`
- [x] T008 Implement pure supported-version migrations and import normalization in `packages/stat-sheet-engine/src/migrations.ts`, exporting the public API from `packages/stat-sheet-engine/src/index.ts`
- [ ] T009 [P] Add failing schema contract tests for community listing metadata, directory query/result/page, owner mutation, and package-download DTOs in `packages/schema/src/template-directory.test.ts`
- [x] T010 Extend `packages/schema/src/publishing.ts` with strict template-directory schemas, bounded limits, controlled category validation, cursor query types, and error DTOs without exposing owner tokens
- [x] T011 [P] Write failing IndexedDB adapter tests for one-record atomic template save, generated local IDs, collision lookup, and no-write-on-validation/network failure in `apps/web/src/lib/stores/stat-sheet-templates.test.ts`
- [x] T012 Add constructor-injected local template persistence and atomic validated-import methods to `apps/web/src/lib/stores/stat-sheet-templates.svelte.ts`, preserving existing vault-scoping and built-in template behavior
- [ ] T013 [P] Add failing worker routing tests for the `/api/template-directory` path and CORS/rate-limit handling in `apps/workers/oracle-proxy/src/__tests__/index.test.ts`
- [x] T014 Add template-directory route dispatch and bounded template read/write rate-limit configuration in `apps/workers/oracle-proxy/src/index.ts` and `apps/workers/oracle-proxy/wrangler.toml`

**Checkpoint**: The canonical package, schemas, atomic local-save seam, and
worker route boundary are ready; user stories can proceed independently.

## Phase 3: User Story 1 - Publish a reusable template (Priority: P1) 🎯 MVP

**Goal**: Let a creator preview and publish one saved local template with
public metadata, then update or unpublish it without changing the local copy.

**Independent Test**: Publish a saved template with acknowledgment, inspect the
directory record/package for structure-only data, update its metadata, unpublish
it, and confirm the local template remains available.

### Tests for User Story 1

- [x] T015 [P] [US1] Write failing worker contract tests for independent template POST, owner-authorized PUT/DELETE, duplicate listing identity, malformed packages, missing tokens, and idempotent unpublish in `apps/workers/oracle-proxy/src/__tests__/template-directory.test.ts`
- [x] T016 [P] [US1] Write failing service tests for publish/update/unpublish request payloads, one-time owner-token persistence, and recoverable network/auth errors in `apps/web/src/lib/services/publishing/PublicTemplateDirectoryService.test.ts`
- [ ] T017 [P] [US1] Write failing component tests for value-free publish preview, required metadata/acknowledgment, cancellation, success, and error states in `apps/web/src/lib/components/stats/community-template/TemplatePublishModal.test.ts`

### Implementation for User Story 1

- [x] T018 [US1] Implement independent R2 listing/package keys, owner-token authorization, package persistence, update, unpublish, validation, and plain error responses in `apps/workers/oracle-proxy/src/template-directory.ts`
- [x] T019 [US1] Add constructor-injected `PublicTemplateDirectoryService` methods for create, update, unpublish, fetch package, and owner-token persistence in `apps/web/src/lib/services/publishing/PublicTemplateDirectoryService.ts`
- [x] T020 [US1] Add vault-scoped community publish registry records and migration-safe IndexedDB access in `apps/web/src/lib/stores/publishing/template-publish-registry.ts` and `apps/web/src/lib/utils/idb.ts`
- [x] T021 [US1] Build the Svelte 5 Runes publish preview/metadata modal using semantic Tailwind tokens, Iconify utility icons, accessible labels, and explicit public-discovery language in `apps/web/src/lib/components/stats/community-template/TemplatePublishModal.svelte`
- [x] T022 [US1] Integrate publish, update, and unpublish actions into the existing local Stat Sheet template settings/modal without sending entity values or vault metadata in `apps/web/src/lib/components/settings/StatSheetTemplateSettings.svelte` and `apps/web/src/lib/components/stats/StatSheetTemplateModal.svelte`
- [x] T023 [US1] Add owner-token copy/export and recovery-entry UI, plus unavailable messaging and retry-safe notifications for lost browser registry, network failure, and remote listing absence in `apps/web/src/lib/components/stats/community-template/TemplateOwnerRecovery.svelte` and `template-errors.ts`

**Checkpoint**: US1 is independently demoable as the MVP publish lifecycle.

## Phase 4: User Story 2 - Discover templates (Priority: P1)

**Goal**: Let users browse, search, filter, paginate, and inspect metadata-only
community template listings.

**Independent Test**: Seed listings from multiple systems/categories, browse
pages, search across all public fields, filter by system/category/labels, and
verify empty, malformed, unavailable, and recoverable-error states.

### Tests for User Story 2

- [ ] T024 [P] [US2] Write failing worker tests for metadata-only listing, keyword/system/category/label filters, cursor pagination, malformed-entry skipping, and empty results in `apps/workers/oracle-proxy/src/__tests__/template-directory.test.ts`
- [ ] T025 [P] [US2] Write failing service tests for query encoding, pagination, malformed responses, unavailable listings, and network-error retry behavior in `apps/web/src/lib/services/publishing/PublicTemplateDirectoryService.test.ts`
- [ ] T026 [P] [US2] Write failing route/component tests for browse query persistence, filter controls, keyboard navigation, loading/empty/error states, cards, and detail metadata in `apps/web/src/routes/(app)/templates/templates.route.test.ts`

### Implementation for User Story 2

- [x] T027 [US2] Extend `apps/workers/oracle-proxy/src/template-directory.ts` with bounded metadata-only list/detail handlers, search across title/description/system/category/labels, cursor pagination, and malformed-record isolation
- [x] T028 [US2] Add `listTemplateDirectory` and `getTemplateListing` methods with typed DTO parsing to `apps/web/src/lib/services/publishing/PublicTemplateDirectoryService.ts`
- [x] T029 [US2] Build accessible Svelte 5 Runes listing cards, search/filter controls, pagination, and loading/empty/unavailable/error states in `apps/web/src/lib/components/stats/community-template/TemplateDirectory.svelte`
- [x] T030 [US2] Build the metadata-first detail view with ordered field preview, creator attribution, labels, import entry point, and no package download during browse in `apps/web/src/routes/(app)/templates/[listingId]/+page.svelte`
- [x] T031 [US2] Add the directory route and query-param state preservation in `apps/web/src/routes/(app)/templates/+page.svelte` and `apps/web/src/routes/(app)/templates/+page.ts`

**Checkpoint**: US2 is independently demoable as public metadata discovery and
can be used even when importing is unavailable.

## Phase 5: User Story 3 - Import a community template (Priority: P1)

**Goal**: Download, validate, migrate, and save a community template as an
independent local copy with explicit collision handling.

**Independent Test**: Import a valid package, apply it from the local picker,
then exercise duplicate-name rename/cancel, malformed/future package,
unavailable listing, interruption, and network failure paths with no partial
local writes.

### Tests for User Story 3

- [x] T032 [P] [US3] Write failing import-engine tests for canonical field preservation, supported migrations, unsupported types/versions, and rejection of private/unknown fields in `packages/stat-sheet-engine/src/import.test.ts`
- [x] T033 [P] [US3] Write failing store tests for unique-name save, collision rename/cancel, replacement policy, and atomic no-write failure behavior in `apps/web/src/lib/stores/stat-sheet-templates.test.ts`
- [ ] T034 [P] [US3] Write failing service/component tests for package download, validation errors, cancellation, retry, success notification, and local-picker availability in `apps/web/src/lib/services/publishing/PublicTemplateDirectoryService.test.ts` and `apps/web/src/lib/components/stats/community-template/TemplateImportModal.test.ts`

### Implementation for User Story 3

- [x] T035 [US3] Implement pure package download validation, migration, destination-name resolution, and import result types in `packages/stat-sheet-engine/src/import.ts`
- [x] T036 [US3] Add package download and report/takedown-aware unavailable handling to `apps/web/src/lib/services/publishing/PublicTemplateDirectoryService.ts`
- [x] T037 [US3] Connect validated imports to the constructor-injected `StatSheetTemplateStore`, generating a new local ID and writing only after complete validation in `apps/web/src/lib/stores/stat-sheet-templates.svelte.ts`
- [x] T038 [US3] Build the Svelte 5 Runes import modal with rename/cancel/replacement choices, progress, cancellation, retry, and plain-language validation/network errors in `apps/web/src/lib/components/stats/community-template/TemplateImportModal.svelte`
- [x] T039 [US3] Wire the detail page Import action to the active vault and verify imported templates appear in `StatSheetTemplateModal.svelte` and settings without remote linkage in `apps/web/src/routes/(app)/templates/[listingId]/+page.svelte` and `apps/web/src/lib/components/stats/StatSheetTemplateModal.svelte`

**Checkpoint**: US3 is independently demoable as a safe local-copy import
workflow.

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Complete safety, reporting, documentation, accessibility, and
repository validation across the three stories.

- [ ] T040 [P] Add basic template reporting and owner-takedown tests plus operator-authenticated admin suspension tests using existing report/suspension conventions in `apps/workers/oracle-proxy/src/reports.ts`, `apps/workers/oracle-proxy/src/suspension.ts`, and `apps/workers/oracle-proxy/src/__tests__/template-directory.test.ts`
- [x] T041 [P] Add and register user-facing Stat Sheets/community-template help covering shared data, unpublishing, owner-token recovery, import copies, collisions, and failure recovery in `apps/web/src/lib/content/help/stat-sheets.md`, `apps/web/src/lib/config/help-content.ts`, and `apps/web/src/lib/config/help-content.test.ts`
- [ ] T042 [P] Add accessibility and Iconify/semantic-token regression coverage for publish, browse, detail, and import components in the corresponding `apps/web/src/lib/components/stats/community-template/*.test.ts` files
- [x] T043 Review all public projections and API responses for credentials, entity content, vault identifiers, asset paths, and forbidden “tag” terminology; add regression assertions in `packages/stat-sheet-engine/src/template-package.test.ts` and `apps/workers/oracle-proxy/src/__tests__/template-directory.test.ts`
- [ ] T044 Run the quickstart verification scenarios from `specs/150-stat-sheet-marketplace/quickstart.md` and record any required fixes in the affected test files
- [x] T045 Run `bun run lint`, `bun run test`, and `bun run --cwd apps/web check`; resolve failures without weakening privacy, coverage, or type guarantees
- [x] T046 [P] Add a representative 1,000-listing directory fixture and measure bounded search/filter response behavior against the SC-002 target in `apps/workers/oracle-proxy/src/__tests__/template-directory.performance.test.ts`
- [x] T047 [P] Add cache/unpublish timing coverage proving delisted listings disappear from new browse/search responses within the SC-007 60-second target in `apps/workers/oracle-proxy/src/__tests__/template-directory.test.ts`

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; T001–T004 can run in parallel.
- **Foundational (Phase 2)**: Depends on Setup; T005/T006/T009/T011/T013 are
  parallel test-first work, while T007/T008, T010, T012, and T014 follow their
  respective tests.
- **US1/US2/US3**: Depend on the foundational checkpoint. US1 and US2 can be
  developed in parallel after shared schemas/routes; US3 depends on the package
  migration/import seam and can proceed alongside US2.
- **Polish (Phase 6)**: Depends on the completed stories and their tests;
  T046/T047 verify the measurable browse and unpublish targets.

### User Story Dependencies

- **US1 (P1)**: Depends on Phase 2; no other story dependency. MVP scope.
- **US2 (P1)**: Depends on Phase 2; shares worker/service files with US1, so
  merge in endpoint/service order or coordinate ownership of those files.
- **US3 (P1)**: Depends on Phase 2 and the package contract; its UI consumes
  the US2 detail route, but engine/store tests remain independently runnable.

### Parallel Execution Examples

```text
# Foundation
T005 + T006 + T009 + T011 + T013

# US1 after foundation
T015 + T016 + T017
then T018 → T019/T020 → T021/T022/T023

# US2 after foundation (coordinate shared worker/service files with US1)
T024 + T025 + T026
then T027 → T028 → T029/T030/T031

# US3 after package contract
T032 + T033 + T034
then T035 → T036/T037 → T038/T039
```

## Implementation Strategy

### MVP First (US1 only)

1. Complete Setup and Foundational phases.
2. Complete US1 publish/update/unpublish lifecycle.
3. Run US1 privacy, authorization, and local-preservation tests.
4. Stop for validation/demo before adding discovery and import UI.

### Incremental Delivery

1. Add US2 metadata-only discovery and validate it independently.
2. Add US3 atomic import and validate local-copy behavior independently.
3. Complete reporting, help content, accessibility checks, and full lint/test.

## Notes

- Every task uses the required `- [ ] T###` checklist format; `[P]` marks
  only file-separated work with no incomplete dependency.
- Every user-story task includes `[US1]`, `[US2]`, or `[US3]` and an exact path.
- Tests intentionally cover success plus meaningful negative, cancellation, or
  failure paths required by the repository instructions.
