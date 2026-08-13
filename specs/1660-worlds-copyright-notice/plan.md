# Implementation Plan: Copyright and Fan-Content Notice for Public Worlds

**Branch**: `1660-worlds-copyright-notice` | **Date**: 2026-07-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/1660-worlds-copyright-notice/spec.md`

## Summary

Add legal expectation-setting to the public worlds experience: a compact provenance notice on `/worlds`, a mandatory publishing-rights acknowledgement plus optional fan-content flag in the public listing flow, a per-vault fan-content disclaimer on guest views, a Turnstile-protected copyright-report intake, and an operator suspension mechanism (delist / disable public access) enforced by the oracle-proxy worker.

Technically this extends the existing publishing stack: Zod schemas in `packages/schema/src/publishing.ts`, the `oracle-proxy` Cloudflare Worker (R2-backed listing/bundle objects), `PublicDirectoryService` / `PublicListingSettings` on the client, and the `/worlds` and `/guest/[publishId]` routes. No new infrastructure: reports and suspension markers are R2 objects; operator actions use existing wrangler tooling (documented runbook), not a new admin UI.

## Technical Context

**Language/Version**: TypeScript 5 (strict), Svelte 5 (runes), SvelteKit
**Primary Dependencies**: Zod (`packages/schema`), Tailwind 4, Cloudflare Workers (oracle-proxy), Cloudflare Turnstile (already integrated for publishing)
**Storage**: Cloudflare R2 (`BUCKET`): `published/{publishId}/bundle.json`, `directory/listings/{publishId}.json`; new objects `published/{publishId}/notice.json`, `moderation/suspensions/{publishId}.json`, `moderation/reports/{reportId}.json`
**Testing**: Vitest (`bun run test`), existing worker-handler and component test patterns (`directory.test.ts`-style, `PublicListingSettings.test.ts`)
**Target Platform**: Browser (SvelteKit static/Pages) + Cloudflare Worker
**Project Type**: Web application (monorepo: `apps/web` + `apps/workers/oracle-proxy` + `packages/schema`)
**Performance Goals**: Notice/disclaimer add no extra blocking requests to `/worlds`; guest-page notice fetch is one small cached JSON GET (same 15s cache-control as directory)
**Constraints**: New `PublicListing` fields must be optional/backward-compatible — existing R2 listing records are validated with `safeParse` and would silently vanish from the directory if the schema became stricter. Report intake must be abuse-resistant (Turnstile + existing IP rate limiting). Suspension must fail closed for content but never accuse the author.
**Scale/Scope**: Directory currently lists tens of worlds; report volume expected to be near zero initially. ~6 client files, ~3 worker files, 1 schema file, help content, plus tests.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                | Status | Notes                                                                                                                                                                                                                           |
| ------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Library-First         | PASS   | Contracts/validation live in `packages/schema` (publishing.ts). UI and worker handlers extend the existing publishing feature slices; no new package warranted (YAGNI).                                                         |
| II. TDD                  | PASS   | Schema, worker handler, service, and component tests planned before implementation; existing test files extended.                                                                                                               |
| III. Simplicity & YAGNI  | PASS   | Reuses R2 + writeToken auth + Turnstile + rate limiting already in place. No admin dashboard, no email service, no new datastore. Notice copy defined once in a shared config module, reused by `/worlds` and guest view (DRY). |
| IV. AI-First Extraction  | N/A    | No Oracle involvement.                                                                                                                                                                                                          |
| V. Privacy & Client-Side | PASS   | Only data the author explicitly publishes is exposed. Reports contain only reporter-provided data; reporter contact stored server-side in R2, never displayed publicly.                                                         |
| VI. Clean Implementation | PASS   | Svelte 5 runes, Tailwind 4 tokens, `bun run lint` + `bun run test` gates.                                                                                                                                                       |
| VII. User Documentation  | PASS   | `help-content.ts` entry updated (public directory) + new copy for report path; FeatureHint not needed (passive notices).                                                                                                        |
| VIII. DI                 | PASS   | New service methods added to `PublicDirectoryService` (constructor-injected fetch); report service follows same pattern with class + singleton export.                                                                          |
| IX. Natural Language     | PASS   | Notice/disclaimer copy uses the plain wording from issue #1660; "Report copyright concern" is the action label.                                                                                                                 |
| X. Coverage              | PASS   | New logic ships with tests meeting the 70% goal for worker/service logic.                                                                                                                                                       |
| XI. Karpathy Rules       | PASS   | Surgical changes to the publishing slice only.                                                                                                                                                                                  |
| XII. Labels over Tags    | PASS   | No new categorization metadata; fan-content flag is a boolean, not a tag system.                                                                                                                                                |

**Post-design re-check (after Phase 1)**: PASS — no violations introduced; Complexity Tracking empty.

## Project Structure

### Documentation (this feature)

```text
specs/1660-worlds-copyright-notice/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output (incl. operator suspension runbook)
├── contracts/           # Phase 1 output
│   └── worker-api.md    # notice / report / suspension endpoint contracts
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created by plan)
```

### Source Code (repository root)

```text
packages/schema/src/
└── publishing.ts                      # + PublishedNoticeSchema, CopyrightReportSchema,
                                       #   SuspensionMarkerSchema; ListingDraft/PublicListing
                                       #   gain rights-ack + fan-content fields

