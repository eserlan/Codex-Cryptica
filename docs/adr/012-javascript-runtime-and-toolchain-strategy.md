# ADR 012: JavaScript Runtime and Toolchain Strategy

## Context and Problem Statement

Codex-Cryptica is currently a TypeScript monorepo using:

- `pnpm` workspaces for package installation and linking.
- `turbo` for root-level orchestration of build, lint, type-check, and test tasks.
- SvelteKit, Vite, Vitest, Playwright, Tailwind, Wrangler, and several browser-oriented npm dependencies in `apps/web`.
- Multiple local TypeScript packages under `packages/*`, many of which are pure or mostly pure library code.

During Spec 103 work, the root `pnpm run lint` and pre-push hook could not run in the local Termux Android arm64 environment because Turborepo does not support that platform. Direct web-level checks still worked:

- `pnpm --filter web run lint`
- `pnpm --filter web run lint:types`
- focused `vitest` runs with constrained worker settings

This raised the question of whether the repository should transition from Node/pnpm/Turbo to Deno, or to another JavaScript runtime/toolchain strategy.

## Decision Drivers

- **Frontend Compatibility:** The SvelteKit/Vite app should remain boring and well-supported.
- **Monorepo Reliability:** Workspace package linking and local package builds must remain predictable.
- **Cross-Platform Developer Experience:** Tooling should work on common development machines and degrade gracefully on constrained environments like Termux.
- **CI Stability:** The chosen toolchain must be easy to reproduce in CI.
- **Migration Risk:** Runtime changes should not consume engineering time unless they remove real complexity.
- **Security and Local-First Fit:** Tooling that improves explicit permissions and reduces unnecessary dependency execution is valuable, but not at the cost of frontend instability.

## Considered Options

### Option 1: Keep Node + pnpm + Turbo as the Primary Toolchain

Keep the current stack as the canonical development and CI toolchain.

**Pros**

- Best-aligned with SvelteKit, Vite, Vitest, Playwright, Wrangler, and the current npm dependency graph.
- Lowest migration cost.
- CI and most developer machines can continue using the established scripts.
- Preserves `pnpm` workspace behavior already used across `apps/*` and `packages/*`.

**Cons**

- Turborepo does not support every local platform, including the Termux Android arm64 environment used during this work.
- Root-level scripts can be unavailable locally even when package-level scripts work.
- Does not reduce reliance on `node_modules` or npm lifecycle tooling.

### Option 2: Full Repository Transition to Deno

Move runtime, dependency management, scripts, linting, formatting, and tests to Deno wherever possible.

**Pros**

- Deno has first-party TypeScript execution, linting, formatting, testing, permissions, and workspace support.
- Deno supports `package.json` compatibility and npm packages.
- Deno workspaces can include Deno-first, hybrid, and Node-first packages.

**Cons**

- The web app depends on SvelteKit/Vite and npm-heavy frontend tooling. Deno's docs still call out frameworks like Svelte as cases where local `node_modules` may be needed.
- Some dependencies may require Node-API/native-addon behavior, postinstall scripts, or explicit permissions.
- A full migration would be mostly compatibility work rather than product work.
- It would introduce a second axis of risk across deployment, tests, and contributor onboarding.

### Option 3: Hybrid Deno for Pure Packages and Scripts

Keep Node/pnpm as canonical for the web app and workspace install, but allow Deno in tightly scoped places:

- pure TypeScript utility packages,
- standalone repository scripts,
- codegen or validation tasks that do not depend on SvelteKit/Vite/Playwright/Wrangler,
- experimental package-level checks.

**Pros**

- Captures Deno's strengths without putting the web app on the migration path.
- Lets the repo prove Deno value with real tasks before broad adoption.
- Can improve script portability and explicit permissions for isolated tasks.
- Deno can participate in hybrid workspaces, reducing the need for all-or-nothing migration.

**Cons**

- Adds another tool developers may need installed.
- Requires clear boundaries so the repo does not drift into two competing toolchains.
- Still does not solve all root orchestration problems unless those tasks are deliberately mirrored or replaced.

### Option 4: Replace Turbo with pnpm-Only Orchestration

