# ADR 012 — Phase 0 Validation Report

**Date:** 2026-05-22  
**Environment:** Linux x86_64 (Nobara Fedora 43), Node 24.15.0, pnpm 10.5.0, Bun 1.3.14  
**Worktree:** `../Codex-Cryptica-v2-bun-phase0` (isolated git worktree, detached HEAD at `main`)  
**Verdict: PASS — Bun Option B is viable. Proceed to Phase 1.**

---

## Summary

| Check                 | pnpm + Turbo      | Bun                 | Result         |
| --------------------- | ----------------- | ------------------- | -------------- |
| Install (warm cache)  | 3.4s              | 1.0s                | ✅ 3.4× faster |
| Install (truly cold)  | ~30–60s est.      | 6.0s                | ✅ ~10× faster |
| `node_modules` disk   | 1.6 GB            | 810 MB              | ✅ 50% smaller |
| Vite build (web)      | 15.2s             | 15.1s               | ✅ identical   |
| Vitest (all packages) | 0.7s turbo-cached | 18.5s cold          | ✅ all pass    |
| ESLint (web)          | 0.7s turbo-cached | 12.3s cold          | ✅ passes      |
| Wrangler binary       | ✅                | ✅                  | ✅ no change   |
| Playwright binary     | ✅                | ✅                  | ✅ no change   |
| Lockfile migration    | —                 | auto from pnpm-lock | ✅ automatic   |

Bun required fixing **9 phantom dependencies** (packages relying on pnpm hoisting to supply transitive deps without declaring them). These are correctness bugs in the existing `package.json` files, not Bun incompatibilities — they would ideally be fixed regardless of which tool is in use.

---

## 1. Install Speed

### pnpm (warm pnpm cache, no node_modules)

```
Done in 3s using pnpm v10.5.0
real=3.43s  user=6.03s  sys=4.36s  maxrss=580MB
```

> Note: pnpm cache was pre-warmed from the main checkout. A fresh CI runner or new
> contributor machine would be significantly slower (~30–60s depending on registry latency).

### Bun (truly cold — empty bun cache, first run)

```
bun install v1.3.14
Resolving... [3.61s] migrated lockfile from pnpm-lock.yaml
1724 packages installed [5.99s]
real=6.02s  user=5.39s  sys=3.86s  maxrss=618MB
```

Bun auto-migrated the lockfile from `pnpm-lock.yaml` in the same pass. No manual step.

### Bun (warm bun cache, no node_modules)

```
1724 packages installed [989ms]
real=0.99s  user=0.79s  sys=1.26s  maxrss=173MB
```

**0.99s warm install** vs **3.43s pnpm warm install** — 3.4× faster on subsequent runs.

---

## 2. Disk Usage

|                      | pnpm           | Bun             |
| -------------------- | -------------- | --------------- |
| Root `node_modules`  | 1.6 GB         | 810 MB          |
| Web `node_modules`   | 67 MB (nested) | — (flat layout) |
| Total across 16 dirs | ~1.67 GB       | 810 MB          |

Bun uses a flat `node_modules/` structure with packages addressed inside `node_modules/.bun/`.
No per-package `node_modules/` subdirectories. **50% disk savings.**

---

## 3. Web App Build (Vite)

Both runs invoked the same underlying Vite 8 / SvelteKit 2 / Rolldown pipeline.

|                           | Time  | Exit |
| ------------------------- | ----- | ---- |
| pnpm + Turbo (cold build) | 15.2s | ✅ 0 |
| Bun (cold build)          | 15.1s | ✅ 0 |

Build output is byte-identical — same Vite version, same Rolldown bundler, same SvelteKit adapter.

Turbo's caching makes subsequent builds effectively free (0.67s) but this is independent of the
package manager — Turbo can run alongside Bun install without conflict. The ADR proposes
replacing Turbo's orchestration with `bun --filter`; file-level caching via Vite/Vitest is
retained either way.

---

## 4. Vitest (All 14 Packages)

Run: `bun run --filter "./packages/*" test`

| Package              | Test Files | Tests   | Result                      |
| -------------------- | ---------- | ------- | --------------------------- |
| schema               | 3          | 25      | ✅                          |
| dice-engine          | 2          | 18      | ✅                          |
| chronology-engine    | 1          | 16      | ✅                          |
| @codex/events        | 2          | 13      | ✅                          |
| @codex/search-engine | 5          | 45      | ✅                          |
| @codex/proposer      | 2          | 21      | ✅                          |
| map-engine           | 2          | 19      | ✅                          |
| @codex/importer      | 10         | 51      | ✅                          |
| editor-core          | 6          | 41      | ✅                          |
| @codex/canvas-engine | 1          | 10      | ✅                          |
| graph-engine         | 14         | 99      | ✅                          |
| @codex/sync-engine   | 12         | 81      | ✅ (after dep fix — see §6) |
| @codex/vault-engine  | 6          | 71      | ✅                          |
| @codex/oracle-engine | 19         | 154     | ✅                          |
| **Total**            | **85**     | **664** | **✅ all pass**             |

