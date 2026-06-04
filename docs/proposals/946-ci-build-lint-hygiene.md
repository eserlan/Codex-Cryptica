# 946 — CI, Build, and Lint Hygiene

> Plan for [#946](https://github.com/eserlan/Codex-Cryptica/issues/946).
> Origin: `docs/proposals/NEXT_FEATURES_AND_CODE_IMPROVEMENTS.md` (Code Improvement J).

## Problem

CI runs lint, tests, and build, but:

- It does **not** run type-checking as a standalone, visible step — a broken type
  change is invisible until someone reads build logs (and the build doesn't even
  type-check; see below).
- There's no bundle-size signal on PRs.
- E2E runs only on a nightly cron, so real UI breakage is found "the morning after."
- `@ts-expect-error` / relaxed Svelte-rule suppressions drift over time.

## Current-state findings (audit)

Investigating the actual workflows turned up more than the issue assumed:

### 1. CI does not run on PRs at all

`ci.yml` triggers **only on `push` to `main`/`staging`**. There is no
`pull_request` trigger. So on a feature-branch PR into `staging`, `ci.yml` never
runs — lint/test/build only execute _after_ merge to `staging`.

### 2. `deploy.yml` already does CI's work — twice

`deploy.yml` triggers on `push` **and** `pull_request` to `main`/`staging`, and its
`build` job runs `lint` + `test:coverage` + `build` before deploying.

| Event                           | `ci.yml`                | `deploy.yml`                                   |
| ------------------------------- | ----------------------- | ---------------------------------------------- |
| **push** → staging/main         | lint + test + **build** | lint + test + **build** + deploy               |
| **pull_request** → staging/main | _(does not run)_        | lint + test + **build** + preview + PR comment |

Consequences:

- On every push, **lint + test + build run twice in parallel** (once per workflow) — pure waste.
- The "CI doesn't run on PRs" gap is partly filled, but by the _deploy_ workflow, not `ci.yml`.
- `deploy.yml` self-gates: its `deploy` job has `needs: build`, so a lint/test/build
  failure blocks the deploy. There is no cross-workflow dependency between `ci.yml`
  and `deploy.yml` — they are independent.

### 3. Type-checking is not the same as linting, and the build skips it

- **Lint (ESLint)** works largely file-by-file on _patterns_ (unused vars,
  `no-explicit-any`, Svelte rules). It does not run the TS compiler over the whole program.
- **Type-check (`svelte-check`/`tsc`)** runs the compiler across the whole program:
  cross-file types, signatures, null/undefined, removed/renamed fields and props.
- **The build does not type-check.** Vite/esbuild _strips_ types without verifying
  them, so a type-broken change builds green and ships. Only `svelte-check` catches it.

These are three genuinely different gates.

### 4. The type-check baseline is already red

`bun run lint:types` currently reports **157 errors / 13 warnings**:

- **99 errors in test/spec files** — heavily clustered: **60 of them in just two files**
  (`entity-store.test.ts` ×33, `DetailProposals.test.ts` ×27). Root cause is repetitive:
  test fixtures build partial objects against tightened types now requiring `type`,
  `tags`, `strength`, `status`, etc., plus a few private-member (`deps`) accesses.
- **58 errors in source/package files** — varied: `theme.svelte.ts` ×11 (read-only
  theme tokens ×8), `search.svelte.ts` ×11, timeline/temporal drift, and
  `packages/editor-core/temporal.ts` ×5 + `graph-engine` + `events`. Several
  "comparison has no overlap" / "property does not exist" cases are likely **genuine
  bugs / dead branches**, not just compiler noise.

This is the "drift" the issue warns about — it means type-check **cannot land as a hard
required gate on day one**, or CI goes red and blocks every PR until all 157 are fixed.

### 5. Dependabot is already done

`.github/dependabot.yml` exists (npm + github-actions, weekly, grouped). Part 5 of the
issue is effectively complete; optionally refine toward the "monthly major-version
window" described in the issue, but the current grouped-weekly config is reasonable.

## Scope decisions

Tackling **Part 1 (type-check in CI)** and **Part 3 (bundle-size signal)** now.

- **Part 2 (smoke E2E on PR)** — deferred. E2E is slow; the cost/benefit on every PR
  isn't worth it right now. Nightly run stays.
- **Part 4 (escalate Svelte rules)** — deferred as its own incremental track. Related to
  the type-error paydown below.
- **Part 5 (Dependabot)** — already done.

## Plan

### A. CI / deploy refactor (the architecture fix)

Make `ci.yml` the single quality gate and stop double-building. Gating model: **lean on
branch protection** (Option (a)) rather than deploy self-gating.

1. **`ci.yml`**
   - Add `pull_request: branches: [staging, main]` trigger (same `paths-ignore` as push).
   - Add **type-check as a prominent, separately-named job** (its own status check) running
     `bun run lint:types` with GitHub annotations.
   - **Remove the build step** — `deploy.yml` already builds on both push and PR.
   - Keep lint + test:coverage (+ coverage upload).
2. **`deploy.yml`**
   - **Remove the redundant `Lint and Test` step** — `ci.yml` now owns quality gates.
   - Keep build + preview/deploy + PR comment.
3. **Branch protection** — require `ci.yml`'s checks (lint, test, and eventually
   type-check) on PRs into `staging`. This is what enforces the gate, since the two
   workflows are independent.

