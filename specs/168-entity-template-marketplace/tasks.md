---
description: "Task list for Entity Template Marketplace (168-entity-template-marketplace)"
---

# Tasks: Entity Template Marketplace

**Input**: Design documents from `/specs/168-entity-template-marketplace/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, contracts/entity-template-package.md, quickstart.md
**Issue**: https://github.com/eserlan/Codex-Cryptica/issues/3548

**Tests**: INCLUDED. The constitution (Principle II, TDD) and AGENTS.md require tests for changed behaviour, covering a success path and at least one negative, failure or cancellation path. Within each story, write the test tasks first and confirm they fail before implementing.

**Organization**: Grouped by user story so each can be implemented and tested independently. US1 (P1) browse and filter · US2 (P1) preview and install · US3 (P1) publish, update, unpublish, delete, recover · US4 (P2) report and takedown · US5 (P3) help and governance.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1–US5, mapped to spec.md
- All paths are relative to the repository root. `web/` below means `apps/web/src/lib/`; `worker/` means `apps/workers/oracle-proxy/src/`.

## Guardrails (apply to every task)

- Svelte 5 Runes, Tailwind 4 semantic tokens (`text-theme-primary`), Iconify (`icon-[lucide--name]`, NEVER `lucide-svelte`). See `docs/STYLE_GUIDE.md`.
- Constructor-based DI for the service and stores: exported class plus a default singleton.
- User-facing metadata is called **labels**, never "tags" (Constitution XII). Copy is plain language (Constitution IX).
- Do not append behaviour to `worker/index.ts` (1,219 lines), `worker/template-directory.ts` (537) or `packages/schema/src/publishing.ts` (679). Extract or add sibling modules as named below (Constitution XIV). `web/config/help-content.ts` is a data catalogue and is exempt.
- Stat sheet listing behaviour must not change (SC-010): the existing worker, service and component tests stay green and are not edited except where a task says so.
- Public responses never contain the owner token, its hash, reporter hashes or vault ids. Installing sends nothing but the package download, and no install counts are recorded.
- No template operation reads or writes entities, and install never sets a default.
- Every worker state change (publish, update, republish, unpublish, delete, takedown) keeps `templates/index/entity.json` equal to the set of active, non-suspended entity listings.
- Run only impacted validation (`bun run lint:changed`, `bun run test:changed`, scoped `svelte-check`); use `bun`, never `node`.

---

## Phase 1: Setup

**Purpose**: Configuration that later phases depend on.

- [x] T001 Add a `TEMPLATE_REPORT_RATE_LIMITER` rate-limit binding to `apps/workers/oracle-proxy/wrangler.toml` (new block after `SHARE_CREATE_RATE_LIMITER`, `namespace_id = "1360"`, `limit = 5`, `period = 60`, with a comment saying it caps entity template reports per address), add the optional `TEMPLATE_REPORT_RATE_LIMITER?` binding and `TEMPLATE_REPORT_HASH_KEY?: string` secret to the `Env` interface in `apps/workers/oracle-proxy/src/index.ts` next to `PUBLISH_WRITE_RATE_LIMITER?`, and document the new `TEMPLATE_REPORT_HASH_KEY` secret (how to set it, why reporting returns 503 without it) in `apps/workers/oracle-proxy/DEPLOYMENT.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The public package projection, the listing schemas, the two pure extractions that make room for new worker code, and the summary index every story relies on. No user-facing change after this phase.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Engine: public package (tests first)

- [x] T002 [P] Write failing tests `packages/schema/src/entity-template-public.test.ts`: a valid package projects to exactly `{kind, formatVersion, template:{name, entityType, markdown}}`; unknown top-level and `template` fields (including passthrough extras) are dropped; entity type is trimmed and lower-cased; markdown is returned byte for byte (leading/trailing whitespace and CRLF preserved); empty markdown, blank name, over-80 name, over-50,000 body and missing entity type each fail with a plain-language error; a newer `formatVersion` fails with the "update the app" message; non-object, wrong `kind` and `null` never throw (negative); `validatePublishMetadata` rejects an empty description, over-500 description, zero labels, more than 8 labels, a label over 30 characters, an over-80 display name, and de-duplicates labels case-insensitively
- [x] T003 Implement the public projection per `contracts/entity-template-package.md`, in `packages/schema/src/entity-template-public.ts` (moved from `entity-template-engine` because workers may only import `schema`; parity with the engine is asserted by `apps/web/src/lib/stores/entity-templates/entity-template-public-constants.test.ts`) (`toPublicEntityPackage`, `validatePublishMetadata`, `PUBLIC_LIMITS`, `PublicEntityTemplatePackage`, reusing `TEMPLATE_NAME_MAX`/`TEMPLATE_MARKDOWN_MAX` from `types.ts`) and export the additions from `packages/entity-template-engine/src/index.ts` until T002 passes (depends on T002)

