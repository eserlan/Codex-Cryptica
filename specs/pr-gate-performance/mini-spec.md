# Local PR Gate & Validation Performance Speedup Mini-Spec

## 1. Specification (What & Why)

### Problem Statement

Pre-PR validation currently takes ~2–2.5 minutes per iteration for modest TypeScript changes because cold `svelte-check` runs (~100s), uncached Vitest module transforms (~5–12s per run), repeated uncached ESLint/Prettier passes across `pre-commit` / `lint:changed` / `pre-push` (~15–25s), and cold `fallow:audit` runs (~13–20s) execute sequentially. In addition, `getChangedFiles({ base })` in `scripts/lint-changed.mjs` omits working-tree changes whenever `--base` is supplied, causing pre-commit `test:changed` / `lint:changed` runs to exit with "No changed files" and forcing manual reruns.

### Scope & Boundaries

- **In Scope**:
  - Enable Vitest 5 persistent module transform caching (`experimental.fsModuleCache: true`) and expand `environmentMatchGlobs` (`"node"`) for pure non-DOM service tests (such as `src/lib/services/adventure/**`) in `apps/web/vite.config.ts`.
  - Add content-hashed ESLint caching (`--cache --cache-strategy content --cache-location node_modules/.cache/eslint/`) in `scripts/lint-changed.mjs` and `package.json` (`lint-staged`), and scope `.husky/pre-push` to the pushed commit range when an upstream SHA exists while keeping its `scripts/lint-changed.mjs --base` contract intact.
  - Fix `getChangedFiles` in `scripts/lint-changed.mjs` so local `--base` runs include uncommitted tracked working-tree edits by default (with `--committed-only` for CI / `factory/checks.sh`).
  - Add a parallel `scripts/pr-gate.mjs` (`bun run pr:gate`) that runs independent read-only gates (`test:changed`, `lint:changed`, `typecheck`, `fallow:audit`) concurrently and prints a single pass/fail timing summary.
  - Add workspace-scoped typechecking (`scripts/typecheck-changed.mjs`) using `selectAffectedWorkspaces` so `svelte-check` only runs when `apps/web` (or a transitive dependency) is affected.
  - Gate Fallow's CSS audit to diffs that touch `.css` or `.svelte` files (or audit why `.fallowrc.json` graph cache invalidates and upgrade/configure Fallow for warm cache reuse).
- **Out of Scope**:
  - Weakening or removing any CI quality gate (CI continues to run full `svelte-check`, lint, impacted tests, and Fallow).
  - Refactoring test assertions or splitting existing slow E2E Playwright suites.
  - Changing gitmoji commitlint rules or repository-wide validation rules in `AGENTS.md`.

### Acceptance Criteria

- [ ] Repeat `apps/web` Vitest runs on unchanged transforms show cache reuse (`fsModuleCache`) and pure `src/lib/services/adventure/**` tests run in `node` environment without booting `jsdom`.
- [ ] `bun scripts/lint-changed.mjs --base origin/staging` and `bun scripts/test-changed.mjs --base origin/staging` detect uncommitted modified files locally, while `--committed-only` restricts output strictly to committed `base...head` diffs.
- [ ] ESLint cache is written under `node_modules/.cache/eslint/` (zero dirty `git status` files) and repeat `lint-changed` / `pre-push` runs reuse cached results.
- [ ] `bun run pr:gate` executes impacted tests, lint, typecheck, and Fallow audit in parallel, exits non-zero if any gate fails, and reports per-gate status and elapsed duration in a single summary.
- [ ] All existing script unit tests (`scripts/lint-changed.test.ts`, `scripts/test-changed.test.ts`, `scripts/pre-push-hook.test.ts`, `scripts/affected-workspaces.test.ts`) plus new unit tests for `pr-gate.mjs` and `typecheck-changed.mjs` pass.

---

## 2. Technical Plan (How & Where)

### Architecture & Touchpoints

- **Affected Packages / Files**:
  - `apps/web/vite.config.ts`: Enable `test.experimental.fsModuleCache = true` and add pure TS service globs (e.g. `["src/lib/services/adventure/**", "node"]`) to `test.environmentMatchGlobs`.
  - `scripts/lint-changed.mjs`:
    - Add `committedOnly = false` flag to `getChangedFiles` (`--committed-only` CLI flag) so uncommitted working-tree edits are included locally even when `--base` is passed.
    - Pass `--cache --cache-strategy content --cache-location node_modules/.cache/eslint/` to `eslint`.
  - `package.json`:
    - Add `--cache --cache-strategy content --cache-location node_modules/.cache/eslint/` to `lint-staged` ESLint entry.
    - Add `"pr:gate": "bun scripts/pr-gate.mjs"` and `"typecheck:changed": "bun scripts/typecheck-changed.mjs"`.
  - `scripts/typecheck-changed.mjs` (new, <150 lines): Inspects changed files and affected workspaces (`selectAffectedWorkspaces`); runs `svelte-check` when `.svelte`/`.svelte.ts`/route files or `--strict-svelte`/`CI` are set, and runs cached `tsc --noEmit --incremental --tsBuildInfoFile node_modules/.cache/tsbuildinfo/web.tsbuildinfo` for fast local `.ts`-only checks.
  - `scripts/pr-gate.mjs` (new, <180 lines): Spawns `test-changed`, `lint-changed`, `typecheck-changed`, and `fallow audit` concurrently with `Bun.spawn` / `child_process.spawn`, buffers per-gate output so logs do not interleave, and prints a concise summary table with wall-clock timings.
  - `.husky/pre-push`: Preserve the `bun scripts/lint-changed.mjs --base "$base"` invocation tested by `scripts/pre-push-hook.test.ts`, using the pushed remote SHA when available on stacked branches so already-pushed base commits are not re-linted unnecessarily.
  - `.fallowrc.json`: Investigate graph cache invalidation and disable unconditional CSS scanning during pure-TS `audit` runs (keeping `fallow health --css` available and enabling CSS checks when `.css`/`.svelte` files change).
  - `scripts/lint-changed.test.ts`, `scripts/typecheck-changed.test.ts` (new), `scripts/pr-gate.test.ts` (new): Unit tests covering happy paths, flag handling, and failure propagation.
