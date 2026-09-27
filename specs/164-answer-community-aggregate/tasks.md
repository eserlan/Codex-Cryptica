# Tasks: 164-answer-community-aggregate

**Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Contracts**: [vote](./contracts/vote.md), [top](./contracts/top.md)
**Gates per repo rules**: impacted tests + `lint:changed` + workspace `svelte-check` green before PR; `discovery-audit` clean; `codex-review` pass.

## Phase A — Worker persistence (oracle-proxy + D1)

### T1 [X] — D1 binding + migration (blocks T2)

- Add `[[d1_databases]]` (`ANSWER_AGGREGATES`) to `apps/workers/oracle-proxy/wrangler.toml` + `ANSWER_FEEDBACK_RATE_LIMITER` ratelimit block (share-create class).
- Add `migrations/0001_answer_aggregates.sql` (schema from data-model.md).
- Extend the `Env` interface in `index.ts` with `ANSWER_AGGREGATES?: D1Database` + limiter type (types only, no logic).
- **Accept**: `bunx wrangler d1 migrations apply codex-answer-aggregates --local` succeeds; `wrangler deploy --dry-run` parses config.

### T2 [X] — `answer-aggregates.ts` handlers + unit tests (blocks T3) — P1 (Stories 1–3)

TDD: write `answer-aggregates.test.ts` first (in-memory D1 stub / miniflare):

- vote: fresh yes/no increments; change moves buckets; same-value no-op; unknown slug 404 + zero writes; bad value 400; thresholds filter top/by-slugs (seed 30/12/9 → top omits 9, order 30,12); score tie-break ratio→slug; `/by-slugs` drops unknown/below-threshold; no `no`/`views`/identity fields in responses.
- Implement `handleVote`, `handleTop`, `handleBySlugs` + `MIN_PUBLIC_YES=10`, score/sort helpers (`yes DESC → ratio DESC → slug ASC`), slug-format validation + registry allowlist hook (accept injected `isKnownSlug` for testability; production set wired in T3). Server applies no quorum — it returns up to `limit` eligible rows; the ≥4 quorum is enforced client-side (defence in depth, see T6/T7). Decrements floor at 0.
- **Accept**: contract tests in `contracts/` all green against handler with stub D1.

### T3 [X] — `index.ts` routing + guards (blocks Phase B manual E2E only)

- Add route block for `/api/answer-aggregates/*` mirroring generator-shares: CORS preflight OK; writes require allowed Origin; public GETs open; `enforcePublishRateLimit`-style check using `ANSWER_FEEDBACK_RATE_LIMITER` for POST only; `caches.default` put-through for GETs with `max-age=300`.
- Wire production `isKnownSlug` from a checked-in generated module: add `scripts/export-answer-slugs.mjs` (Bun) that reads the web answer registry/pages and writes `apps/workers/oracle-proxy/src/answer-slugs.ts` (`export const ANSWER_SLUGS: ReadonlySet<string>`). Worker imports it (Node-free, no `$lib` dependency). Re-run the script whenever answer slugs change; CI check optional — at minimum document the regen step in the PR.
- **Accept**: `index.test.ts`-style routing tests (405 on wrong method, 403 on bad-Origin POST, 429 on 6th rapid POST, GET cache header present).

## Phase B — Web client

### T4 [X] — `community-aggregates` DI service + tests (blocks T5, T6) — P1

- NEW `apps/web/src/lib/services/community/community-aggregates.ts` (constructor DI: `fetch`, `baseUrl`, thresholds for client-side quorum re-check) with `recordVote({slug,value,previous})` (fire-and-forget, swallows errors → `false`), `fetchTop(limit)` → `{slug,yes}[] | null`, `fetchBySlugs(slugs)` → same; fail-silent on any non-OK (return `null`/`[]`).
- Tests: vote POST shape; 404/429/throw → `false`, no throw; top filters below-threshold defensively; quorum helper (`>=4`) unit-tested.
- **Accept**: 100% branch coverage on threshold/quorum helpers.

### T5 [X] — `UsefulnessFeedback` dual-write (independent of T6) — P1 (Story 2)

- Inject service (default singleton, prop-overridable for tests); after existing localStorage write + Zaraz emit, call `recordVote` without awaiting render; pass `previous` from marker; no UI/error-path changes.
- Per-article helpfulness line: fetch `fetchBySlugs([slug])` on mount; render `N readers found this helpful` only when result present (server guarantees threshold; client re-checks `yes>=10`).
- Tests: existing `answer-feedback-tracking` tests unchanged-green; new tests — Zaraz fires once per vote; Worker called with `{slug,value,previous}`; Worker down → UI still `done` stage, no banner; threshold-gated label shows/hides.
- **Accept**: SC-002 (50 forced-failure trials, zero banners — scripted loop in test).

### T6 [X] — `CommunityFavourites.svelte` + tests (independent of T5) — P1 (Story 1)

- NEW section component: props `items: {slug,question,shortAnswer,category,yes}[]`; renders compact cards (max 6) with `N readers found this helpful`, links to `/answers/{slug}`; loading → skeleton; `null`/`<4` → renders nothing (empty fragment, no heading).
- Slug→metadata resolution via existing `getAnswer`/registry (no new data fetching for copy).
- Tests: renders 6 ordered; 3 items → renders nothing; empty → nothing; each link href correct; a11y (heading level, list semantics).
- Style: Svelte 5 Runes, Tailwind 4 semantic tokens, `icon-[lucide--*]`.

### T7 [X] — `/answers` wiring (blocks E2E; needs T4+T6)

- `+page.svelte`: fetch top via service only when `!isSearchingOrFiltered` (default view); pass resolved metadata to `<CommunityFavourites>`; placement above category directory; zero changes to filter/sort logic. No `+page.server.ts` change (per R4).
- Route test (`page.route.test.ts` pattern): seeded top ≥4 → strip present with correct order; filtered/search view → strip absent; cold-start (fetch null) → page renders normally, no strip.
- **Accept**: SC-001 (identify 4–6 starters <30s — manual check recorded as PR comment).

### T8 [X] — Quality gates + docs (last)

- `bun scripts/test-changed.mjs`, `bun scripts/lint-changed.mjs`, `cd apps/web && bunx svelte-check --tsconfig ./tsconfig.json --threshold error`, `bun scripts/discovery-audit.mjs` (expect clean), worker `vitest run`.
- SC-005 sanity (no load infra in v1): assert `Cache-Control: public, max-age>=300` on both GETs (contract test) + record manual timings for top-read and vote-write in the PR (dev Worker + staging).
- Update `help-content.ts`? Only if a user-facing help entry for My Stuff/answers warrants a line — otherwise skip per YAGNI (record decision in PR).
- **Accept**: all green; PR description records manual SC-001/SC-002 evidence + D1 database ids for staging/prod.

## Out of scope (tracked, not this slice)

- Story 4 view pings (`POST /api/answer-aggregates/view`) — schema column reserved; no endpoint, no client ping in v1.
- Backfill from Zaraz history; admin dashboard; hub-ordering influence; account sync.
- Lowering `MIN_PUBLIC_YES` below 10 (needs editorial sign-off).

## Dependencies

```text
T1 → T2 → T3
T4 → T5 ─┐
T4 → T6 ─┴→ T7 → T8
```