### Schema: listing transport types (tests first)

- [x] T004 [P] Write failing tests `packages/schema/src/entity-template-listing.test.ts`: a valid `EntityTemplateListing` parses; `templateKind` must be `"entity"`; strict (unknown keys such as `ownerToken`, `ownerTokenHash`, `importCount` are rejected); label limits (1–8, each 1–30); description 1–500; `status` only `active` or `unpublished`; the query schema defaults `limit` to 24, caps it at 50, and rejects an unknown `kind`; a stat sheet listing fixture does not parse as an entity listing and an entity listing does not parse as a stat sheet `CommunityTemplateListingSchema` (negative, guards D1); report schema accepts the four reasons and rejects others; facets schema shape; the summary index schema accepts `{schemaVersion, updatedAt, entries}` of active listings and rejects entries carrying a token, hash or template text
- [x] T005 Implement `packages/schema/src/entity-template-listing.ts` per `data-model.md` (`EntityTemplateListingSchema`, `EntityTemplateDirectoryQuerySchema`, `EntityTemplateDirectoryResultSchema` with `previewMarkdown`, `EntityTemplateDirectoryPageSchema` with `facets.entityTypes`, `EntityTemplateReportInputSchema`, `EntityTemplateReportRecordSchema`, `EntityTemplateIndexSchema`, exported types) and re-export from the package index; do not edit `publishing.ts` (depends on T004)

### Pure extractions (existing tests must stay green)

- [x] T006 Run the existing stat sheet worker tests first to record a green baseline (`worker/__tests__/directory.test.ts`, `worker/__tests__/template-directory.performance.test.ts`). Then extract `cors`, `json`, `readJson`, `ownerToken`, `hashOwnerToken`, `authorize`, `getTemplateListingKey`, `getTemplatePackageKey` and the `TemplateDirectoryEnv` type from `worker/template-directory.ts` into a new `worker/template-directory-shared.ts`, and import them back. Add `worker/__tests__/template-directory-shared.test.ts` covering token parsing (Bearer and bare), hash stability, `authorize` outcomes (401 missing, 404 unknown, 401 wrong, pass) and `json`/CORS headers, so the split gains its own coverage. No behaviour change; re-run the baseline tests and confirm they pass
- [x] T007 Move the inline `/api/template-directory/*` routing block (admin suspensions, `/listings`, `/listings/:id`, `/package`, `/report`) out of `worker/index.ts` into a new `worker/template-directory-routes.ts` exporting `handleTemplateDirectoryRoutes(request, env, pathname): Promise<Response | null>`, leaving a single call in `index.ts`. The origin check and `enforcePublishRateLimit` call stay in `index.ts` before it. Add `worker/__tests__/template-directory-routes.test.ts` covering each existing route reaching the right handler, 405 for unsupported methods, and `null` for unrelated paths. No behaviour change; re-run the T006 baseline (depends on T006)
- [x] T008 [P] Extract the base-URL resolution and error-message helpers from `web/services/publishing/PublicTemplateDirectoryService.ts` into `web/services/publishing/template-directory-http.ts` (`getTemplateDirectoryBaseUrl(deps)` and a small `assertOk(response, message)`), with a small test file `template-directory-http.test.ts`, and use them from the existing service. No behaviour change; the existing `PublicTemplateDirectoryService` tests pass unchanged

### Summary index (worker foundation)

