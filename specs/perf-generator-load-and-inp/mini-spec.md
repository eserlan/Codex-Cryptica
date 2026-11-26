# Generator Page Load, Turnstile INP & Mobile Autoscroll Mini-Spec

## 1. Specification (What & Why)

### Problem Statement

Profiling [`/generators/dnd-npc`](https://staging.codexcryptica.com/generators/dnd-npc) in Chrome showed avoidable main-thread CPU work on both cold page load and interactive AI generation: Google Identity Services (`accounts.google.com/gsi/client`, 103 kB / 79 ms main thread) is loaded eagerly in `app.html` on every public page; deferred theme fonts load even on the default workspace theme; clicking Generate/Surprise Me blocks the first paint behind Turnstile script/widget setup (`884 ms` INP, `700 ms` presentation delay); and stacked/mobile layouts do not scroll to the output area until generation finishes.

### Scope & Boundaries

- **In Scope**:
  - Remove the eager `<script src="https://accounts.google.com/gsi/client" async defer></script>` tag from `apps/web/src/app.html` and lazy-load it on demand inside `packages/gdrive-sync/src/gdrive-auth.ts`.
  - Gate the `requestIdleCallback` theme-font stylesheet injection in `apps/web/src/app.html` so it only runs when a non-default theme is active.
  - Export `preloadTurnstile()` from `apps/web/src/lib/services/publishing/turnstile.ts` (no-op in SSR/DEV or when already loaded/missing key) and pre-warm it on form interaction/idle when AI mode is active on generator pages.
  - In `apps/web/src/lib/components/seo/layout/use-generator-session.svelte.ts`, scroll stacked/mobile layouts to the output card as soon as `isGenerating = true` starts, and yield one paint frame before running Turnstile + `generateOutput(...)` so the loading state paints immediately.
  - Add CSS `content-visibility: auto` (with `contain-intrinsic-size`) to below-the-fold `GeneratorGuideSection.svelte`, `FaqSection.svelte`, and `RelatedLinksSection.svelte`.
- **Out of Scope**:
  - Changing Turnstile verification semantics, worker rate limits, or `public-session-bootstrap.ts` token caching.
  - Refactoring `SEOGeneratorLayout.svelte` beyond wiring Turnstile pre-warm on form interaction.

### Acceptance Criteria

- [ ] `apps/web/src/app.html` no longer loads `accounts.google.com/gsi/client` eagerly, and only injects the extra theme-font stylesheet when `document.documentElement.dataset.theme` is set to a non-default theme.
- [ ] `GDriveAuthService` injects `https://accounts.google.com/gsi/client` into `document.head` when `google.accounts.oauth2` is not yet present, deduplicates concurrent loads, and surfaces a clear error if the script fails to load.
- [ ] `preloadTurnstile()` in `turnstile.ts` loads the Turnstile script idempotently in the browser when `VITE_TURNSTILE_SITE_KEY` is configured (and resolves cleanly without throwing on failure or in `DEV`/SSR).
- [ ] `useGeneratorSession.handleGenerate()` sets `isGenerating = true`, scrolls stacked/mobile viewports to `outputCard` immediately, and yields a frame before invoking `generate(...)`.

---

## 2. Technical Plan (How & Where)

### Architecture & Touchpoints

- **Affected Packages / Files**:
  - `apps/web/src/app.html`: Remove global GSI `<script>` tag; gate `loadThemeFonts()` on non-default theme.
  - `packages/gdrive-sync/src/gdrive-auth.ts`: Add idempotent `ensureGisLoaded()` helper called by `initTokenClient()`.
  - `packages/gdrive-sync/tests/gdrive-auth.test.ts`: Add tests for lazy script injection (success + failure/timeout).
  - `apps/web/src/lib/services/publishing/turnstile.ts` & `turnstile.test.ts`: Export `preloadTurnstile()` and test idempotency + failure safety.
  - `apps/web/src/lib/components/seo/layout/use-generator-session.svelte.ts` & `use-generator-session.svelte.test.ts`: Yield one frame before `generateOutput` and call `scrollToOutputIfStacked()` when generation begins; test immediate scroll + frame yield + cancellation/error paths.
  - `apps/web/src/lib/components/seo/SEOGeneratorLayout.svelte`: Pre-warm `preloadTurnstile()` on form `onfocusin` / `onpointerenter` when AI is enabled.
  - `apps/web/src/lib/components/seo/GeneratorGuideSection.svelte`, `FaqSection.svelte`, `RelatedLinksSection.svelte`: Add `content-visibility: auto` on below-the-fold `<section>`s.

### Key Technical Decisions & Tradeoffs

- **Load GSI inside `GDriveAuthService` rather than an app-level layout**: Keeps the script dependency encapsulated in `@codex/gdrive-sync` so any consumer gets lazy loading without duplicating `<script>` tags.
- **Yield via `requestAnimationFrame` + `setTimeout(0)`**: Ensures the browser commits the `isGenerating = true` paint before Turnstile or synchronous generator work runs, cutting presentation delay without perceptible lag.

### Failure, Edge & Cancellation Paths

- **Positive / Expected Path**: Public generator pages load without GSI; AI clicks paint the spinner and scroll on mobile within ~1 frame; Google Drive Sync still loads GIS seamlessly on first auth.
- **Negative / Error Path**: If `gsi/client` fails to load or times out, `GDriveAuthService.initTokenClient` rejects with the existing connection error and cleans up the failed script tag so retries work. If `preloadTurnstile()` fails, it swallows the error silently so pre-warming never breaks the page.
- **Cancellation / Edge Case**: If a new generation starts or the route changes during the paint yield (`!isCurrentRequest()`), `handleGenerate` exits cleanly without calling `generateOutput`.

---

## 3. Tasks & Execution Sequence (When)

- [ ] **Task 1: Tests (TDD)** — Add tests in `gdrive-auth.test.ts`, `turnstile.test.ts`, and `use-generator-session.svelte.test.ts`.
- [ ] **Task 2: Lazy GIS & Theme Font Gate** — Update `app.html` and `gdrive-auth.ts`.
- [ ] **Task 3: Turnstile Pre-warm, Paint Yield, Mobile Scroll & Below-the-Fold Containment** — Update `turnstile.ts`, `use-generator-session.svelte.ts`, `SEOGeneratorLayout.svelte`, and the three below-the-fold SEO section components.
- [ ] **Task 4: Local Review (`codex-review`)** — Run `codex-review` (Sweeps 0–8) on `git diff origin/staging...HEAD`, fix findings, and stamp `HEAD`.
- [ ] **Task 5: Verification Gate** — Run `bun run test:changed`, `bun run lint:changed`, affected `svelte-check`, and `bun run fallow:audit`.

---

## 4. Verification Gate

```bash
bun run test:changed
bun run lint:changed
bunx svelte-check --tsconfig ./apps/web/tsconfig.json --threshold error
bun run fallow:audit
```
