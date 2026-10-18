# Implementation Plan: Shareable Generated Entities

**Branch**: `2916-shareable-generator-results` | **Date**: 2026-09-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/2916-shareable-generator-results/spec.md`

## Summary

Let a user explicitly share one completed generated entity from a public generator, the in-app Session Hub, or a saved vault entity. A small, immutable, text-only public snapshot is written to Cloudflare R2 through a dedicated Worker endpoint; it is never a vault export. A browser-local management credential allows only the creating browser to revoke it. The public `/share/[id]` route renders safe server-visible metadata and offers a generator-specific remix or creation action.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5.55.9 Runes, SvelteKit 2.60.1, Bun 1.3.14, Cloudflare Workers runtime  
**Primary Dependencies**: Existing Zod/schema workspace, Cloudflare R2 Worker, SvelteKit, `marked`/DOMPurify rendering path, native Web Share/Clipboard APIs; no new dependency  
**Storage**: Immutable R2 JSON objects under a distinct `share-snapshots/` prefix; browser-local IndexedDB/local storage only for revocation credentials  
**Testing**: Vitest 4.1.7, jsdom, Testing Library Svelte, Worker endpoint tests, SvelteKit route-load tests  
**Target Platform**: Modern secure-context browsers and Cloudflare Workers; public route must also render useful crawler-visible HTML  
**Project Type**: SvelteKit web application with a Cloudflare Worker API  
**Performance Goals**: Public snapshot fetch and render within 3 seconds on typical broadband; creation/revocation remains one user-initiated request  
**Constraints**: Explicit opt-in before upload; 64 KB JSON payload cap; text-only safe projection; no credential in URL or API creation response; no public indexing; local entity remains authoritative  
**Scale/Scope**: One shared entity projection/service, three creation entry points, one public reader route, dedicated Worker CRUD endpoints, revocation management, help, analytics, and focused tests

## Constitution Check

_Gate result before research: PASS. Re-checked after design: PASS._

- **I. Library-First — PASS**: Cross-surface snapshot projection and validation belong in `packages/schema`; browser/network orchestration remains an injected web service and the Worker stays a thin storage boundary.
- **II. TDD — PASS**: Implement contracts through failing schema, Worker, service, and UI/route tests before behaviour changes.
- **III. Simplicity & YAGNI — PASS**: Reuse the existing Worker/R2 binding, rate limiter, Turnstile token helper, modal system, analytics, and generator routing. Do not add accounts, a share directory, images, asset exports, a new dependency, or a browser polyfill.
- **IV. AI-First Extraction — N/A**: No extraction or generation logic changes.
- **V. Privacy & Client-Side Processing — PASS, narrow exception satisfied**: (1) remote sharing is off by default and only follows Share + confirmation; (2) the confirmation identifies public readability, Cloudflare-hosted storage, persistence until revocation, and browser-limited revocation; (3) revocation deletes the remote object and local credential; (4) the local entity/session remains authoritative and sharing failure changes nothing; (5) the snapshot is not forwarded beyond disclosed hosting and does not enter training; (6) support/staff access is disclosed where the existing hosting/privacy copy requires it and is not expanded by this feature.
- **VI. Clean Implementation — PASS**: Components use Svelte runes, existing accessible modal patterns, semantic tokens, and Iconify utility icons. Native sharing is feature-detected and Copy link remains the fallback.
- **VII. User Documentation — PASS**: Add a help entry explaining exactly what is published, what remains private, and how local-browser revocation works.
- **VIII. Dependency Injection — PASS**: `ShareSnapshotService` accepts fetch, storage, random-id/crypto, and native share/clipboard collaborators; components receive callbacks rather than browser globals.
- **IX. Natural Language — PASS**: The UI says “Share entity”, “Copy link”, and “Remove shared link”; no draft, MIME, credential, or storage jargon is exposed.
- **X. Quality & Coverage — PASS**: Cover validation, immutability, authorization failure, revocation, safe public rendering, and meaningful user-facing failures.
- **XI. Operational Protocol — PASS**: Scope stays limited to sharing a single entity, not public vault publishing or a discovery/listing system.
- **XII. Labels Over Tags — PASS**: Snapshot metadata retains the user-facing field name `labels`.
- **XIII. Discovery Intent Governance — N/A**: `/share/[id]` is an unlisted, `noindex` application reader route, not an indexable discovery page.
- **XIV. Bounded Responsibility — PASS**: The large generator layout and entity header remain entry-point owners only. Share payload building, network lifecycle, confirmation UI, and public rendering are extracted into focused modules with their own tests.

### Discovery Intent Check

N/A. The new public reader route explicitly requests `noindex` and is accessible only by a stable share link; it is not a governed discovery surface.

### Bounded Responsibility Check

- [x] `apps/web/src/lib/components/seo/SEOGeneratorLayout.svelte` already exceeds 500 lines. It remains the public-generator orchestrator; it receives only an injected/open-share callback.
- [x] `apps/web/src/lib/components/entity-detail/DetailHeader.svelte` is an established entity action host. It receives only a Share action that delegates to the new flow.
- [x] New snapshot normalisation is extracted into `packages/schema`; browser lifecycle and local credentials into `ShareSnapshotService`; shared confirmation UI into a focused modal.
- [x] Each extracted unit gains direct tests; component tests cover only entry-point wiring and state feedback.

## Project Structure

### Documentation (this feature)

```text
specs/2916-shareable-generator-results/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── share-snapshots.md
```

### Source Code (repository root)

```text
packages/schema/src/
├── shared-result.ts
└── shared-result.test.ts