- [x] T009 Extend the test bucket `worker/__tests__/r2-memory-bucket.ts` with an operation counter (`get`, `head`, `put`, `delete`, `list` counts and a reset) and conditional writes (`onlyIf: { etagMatches }` returning `null` on a mismatch, plus an injectable one-time conflict), and add a short test for the additions; existing tests that use the bucket must still pass
- [x] T010 [P] Write failing tests `worker/__tests__/template-directory-index.test.ts`: reading a missing index returns an empty list; `upsert` adds and replaces by `listingId` and keeps newest-updated-first order; `remove` drops an entry and is idempotent; a conditional-write conflict retries and succeeds; retries exhausted throws (negative); a corrupted or schema-invalid index reads as empty and is not overwritten by a read (negative); entries never contain a token, hash or template text; a 1,000-entry index stays under 1 MB; each operation uses at most 3 bucket operations (depends on T005, T009)
- [x] T011 Implement `worker/template-directory-index.ts` (`readEntityIndex`, `upsertEntityIndexEntry`, `removeEntityIndexEntry`, key `templates/index/entity.json`, etag-conditional writes with a bounded retry, summary projection from a listing) until T010 passes (depends on T005, T006, T010)

**Checkpoint**: Engine projection, schemas and the summary index exist; the worker and service are ready for entity code with all stat sheet tests still green.

---

## Phase 3: User Story 1 - Browse and filter community entity templates (Priority: P1) 🎯 MVP

**Goal**: A user opens the directory, switches to Entity templates, filters by entity type and label, searches, and sees cards. Stat sheet listings are untouched.

**Independent Test**: Seed R2 with entity listings of several types and labels (plus one stat sheet listing, one malformed record, one `unpublished` and one suspended) and the matching index, browse, filter, search, and confirm only the matching active summaries appear, facets are correct, browse stays within its R2 operation budget, and the stat sheet view is unchanged.

### Tests for User Story 1 (write first, confirm they fail)

- [x] T012 [P] [US1] Write failing worker contract tests `worker/__tests__/entity-template-directory.list.test.ts` (using `r2-memory-bucket.ts`): `kind=entity` is served from the summary index and returns only active, non-suspended entity listings newest first; `entityType` filter is case-insensitive; `labels` uses AND; `q` matches title, description, entity type and labels; `facets.entityTypes` counts ignore the type filter and merge `Faction`/`faction`; pagination with `cursor`/`limit`; a missing or corrupted index returns an empty page, not an error (negative); invalid query returns 400 (negative); no response contains `ownerToken`, `ownerTokenHash` or template text; a browse request uses at most 5 bucket operations; a request without `kind` returns exactly the stat sheet results as before and never includes entity listings (SC-010)
- [x] T013 [P] [US1] Write failing worker tests `worker/__tests__/entity-template-directory.detail.test.ts`: `GET /listings/:id` returns the entity listing plus `previewMarkdown` for an active listing; a stat sheet id still returns the stat sheet result; `unpublished`, suspended, deleted and missing return 404; `GET /listings/:id/package` returns the public package for active and 404/422 for unpublished/suspended/malformed
- [x] T014 [P] [US1] Write the scale check `worker/__tests__/entity-template-directory.performance.test.ts`, modelled on the existing `template-directory.performance.test.ts`: seed 1,000 entity listings and their index, run browse with and without filters, assert every request uses at most 5 bucket operations and finishes within 2 s p95 CPU time on the fixture
- [x] T015 [P] [US1] Write failing worker tests `worker/__tests__/entity-template-directory.rebuild.test.ts`: `POST /admin/rebuild-index` requires the operator token (401 otherwise); it rebuilds the index from listings in bounded batches with a `cursor` and `nextCursor`; it skips `unpublished` and suspended listings and stat sheet listings; running it after the index is deleted or corrupted restores browse; a malformed listing is skipped without failing the batch (negative)
- [x] T016 [P] [US1] Write failing service tests `web/services/publishing/PublicEntityTemplateDirectoryService.list.test.ts`: `listEntityTemplates` builds the query string (`kind=entity`, `q`, `entityType`, `labels`, `cursor`, `limit`), parses the page with facets, and throws a plain-language error on non-OK, network failure and a malformed body (negative); `getEntityTemplateListing` returns the result, returns `null` on 404 and throws otherwise; browse and detail requests carry no request body and no vault identifiers (FR-014)

### Implementation for User Story 1