Net: no more double lint/test/build, type-check becomes a first-class visible check, and
CI finally runs on PRs.

> Caveat accepted: stripping lint/test from `deploy.yml` means a direct
> `workflow_dispatch`/hotfix push that skips a PR would deploy without a lint/type gate
> (the build still runs). Acceptable under the branch-protection model.

### B. Type-check sequencing (resolving the red baseline)

Land the full fix rather than a permanent `continue-on-error` escape hatch:

1. **Test bucket first (99 errors, fast & safe).** Introduce a shared fixture factory
   (`makeEntity()` / `makeDeps()`), which clears most of the clustered errors; mop up the
   per-file remainder. Low risk — test code only.
2. **Source/package bucket (58 errors).** Case-by-case. The mechanical ones are quick; the
   ~6–10 "no overlap" / "property doesn't exist" cases are likely real bugs — these need a
   behavior decision (is this dead code or a real branch?) and will be raised on the issue/PR
   as they come up.
3. Once `lint:types` is green, **flip the type-check job to required** (remove any
   `continue-on-error`) and add it to branch protection.

**Estimate (AI-driven):** test bucket ~20–40 min; source bucket ~1–2 hrs plus a handful of
judgment-call questions. Roughly a **1.5–2.5 hr** end-to-end task, gated mostly by the
genuine-bug decisions and `lint:types` run time (~30–60 s/run).

> If a faster landing is preferred: fix the 99 test errors now and gate type-check on a
> config that's already green for tests, keeping source as non-blocking until the 58 are
> paid down. (Hybrid fallback — not the default plan.)

### C. Bundle-size signal (Part 3)

1. Add `rollup-plugin-visualizer` as a dev dependency and wire it into
   `apps/web/vite.config.ts` (`build.rollupOptions.plugins`), emitting a treemap on build.
2. Set `build.chunkSizeWarningLimit` to a sensible threshold so oversized chunks warn.
3. Surface size deltas on PRs (visualizer artifact upload, and/or a size-report comment).

## Deferred / follow-up

- Part 2: smoke E2E on PR.
- Part 4: escalate the relaxed Svelte rules `off` → `warn` → `error` incrementally; audit
  the (currently 19) `@ts-expect-error` suppressions. Pairs naturally with the type-error
  paydown in **B**.
- Part 5: optional Dependabot refinement toward a monthly major-version review window.