apps/workers/oracle-proxy/src/
├── index.ts                           # route wiring: /notice, /api/reports/copyright
├── directory.ts                       # suspension filter in list/get listing handlers
├── publish.ts                         # suspension gate on bundle/asset GET (451 + neutral body)
├── notice.ts                          # NEW: GET/PUT published notice (fan flag, disclaimer, ack, suspended state)
└── reports.ts                         # NEW: POST copyright report (Turnstile + rate limit → R2)

apps/web/src/lib/
├── config/
│   ├── public-worlds-notice.ts        # NEW: shared notice/disclaimer copy (single source, DRY)
│   └── help-content.ts                # updated public-world-directory entry
├── services/publishing/
│   ├── PublicDirectoryService.ts      # + getNotice/saveNotice; listing draft carries ack + fan fields
│   └── CopyrightReportService.ts      # NEW: DI service posting reports (class + singleton)
└── components/
    ├── settings/PublicListingSettings.svelte   # ack checkbox, fan-content toggle,
    │                                           # custom disclaimer input, suspended banner
    └── publishing/
        ├── WorldsProvenanceNotice.svelte       # NEW: compact footer notice (worlds + guest reuse)
        ├── FanContentDisclaimer.svelte         # NEW: per-vault disclaimer block
        └── CopyrightReportModal.svelte         # NEW: report form (ModalShell)

apps/web/src/routes/
├── (marketing)/worlds/+page.svelte    # mounts WorldsProvenanceNotice + report entry point
└── (app)/guest/[publishId]/+page.svelte  # disclaimer + report link + suspended/unavailable state
```

**Structure Decision**: Follow the existing publishing feature slice: shared Zod contracts in `packages/schema`, HTTP handlers in `apps/workers/oracle-proxy/src` (one module per concern, mirroring `directory.ts`), DI services in `apps/web/src/lib/services/publishing`, presentational components under `apps/web/src/lib/components`. Notice copy is centralized in one config module so `/worlds`, the guest view, and the settings preview never drift (Constitution III DRY rule).

## Key Design Decisions (from Phase 0 research)

1. **Notice sidecar, not bundle field**: fan-content flag + disclaimer + acknowledgement live in `published/{publishId}/notice.json`, editable via writeToken without republishing the snapshot, and readable by _any_ guest view (listed or unlisted-by-link) — satisfying the edge case that direct-URL guest views still show the disclaimer.
2. **Backward-compatible listing schema**: `PublicListing` gains only optional fields; `ListingDraftSchema` requires `rightsAcknowledged: true` on every PUT, which automatically forces pre-existing listings through the acknowledgement the next time their owner saves (FR-008) without any migration.
3. **Suspension as R2 marker enforced by the worker**: `moderation/suspensions/{publishId}.json` with mode `delist` (hidden from directory) or `disable` (bundle/asset/listing GETs return 451 with a neutral message). Operator tooling is a documented wrangler runbook — no admin UI/auth surface in v1.
4. **Reports stored in R2 behind Turnstile**: `POST /api/reports/copyright` validates with Zod, verifies a Turnstile token (existing `turnstile.ts` client helper), applies the worker's existing IP rate limiting, writes `moderation/reports/{reportId}.json`, returns a receipt id. No email infrastructure needed.

## Complexity Tracking

No constitution violations — table intentionally empty.