- [x] T017 [US1] Implement `worker/entity-template-directory.ts` read handlers: `handleListEntityTemplateListings` (single read of the summary index via `template-directory-index.ts`; filters, facets, sort and cursor per `contracts/api.md`; no per-listing reads and no suspension lookup), `handleGetEntityTemplateListing` and `handleGetEntityTemplatePackage` (validate with `toPublicEntityPackage` and the listing schema, check the suspension marker). Use helpers from `template-directory-shared.ts` (depends on T003, T005, T006, T011, T012, T013, T014)
- [x] T018 [US1] Implement `handleRebuildEntityTemplateIndex` in `worker/entity-template-directory.ts` (operator-token check reusing `TEMPLATE_ADMIN_TOKEN`, bounded batches of 200, `cursor`/`nextCursor`, skips unpublished, suspended and stat sheet listings) and route `POST /admin/rebuild-index` in `worker/template-directory-routes.ts` (depends on T007, T011, T015, T017)
- [x] T019 [US1] Add the kind dispatch to `worker/template-directory.ts` and `worker/template-directory-routes.ts`: list with `kind=entity`, and get/package for a record whose raw `templateKind` is `"entity"`, delegate to T017; everything else keeps calling the existing stat sheet handlers unchanged, and the stat sheet list handler explicitly skips records whose `templateKind` is not absent/`stat-sheet` (depends on T007, T017)
- [x] T020 [US1] Implement `web/services/publishing/PublicEntityTemplateDirectoryService.ts` with `listEntityTemplates`, `getEntityTemplateListing` and `downloadEntityTemplatePackage` using `template-directory-http.ts`, constructor-injected `fetch`/`baseUrl`, and an exported singleton (depends on T005, T008, T016)
- [x] T021 [P] [US1] Write failing component tests `web/components/stats/community-template/TemplateDirectory.entity.test.ts`: a kind switch (Entity templates / Stat sheet templates) changes the data source and resets filters; entity view shows cards with name, description, entity type, labels, display name and updated date; the entity-type filter lists built-in types first then others from facets; the label filter and search apply and can be cleared; empty state keeps the query and filters; a failed load shows a retryable error while the stat sheet view still works (negative); the stat sheet view renders exactly as before
- [x] T022 [US1] Add the kind switch (`?kind=entity` in the URL) as `web/components/community-templates/TemplatesDirectoryPage.svelte`, rendered by `web/routes/(app)/templates/+page.svelte`, with the entity list in `EntityTemplateBrowse.svelte`. The stat sheet list only adopts the shared `DirectorySearchForm`, `DirectoryFeedback` and `TemplateCardShell` pieces (depends on T020, T021)

**Checkpoint**: US1 works with seeded data and is the MVP browse experience.

---

## Phase 4: User Story 2 - Preview and install a community template (Priority: P1)

**Goal**: Open a listing, preview the note it produces, and install it as an ordinary user template without touching defaults or entities.

**Independent Test**: Preview a listing, install it into a test vault, confirm it appears as a user template with identical text, the default for its type is unchanged, and existing entities are untouched; failures leave the vault unchanged.

### Tests for User Story 2 (write first, confirm they fail)

- [x] T023 [P] [US2] Write failing tests `web/stores/entity-templates/entity-template-install.test.ts` with a fake store and service: a valid package installs through exactly one `create()` and produces byte-identical markdown; `setDefault` is never called and no entity API is touched; the installed template holds no reference to the listing, so a later listing update, unpublish or delete changes nothing locally (FR-013); a same-name, same-type collision (case-insensitive) returns `needs-name` and writes nothing until a new name is supplied; cancel writes nothing (cancellation path); an invalid or newer-version package returns an error and writes nothing (negative); a download failure and a 404 ("no longer available") write nothing; a custom entity type unknown to the vault still installs and reports a notice that the vault has no such category yet; a read-only store returns an error without downloading (FR-025); the only network request made is the package download, with no body and no vault identifiers (FR-014)
- [x] T024 [P] [US2] Extend `web/stores/entity-templates/no-entity-mutation.test.ts` with an install case proving entities, defaults and legacy files are byte-for-byte unchanged after installing a package (SC-003, SC-005)
- [x] T025 [P] [US2] Write failing component tests `web/components/community-templates/EntityTemplateListingDetail.test.ts` and `EntityTemplateInstallModal.test.ts`: detail shows description, entity type, labels, attribution and a preview of the note; an unavailable listing shows a recoverable message; Install opens the modal; a name collision asks for a new name or cancel; success confirms without changing the default; failure shows a plain-language error and offers retry; in a read-only vault Preview works and Install is disabled with an explanation; opening a stat sheet id in the entity view or the reverse shows the right kind or "not found"