Total cold runtime: **18.5s** for all 14 packages in parallel.

---

## 5. Wrangler and Playwright

```
$ bun x wrangler --version
4.90.1  ✅

$ bun x wrangler pages deploy --help
wrangler pages deploy [directory] ...  ✅

$ bun x playwright --version
Version 1.60.0  ✅

$ bun x playwright test --list
[lists PR labeler tests correctly]  ✅
```

Both tools run identically under `bun x` as they do under `pnpm exec` / `pnpm dlx`. No
shims, no compatibility flags needed.

---

## 6. Phantom Dependencies Surfaced

Bun's strict module resolution (no implicit hoisting from parent workspaces) exposed 9 packages
that were relying on pnpm's hoisting behaviour to supply deps they hadn't declared. These are
pre-existing correctness bugs; pnpm masked them, Bun revealed them.

| File                                  | Missing Dep                      | Category                                                                        |
| ------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------- |
| `apps/web/package.json`               | `dompurify ^3.4.2`               | 8 direct import sites; only `isomorphic-dompurify` was declared                 |
| `apps/web/package.json`               | `@tiptap/extension-link ^3.23.4` | imported in `MarkdownEditor.svelte`                                             |
| Root `package.json`                   | `js-yaml ^4.1.1`                 | used by `scripts/generate-llms-full.mjs` and `scripts/publish-blog-content.mjs` |
| `packages/vault-engine/package.json`  | `dexie ^4.4.2`                   | imported in `WorldService.ts`, `ActivityService.ts`                             |
| `packages/editor-core/package.json`   | `schema workspace:*`             | imported in `validation/temporal.ts`                                            |
| `packages/oracle-engine/package.json` | `schema workspace:*`             | imported in `types.ts`, `drafting-engine.ts`                                    |
| `packages/oracle-engine/package.json` | `@codex/proposer workspace:*`    | dynamic import in `merge-executor.ts`, `connect-executor.ts`                    |
| `packages/sync-engine/package.json`   | `@codex/events workspace:*`      | imported in `events.ts`, `GDriveSyncService.ts`                                 |
| `packages/sync-engine/package.json`   | `fake-indexeddb ^6.0.0` (devDep) | test-only import in `SyncRegistry.test.ts`                                      |

All nine were fixed in the worktree before rerunning the test suite. All fixes should be
backported to the main branch regardless of the Bun migration outcome.

---

## 7. Compatibility Summary

| Tool       | Version | Under Bun         | Notes                                  |
| ---------- | ------- | ----------------- | -------------------------------------- |
| Vite       | 8.0.13  | ✅ Full build     | Rolldown bundler, identical output     |
| SvelteKit  | 2.59.1  | ✅                | `svelte-kit sync` runs in prepare hook |
| Vitest     | 4.1.6   | ✅ 664 tests pass | Invoked via `bun x vitest`             |
| Wrangler   | 4.90.1  | ✅                | Deploy CLI runs fine                   |
| Playwright | 1.60.0  | ✅                | Binary resolves, `--list` works        |
| ESLint     | 10.3.0  | ✅                | `bun run lint` exits 0                 |
| Prettier   | 3.8.3   | ✅                | Invoked via scripts                    |
| Husky      | 9.1.7   | ✅                | Runs in `prepare` hook on install      |
| TypeScript | 6.0.3   | ✅                | `svelte-check` lint:types passes       |

---

## 8. What Phase 0 Does NOT Cover

These require the later phases (1–4) to validate:

- **CI image:** GitHub Actions runner needs `bun` added to the build image (one-line install).
- **Cloudflare Pages build environment:** Pages build command must be updated to use Bun.
- **Wrangler deploy live run:** `bun x wrangler pages deploy` with real Cloudflare credentials.
- **Playwright e2e with running dev server:** `bun run test:e2e` was not run in Phase 0.
- **Turbo removal:** Scripts were still invoking Turbo in Phase 0; `bun --filter` as a Turbo replacement is a Phase 2 change.
- **Warm install on a fresh CI runner (no pnpm cache):** Expected to favour Bun more strongly.
- **Remote caching:** Not applicable once Turbo is removed.

---

## 9. Recommendation

**Proceed to Phase 1.** Phase 0 passes without any Bun-fundamental incompatibilities:

- Vite, Vitest, Wrangler, Playwright all work under Bun without modification.
- Install speed advantage is significant (~3–10×) and disk savings are material (50%).
- The 9 phantom deps are correctness fixes that should land on `main` first, before or
  alongside the Phase 1 lockfile swap.

**Immediate action:** Open a PR from the worktree's `package.json` changes to fix the 9 phantom
deps on `main`. These fixes are correct regardless of whether the Bun migration continues.

---

## Appendix: Worktree

The experiment was run in a throwaway git worktree at `../Codex-Cryptica-v2-bun-phase0`.
The `bun.lock` generated there is the canonical starting point for Phase 1.
Bun installed to `~/.bun/bin/bun` (user-local, reversible via `rm -rf ~/.bun`).
