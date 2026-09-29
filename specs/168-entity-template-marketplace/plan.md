# Implementation Plan: Entity Template Marketplace

**Branch**: `168-entity-template-marketplace` | **Date**: 2026-09-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/168-entity-template-marketplace/spec.md`

## Summary

Extend the existing community template directory (spec 150) so it can also list **entity templates** (spec 167). One directory, one worker namespace, one owner-token model; a new `templateKind` discriminator separates the two kinds. A listing is the spec 167 `TemplatePackage` (name, entity type, markdown, format version) plus listing metadata (description, labels, display name). The package is projected through a strict public schema in `schema` so nothing but the four package fields ever leaves the browser.

New behaviour on top of what stat sheet listings already have: a reversible owner unpublish (listing kept, hidden), a permanent owner delete, a final operator takedown, per-device report de-duplication with minute and daily caps, a compact summary index so browse costs a handful of R2 operations, a per-template publish link kept on the device, and an install flow that creates an ordinary user template without touching defaults or entities.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 Runes, SvelteKit 2, Bun 1.3.14
**Primary Dependencies**: Existing `@codex/entity-template-engine`, `schema` (Zod), `PublicTemplateDirectoryService` pattern, Cloudflare Worker `oracle-proxy`, R2, IndexedDB (`idb`). **No new third-party dependency.**
**Storage**: R2 (`templates/listings/{id}/listing.json` + `package.json`, `templates/index/entity.json` summary index, `moderation/template-reports/{listingId}/{reportId}.json`, report de-duplication and daily quota markers, existing suspension markers); IndexedDB `settings` store for the device-local publish link and owner token; vault templates via the existing `EntityTemplateStore` (`.codex/templates/{id}.json`). No new persistence format in the vault.
**Testing**: Vitest (engine, schema, worker contract, service, store), Svelte component tests, a 1,000-listing browse benchmark fixture for the worker.
**Target Platform**: Browser-first SvelteKit app plus Cloudflare Worker/R2.
**Project Type**: Workspace library + web UI + serverless API.
**Performance Goals**: Browse/filter/search over 1,000 entity listings costs no more than 5 R2 operations per request (measured by counting bucket calls, since the in-memory test bucket cannot measure latency or the Worker subrequest limit) and stays within 2 s p95 in CPU time on the fixture (SC-002 leaves the user under 30 s end to end); install under 1 s for a 50,000-character body.
**Constraints**: Opt-in and privacy-preserving; public package carries no vault data, no ids, no credentials; installs are atomic; stat sheet directory behaviour unchanged (SC-010); no usage tracking (see Constitution V note below).
**Scale/Scope**: 1,000+ listings; publish, browse, filter, search, detail, preview, install, update, unpublish/republish, report, owner recovery, operator takedown and report review.

## Constitution Check

_GATE: passed before Phase 0; re-checked after Phase 1._

- **I Library-First — PASS.** The public projection, publishability rules and package version handling live in `packages/schema` (new `entity-template-public.ts`), because workers may only import `schema` (fallow boundary rule); the local package format stays in `packages/entity-template-engine`, and a test in `apps/web` keeps the two in step. Listing/transport Zod schemas live in `packages/schema` in a sibling file. The web app is a thin UI/orchestration layer.
- **II TDD — PASS.** Each layer gets tests written first: engine projection, schema, worker contract (success and failure), service, stores, components. Negative paths are listed in the Verification Strategy.
- **III Simplicity/YAGNI — PASS.** Reuses the spec 150 routes, service shape, owner-token storage, suspension marker and report storage. The one addition is a single compact summary object, justified because one R2 `get` per listing cannot meet the Worker subrequest limit at 1,000 listings (research D8); no database or search service. No install counts, ratings or update notifications.
- **IV AI-First — N/A.** No AI extraction in this feature.
- **V Privacy & client-side — PASS, exception not invoked.** Publishing is an explicit, per-listing _share_ of content the user just previewed, like world and stat sheet publishing, not remote storage or mirroring of vault data. Only `{name, entityType, markdown}` plus listing metadata is sent; installs send nothing about the vault. As a safeguard the six exception conditions are still met: (1) off by default, only the Publish action sends anything; (2) the publish dialog states in plain language what becomes public, that anyone can read it, that the hosting provider holds the bytes, how to unpublish, and shows the full body; (3) the owner can unpublish reversibly and can permanently delete the listing and its template text at any time, without support (operator-removed listings are the one exception, where the operator keeps the record); (4) the local template stays authoritative and is unchanged by publish/unpublish; (5) nothing is forwarded or used for training; (6) operators can read listings and report data, which the dialog and help article disclose. Reporters' network addresses are stored only as a keyed one-way hash (HMAC) for de-duplication and quotas.
- **VI Clean Implementation — PASS.** Svelte 5 Runes, Tailwind 4 semantic tokens and Iconify classes (`icon-[lucide--name]`), per `docs/STYLE_GUIDE.md`.
- **VII User Documentation — PASS.** Extend the `entity-templates` help article and add a "Sharing templates" article (what is shared, how to unpublish, installs are local copies), linked from the publish and install dialogs.
- **VIII DI — PASS.** New service and stores take constructor dependencies with production defaults and export a singleton.
- **IX Natural Language — PASS.** Plain user-facing strings ("Install", "Publish", "Take down my listing").
- **X Coverage — PASS.** The engine additions and new stores meet the 70%/50% goals; the worker file meets the 70% engine goal.
- **XI Operating rules — PASS.** Surgical changes; the touched large files are handled under XIV below.
- **XII Labels over Tags — PASS.** All user-facing metadata is "labels" (`labels` field, "Labels" filter). The spec was corrected from "tags" during planning.
- **XIII Discovery Intent — N/A (see check below).**
- **XIV Bounded Responsibility — PASS with planned extraction (see check below).**

### Discovery Intent Check

This feature adds no public, indexable discovery page. The directory and detail views are ordinary application routes under `(app)/templates`, client-rendered (`ssr = false`) and outside the governed route set (`governed-routes.ts`). Entity listing detail pages additionally carry a `noindex` robots meta so they are never offered for indexing (FR-023, User Story 5 scenario 3). Marked N/A; `bun scripts/discovery-audit.mjs` is still run once as a regression check that no governed route was affected.

- [x] Existing intent ownership checked — no discovery intent involved.
- [x] No new governed page; no registry entry required.
- [x] No synonyms or variants introduced as URLs.
- [x] No overlap with an existing discovery page.
- [ ] `bun scripts/discovery-audit.mjs` reports no errors (run at delivery).

### Bounded Responsibility Check

Existing files this feature touches that already exceed 500 lines (excluding tests and data modules):

| File                                                  | Lines | Plan                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/workers/oracle-proxy/src/index.ts`              | 1,219 | Do not append. Move the existing `/api/template-directory/*` routing block into a new `template-directory-routes.ts` and leave a single dispatch call in `index.ts` (net line reduction). The rate-limit selection for report/publish stays where it is, with one small addition for the report limiter.                      |
| `apps/workers/oracle-proxy/src/template-directory.ts` | 537   | Do not append entity behaviour. Extract the shared helpers (`cors`, `json`, owner-token hashing, `authorize`, R2 JSON reads) into `template-directory-shared.ts`; entity handlers live in the new `entity-template-directory.ts`. The stat sheet file keeps only its own handlers, plus a one-line kind dispatch in list/get. |
| `packages/schema/src/publishing.ts`                   | 679   | Not modified. New listing and query schemas go in a new `entity-template-listing.ts`, re-exported from the package index.                                                                                                                                                                                                     |