### Implementation for User Story 2

- [x] T026 [US2] Implement `web/stores/entity-templates/entity-template-install.ts` (`installEntityTemplate({ listingId, name?, service, store })` returning `installed | needs-name | error`, using `importTemplatePackage` then one `store.create()`; never imports `setDefault`; exported factory with injected deps per Constitution VIII) (depends on T020, T023)
- [x] T027 [P] [US2] Create `web/components/community-templates/EntityTemplateListingDetail.svelte` (metadata, note preview, Install button, unavailable state, `<svelte:head>` with `<meta name="robots" content="noindex">`) and `web/components/community-templates/EntityTemplateInstallModal.svelte` (rename-or-cancel, progress, result), using the Svelte 5 Runes patterns from `stats/community-template/TemplateImportModal.svelte` (depends on T025, T026)
- [x] T028 [US2] Give entity listings their own route `web/routes/(app)/templates/entity/[listingId]/+page.svelte` (rendering `EntityListingPage`), and add `web/routes/(app)/templates/[listingId]/+page.ts` so an entity id opened at the Stat Sheet address is redirected there. The Stat Sheet detail page is unchanged, and a Stat Sheet id opened at the entity address is sent to its own page (depends on T020, T027)

**Checkpoint**: US1 + US2 give browse, preview and install end to end.

---

## Phase 5: User Story 3 - Publish, update, unpublish, delete and recover (Priority: P1)

**Goal**: Publish your own entity template from the Entity Templates list, keep the owner token on the device, update and unpublish/republish the same listing, delete it permanently, and recover controls after clearing browser data.

**Independent Test**: Publish a user template with metadata, see it in the directory with the right kind, type and labels and with only the four package fields shared; update without a duplicate; unpublish and republish at the same address; delete permanently and confirm nothing remains public; clear site data and recover with the token.

### Tests for User Story 3 (write first, confirm they fail)

- [x] T029 [P] [US3] Write failing worker tests `worker/__tests__/entity-template-directory.write.test.ts`: create requires the acknowledgment (400 otherwise), validates through `toPublicEntityPackage` and `validatePublishMetadata`, returns `201 { listing, ownerToken }`, stores only the token hash as custom metadata, writes both objects and an index entry, and the response and stored records contain no token or hash; a body with extra package fields is stored without them; `PUT` with the right token updates in place, sets `active` and refreshes the index entry (republish); wrong or missing token returns 401 (negative); a suspended listing returns 403 `removed_by_operator` for `PUT`, `unpublish`, `DELETE` and `GET /owner` (negative); `POST /unpublish` hides the listing from list, detail and package, removes its index entry and is idempotent; unpublish then `PUT` restores it to browse at the same `listingId`; `DELETE` with the right token removes `listing.json`, `package.json` and the index entry, works from `active` and `unpublished`, returns 401 with a wrong token and 404 when repeated, and leaves report records (negative and success); `GET /owner` returns listing and package for active and unpublished with the right token and 401 with a wrong one; after each transition the index equals the set of active, non-suspended entity listings; two concurrent publishes both appear in the index
- [x] T030 [P] [US3] Write failing tests `web/stores/publishing/entity-template-publish-registry.test.ts`: save and read a link keyed by vault and template; the owner token is saved through `saveTemplateOwnerToken`; relinking replaces the previous link for that vault and template; a link for another vault is not returned; clearing removes the link and the saved token; nothing is written outside IndexedDB `settings` and no template file or export contains the link or token (negative)
- [x] T031 [P] [US3] Write failing service tests `web/services/publishing/PublicEntityTemplateDirectoryService.write.test.ts`: `publishEntityTemplate` sends the package and metadata with `rightsAcknowledged: true`, saves the token, returns the listing; a failed publish saves nothing (negative); `updateEntityTemplate`, `unpublishEntityTemplate`, `deleteEntityTemplate` and `verifyOwner` send the Bearer token and map 401, 403 `removed_by_operator` and 404 to distinct plain-language errors; a failed delete leaves the saved token in place so it can be retried (negative); network failure throws a retryable error
- [x] T032 [P] [US3] Write failing store tests `web/stores/entity-templates/entity-template-publish-store.test.ts`: publish links the template only after the worker confirms; a failed publish leaves no link (negative); an already published template exposes `update`, `unpublish` and `delete` and not `publish` (scenario 9); update sends the current template text; unpublish sets status and republish reuses the same listing; delete clears the link and token only after the worker confirms, and a failed delete keeps them (scenario 12); a built-in or legacy template cannot be published directly (must be duplicated); a read-only vault blocks publish, update, unpublish and delete (FR-025); a template edited after publishing can still be updated; deleting the local template keeps the link and the delete confirmation copy says the listing stays until unpublished or deleted; recovery with a valid token restores the link, relinks automatically when exactly one local template matches by name and entity type, asks the user to choose when several match, and offers installing a copy when none match; recovery with a wrong token or an operator-removed listing shows the right message and links nothing (negative); the same vault on another device shows the template as unpublished (scenario 10)
- [x] T033 [P] [US3] Write failing component tests `web/components/community-templates/EntityTemplatePublishModal.test.ts` and `OwnerControls.test.ts`: the modal shows the full body in the preview, live counters for description and labels, blocks publishing with an empty body, no label, over-limit fields and a missing acknowledgment with plain-language messages (negative), states what becomes public and how to unpublish or delete, shows the owner token with copy/export controls after success, and keeps the form intact on failure; owner controls show Update, Unpublish, Republish and Delete permanently by status, Delete permanently asks for explicit confirmation and can be cancelled without any request (cancellation path), a failed delete keeps the controls and offers retry, and the recovery form accepts a listing link and token

