# Feature Specification: Community Aggregate for Answer Usefulness + Community Favourites on /answers

**Feature Branch**: `164-answer-community-aggregate`
**Created**: 2026-09-27
**Status**: Draft
**Input**: User description: "Community aggregate for answer usefulness votes and views with public top helpful section"
**Extends**: #3038 (Was this useful?), #3048 (public aggregate display), #3055 (My Stuff local-first). Does NOT reopen #3039 (save/star).

## User Scenarios & Testing

### User Story 1 - Discover the most helpful answers (Priority: P1)

A reader lands on `/answers` (101+ articles) with no specific question and wants to know where to start. A compact `Community favourites` strip near the top shows the 4–6 answers the CC readership most often marked useful, each linking to the full article.

**Why this priority**: This is the requested value — communal wayfinding across a large answer library. Achievable with usefulness votes alone, no view tracking required.

**Independent Test**: Seed aggregates with 8 above-threshold slugs + 90 below-threshold slugs, load `/answers` with no filters, confirm the strip shows only the top 6 above-threshold entries in helpfulness order and each links to the correct article.

**Acceptance Scenarios**:

1. **Given** at least 4 slugs meet the public-display threshold, **When** a reader opens `/answers` with no search/filter/sort active, **Then** a `Community favourites` section lists up to 6 of them ordered by helpfulness score with an understated helpfulness label.
2. **Given** fewer than 4 slugs meet the threshold, **When** a reader opens `/answers`, **Then** no community strip is shown (no misleading `1 of 1` badges, no empty section).
3. **Given** a reader has search, category, kind, or non-default sort active, **When** the results view renders, **Then** the community strip is hidden so it never competes with the filtered result set.

---

### User Story 2 - Cast a vote that counts toward the community total (Priority: P1)

A reader finishes an answer article and answers `Was this useful? Yes/No` (with optional structured `No` reason). The vote continues to fire the existing Zaraz editorial event AND increments the anonymous community aggregate so future readers benefit.

**Why this priority**: Without a queryable write path there is no community signal. This is the persistence layer #3038 deliberately deferred and #3048 specified as prerequisite.

**Independent Test**: Vote Yes on a fresh test slug via `UsefulnessFeedback`, then GET the public aggregate and confirm `yes` incremented by exactly 1 with no voter identity exposed.

**Acceptance Scenarios**:

1. **Given** a reader has not voted on this slug in this browser, **When** they pick Yes, **Then** one Zaraz `answer_useful_vote` event fires and one Worker aggregate increment is recorded.
2. **Given** a reader already voted in this browser (existing localStorage marker), **When** they change their vote, **Then** the aggregate moves the count (decrement old bucket, increment new) rather than double-counting.
3. **Given** the Worker endpoint is unreachable or returns an error, **When** a reader votes, **Then** the Zaraz event and local My Stuff marker still succeed and the UI shows the normal voted state (aggregate write fails silently, never blocks).

---

### User Story 3 - See honest social proof on an answer page (Priority: P2)

A reader near the bottom of a well-read answer sees a quiet line such as `24 readers found this helpful` — shown only once enough votes exist to be meaningful. Low-traffic pages show nothing rather than a damning `1 of 1`.

**Why this priority**: Per-article proof complements the `/answers` strip and closes #3048, but the strip alone already delivers the navigation value.

**Independent Test**: Open an above-threshold article (shows label) and a below-threshold article (shows no label) and confirm the threshold gate.

**Acceptance Scenarios**:

1. **Given** an article with `yes >= MIN_PUBLIC_YES` (proposed 10), **When** the reader reaches the feedback area, **Then** a subdued helpfulness line is shown alongside the voting control.
2. **Given** an article below threshold, **When** the reader reaches the feedback area, **Then** no count or ratio is shown — only the `Was this useful?` prompt.
3. **Given** any article, **When** it renders, **Then** no individual voter, IP, reason free-text, or `No`-voter identity is ever displayed.

---

### User Story 4 - Most-read awareness without surveillance (Priority: P3)

If usefulness data is sparse for a cluster, view volume can backfill ordering interest. A privacy-preserving, session-deduped view ping lets `Community favourites` break ties or fall back gracefully — without cookies, fingerprinting, or per-user tracking.

