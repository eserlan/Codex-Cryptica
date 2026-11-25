# [4/5] Verify Public Cache Bypass and Offline Vault Isolation Mini-Spec

> Issue: [#5096 — test(sw): verify public cache bypass and offline vault isolation across deploys](https://github.com/eserlan/Codex-Cryptica/issues/5096)
> Sequence: 4/5. Baseline [#5093](https://github.com/eserlan/Codex-Cryptica/issues/5093), [#5094](https://github.com/eserlan/Codex-Cryptica/issues/5094) and [#5095](https://github.com/eserlan/Codex-Cryptica/issues/5095) are closed; this slice can run in parallel with the remaining sequence work.
> Approach: mini-spec, not full Spec Kit. This is a verification slice over existing behaviour with a conditional, smallest-possible fix — no new feature, package, schema or storage contract.

## 1. Specification (What & Why)

### Problem Statement

`apps/web/src/lib/service-worker/routing.ts` already excludes public navigation paths and restricts vault cache seeds, and its unit tests already cover those predicates in isolation. What is not yet proven is the installed worker end to end on production builds: that a real browser, including one already controlled by a worker from a previous deployment, gets fresh public pages after a deploy, and that a previously seeded vault still reloads offline. A regression here would be invisible to the unit tests and would show up only as stale marketing/tools pages or a broken offline vault.

### Scope & Boundaries

- **In Scope**:
  - Audit the installed worker, its registration and its cache strategy as built for production: `apps/web/src/service-worker.ts` (installed worker, cache name `cache-${appVersion}-${CACHE_VERSION}`), `apps/web/src/lib/app/init/service-worker.ts` (registration, update checks, `VAULT_CACHE_SESSION` seeding) and the `routing.ts` / `fetch-handler.ts` / `lifecycle.ts` trio it imports.
  - Browser-level regression tests on a **production build** (never the Vite dev server) for: (a) online → offline → reload of an active vault, (b) public navigation after vault use, (c) a deployed update to a public page, including a client controlled by the previous deployment's worker, (d) cross-navigation `/tools/*` ↔ vault, and (e) cache cleanup.
  - Assertions on real responses and real Cache Storage contents (bodies, markers, `caches.keys()`, `caches.match()`), not merely on the unit-level predicates `shouldBypassFetchSynchronously()` / `shouldHandleVaultRequest()`.
  - A fix **only if** a browser test fails: the smallest change in `routing.ts`, `fetch-handler.ts`, `lifecycle.ts` or `src/service-worker.ts` that makes the failing scenario pass, retaining the abort and cross-origin bypass behaviour.
  - Documentation of realistic offline guarantees and required browser-specific test exclusions.
- **Out of Scope**:
  - No service-worker rewrite, no route migration, and no attempt to scope the worker to a literal `/(app)` subtree. The SvelteKit `(app)` / `(marketing)` groups are pathless; root registration stays, and the boundary stays in explicit request/cache logic.
  - No change to vault data storage (OPFS/IndexedDB), sync, or the `VAULT_CACHE_SESSION` protocol beyond what a proven regression requires.
  - No new browser projects in the default Playwright matrix, and no repository-wide test, lint or typecheck runs.

### Acceptance Criteria

- [x] Offline reload of a previously seeded active vault works as designed, with no new data-loss or sync regression.
- [x] A deployed update to a marketing/tools route is not obscured by older service-worker caches, including for a client controlled by the previous deployment's worker.
- [x] Public HTML and tool assets are demonstrably absent from vault caches and are never served stale from them.
- [x] Existing service-worker unit tests plus the new browser-level regression tests pass.
- [x] No unneeded service-worker rewrite or route migration; if no browser test fails, no production code changes.

---

## 2. Technical Plan (How & Where)

### Architecture & Touchpoints

- **Affected Packages / Files**:
  - `apps/web/src/service-worker.ts`: installed worker entry — `install` (`skipWaiting`), `activate` (`clients.claim`), `VAULT_CACHE_SESSION` message (validated by `getVaultSeedUrls`, seeded by `seedVaultCache`), and the `fetch` handler that returns early on `shouldBypassFetchSynchronously()` before any `respondWith`.
  - `apps/web/src/lib/service-worker/routing.ts`: `isVaultAppPath` (`/` and `/import` plus `VAULT_APP_ROUTE_PREFIXES`), `shouldBypassFetchSynchronously` (cross-origin, non-HTTP, Vite-dev, non-vault navigation, non-vault subresource), `shouldHandleVaultRequest`, `getVaultSeedUrls`. Fix site only on a proven failure.
  - `apps/web/src/lib/service-worker/fetch-handler.ts`: network-first `handleFetchRequest` — caches only same-origin `200`s, version-skew guard, offline fallback to current-then-older caches and the `/` / `/index.html` SPA shell, `AbortError` returning `Response.error()`. Fix site only on a proven failure; abort handling must be retained.
  - `apps/web/src/lib/service-worker/lifecycle.ts`: `seedVaultCache` seeds the current shell and only then deletes older `cache-*` entries; `installWorker` / `activateBuild` intentionally do no cache deletion. Fix site only on a proven failure.
  - `apps/web/src/lib/app/init/service-worker.ts`: production-only registration of `/(app)/service-worker.js`, immediate `registration.update()` plus a 15-minute-throttled visibility check, controller-change reload prompt, and `collectVaultShellUrls` (current document plus `/_app/immutable/` resources) behind `setVaultSessionActive`, driven from `apps/web/src/routes/(app)/+layout.svelte`. Read-only unless a proven failure lands here.
  - `apps/web/playwright.sw.config.ts` (new): dedicated production-build Playwright config (see Decisions). The default `apps/web/playwright.config.ts` keeps serving the Vite dev server for all other specs and is not modified.
  - `apps/web/tests/service-worker-public-bypass.spec.ts` (new): the five browser scenarios, run serially.
  - `apps/web/src/lib/content/help/offline-sync.md`: user-facing note separating vault-data offline behaviour (OPFS) from app-shell offline behaviour (service-worker cache); see Documentation decision.
- **Data Contracts & State Flow**: page registers the worker in production → `(app)` layout marks the vault session active → worker receives `VAULT_CACHE_SESSION` with shell URLs → `getVaultSeedUrls` rejects anything not same-origin, not a vault path, and not the document itself or an immutable asset → `seedVaultCache` writes the current `cache-${appVersion}-${CACHE_VERSION}` and retires older `cache-*` entries → later fetches either bypass synchronously (public/cross-origin/aborted/non-GET) or go network-first with a cache fallback (vault only). No new persisted data, schema or storage.

### Key Technical Decisions & Tradeoffs

- **Production harness, separate config**: the default Playwright config's `webServer` runs `bun run dev`, and `registerServiceWorker` returns early in dev, so the existing harness cannot exercise the worker at all. Add `playwright.sw.config.ts` whose `webServer` runs `bun run preview` against a completed `bun run build`, with `reuseExistingServer: false`, a dedicated port, `workers: 1` and serial tests. One build per test run; the default config and its smart success-tracker are untouched.
- **Deploy simulation on one origin**: scenario (c) must keep a single origin (worker scope is origin-bound). Preferred mechanism, settled by the Task 1 spike: serve build A, register and seed, then restart the preview on the **same port** serving build B with a changed marker on a public page, trigger `registration.update()` from the page (do not wait out the 15-minute throttle), wait for the new worker to activate and control the client, then navigate. If a second full build proves too slow or brittle, fall back to a small static test server over the one production build that can swap the public page body and the served worker script bytes between phases; record which mechanism was used in the spec file header. Route interception (`page.route`) is not the mechanism: it does not reliably emulate a new deployment behind an already-controlling worker.
- **Cache-cleanup expectation matches the code**: old `cache-*` entries are deleted by `seedVaultCache` after a successful vault seed, not on `activate`. Scenario (e) therefore asserts cleanup after activation **plus** a successful vault session seed, and asserts that a failed or empty seed leaves older caches in place. If the audit judges that gap itself to be the regression, that judgement — not an assumption — is what licenses a lifecycle fix.
- **Chromium-only, documented**: the repo's only Playwright project is Desktop Chrome. These tests run there; Firefox and WebKit/Safari are recorded exclusions (service-worker cache and update semantics differ and are not covered by this slice), alongside Playwright's own sandbox limits already noted in `cache-persistence.spec.ts` (OPFS unavailable — seed through the real UI flow, not by reaching into storage).
- **Assertions on responses, not predicates**: each scenario asserts observable outcomes — response body markers for fresh vs stale HTML, offline reload rendering the seeded vault route, `caches.keys()` containing no public HTML entries, and the controlling worker's script state. The existing unit tests in `routing.test.ts`, `fetch-handler.test.ts` and `lifecycle.test.ts` remain the predicate-level coverage and are not duplicated.
- **Conditional fix gate**: production code changes only behind a failing browser test, and each fix lands with a unit test at the same layer (success path plus one negative/abort/failure path, per TDD). A `CACHE_VERSION` bump in `src/service-worker.ts` is a valid smallest fix only when the failure is stale-cache retention, not as a routine step.

### Failure, Edge & Cancellation Paths

- **Positive / Expected Path**: vault seeded online reloads offline; every public navigation returns the network's current HTML; a deploy is visible on the next public navigation without a manual cache clear.
- **Negative / Error Path**: offline public navigation fails as a normal network error (no vault-cache fallback, no SPA shell substitution for a public path); a failed seed leaves older caches untouched; version-skewed JS/CSS still returns the plain-text 404 from `createVersionSkewResponse`.
- **Cancellation / Edge Case**: aborted or cross-origin requests still bypass via `shouldBypassFetchSynchronously` / the `AbortError` branch and produce no unhandled rejections; a first visit with no controller, and a client that declines the "App Update Available" reload prompt, both still receive fresh public HTML because public navigations are never intercepted.

---

## 3. Tasks & Execution Sequence (When)

- [x] **Task 1: Audit & Harness Spike** — Traced registration → seeding → fetch → cleanup on the production build. Deploy simulation uses the swap-capable preview mechanism (public HTML and worker bytes rewritten on disk under the running `vite preview`, same origin/port, restored afterwards). Scenario (e)'s cleanup trigger is confirmed as a successful vault seed in `seedVaultCache`. **Audit finding (regression)**: on a first visit the vault seed never runs — a `postMessage` spy recorded exactly one `VAULT_CACHE_SESSION` post, with `active: false`. The `$effect` in `apps/web/src/routes/(app)/+layout.svelte` short-circuits on the still-undefined `serviceWorkerSession` (a plain `let`), tracks no dependencies, and never re-runs when the vault activates; the seeded cache therefore contains immutable assets (cached by the fetch handler) but no document, and a first-visit offline reload fails with `ERR_FAILED`. A second online visit masks the bug because the fetch handler then caches the navigation itself.
- [x] **Task 2: Production Playwright Config (TDD-enabling)** — Added `playwright.sw.config.ts` (preview server, serial, Chromium); the default dev-server config is untouched. Production pages do not expose `window.vault` (dev-only in `stores/vault/singleton.ts`), so the spec sets the app's own `__CODEX_PERFORMANCE_CAPTURE__` flag before boot, as the performance specs do.
- [x] **Task 3: Browser Tests — Vault & Public Isolation** — Scenarios (a), (b) and (d): seed an active vault through the real UI flow, go offline via `context.setOffline`, reload, and assert the vault renders; assert public navigation after vault use returns network HTML and that `caches.match()` finds no public HTML in any `cache-*` store.
- [x] **Task 4: Browser Tests — Deploy Freshness & Cleanup** — Scenarios (c) and (e): with the previous worker controlling the client, deploy the changed public page, trigger `registration.update()`, and assert the new marker is served; then seed a new vault session and assert older `cache-*` entries are deleted while the current cache is retained.
- [x] **Task 5: Conditional Fix** — Scenario (a) failed, so the gate opened. Smallest fix at the proven root cause in `apps/web/src/routes/(app)/+layout.svelte`: `serviceWorkerSession` is now `$state`, so the vault-session effect re-runs when registration resolves and again when the vault activates, and the seed message is actually sent on a first visit. No change to `routing.ts`, `fetch-handler.ts`, `lifecycle.ts` or `src/service-worker.ts`. Regression proof is browser scenario (a) itself (failed before, must pass after); existing service-worker unit tests (93) still pass.
- [x] **Task 6: Documentation** — Added the offline-guarantees note to `apps/web/src/lib/content/help/offline-sync.md` (vault data vs app shell; public pages need the network; Chromium-tested, Firefox/WebKit exclusions) in plain British English.
- [x] **Task 7: Verification Gate** — All 6 browser scenarios pass (2.1m, serial Chromium); existing SW unit tests 93 pass; `bun run test:changed` pass; `bun run lint:changed` exit 0; `svelte-check` 0 errors; fallow audit verdict pass.

---

## 4. Verification Gate

```bash
bun run test:changed
bun run lint:changed
bunx svelte-check --tsconfig ./tsconfig.json --threshold error # in apps/web, only if Svelte/TS sources changed
cd apps/web && bunx playwright test --config=playwright.sw.config.ts tests/service-worker-public-bypass.spec.ts
bunx fallow audit --format json --quiet --explain --gate-marker agent # before commit / PR
```