### Implementation for User Story 3

- [x] T034 [US3] Implement the write handlers in `worker/entity-template-directory.ts`: `handleCreateEntityTemplateListing`, `handleUpdateEntityTemplateListing` (also republish), `handleUnpublishEntityTemplateListing`, `handleDeleteEntityTemplateListing`, `handleEntityTemplateOwner`, each with the suspension check and token authorization from `template-directory-shared.ts` and an index update through `template-directory-index.ts`; extend `worker/template-directory-routes.ts` to dispatch entity package bodies on `POST`/`PUT`, add `POST .../unpublish` and `GET .../owner`, and dispatch `DELETE` for entity records (stat sheet `DELETE` stays on its existing handler). Create keeps using the existing create rate limiter (depends on T003, T005, T011, T017, T019, T029)
- [x] T035 [P] [US3] Implement `web/stores/publishing/entity-template-publish-registry.ts` (link get/set/clear with `{ vaultId, templateId } → { listingId, status, publishedAt }`, reusing `saveTemplateOwnerToken`/`getTemplateOwnerToken`/`deleteTemplateOwnerToken`) (depends on T030)
- [x] T036 [US3] Add `publishEntityTemplate`, `updateEntityTemplate`, `unpublishEntityTemplate`, `deleteEntityTemplate` and `verifyOwner` to `web/services/publishing/PublicEntityTemplateDirectoryService.ts` (depends on T020, T031)
- [x] T037 [US3] Implement `web/stores/entity-templates/entity-template-publish-store.svelte.ts` (constructor DI: service, registry, `getVaultId`, template store, `isReadOnly`; exported class and singleton; publish, update, unpublish, republish, delete, recover and relink per T032; reads the vault id from `vault-registry.svelte.ts`) (depends on T032, T035, T036)
- [x] T038 [P] [US3] Create `web/components/community-templates/EntityTemplatePublishModal.svelte` (fields, live counters, full-body preview, acknowledgment, token display with copy/export) and `web/components/community-templates/OwnerControls.svelte` (Update, Unpublish, Republish, Delete permanently with confirmation, recovery form reusing the copy pattern of `stats/community-template/TemplateOwnerRecovery.svelte`) (depends on T033, T037)
- [x] T039 [US3] Add Publish, Update, Unpublish and Delete permanently actions and a "Published" badge to `web/components/settings/entity-templates/EntityTemplateRow.svelte` (117 lines) and wire the modal in `EntityTemplateSettings.svelte` (197 lines); built-in and legacy rows offer Duplicate first with an explanation instead of Publish; hidden in read-only vaults; extend `EntityTemplateSettings.test.ts` for the new actions (depends on T037, T038)
- [x] T040 [US3] Show `OwnerControls` on the listing detail when the device holds the token for the listing, and add the recovery entry point to `EntityTemplateListingDetail.svelte` (depends on T027, T038)

