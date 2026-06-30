# Implementation Plan: Public World Directory

**Branch**: `139-public-world-directory` | **Date**: 2026-06-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/139-public-world-directory/spec.md`

## Summary

Implement an opt-in public directory for already-published read-only guest vault snapshots. The directory stores a saved owner-approved `PublicListing` record separate from guest snapshot publishing, exposes browse/search/filter over listing metadata only, and links visitors only to the read-only guest view from `135-guest-vault-r2`.

The implementation extends the existing Cloudflare Worker + R2 publish layer from `135-guest-vault-r2`: listing records live under a separate R2 prefix, use the snapshot write token for owner mutations, and are removed when the underlying snapshot is unpublished. Client UI remains a thin Svelte layer over schema validation and service logic.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 Runes, SvelteKit 2, Bun 1.3.14  
**Primary Dependencies**: Existing Cloudflare Worker runtime/wrangler, Cloudflare R2, Svelte 5, Tailwind 4 semantic tokens, Iconify utility classes, existing `schema` and `@codex/vault-engine` packages  
**Storage**: Cloudflare R2 bucket (`codex-cryptica-statics`) for public listing records; existing R2 guest snapshot bundle/assets from `135-guest-vault-r2`; browser IndexedDB for local publish registry  
**Testing**: `bun run lint`, `bun run test`; focused Vitest/Bun tests for schema/service/worker routes; Svelte component and route tests for owner controls and public directory  
**Target Platform**: Modern browser, SvelteKit web app, Cloudflare Workers  
**Project Type**: Web application + serverless Worker proxy + workspace library/schema extensions  
**Performance Goals**: Directory browse/search returns first page within 500ms for 1,000 listings; delist removes the listing from Worker responses within 30 seconds; owner preview/update interactions respond locally within 200ms after required data is available  
**Constraints**: Listing is never enabled automatically; directory search indexes only saved owner-approved listing metadata; no editable URLs, write tokens, local vault IDs, internal entity IDs, private notes, hidden relationships, generation prompts, or private metadata in listing records or search responses; no user-facing "tags" terminology  
**Scale/Scope**: First version supports a lightweight public directory with browse, title/description search, label filters, preview, enable/update, and delist; moderation, reporting, featured listings, comments, ratings, social networking, and search-engine indexing are out of scope

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                           | Status | Direct Application in Design                                                                                                                                                                                                                                                       |
| ----------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Library-First                    | Passed | Listing validation types live in `packages/schema`; owner/public directory service logic is isolated in `apps/web/src/lib/services/publishing/` and pure listing helpers can be placed in `@codex/vault-engine` if they operate on vault/publish data. The Svelte UI remains thin. |
| II. TDD                             | Passed | Add failing tests first for listing schema validation, Worker authorization/privacy boundaries, owner enable/update/delist flows, and public browse/search/filter behavior.                                                                                                        |
| III. Simplicity & YAGNI             | Passed | Reuse the existing Worker/R2 publish layer. Do not add a database, search service, moderation system, social features, or SEO indexing in v1.                                                                                                                                      |
| V. Privacy & Client-Side Processing | Passed | Listing metadata is a saved owner-approved record and never live-mirrors editable world/profile fields. Directory search operates only on listing records, not guest bundles or local vault data.                                                                                  |
| VI. Clean Implementation            | Passed | UI must follow `docs/STYLE_GUIDE.md`: Svelte 5 runes, Tailwind 4 semantic tokens, Iconify utility classes, and standard validation commands.                                                                                                                                       |
| VII. User Documentation             | Passed | Add or update a user-facing help article explaining the difference between sharing by link and listing publicly.                                                                                                                                                                   |
| VIII. Dependency Injection          | Passed | Directory client service uses constructor-injected `fetch`, base URL, registry accessors, and notification dependencies for testability.                                                                                                                                           |
| IX. Natural Language                | Passed | Confirmation, empty, and error states use plain language that clearly distinguishes "share by link" from "list publicly".                                                                                                                                                          |
| X. Quality & Coverage Enforcement   | Passed | New schema, service, Worker, and UI behavior receives focused success and failure-path tests without lowering existing coverage floors.                                                                                                                                            |
| XII. Labels over Tags               | Passed | Public classification uses `labels` throughout schemas, APIs, UI, and tests.                                                                                                                                                                                                       |

## Project Structure

### Documentation (this feature)

```text
specs/139-public-world-directory/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── api.yaml
├── checklists/
│   └── requirements.md
└── tasks.md              # Created later by /speckit.tasks
```

### Source Code (repository root)

```text
packages/schema/src/
├── publishing.ts                         # Extend with PublicListing schemas and limits
└── publishing.test.ts                    # Listing schema/validation tests

apps/workers/oracle-proxy/src/
├── index.ts                              # Route public directory endpoints
├── publish.ts                            # Delete listing when snapshot is unpublished
├── directory.ts                          # Listing CRUD, browse/search/filter over R2 records
└── __tests__/
    └── directory.test.ts                 # Worker route, auth, privacy, deletion tests

apps/web/src/lib/services/publishing/
├── PublicDirectoryService.ts             # DI fetch client for owner and public listing APIs
└── PublicDirectoryService.test.ts

apps/web/src/lib/components/settings/
└── PublicListingSettings.svelte          # Owner preview, enable/update, delist controls

apps/web/src/routes/
├── (app)/settings/publishing/            # Integrate owner listing controls with publish settings
└── (marketing)/worlds/
    ├── +page.ts                          # Load public directory listing page
    ├── +page.svelte                      # Public directory browse/search/filter UI
    └── worlds.route.test.ts

apps/web/src/lib/config/help-content.ts   # Help article for sharing vs listing publicly
```

**Structure Decision**: Extend the existing `135-guest-vault-r2` Worker/R2 publish surface instead of introducing a new backend. Store public listing records as separate R2 JSON objects under `directory/listings/{publishId}.json`; owner mutations authenticate against the existing snapshot write token, and public browse/search reads listing records only. Client service and UI are scoped under publishing because public listing is a consent layer on top of published guest snapshots.

## Phase 0: Research

See [research.md](./research.md).

## Phase 1: Design & Contracts

- [data-model.md](./data-model.md)
- [contracts/api.yaml](./contracts/api.yaml)
- [quickstart.md](./quickstart.md)

## Post-Design Constitution Check

| Principle                           | Status | Notes                                                                                                 |
| ----------------------------------- | ------ | ----------------------------------------------------------------------------------------------------- |
| I. Library-First                    | Passed | Shared data contracts are in `schema`; reusable client API logic is service-based and UI-independent. |
| II. TDD                             | Passed | Quickstart and contracts identify success and negative paths to cover before implementation.          |
| III. Simplicity & YAGNI             | Passed | R2 listing records avoid adding a separate datastore/search index for v1.                             |
| V. Privacy & Client-Side Processing | Passed | Saved listing records are the only searchable source; guest bundles remain read-only destinations.    |
| VIII. DI                            | Passed | `PublicDirectoryService` is planned with injectable fetch/base URL.                                   |
| XII. Labels over Tags               | Passed | Contracts and model use `labels` only.                                                                |

## Complexity Tracking

No constitution violations.
