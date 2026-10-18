# Validation and review

## Results

- help-engine: 242 tests passed, including real-corpus references, retrieval,
  context keys, action validation and failure cases. Used a 30-second timeout
  because concurrent workspace checks exceeded Bun's five-second default in two
  existing evaluation tests; assertions and thresholds were not changed.
- Web Help/content/context/actions/privacy: 115 tests passed across 13 files.
- Oracle proxy Help handler/dispatch/metrics: 47 tests passed across three files.
- `bun scripts/test-changed.mjs --base origin/staging`: passed.
- help-engine scoped TypeScript: passed.
- web `svelte-check`: zero errors, 79 warnings.
- Changed-file ESLint and Prettier: passed.
- Knowledge bundle: 19 features, 44 articles, 279 chunks; size guards passed.
- Fallow new-only audit: passed, no introduced findings.

## Retrieval evaluation

The new set was written before inspecting results. It covers four questions per
remaining feature: two tune and two held-out, with separate cross-feature and
misleading-screen assertions. Tune: 16/16 recall@3. Held-out: 16/16 recall@3.
The evaluated holdout is now retained as a regression set, without changing
retrieval constants or adding query-specific synonyms.

Existing evaluation: 61/65 tune and 25/28 legacy holdout questions hit an expected
source in the top three; all 93 in-scope questions were answerable and all 21
unrelated questions were rejected. The prior fresh set is 26/30, with 10/10
unrelated questions rejected. Building the knowledge corpus from `origin/staging`
and the original eleven features also produces 26/30 on that set, so this
increment does not introduce a recall regression there. The older PR's recorded
27/30 describes its earlier corpus, not today's staging baseline.

No live model evaluation or remote deployment was performed. Deterministic
retrieval tests do not establish answer quality, latency or near-miss refusal.
Deploy the rebuilt Worker before web: old strict Workers reject the added enums.

## General and Codex specialist review

Reviewed the diff and immediate callers against the general code-review and
codex-review skills, constitution and style guide. The package remains independent
of web stores. Privacy context keys and the five action types are unchanged;
Family kind checks run in both the browser context and engine validation.
Available panels are revalidated before execution, and journal navigation calls
only `openJournal`, which does not start or write a journal. Existing
QuickNoteStore tests cover that behaviour. Coverage limits, shared Help prose and
the public builder's knowledge-only support are documented.

During review, fixed two gaps: offline fallback now uses the same tab/kind matcher
as retrieval, and engine panel validation rejects Family on non-characters or
tabs behind other screen areas. Added negative regression tests for both.
No remaining blocking findings.

```text
DEV_AGENTS_REVIEW_REPORT_BEGIN
FINDINGS: none remaining
FIXES: share fallback screen matching; enforce entity-panel area and Family kind
REPORT_JSON: {"verdict":"clean","findings":[],"categories_checked":["behaviour","trust-boundaries","privacy","compatibility","performance","tests","constitution","svelte","worker-safety","documentation"],"validation":["scoped engine/web/Worker tests passed","scoped type checks passed","changed-file lint passed","Fallow passed"],"fixes":[{"location":"apps/web/src/lib/services/help-assistant/help-fallback.ts","summary":"Use the shared kind/tab matcher for offline topics."},{"location":"packages/help-engine/src/actions/validate.ts","summary":"Reject entity tabs on other areas and Family for non-characters."}]}
DEV_AGENTS_REVIEW_REPORT_END
```
