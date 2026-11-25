# Mini-Spec: Test Execution Performance (Vitest 5 Projects, Threads & Package Node Defaults)

**Status:** In Progress
**Date:** 2026-11-24
**Branch:** `perf/test-speedup` (stacked on `perf/ci-svelte-check-tsgo`)

---

## 1. Problem & Root Causes

CI and local test runs were disproportionately slow across `apps/web` and several Vitest packages:

1. **Silent `environmentMatchGlobs` regression in Vitest 5 (`apps/web/vite.config.ts`)**: Vitest 5 removed `test.environmentMatchGlobs` in favour of `test.projects`. Because `apps/web/vite.config.ts` cast `test` as `any`, all 50 `"node"` globs were silently ignored — every one of the 1,355 test files (including ~580 pure-TS tests) booted a full `jsdom` environment (`environment 58%` of the 785.95s CI `web` test run).
2. **Build-only Vite plugins running during Vitest (`apps/web/vite.config.ts`)**: `tailwindcss()` and two `rollup-plugin-visualizer` instances loaded on every Vitest run.
3. **`pool: "forks"` overhead**: Spawning OS child processes per worker in `apps/web` and package Vitest configs added heavy startup/environment overhead compared to `pool: "threads"`. (Measured on 53 pure-TS files in `apps/web`: `jsdom`+`forks` = 131.90s -> `node`+`forks` = 60.89s -> `node`+`threads` = 25.32s.)
4. **Unnecessary `jsdom` default in pure-TS packages**: `ai-engine` (46 files, 73% env), `vault-engine` (17 files, 64% env), `map-engine` (13 files, 86% env), and `gdrive-sync` (2 files, 61% env) defaulted to `jsdom` even though nearly all tests are pure Node/TS, and lacked `fsModuleCache: true`.
5. **Sequential multi-workspace execution**: `scripts/test-changed.mjs` ran affected workspaces sequentially (`execFileSync`), and `.github/workflows/deploy.yml` ran `FULL=true` workspaces sequentially without caching package `.vite` directories.

---

## 2. Solution

1. **`apps/web/vite.config.ts`**:
   - Gate `tailwindcss()` and both `visualizer(...)` plugins behind `!process.env.VITEST`.
   - Switch `pool` from `"forks"` to `"threads"`.
   - Replace `environmentMatchGlobs` with Vitest 5 `test.projects` (`extends: true` for `"node"` and `"jsdom"` projects sharing a single `NODE_TEST_GLOBS` list).
2. **Vitest package configs (`ai-engine`, `vault-engine`, `map-engine`, `gdrive-sync`, `audio-engine`)**:
   - Default `environment` to `"node"` in `ai-engine`, `vault-engine`, `map-engine`, and `gdrive-sync`, adding `// @vitest-environment jsdom` only to the specific test files that require DOM/browser globals.
   - Enable `pool: "threads"` and `fsModuleCache: true` across those package configs.
3. **`scripts/test-changed.mjs`**:
   - Run affected workspace test groups concurrently via `runBufferedCommand` (reused from `scripts/lint-changed.mjs`).
4. **`.github/workflows/deploy.yml`**:
   - Run `FULL=true` workspace tests concurrently (`xargs -P 4`) and persist package `node_modules/.vite` caches in `Cache test artifacts`.

---

## 3. Verification Plan

- `apps/web`: run both `node` project tests (`src/lib/services/adventure/`) and `jsdom` Svelte component tests (`src/lib/components/adventure/`) via `bunx vitest run`.
- Packages: run `bun test` / `vitest run` in `ai-engine`, `vault-engine`, `map-engine`, `gdrive-sync`, `audio-engine`.
- Tooling & PR gate: run `bun run pr:gate --base perf/ci-svelte-check-tsgo`.
