# ADR 012: JavaScript Runtime and Build Tooling Strategy

## Status

Proposed. Supersedes the earlier draft of this ADR, which framed the question as "should we migrate to Deno?" — too narrow. This version treats the toolchain as a set of swappable axes and recommends a target stack.

## Context

Codex-Cryptica is a TypeScript monorepo with one Svelte 5 / SvelteKit 2 web app, one Cloudflare Worker (`oracle-proxy`), and 14 pure-TypeScript packages. The current toolchain is:

| Axis              | Today                    |
| ----------------- | ------------------------ |
| Runtime (scripts) | Node 24                  |
| Package manager   | pnpm 10 workspaces       |
| Orchestrator      | Turbo 2.9                |
| Bundler (web)     | Vite 8 (via SvelteKit 2) |
| Test runner       | Vitest 4                 |
| E2E               | Playwright               |
| Deploy            | Wrangler (Cloudflare)    |
| Lint / format     | ESLint 10 + Prettier 3.8 |

Pain points that motivate revisiting this:

1. **Cross-platform binary gaps.** Turbo has no Termux Android arm64 build, so root-level scripts fail in that environment.
2. **Install time.** `pnpm install` cold on this repo (~80 npm deps + 14 workspace packages) is the single largest CI step.
3. **Tool sprawl.** Turbo's value over `pnpm -r --filter` is mostly remote caching and task graph, both of which are underused here (no remote cache; task graph is shallow).
4. **Script runtime.** Many root and per-package scripts are plain TS or `.mjs`. Running them through Node + tsx/esbuild adds startup overhead per invocation.

The earlier draft assumed the only alternative was Deno. There are more options, and they're separable.

## What is fixed (and why)

These are not on the table; treat them as constraints:

- **Vite 8** — locked in by SvelteKit 2. Any bundler swap means leaving SvelteKit.
- **SvelteKit 2 / Svelte 5** — the web app's framework. Out of scope.
- **Wrangler** — required by Cloudflare Pages + Workers deploy. Node-shaped CLI.
- **Playwright** — e2e runner. Node-shaped binary.
- **Vitest 4** — coupled to Vite. Swapping would force a different bundler stack and rewrite of every test file.

What this means: any candidate must run Vite, Vitest, Wrangler, and Playwright as Node-API consumers without compatibility shims. That rules out Deno as a primary runtime and rules out Bun's bundler/test runner as replacements for Vite/Vitest.

## What is swappable

| Axis                  | Candidates                                    |
| --------------------- | --------------------------------------------- |
| Package manager       | pnpm (today), Bun, npm                        |
| Orchestrator          | Turbo (today), moon, Nx, Bun `--filter`, none |
| Script-execution host | Node (today), Bun, tsx-via-Node               |
| Lockfile              | pnpm-lock.yaml (today), bun.lock              |

## Decision Drivers

1. **Speed** — install time and orchestration overhead are the visible cost on CI and local dev.
2. **Cross-platform binaries** — aarch64 Linux (incl. Termux) must work. macOS arm64 and Linux x64 are non-negotiable.
3. **Tool surface** — fewer tools is better, all else equal.
4. **Migration cost** — measured in PRs, not weeks. One contributor should be able to land it.
5. **Compatibility with locked-in stack** — Vite/Vitest/Wrangler/Playwright must keep working without per-call shims.
6. **CI image availability** — must be a one-line install in GitHub Actions and the Cloudflare Pages build environment.

## Options

### Option A — Status quo: Node + pnpm + Turbo

Keep everything. Add documented `pnpm -r --filter` fallbacks for Termux.

- **Speed:** baseline.
- **Cross-platform:** broken on Termux/arm64 (Turbo).
- **Tool surface:** unchanged.
- **Migration cost:** ~0.
- **Verdict:** safe but leaves real wins on the table.

### Option B — Bun as package manager + script host; drop Turbo; keep Vite/Vitest

Replace pnpm with `bun install`, replace Turbo with `bun --filter`, run scripts through `bun run` / `bun x`. Vite, Vitest, Wrangler, Playwright, SvelteKit unchanged — they continue to be invoked the same way; Bun just hosts them.

- **Speed:** `bun install` is typically 5–10× pnpm cold; `bun run` is faster than `node` for scripts.
- **Cross-platform:** native aarch64-linux binary; runs on Termux.
- **Tool surface:** −1 (Turbo gone). pnpm + Turbo → Bun.
- **Migration cost:** moderate — lockfile swap, CI image swap, validate every `pnpm` invocation has a `bun` equivalent, audit any package that ships postinstall scripts or expects pnpm's symlinked `node_modules` layout.
- **Risks:** Bun's `node_modules` layout differs from pnpm's (no symlink farm). Some packages with implicit transitive imports may break — mitigation is a one-pass audit during migration. Wrangler and Playwright are routinely run under Bun in production by other projects; low risk.
- **Verdict:** highest ROI swap. Touches the swappable axes, leaves the locked-in stack alone.

### Option C — Keep pnpm; replace Turbo with moon

Swap orchestrator only. `moon` (Rust-based, native binaries for linux-x64, linux-arm64, darwin-arm64, win-x64) is the closest direct replacement for Turbo with better cross-platform binary coverage.

- **Speed:** roughly Turbo-equivalent, possibly faster for affected-task graphs.
- **Cross-platform:** native aarch64 Linux binary.
- **Tool surface:** unchanged (1-for-1 swap).
- **Migration cost:** rewrite `turbo.json` as `.moon/*.yml`, port the four task definitions.
- **Risks:** smaller community than Turbo; less GitHub Actions tooling.
- **Verdict:** the conservative answer. Fixes the binary gap without touching the package manager.