**Checkpoint**: US1–US3 give the full publish, browse, preview, install and manage loop, including erasure.

---

## Phase 6: User Story 4 - Report and take down unsuitable listings (Priority: P2)

**Goal**: Anyone can report a listing (once per device, with minute and daily caps), owners can unpublish or delete their own, and the operator can take any listing down and read the reports.

**Independent Test**: Report a listing and see a confirmation; report again and be told it was already reported; exceed the caps and see "try again later"; take a listing down as owner and as operator; read the report count as operator.

### Tests for User Story 4 (write first, confirm they fail)

- [x] T041 [P] [US4] Write failing worker tests `worker/__tests__/entity-template-directory.report.test.ts`: a valid report returns 201 and stores `moderation/template-reports/{listingId}/{reportId}.json`, a de-duplication marker and increments the daily quota counter; a second report from the same address for the same listing returns 409 `already_reported` and stores nothing new; a different listing from the same address succeeds; the reporter hash is an HMAC keyed by `TEMPLATE_REPORT_HASH_KEY` (same address gives the same hash, a different key gives a different hash, and no stored key or response contains the raw address); without `TEMPLATE_REPORT_HASH_KEY` the endpoint returns 503 `reporting_unavailable` and stores nothing (negative); the 21st report from one address in a day returns 429 even when the rate-limit binding is absent, and an exhausted per-minute binding returns 429, storing nothing (negative); an invalid reason and over-long details return 400 (negative); a missing, `unpublished`, deleted or suspended listing returns 404; `GET /admin/reports?listingId=` returns the count and each reason and details, requires the operator token (401 otherwise), and never returns reporter hashes; the operator suspension endpoint hides an entity listing, removes it from the summary index, and owner `PUT`, `unpublish` and `DELETE` then return 403 (final takedown)
- [x] T042 [P] [US4] Write failing service and component tests `web/services/publishing/PublicEntityTemplateDirectoryService.report.test.ts` and `web/components/community-templates/ReportListingModal.test.ts`: `reportEntityTemplate` sends `reason` and `details`; 409 maps to "You've already reported this", 429 to "Too many reports, try again later", 503 to "Reporting isn't available right now", other failures to a retryable error; the modal requires a reason, remembers reported ids on the device (`entityTemplateReported:{listingId}`) and shows the already-reported message without a request; a failed request can be retried without creating a duplicate

### Implementation for User Story 4

- [x] T043 [US4] Implement `handleReportEntityTemplateListing` and `handleAdminEntityTemplateReports` in `worker/entity-template-directory.ts` (HMAC reporter hash, de-duplication marker, per-listing report keys, daily quota counter, 503 without the key, operator-token check reusing `TEMPLATE_ADMIN_TOKEN`), route them in `worker/template-directory-routes.ts` (entity ids on `/report`, plus `GET /admin/reports`), and apply `TEMPLATE_REPORT_RATE_LIMITER` inside the entity report handler after the listing is known to be an entity listing, keyed by the address hash (this leaves `enforcePublishRateLimit` in `worker/index.ts` untouched, so stat sheet reports keep their existing limiter; when the binding is absent the daily quota still applies) (depends on T001, T019, T034, T041)
- [x] T044 [US4] Update `handleAdminSuspendTemplateListing` in `worker/template-directory.ts` to call `removeEntityIndexEntry` from `worker/template-directory-index.ts` after writing the suspension marker (a no-op for stat sheet ids), keeping stat sheet behaviour unchanged, and cover it in the T041 tests (depends on T011, T041)
- [x] T045 [US4] Add `reportEntityTemplate` to `web/services/publishing/PublicEntityTemplateDirectoryService.ts` with typed error mapping (depends on T036, T042)
- [x] T046 [P] [US4] Create `web/components/community-templates/ReportListingModal.svelte` (reason choice, optional details, remembered reports) and add a Report action to `EntityTemplateListingDetail.svelte` (depends on T027, T042, T045)

**Checkpoint**: US4 completes the safety valve; operator takedown works via the existing suspension endpoint and keeps the index in step.

---

## Phase 7: User Story 5 - Help and governance (Priority: P3)

**Goal**: First-time users can find plain-language help, and the feature respects the discovery and indexing rules.