- [x] Files over 500 lines are listed with a plan.
- [x] New behaviour lives in new sibling modules or packages, not in the large files.
- [x] Extracted helpers keep their existing worker tests, and the new modules gain their own.
- `help-content.ts` is a data-only module and is exempt.

## Project Structure

### Documentation (this feature)

```text
specs/168-entity-template-marketplace/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── api.md                        # worker endpoints for entity listings
│   └── entity-template-package.md    # public package and projection rules
└── tasks.md                          # created by /speckit-tasks
```

### Source Code (repository root)

```text
packages/schema/src/
├── entity-template-public.ts         # NEW: strict public projection + publishability checks
├── entity-template-public.test.ts    # NEW
├── entity-template-listing.ts        # NEW: listing, query, result, facets, report schemas
├── entity-template-listing.test.ts   # NEW
└── index.ts                          # re-export

apps/workers/oracle-proxy/src/
├── template-directory-shared.ts      # NEW: helpers extracted from template-directory.ts
├── template-directory-routes.ts      # NEW: routing block extracted from index.ts
├── template-directory-index.ts       # NEW: summary index read/upsert/remove with conditional writes
├── entity-template-directory.ts      # NEW: create/get/list/update/unpublish/delete/owner/report/admin
├── template-directory.ts             # trimmed: stat sheet handlers only, kind dispatch on list/get
├── index.ts                          # single dispatch call replaces the inline block
└── __tests__/entity-template-directory.test.ts   # NEW (+ 1,000-listing operation-budget fixture)

apps/web/src/lib/services/publishing/
├── template-directory-http.ts        # NEW: shared base URL and error mapping
├── PublicEntityTemplateDirectoryService.ts   # NEW
├── PublicEntityTemplateDirectoryService.test.ts
└── PublicTemplateDirectoryService.ts # uses the shared helper only

apps/web/src/lib/stores/
├── publishing/entity-template-publish-registry.ts   # NEW: device-local link {vault, template} -> listing
├── entity-templates/entity-template-publish-store.svelte.ts   # NEW: publish/update/unpublish/recover state
├── entity-templates/entity-template-install.ts      # NEW: validate, resolve name collision, create (atomic)
└── entity-templates/entity-template-store.svelte.ts # unchanged (330 lines)

apps/web/src/lib/components/
├── community-templates/               # NEW
│   ├── TemplatesDirectoryPage.svelte  # Entity / Stat sheet tabs over the two lists
│   ├── EntityTemplateBrowse.svelte    # entity list, filters, load more
│   ├── EntityTemplateCard.svelte, TemplateCardShell.svelte
│   ├── DirectorySearchForm.svelte, DirectoryFeedback.svelte   # shared with the stat sheet list
│   ├── EntityListingPage.svelte       # probes the id, then shows the detail
│   ├── EntityTemplateListingDetail.svelte, EntityTemplateListingView.svelte
│   ├── EntityTemplateInstallModal.svelte, ReportListingModal.svelte, SharingHelpLink.svelte
│   ├── EntityTemplatePublishModal.svelte, PublishDetailsFields.svelte, PublishFeedback.svelte, PublishedTokenPanel.svelte
│   └── OwnerControls.svelte, OwnerRecoverForm.svelte
├── stats/community-template/TemplateDirectory.svelte   # stat sheet list, now using the shared pieces
└── settings/entity-templates/EntityTemplateRow.svelte, EntityTemplateShareActions.svelte

apps/web/src/routes/(app)/templates/
├── +page.svelte                       # renders TemplatesDirectoryPage
├── [listingId]/+page.ts               # NEW: sends an entity listing id to its own page
├── [listingId]/+page.svelte           # stat sheet detail, unchanged
└── entity/[listingId]/+page.svelte    # NEW: renders EntityListingPage

apps/web/src/lib/config/help-content.ts # extend "entity-templates", add "sharing-templates"
```