- **Data Contracts & State Flow**:
  - All caches live strictly under `node_modules/.cache/` (`eslint/`, `tsbuildinfo/`, Vitest's `.vitest` cache) so they are automatically gitignored and disposable.
  - `scripts/pr-gate.mjs` uses dependency-injected command runners in its exported `runPrGate(...)` helper so unit tests exercise parallel aggregation and failure handling without spawning real subprocesses.

### Key Technical Decisions & Tradeoffs

- **Keep caches in `node_modules/.cache/`**: Avoids modifying `.gitignore` or risking accidental commits of `.eslintcache` / `*.tsbuildinfo` files.
- **Buffered parallel execution in `pr-gate.mjs`**: Running gates concurrently reduces wall time from `sum(gates)` (~140s) to `max(gates)` (~15–25s warm) and surfaces all failures in one pass; buffering stdout/stderr per gate prevents unreadable interleaved output and prints full output only for failing gates (or with `--verbose`).
- **Incremental `tsc` fast-path vs. `svelte-check`**: A `.ts` export signature change can still affect a `.svelte` consumer; therefore `typecheck-changed.mjs` uses incremental `tsc` only as a fast local mode for `.ts`-only diffs inside `apps/web` (or when `packages/*` didn't change public exports), while `--strict-svelte` and CI always run full `svelte-check`.
- **Keep `.husky/pre-push` invoking `scripts/lint-changed.mjs --base`**: Preserves compatibility with `scripts/pre-push-hook.test.ts`; ESLint's content cache provides the speedup automatically.

### Failure, Edge & Cancellation Paths

- **Positive / Expected Path**: On a branch touching `packages/adventure-engine` and one `.ts` file in `apps/web`, `bun run pr:gate` runs all 4 gates in parallel, hits warm ESLint/Vitest/TS caches, and completes in ~15–25s with exit code `0`.
- **Negative / Error Path**: If any single gate fails (e.g., Fallow complexity violation or unit test failure), `pr-gate.mjs` waits for sibling gates to finish (so all defects are visible at once), prints the failing gate's buffered output, and exits non-zero (`1`).
- **Cancellation / Edge Case**: On `SIGINT`/`SIGTERM`, `pr-gate.mjs` terminates all spawned child processes cleanly without leaving orphaned `svelte-check` or `vitest` workers. When `node_modules/.cache` is missing or stale (fresh checkout), all tools fall back cleanly to cold builds without failing.

---

## 3. Tasks & Execution Sequence (When)

- [ ] **Task 1: Tests (TDD)** — Add failing unit tests in `scripts/lint-changed.test.ts` (uncommitted inclusion with `--base`, `--committed-only`, ESLint `--cache` args), `scripts/typecheck-changed.test.ts` (`.ts`-only fast path vs. `.svelte` full `svelte-check` vs. failure propagation), and `scripts/pr-gate.test.ts` (parallel execution, aggregated failure exit code, empty/no-op gate).
- [ ] **Task 2: Vitest & ESLint Cache Quick Wins** — Update `apps/web/vite.config.ts` (`fsModuleCache: true`, `node` env globs), `scripts/lint-changed.mjs` (`--cache` + `committedOnly`), and `package.json` (`lint-staged` ESLint cache).
- [ ] **Task 3: Incremental Typecheck & Parallel PR Gate** — Implement `scripts/typecheck-changed.mjs` and `scripts/pr-gate.mjs` with constructor/parameter DI for subprocess execution and clean `SIGINT`/`SIGTERM` teardown; wire `pr:gate` and `typecheck:changed` scripts in `package.json`.
- [ ] **Task 4: Pre-push & Fallow Tuning** — Refine `.husky/pre-push` base selection for stacked branches (preserving `pre-push-hook.test.ts`) and tune `.fallowrc.json` / Fallow cache behaviour for non-CSS diffs.
- [ ] **Task 5: Benchmark & Verification Gate** — Measure cold vs. warm timings on a sample diff and run impacted verification checks.

---

## 4. Verification Gate

```bash
bun test scripts/lint-changed.test.ts scripts/test-changed.test.ts scripts/pre-push-hook.test.ts scripts/affected-workspaces.test.ts scripts/typecheck-changed.test.ts scripts/pr-gate.test.ts
bun scripts/lint-changed.mjs --base origin/staging
bun run fallow:audit
```
