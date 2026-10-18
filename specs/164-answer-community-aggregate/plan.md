# Implementation Plan: Community Aggregate for Answers (164)

**Branch**: `164-answer-community-aggregate` | **Date**: 2026-09-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/164-answer-community-aggregate/spec.md`
**Locked proposals**: `MIN_PUBLIC_YES=10`, quorum 4, max 6, votes-only v1 (views deferred, column reserved).

## Summary

Add a queryable, anonymous community aggregate for answer usefulness votes so `/answers` can show a `Community favourites` strip and answer pages can show an understated helpfulness line. Approach: new D1 table `answer_aggregates` behind `oracle-proxy` (`apps/workers/oracle-proxy/src/answer-aggregates.ts`), dual-write from `UsefulnessFeedback` (Zaraz unchanged + Worker fire-and-forget), cached public reads consumed by a new `CommunityFavourites.svelte` section on the existing `/answers` index. Cold start: strip hidden until quorum; no migration, no backfill.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 Runes, SvelteKit 2, Bun 1.3.14; Workers runtime (no Node built-ins)
**Primary Dependencies**: existing `oracle-proxy` Worker routing/CORS/ratelimit patterns, existing `answer_useful_vote` Zaraz pipeline, existing answer registry (`$lib/content/answers/registry`), `caches.default`
**Storage**: NEW Cloudflare D1 database (single table `answer_aggregates`); no KV, no R2, no Analytics Engine in v1
**Testing**: Vitest (worker `vitest.config.ts` + web unit tests), `svelte-check`, `bun scripts/discovery-audit.mjs` (guard, expect pass/no-change)
**Target Platform**: web (Cloudflare Pages) + `oracle-proxy` Worker (workers.dev + custom-domain gallery route unchanged)
**Project Type**: Web application (frontend section + backend Worker endpoint)
**Performance Goals**: public top read p95 < 300 ms edge-cached; vote write p95 < 500 ms; `Cache-Control: public, max-age=300` + `caches.default`
**Constraints**: anonymous only (`{slug, value}` writes; no IP/user-agent/reason persisted); slug allowlist validated server-side; origin check same as generator-shares; new `ANSWER_FEEDBACK_RATE_LIMITER` (share-create-class budget: 5/60s per IP); Worker failure never blocks vote UI; thresholds server-side constants
**Scale/Scope**: ~101 aggregate rows; low write volume (human votes), bursty reads on `/answers`; v1 scope = Stories 1–3 (votes). Story 4 (view pings) deferred — schema reserves `views` column, no ping endpoint in v1, tie-break falls back to ratio→slug.

## Constitution Check

- **I Library-First**: PASS — no new `packages/` logic; web aggregation helper lives in `apps/web` (app-specific), Worker persistence lives in Worker (runtime-bound, same as generator-shares/publish).
- **II TDD**: PASS — plan carries tests for every FR (contract tests for endpoints, unit tests for score/threshold, component tests for strip gating).
- **III YAGNI**: PASS — D1 single table, no AE/backfill/admin UI/sync in v1; views explicitly deferred.
- **V Privacy**: PASS (no exception needed) — anonymous public-content telemetry, not vault data. No account/fingerprint; IP only in ephemeral rate limiter, never persisted; no reason text stored; local My Stuff markers unchanged and authoritative for personal state.
- **VI Style/DI/hygiene**: PASS — Svelte 5 Runes, Tailwind 4 semantic tokens, Iconify `icon-[lucide--*]` (no lucide-svelte), constructor DI for new web service with defaults, `_`-prefixed unused.
- **IX Natural language**: PASS — copy fixed in spec: `N readers found this helpful`; never ratios, never `No` shaming, never `Likes`.
- **XIII Discovery Intent**: N/A — no new URL. Only change is a section inside existing governed route `/answers` (already registered in `governed-routes.ts`). `discovery-audit` must report no errors.
- **XIV Bounded Responsibility**: CONDITIONAL PASS — see below.

### Discovery Intent Check

N/A — no new indexable page. Verified `/answers` already governed. No alias/overlap work. Gate: `bun scripts/discovery-audit.mjs` passes unchanged.

### Bounded Responsibility Check

Files over 500 lines this feature touches:

- `apps/web/src/routes/(marketing)/answers/+page.svelte` (594 lines) — MUST NOT gain strip logic inline. Extraction target: NEW `apps/web/src/lib/components/answers/CommunityFavourites.svelte` (+ test). Page change limited to import + conditional slot.
- `apps/workers/oracle-proxy/src/index.ts` (1251 lines) — MUST NOT gain aggregate logic inline. Extraction target: NEW `apps/workers/oracle-proxy/src/answer-aggregates.ts` (+ test). Index change limited to route guards + delegation (same shape as generator-shares block).
- `UsefulnessFeedback.svelte` (164 lines) — under trigger; small additive dual-write via injected service, no decomposition needed.

## Project Structure

### Documentation (this feature)

```text
specs/164-answer-community-aggregate/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── vote.md
│   └── top.md
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
apps/workers/oracle-proxy/
├── src/
│   ├── answer-aggregates.ts        # NEW: D1 handlers (vote, top, by-slugs) + thresholds + score
│   ├── answer-aggregates.test.ts   # NEW: contract/unit tests
│   └── index.ts                    # MOD: route delegation only (+ ANSWER_FEEDBACK_RATE_LIMITER type)
├── wrangler.toml                   # MOD: [[d1_databases]] binding + ANSWER_FEEDBACK_RATE_LIMITER
└── migrations/
    └── 0001_answer_aggregates.sql  # NEW: table DDL

apps/web/src/
├── lib/components/answers/
│   ├── CommunityFavourites.svelte       # NEW: strip section (default view only)
│   └── CommunityFavourites.test.ts      # NEW
├── lib/services/community/
│   ├── community-aggregates.ts          # NEW: DI service (vote, fetchTop, fetchBySlugs) + fail-silent
│   └── community-aggregates.test.ts     # NEW
├── lib/components/UsefulnessFeedback.svelte  # MOD: dual-write via service (Zaraz unchanged)
└── routes/(marketing)/answers/
    └── +page.svelte                  # MOD: conditional <CommunityFavourites> slot only (no +page.server.ts change in v1, per research R4)
```

**Structure Decision**: Web-app shape (Worker backend + SvelteKit frontend). No new workspace package: Worker code is runtime-bound (like generator-shares), web code is app-specific presentation + thin fetch service.

## Complexity Tracking

| Violation                                                           | Why Needed                                                                       | Simpler Alternative Rejected Because                                                                                                   |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| New D1 database (first structured store on oracle-proxy besides R2) | #3048 requires a queryable aggregate; Zaraz cannot serve counts back to the page | KV races on concurrent increments; Analytics Engine needs a second query path for a 101-row counter; R2 is object storage, wrong shape |