Keep Node and pnpm, but remove or reduce root reliance on Turbo by using `pnpm --recursive`, `pnpm --filter`, and package-level scripts.

**Pros**

- Directly addresses the Termux/Turbo platform issue.
- Minimal runtime migration risk.
- Keeps the current package manager and dependency model.
- Easier to reason about than adding Deno or Bun.

**Cons**

- Loses Turbo caching and task graph behavior unless replaced elsewhere.
- May make CI slower.
- Requires maintaining root scripts carefully so package ordering remains correct.

### Option 5: Move to Nx

Replace Turbo with Nx for task orchestration and caching.

**Pros**

- Mature monorepo task graph, caching, affected-project workflows, and inferred task support.
- Can improve large-repo ergonomics if Codex-Cryptica keeps growing.

**Cons**

- Larger conceptual surface than the repo currently needs.
- Does not materially improve the SvelteKit runtime story.
- Migration cost is higher than pnpm-only fallback scripts.
- Platform support and local binary availability still need validation on Termux before it can be called a fix.

### Option 6: Move to Bun

Adopt Bun as runtime/package manager/test runner, either fully or selectively.

**Pros**

- Fast package manager and runtime.
- Supports workspaces and filtered workspace script execution.
- Closer to Node/npm compatibility goals than a pure Deno migration.

**Cons**

- Still a major toolchain migration.
- Test runner and edge cases would need validation against SvelteKit/Vite/Vitest/Playwright/Wrangler.
- Does not offer the same explicit-permission model that makes Deno attractive.
- Adds less strategic value than solving the narrower Turbo platform issue directly.

## Decision Outcome

Chosen option: **Option 1 as the canonical toolchain, with Option 3 allowed as a controlled pilot and Option 4 as the preferred mitigation for local Turbo incompatibility.**

Codex-Cryptica should **not** transition the full repository to Deno at this time.

The canonical stack remains:

- Node runtime for the web app and build tooling.
- `pnpm` for dependency management and workspaces.
- Turbo for CI/root orchestration where supported.
- Package-level `pnpm --filter` commands for local environments where Turbo is unavailable.

Deno may be introduced only under a narrow pilot rule:

1. The target must be a pure TypeScript package or standalone script.
2. It must not be required for `apps/web` build, preview, deployment, Playwright, Wrangler, or SvelteKit/Vite tasks.
3. It must have explicit commands documented in the package or ADR follow-up.
4. It must prove at least one concrete benefit: simpler script execution, stronger permission boundaries, less install friction, or better local portability.
5. It must not introduce duplicate formatting/linting rules that conflict with the existing repo style.

## Consequences

### Positive

- Avoids a high-risk runtime migration while the web app is heavily coupled to Node-oriented frontend tooling.
- Keeps CI and deployment aligned with the current SvelteKit/Vite/Wrangler ecosystem.
- Gives Deno a legitimate evaluation path without committing the whole repo.
- Separates the actual local blocker, Turbo platform support, from the broader runtime decision.

### Negative

- Root scripts may still fail on unsupported Turbo platforms unless package-level fallback commands are documented and maintained.
- Deno benefits remain limited until a concrete pilot is selected.
- The repo keeps a conventional `node_modules` workflow for now.

## Follow-Up Work

1. Add documented fallback commands for local environments where Turbo is unavailable:
   - `pnpm --filter web run lint`
   - `pnpm --filter web run lint:types`
   - `pnpm --filter web exec vitest run --maxWorkers=1 --no-fileParallelism`
2. Identify one low-risk Deno pilot candidate, preferably a pure package or standalone validation script.
3. Before adopting Deno in any package, run:
   - `deno check`
   - `deno test`
   - `deno lint`
4. Reconsider a broader transition only if the pilot reduces maintenance cost without increasing frontend/tooling risk.

## References

- Deno workspaces and monorepos: https://docs.deno.com/runtime/fundamentals/workspaces/
- Deno Node and npm compatibility: https://docs.deno.com/runtime/manual/node/
- Deno configuration and `package.json` support: https://docs.deno.com/runtime/fundamentals/configuration/
- Bun workspaces: https://bun.sh/docs/install/workspaces
- Nx inferred tasks: https://nx.dev/docs/concepts/inferred-tasks