**Why this priority**: Explicitly deprioritised. Usefulness (Story 1+2) is the signal #3038 validated; views are a tie-break at most. Kept in spec so the endpoint shape does not preclude it later.

**Independent Test**: Load the same article twice in one session — aggregate `views` increments at most once.

**Acceptance Scenarios**:

1. **Given** two slugs with equal `yes` counts, **When** the top list orders them, **Then** the higher-view slug ranks first (deterministic tie-break).
2. **Given** a reader with ad-blocking / Zaraz disabled, **When** they read answers, **Then** nothing breaks; pings no-op silently.

### Edge Cases

- Unknown / mistyped / retired slug in POST body → `404`, nothing written (slug allowlist validated against answer registry).
- `No`-with-reason vote → reason forwarded to Zaraz editorial event only; aggregate stores only `yes/no` counters, never the reason text.
- Rapid double-click / retry storm → idempotent per browser marker + per-IP Worker rate limit; count moves at most once per browser per value change.
- Ad-blocker / offline / Worker 5xx → vote UI still resolves locally; aggregate catches up on next successful vote change, never shows an error banner.
- Threshold boundary (e.g. 9 vs 10 yes) → below-threshold slugs are excluded from both the strip and the per-article label, and omitted from the public top endpoint response entirely.
- Stale cache (CDN / `caches.default` 5–10 min) → acceptable; counts are explicitly labelled as approximate community signal, never live tallies.
- Import / rename of an answer slug → old slug row orphaned, new slug starts at zero; no migration, no cross-slug merging in v1.

## Requirements

### Functional Requirements

- **FR-001**: System MUST record anonymous `yes`/`no` usefulness votes per answer slug in a Worker-persisted aggregate queryable by the site (Zaraz alone is not sufficient).
- **FR-002**: System MUST validate every write slug against the canonical answer registry; unknown slugs MUST be rejected without writes.
- **FR-003**: System MUST expose a public read endpoint returning only above-threshold aggregates (`slug`, `yes`, display label inputs) ordered by helpfulness score; below-threshold slugs MUST NOT appear.
- **FR-004**: `/answers` MUST render a `Community favourites` strip (max 6) on the default unfiltered view when ≥4 slugs meet threshold; it MUST be hidden in search/filter/sort mode and when below quorum.
- **FR-005**: Answer pages MUST show an understated per-article helpfulness line only when that slug meets threshold; otherwise show the vote prompt alone.
- **FR-006**: Client MUST dual-write votes: existing Zaraz `answer_useful_vote` (unchanged semantics) + Worker aggregate; Worker failure MUST NOT block the Zaraz event, local marker, or UI state.
- **FR-007**: Client MUST preserve the existing per-browser vote marker and support vote changes as move-not-add (decrement old, increment new).
- **FR-008**: System MUST rate-limit aggregate writes per IP using the existing Workers `ratelimits` binding pattern (new `ANSWER_FEEDBACK_RATE_LIMITER` namespace, share-create-class budget).
- **FR-009**: Helpfulness score for ordering MUST be deterministic and documented; v1: `yes` descending, tie-break `yes-ratio` (`yes/(yes+no)`) then slug ascending. (`views` tie-break is deferred with Story 4; the column is reserved but always 0 in v1.)
- **FR-010**: Public responses MUST be cacheable (`Cache-Control: public, max-age=300–600` + `caches.default`) and MUST NOT include voter identity, IP, user-agent, reason text, or `no`-count detail beyond what the display label needs.
- **FR-011** (DEFERRED, follow-up only): View pings (Story 4, P3) MUST be session-deduped client-side, fire-and-forget via `sendBeacon`/fetch `keepalive`, and MUST NOT gate any P1/P2 behaviour. No view endpoint or client ping in v1; schema reserves the `views` column.

### Key Entities

- **AnswerAggregate**: per-slug community counters. Attributes: `slug` (PK, registry-validated), `yes` (int ≥0), `no` (int ≥0), `views` (int ≥0, always 0 in v1 — reserved for deferred Story 4), `updated_at` (ISO timestamp). Counters never decrement below 0. No user, session, IP, or reason columns — by design there is nowhere to store PII.
- **HelpfulnessLabel**: derived display value, never stored. Inputs: `yes`, total; rule: shown only when `yes >= MIN_PUBLIC_YES` (default 10, tunable without migration). Copy: `N readers found this helpful` (never a ratio, never `No` shaming).
- **CommunityTop**: derived ordered list. Inputs: all above-threshold aggregates; output: top ≤6 slugs by score (FR-009); quorum rule: hidden unless ≥4 qualify.

