# Implementation Plan: Community Stat Sheet Template Directory

**Branch**: `150-stat-sheet-marketplace` | **Date**: 2026-07-31 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/150-stat-sheet-marketplace/spec.md`

## Summary

Add an opt-in community directory for reusable Stat Sheet layouts. A new
`@codex/stat-sheet-engine` package will own public projection, validation, and
version migrations. The web app will use it to create a preview, publish an
independent template listing, browse metadata, and atomically import a local
copy. The existing oracle-proxy worker and R2 bucket will receive template
specific endpoints and objects, reusing existing write-token, CORS, rate-limit,
and reporting/takedown conventions without coupling a template to a world.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 Runes, SvelteKit 2, Bun 1.3.14
**Primary Dependencies**: Zod/schema, `@codex/stat-sheet-engine`, existing
`PublicDirectoryService`/publishing services, Cloudflare Worker, R2, IndexedDB
**Storage**: R2 for public listing/package records; IndexedDB vault-scoped
templates and local publish registry; no account or relational database
**Testing**: Vitest unit/contract tests, Svelte component tests, worker route
tests, Svelte check, lint
**Target Platform**: Browser-first SvelteKit app plus Cloudflare Worker/R2 API
**Project Type**: Workspace library + web UI + serverless API
**Performance Goals**: Paginated directory responses and metadata-only browse;
search/filter interaction remains responsive for 1,000 listings, verified with
a representative fixture/benchmark
**Constraints**: Opt-in and privacy-preserving; no entity values or vault data
in public packages; imports are atomic; public writes require owner tokens
**Scale/Scope**: v1 publish, browse/search/filter, detail, import, update,
unpublish, report, and takedown controls; ratings/comments/social features are
out of scope

## Constitution Check

- **Library-first**: PASS — public package projection, validation, and migration
  live in a standalone `packages/stat-sheet-engine` workspace package; Svelte
  components remain UI adapters.
- **TDD**: PASS — package, schema, worker, service, store, and route behavior
  each receive success and failure/cancellation tests.
- **Privacy/client-side**: PASS — only an explicit structural projection leaves
  the browser; imports validate before one local save operation.
- **DI**: PASS — network and persistence dependencies are constructor-injected
  in services/stores, with production singletons as defaults.
- **Style/accessibility/natural language**: PASS — Svelte 5 Runes, semantic
  Tailwind tokens, Iconify classes, keyboard-accessible controls, and plain
  user-facing error states are required.
- **Documentation**: PASS — update and register the Stat Sheets help article in
  `apps/web/src/lib/config/help-content.ts` with publishing, unpublishing,
  privacy, and local-import behavior.
- **Validation**: PASS — affected tests plus repository lint and test commands
  are part of delivery verification.

## Project Structure

```text
packages/stat-sheet-engine/
├── src/                         # projection, package schema, migration
└── src/*.test.ts                # validation, privacy, migration tests
packages/schema/src/
├── stat-sheet.ts                # shared local model/version types
└── publishing.ts                # shared transport schemas where appropriate
apps/workers/oracle-proxy/src/
├── template-directory.ts        # independent R2 listing/package handlers
├── index.ts                     # template routes and rate-limit dispatch
└── __tests__/template-directory.test.ts
apps/web/src/lib/services/publishing/
├── PublicTemplateDirectoryService.ts
└── PublicTemplateDirectoryService.test.ts
apps/web/src/lib/stores/
└── stat-sheet-templates.svelte.ts # atomic import/publish registry integration
apps/web/src/lib/components/stats/community-template/
└── publish, browse, detail, and import components
apps/web/src/routes/(app)/templates/
├── +page.svelte                  # browse and search
└── [listingId]/+page.svelte      # metadata/detail/import
apps/web/src/lib/content/help/
└── stat-sheets.md                # user-facing guidance
```

**Structure Decision**: Use the existing monorepo split. Domain-safe template
logic belongs in a standalone workspace package; R2 access belongs in the
existing Cloudflare Worker; IndexedDB and UI orchestration remain in `apps/web`.
The worker uses a separate `templates/` R2 namespace so world publishing data
and template data cannot be confused.

## Complexity Tracking

No constitution violations identified. The standalone package is required by
the library-first principle and contains only reusable projection, validation,
and migration logic needed by both browser and worker boundaries.

## Implementation Phases

### Phase 0 — Research decisions

1. Treat `StatSheetTemplateSchema` as the local source of truth and publish a
   value-free structural projection (`id`, `label`, `type`, `formula`, `min`,
   `max`, `step`) with no `value`, `collapsed`, entity, or vault fields.
2. Require at least one of the free-form `system` or controlled `category`
   metadata fields; represent section structure with ordered `heading` fields.
3. Use a versioned package envelope with explicit migrations for supported older
   versions and a clear rejection for newer/unknown versions.
4. Store independent listing metadata and package objects under R2 keys scoped
   by a generated template listing ID. Authorize PUT/DELETE with the listing's
   owner token stored as private object metadata; never place it in JSON.
5. Return metadata-only paginated results. Search name, description, system,
   category, and labels; keep systems free-form and validate categories against
   the existing controlled entity category vocabulary.
6. Let creators copy/export the owner token at publication and re-enter it to
   recover controls after browser data loss; admin takedown remains an
   operator-authenticated suspension action.

### Phase 1 — Design and contracts

The data model, API contract, package envelope, and local import flow are
documented in [data-model.md](./data-model.md),
[contracts/api.md](./contracts/api.md), and
[contracts/template-package.md](./contracts/template-package.md).

### Phase 2 — Implementation order

1. Add schemas and `@codex/stat-sheet-engine` tests and implementation.
2. Add worker R2 handlers/routes and contract tests, including malformed,
   unauthorized, unavailable, and report/takedown cases.
3. Add the injected web service and publish-registry integration with tests.
4. Add browse/detail/import and publish/update/unpublish UI using Svelte 5
   Runes, semantic tokens, Iconify icons, and accessible loading/error states.
5. Add and register help content, verify performance/cache behavior, then run
   focused tests followed by `bun run lint` and `bun run test`.

## Verification Strategy

Success tests cover valid publish, browse, filter, detail, and import flows.
Negative tests cover private-data stripping, invalid/unsupported packages,
name collisions, cancellation, network failure, missing listings, bad owner
tokens, and unpublish/takedown behavior. Contract tests assert that public
responses never contain write credentials or campaign content.