### Option D — Keep pnpm; drop Turbo entirely (use `pnpm -r --filter`)

No orchestrator. Use `pnpm -r --filter "./packages/*" --filter web run <task>` in root scripts.

- **Speed:** loses Turbo's task graph and local cache.
- **Cross-platform:** pnpm works everywhere.
- **Tool surface:** −1 (Turbo gone).
- **Migration cost:** rewrite four root scripts.
- **Risks:** CI gets ~10–30% slower depending on cache hit rates; no `--affected` flag without scripting it.
- **Verdict:** the minimum-change option. Worth doing if Option B is rejected.

### Option E — Bun for everything, including bundler/test (rejected)

Use Bun's bundler and test runner instead of Vite/Vitest. Rejected up front — SvelteKit requires Vite; rewriting test files away from Vitest costs more than it saves.

### Option F — Deno (rejected)

Same reasoning as the prior ADR draft: SvelteKit/Vite/Wrangler/Playwright are all Node-shaped, full Deno migration is compatibility work with no product payoff.

### Option G — Nx (rejected)

Larger conceptual surface than this repo needs at 14 packages; does not improve any locked-in axis.

## Decision

**Adopt Option B: Bun as package manager + script-execution host; drop Turbo; keep Vite, Vitest, SvelteKit, Wrangler, Playwright, ESLint, Prettier.**

Target stack:

| Axis              | Today      | Target                 |
| ----------------- | ---------- | ---------------------- |
| Runtime (scripts) | Node 24    | **Bun 1.x**            |
| Package manager   | pnpm 10    | **Bun**                |
| Orchestrator      | Turbo      | **`bun --filter`**     |
| Bundler (web)     | Vite 8     | Vite 8 (unchanged)     |
| Test runner       | Vitest 4   | Vitest 4 (unchanged)   |
| E2E               | Playwright | Playwright (unchanged) |
| Deploy            | Wrangler   | Wrangler (unchanged)   |

Rationale: This is the only option that simultaneously fixes install speed, the Termux/arm64 gap, and tool surface — without touching any of the locked-in pieces. Vitest stays because it's coupled to Vite; we are not swapping the test runner. Bun is the _host_, not the framework.

**Fallback if Option B blocks on a real incompatibility:** Option C (moon). Option D is the zero-risk bottom line.

## Migration Plan

Phased so each step is independently revertible.

1. **Phase 0 — Decision validation** _(1 day)_
   Build a throwaway branch. Run `bun install`, `bun run build --filter web`, `bun run test --filter "./packages/*"`, `bun x playwright test`, `bun x wrangler deploy --dry-run`. Confirm green. If anything is yellow, escalate to Option C before committing.

2. **Phase 1 — Lockfile and CI** _(1 PR)_
   Add `bun.lock`, keep `pnpm-lock.yaml` in place. Update CI to install Bun and run `bun install --frozen-lockfile`. Verify caches.

3. **Phase 2 — Replace root scripts** _(1 PR)_
   Rewrite root `package.json` scripts using `bun --filter` in place of `turbo run`. Delete `turbo.json`. Remove `turbo` from `devDependencies`.

4. **Phase 3 — Remove pnpm** _(1 PR)_
   Delete `pnpm-lock.yaml`, drop `packageManager` field's pnpm pin, update `engines` to Bun. Update CONTRIBUTING and any README references.

5. **Phase 4 — Cloudflare Pages build environment** _(1 PR)_
   Set the Pages build command to use Bun. Verify deploy preview parity with current main.

Each phase is one commit, easy to revert.

## Consequences

### Positive

- ~5–10× faster cold installs locally and in CI.
- One fewer top-level tool (Turbo gone).
- Native aarch64 binary; Termux works.
- Script startup overhead reduced (`bun x vitest` beats `node` boot).
- Lockfile becomes the only source of truth (no pnpm/npm dual presence).

### Negative

- One-time migration cost (5 PRs above).
- Bun's `node_modules` layout is flat-ish, not pnpm's symlink farm. Packages that secretly relied on pnpm strictness may surface hidden dependency leaks. Mitigation: fix the missing `dependencies` declaration in the offending package — that's a correctness improvement, not a regression.
- CI cache key changes; first CI run after merge is uncached.
- Contributors must install Bun. One-line install; not a real obstacle, but worth a CONTRIBUTING note.

### Neutral

- Vitest, Vite, SvelteKit, Wrangler, Playwright, ESLint, Prettier all unchanged.

## Re-evaluation Triggers

Revisit this ADR if any of:

- Bun introduces a regression in Vite/Vitest/Wrangler/Playwright that requires per-call shims.
- The repo grows past ~30 packages and the `--filter` task graph becomes a bottleneck (consider moon or Nx at that point).
- SvelteKit migrates off Vite (unlikely).
- A workspace package needs to be published to npm and Bun's publish workflow proves insufficient.

## References

- Bun workspaces and `--filter`: https://bun.sh/docs/install/workspaces
- Bun vs Node compatibility matrix: https://bun.sh/docs/runtime/nodejs-apis
- moon orchestrator: https://moonrepo.dev/
- Vite + Bun compatibility notes: https://bun.sh/docs/ecosystem/vite
- SvelteKit on Bun: https://bun.sh/guides/ecosystem/sveltekit
- Cloudflare Pages with Bun: https://developers.cloudflare.com/pages/configuration/build-image/
- Prior context: the rejected Deno-migration framing in this ADR's earlier draft.