### Storage Decision (fills #3048 open question)

- **Choice**: Cloudflare **D1** (single table `answer_aggregates`) in front of `oracle-proxy`, same Worker that already serves generator-shares / publish / directory.
- **Why not KV**: KV read-modify-write races on concurrent votes; D1 gives atomic `UPDATE ... SET yes = yes + 1` and `ORDER BY yes DESC` for the top query in one place.
- **Why not Analytics Engine**: AE is event-log shaped and needs a separate query path; D1 counters match the read pattern (tiny row count ≈ number of answers, ~101 rows) with trivial cost.
- **Why not R2**: R2 is object storage for bundles/assets, wrong shape for counters.
- **Migration**: none — greenfield table, zero-row start. Public strip stays hidden until quorum (FR-004), so launch is graceful with no backfill.

### Privacy & Constitution Check (Principle V)

This stores **anonymous public-content telemetry**, not user vault data — the Principle V remote-storage exception path (vault mirroring with consent/erase) does not apply because there is no user content leaving the device:

1. No account, no login, no fingerprint; vote carries only `{slug, value}`.
2. IP is visible to the Worker as with every request and used only inside the ephemeral rate limiter (existing pattern); it is never written to D1 or logs.
3. No `No`-reason text leaves Zaraz; aggregate stores counters only.
4. Nothing to erase per-user (nothing per-user stored); global reset is a table truncate by ops if ever needed.
5. Local remains authoritative for personal state: My Stuff markers stay in `localStorage` unchanged.
6. Display shows aggregates only, minimum-volume gated, no individual voters ever.

### Display Thresholds (fills #3048 open question)

- `MIN_PUBLIC_YES = 10`: per-article label + top-list eligibility both require `yes >= 10`.
- `MIN_QUORUM_SLUGS = 4`: strip hidden until ≥4 slugs qualify.
- `MAX_STRIP_ITEMS = 6`.
- Only `yes` volume gates display; `no` count informs ordering tie-break only and is never rendered as `X found this unhelpful`.
- Thresholds are server-side constants, tunable without client deploy; lowering below 10 requires explicit editorial sign-off (misleading-sample risk from #3038).

### Non-Goals (explicit)

- No save/star/bookmark revival — #3039 stays closed; favourites strip is derived from usefulness votes, not a new control.
- No comments, profiles, followers, feeds, public like-counts-as-identity, or trending/ranking pages.
- No influence on search/hub ordering in v1; editorial placement stays manual.
- No account-backed sync of votes in v1 (local marker remains the personal source; server holds only counters).
- No backfill from historical Zaraz events unless editorial explicitly requests it; cold start is acceptable.

## Success Criteria

- **SC-001**: A first-time reader can identify 4–6 community-validated starting answers from `/answers` in under 30 seconds with no search input.
- **SC-002**: Voting Yes/No on an answer succeeds (UI resolves) even when the aggregate endpoint is down or blocked, with zero error banners across 50 forced-failure trials.
- **SC-003**: No below-threshold count is publicly visible anywhere (automated check: seed 90 slugs at 0–9 yes, assert top endpoint omits all and strip stays hidden).
- **SC-004**: Aggregate write abuse from a single IP beyond the rate budget is rejected with 429 while legitimate single votes succeed (rate-limit test).
- **SC-005**: Public read p95 latency < 300 ms globally (edge-cached) and Worker write p95 < 500 ms at 2× current answer-page traffic.

## Related

- #3038 — `Was this useful?` feedback (shipped, Zaraz-only)
- #3048 — public aggregate display (this spec answers its four open questions: threshold §, storage §, no-ratio display §, answers-index-only placement §)
- #3037 — answer sharing (shares already surface in My Stuff; not in community top v1)
- #3055 — My Stuff local-first page (personal source unchanged; community strip links reuse the same answer URLs)
- #3039 — save/star rejected (not reopened)