**Independent Test**: Open help from the publish and install flows and check its content; run the discovery audit; confirm the entity listing page carries `noindex`.

### Tests for User Story 5 (write first, confirm they fail)

- [x] T047 [P] [US5] Write failing tests `web/config/help-content.entity-sharing.test.ts` (or extend the existing help-content test if one exists): the `sharing-templates` article exists and mentions what is shared, that the full body becomes public, how to unpublish and delete permanently, that installs are independent local copies and that operator removal is final; the `entity-templates` article links to it; neither article uses the word "tags"
- [x] T048 [P] [US5] Extend `web/components/community-templates/EntityTemplateListingDetail.test.ts` and `EntityTemplatePublishModal.test.ts` to assert the `noindex` robots meta on the listing detail, and that both the publish modal and install modal link to the help article

### Implementation for User Story 5

- [x] T049 [US5] Extend the `entity-templates` article and add a `sharing-templates` article in `web/config/help-content.ts` (data catalogue; register the new id wherever help ids are enumerated), then link both from `EntityTemplatePublishModal.svelte` and `EntityTemplateInstallModal.svelte` (depends on T027, T038, T047, T048)
- [x] T050 [US5] Run `bun scripts/discovery-audit.mjs` and confirm it reports no errors and no new governed route; if it reports any, record the finding in `plan.md` under the Discovery Intent Check instead of adding a registry entry (no discovery page is added by this feature)

---

## Phase 8: Polish & Cross-Cutting Concerns

- [x] T051 [P] Re-run the whole stat sheet directory test set (worker, `PublicTemplateDirectoryService`, `TemplateDirectory`, `TemplatePublishModal`, `[listingId]` page) and confirm nothing changed (SC-010)
- [x] T052 [P] Confirm `worker/index.ts` and `worker/template-directory.ts` are shorter than before this feature (Constitution XIV) and that no touched non-test file over 500 lines gained unrelated behaviour
- [x] T053 Run impacted validation: `bun run lint:changed`, `bun run test:changed`, and `bunx svelte-check --tsconfig ./tsconfig.json --threshold error` in `apps/web` (plus `bun scripts/affected-workspaces.mjs` for the engine, schema and worker workspaces); never the repository-wide commands
- [ ] T054 Walk through `quickstart.md` manually against a local worker (publish, browse, install, update, unpublish, republish, delete permanently, recover, report twice, rebuild index, operator takedown, read-only vault) and record any deviations
- [x] T055 Run `bunx fallow audit --format json --quiet --explain --gate-marker agent` and fix reported findings before committing, then run the `codex-review` specialist review required by the PR quality gate

---

## Dependencies & Execution Order

- **Phase 1** has no dependencies. **Phase 2** follows it and blocks every story.
- Within Phase 2: T002→T003, T004→T005, T006→T007 and T009→T010→T011 are sequential chains; the chains and T008 run in parallel where they touch different files (T011 also needs T005 and T006).
- **US1** (Phase 3) needs Phase 2. **US2** needs US1's service (T020). **US3** needs US1's worker and service files (T017–T020), and US2's detail component for T040. **US4** needs US3's worker write handlers and service (T034, T036). **US5** needs the components from US2 and US3.
- Each story is testable on its own with seeded R2 fixtures and index, so US1 can ship first as the MVP.
- T017, T018, T019, T034, T043 and T044 all edit worker files that earlier tasks also edit; none is marked `[P]`.

## Parallel Opportunities

- Phase 2: T002, T004, T006, T008 and T009 start together.
- US1 tests T012–T016 and T021 are all in different files and run together; implementation then splits between worker (T017–T019) and web (T020, T022).
- US3 tests T029–T033 run together; T035 and T038 can proceed in parallel once their tests exist.
- US4 tests T041 and T042 run together.

## Implementation Strategy

1. **MVP**: Phases 1–3 (browse and filter). Validate with seeded data and the operation-budget check.
2. **Increment 2**: US2 (preview and install), so the directory is useful to people who did not write templates.
3. **Increment 3**: US3 (publish, manage and erase), which supplies real listings.
4. **Increment 4**: US4 (report and takedown). Do not open publishing to the public before this lands, and set `TEMPLATE_REPORT_HASH_KEY` in every deployed environment first.
5. **Finish**: US5 and Polish. Work test-first in every phase; commit only with the fallow audit passing.
