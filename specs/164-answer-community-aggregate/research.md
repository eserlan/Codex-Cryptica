# Research (Phase 0): 164-answer-community-aggregate

All NEEDS CLARIFICATION resolved. Votes-only v1; views deferred.

## R1 — Counter store: D1 vs KV vs Analytics Engine vs R2

- **Decision**: Cloudflare D1, one table `answer_aggregates`, bound to `oracle-proxy`.
- **Rationale**: atomic `UPDATE ... SET yes = yes + 1` (no read-modify-write race); `ORDER BY yes DESC` serves the top query directly; ~101 rows = trivial cost; migrations are SQL files alongside the Worker, matching deploy story.
- **Alternatives considered**:
  - KV: eventually consistent + no atomic increment → lost votes under concurrency. Rejected.
  - Analytics Engine: event-log shape, separate query API, overkill for counters the page needs in one fetch. Rejected for v1.
  - R2: object store for bundles/assets. Wrong shape. Rejected.
- **Precedent in repo**: Worker already owns R2 + rate-limit bindings; adding a first D1 binding follows the same `wrangler.toml` pattern. No `[env.*]` split — one Worker serves all envs.

## R2 — Write path & abuse control

- **Decision**: `POST /api/answer-aggregates/vote` with `{slug, value: yes|no, previous?: yes|no}`, origin-checked (same helper as generator-shares: allow empty-origin? No — browser sends Origin; non-browser without Origin treated like share-create: require origin match for writes), plus new `ANSWER_FEEDBACK_RATE_LIMITER` (5 creates/min/IP, share-create class). Slug validated against a checked-in generated module (`src/answer-slugs.ts`, produced by `scripts/export-answer-slugs.mjs` from the web answer registry; see tasks T3).
- **Vote-change semantics**: client sends `previous` from its localStorage marker; server applies `decrement previous + increment value` atomically in one UPDATE. No `previous` → single increment. Unknown slug → 404, no write.
- **Alternatives considered**: blind increment per click (double-counts on change) — rejected per FR-007.

## R3 — Read path & caching

- **Decision**: two public GETs (see contracts/): `/top?limit=6` (strip) and `/by-slugs?slugs=a,b,c` (per-article label, batched, max ~10 slugs). Both `Cache-Control: public, max-age=300`, plus `caches.default` put-through on the Worker (same pattern as `handleCachedAssetGallery` in `index.ts`). Responses contain only `{slug, yes}` for above-threshold slugs. Below-threshold slugs omitted entirely (never `yes: 3` leaked).
- **Rationale**: top query is one D1 `SELECT ... WHERE yes >= ? ORDER BY yes DESC, ... LIMIT ?`; by-slugs is one `SELECT ... WHERE slug IN (...) AND yes >= ?`. Edge cache makes p95 < 300 ms trivial at this row count.

## R4 — Server-preload vs client-fetch for the strip

- **Decision**: client-fetch on mount (default view only), `fetchBySlugs`/top via new DI service with fail-silent (`null` → hide section). No `+page.server.ts` change in v1.
- **Rationale**: keeps the change out of the SSR/data-loading path; failure mode is "section absent" which is already a designed state (below-quorum). Server-preload would couple aggregate availability to page render. Revisit only if strip causes layout-shift complaints — reserve `+page.server.ts` edit as follow-up, not v1.

## R5 — Dual-write failure semantics (web)

- **Decision**: `UsefulnessFeedback` keeps current Zaraz + localStorage flow untouched; adds `communityAggregates.recordVote({slug, value, previous})` as fire-and-forget (no await for render, `.catch(() => {})`). Vote UI resolves from local state immediately.
- **Rationale**: satisfies SC-002 (50 forced-failure trials, zero banners). Existing tests for Zaraz event shape must keep passing unchanged.

## R6 — Score & thresholds (locked per user: use proposals)

- **Decision**: `MIN_PUBLIC_YES = 10`, `MIN_QUORUM_SLUGS = 4`, `MAX_STRIP_ITEMS = 6`. Server-side constants in `answer-aggregates.ts`. Score: `yes DESC`, tie-break `yesRatio DESC` (`yes/(yes+no)`), then `slug ASC`. (Views tie-break drops out of v1 with pings deferred; column reserved.)
- **Rationale**: answers #3048 open questions; 10 avoids `1-of-1` embarrassment on low-traffic pages; quorum avoids a one-item "community" strip at cold start.

## R7 — Privacy review (Principle V)

- No PII column exists in D1 by construction (migration has exactly `slug, yes, no, views, updated_at`). IP used only inside the Workers rate-limiter (ephemeral, existing pattern), never logged with slug. `No`-reasons stay in Zaraz. Nothing per-user stored → nothing per-user to erase; ops reset = table truncate. No consent surface required (anonymous telemetry on public pages, same class as existing Zaraz votes/pageviews), but copy must stay `helpful`, never identity-flavoured.
