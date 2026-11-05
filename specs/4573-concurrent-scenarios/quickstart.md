# Validation guide

Use fixture Vault data and stubbed providers; no live AI or private campaign required.

1. Migrate ordinary v1/v2, single-scenario and legacy background saves twice. Compare original truth, event/reveal/thread references and unchanged input objects; reject mixed/future/colliding state without a write.
2. Add three different situations, retry one import and add a same-title rumour from another batch. Inspect explicit origin conflicts, max-ID secret binding, equal-text independent disclosure and aggregate overflow.
3. Play fifteen further turns; hear one dormant situation through a typed committed reveal, change/clear focus, resolve one and leave another open. Save/reload during a pending roll and verify blocked scenario mutations preserve the roll.
4. Verify player UI/recap/copy/projections contain only heard leads and revealed facts. Exercise keyboard controls, read-only/offline/AI-disabled state-only operations, stale save and cancellation.
5. Run impacted checks with Bun: lint:changed, test:changed, web-scoped svelte-check and affected engine type checks. Run the worker build if worker-transitive contracts change, then Fallow and codex-review before a PR. Use a clean feature-only diff against origin/staging.

Success is concurrent remembered situations in the existing scene, with no mandatory selection or quest acceptance. Qualitative model behaviour is a separate evaluation; deterministic tests establish state, source delivery, projection and commit safety.

## Implementation validation

- `bun run test:changed`: passed on 2026-11-03 — 168 web tests, 45 adventure-engine tests and 15 generator-engine tests.
- `bun run test:coverage` in `packages/adventure-engine`: passed — all new engine modules are at or above the plan's 70% line-coverage target (scenario collection 88.24%, migration 92.31%, scenario schemas 85.53%, scenario state 96.15%).
- `bun run lint:changed`: passed — ESLint, Prettier and UI pattern checks clean. The Answer mesh and discovery audit reported existing advisory warnings unrelated to this feature.
- `bunx svelte-check --tsconfig ./tsconfig.json --threshold error` in `apps/web`: passed with 0 errors and 40 warnings.
- `bunx fallow audit --base origin/staging --format json --quiet --explain --gate-marker agent`: passed with 0 introduced dead-code, complexity or duplication findings; two low-confidence Tailwind `overflow-y-auto` suggestions are valid utility classes.
- Focused `AdventureScenarioControls` test: 3 tests passed, including read-only projection of resolved situations and omission of unheard situation text.
- No Worker files or public discovery pages changed; a Worker build and discovery audit are not required by this diff.

The state fits the existing 32,000-character serialized budget and refuses an over-budget mutation without changing the committed session. World-entry seeds now store three compact situation records instead of duplicating their prose as GM threads and hidden secrets. No new persistence store or third-party dependency was added.