apps/workers/oracle-proxy/src/
├── share-snapshots.ts
├── index.ts
└── __tests__/share-snapshots.test.ts

apps/web/src/
├── lib/services/sharing/
│   ├── ShareSnapshotService.svelte.ts
│   └── ShareSnapshotService.test.ts
├── lib/components/sharing/
│   ├── ShareEntityModal.svelte
│   └── ShareEntityModal.test.ts
├── lib/components/seo/
│   ├── SEOGeneratorLayout.svelte
│   └── EntityDetailModal.svelte
├── lib/components/entity-detail/DetailHeader.svelte
├── lib/config/help-content.ts
└── routes/(marketing)/share/[shareId]/
    ├── +page.ts
    ├── +page.svelte
    └── page.test.ts
```

**Structure Decision**: The snapshot representation and its validation are cross-runtime and live in the schema package. R2 object handling is isolated from existing whole-vault publishing. The web service owns browser-only credentials and native-share fallback. Existing generator, Session Hub, and entity-detail components supply an entity-shaped source to one shared flow.

## Phase 0: Research Decisions

Completed decisions are recorded in [research.md](./research.md). No unresolved clarification remains: the unit being shared is one entity/result; a vault remains private; every entity-shaped entry point uses the same snapshot schema.

## Phase 1: Design & Contracts

The durable contract is in [contracts/share-snapshots.md](./contracts/share-snapshots.md), the browser/R2 state model in [data-model.md](./data-model.md), and the test/manual validation path in [quickstart.md](./quickstart.md).

Implementation must proceed in this order:

1. Add a strict, text-only `SharedResultSnapshot` schema plus safe projectors from `Entity` and `SessionEntity`; reject oversized, binary, or unknown fields before any network call.
2. Add focused Worker routes: `POST /api/share-snapshots`, `GET /api/share-snapshots/:shareId`, and `DELETE /api/share-snapshots/:shareId`. Store each payload once under `share-snapshots/:shareId.json`; never expose or accept a write/update operation.
3. Have the browser generate a high-entropy revocation secret before creation, send only its SHA-256 digest for R2 metadata, and retain the raw secret locally keyed by share id. Creation returns only the public id/URL.
4. Build an injected `ShareSnapshotService` that projects an entity, gets an existing Turnstile token, creates/revokes, persists/removes the local credential, and attempts `navigator.share` with an accessible Copy-link fallback.
5. Add one reusable explicit-consent modal. It must name the selected entity, explain the remote/public/revocation boundary, and only invoke the service after confirmation.
6. Wire Share into current public-generator results, Session Hub detail, and vault entity detail. Do not publish automatically when an entity is generated or saved.
7. Add the server-loaded public reader page with safe Markdown rendering, noindex metadata, social title/description, the correct generator action, and a generic generator fallback.
8. Add a creator-only revoke action wherever the current browser has a stored credential, plus help and analytics. Keep anonymous visitors unable to infer management state.

## Complexity Tracking

No constitution violations require exceptions.