**Structure Decision**: Entity listings get their own detail address, `/templates/entity/[listingId]`, so the Stat Sheet detail page stays untouched; opening an entity id at the Stat Sheet address redirects, and the reverse redirects too. Use the existing monorepo split. Portable, browser-and-worker-shared logic goes into the two existing packages; R2 access stays in the existing worker; IndexedDB and UI orchestration stay in `apps/web`. Entity and stat sheet listings share the `templates/listings/` R2 namespace and are told apart by `templateKind` (a missing value means `stat-sheet`), so existing listings need no migration.

## Complexity Tracking

No constitution violations. The two extractions (`template-directory-shared.ts`, `template-directory-routes.ts`) are required by Principle XIV because the files being edited already exceed 500 lines.

## Implementation Phases

### Phase 0 — Research

See [research.md](./research.md). All open design questions are resolved there (kind discriminator, lifecycle, report de-duplication, publish link, install atomicity, scale, indexing).

### Phase 1 — Design and contracts

See [data-model.md](./data-model.md), [contracts/api.md](./contracts/api.md), [contracts/entity-template-package.md](./contracts/entity-template-package.md) and [quickstart.md](./quickstart.md).

### Phase 2 — Implementation order (for `/speckit-tasks`)

1. Engine: `public-package.ts` (projection, publishability, version handling) with tests.
2. Schema: `entity-template-listing.ts` with tests.
3. Worker: extract shared helpers and routing (pure refactor, existing tests stay green), then entity handlers with contract tests and the 1,000-listing benchmark.
4. Web service and device-local registry, then the publish store and install flow.
5. UI: directory kind switch and filters, listing detail with preview, install modal, publish modal, owner controls and recovery, report modal, `noindex`.
6. Help content and deployment notes (new `TEMPLATE_REPORT_HASH_KEY` secret); run the impacted lint, tests and type-check (`bun run lint:changed`, `bun run test:changed`, scoped `svelte-check`), `bun scripts/discovery-audit.mjs`, then `codex-review`.

## Verification Strategy

- **Success paths**: publish with preview and acknowledgment; browse, filter by entity type and label, search; preview and install; update; unpublish and republish; permanent delete; summary index rebuild; owner recovery with relink; report; operator takedown; read-only vault browse and preview.
- **Negative paths**: permanent delete failing and retrying; delete of an operator-removed listing; report without the hash key configured; report over the minute and daily caps; concurrent index writes; a corrupted index; over-limit metadata; empty body; unsupported (newer) package version; extra fields stripped from the public package; wrong or missing owner token; token on a suspended listing; report twice from one device; report over the rate cap; install into a vault with a name collision (rename and cancel); install failure mid-way leaves the vault unchanged; network loss on every call; unpublished listing opened or installed mid-view.
- **Invariants asserted in tests**: public responses never contain the owner token, its hash, reporter hashes or vault ids; install never changes any default or entity (extends `no-entity-mutation.test.ts`); stat sheet directory tests are unchanged and green (SC-010); installed text equals published text byte for byte (SC-007).
- **Scale check**: the 1,000-listing fixture asserts an R2 operation budget per browse request, not wall time.
- **Validation commands** (impacted only, per repository rules): `bun run lint:changed`, `bun run test:changed`, `bunx svelte-check --tsconfig ./tsconfig.json --threshold error` in `apps/web`, `bun scripts/discovery-audit.mjs`.
