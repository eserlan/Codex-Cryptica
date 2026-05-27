# Bun Native Test Migration Blueprint

This blueprint tracks a staged migration from Vitest to native `bun test` for packages that are safe to run without Vite, Svelte transforms, or browser-heavy test harnesses.

The first local compatibility probe was run on 2026-05-27 with Bun 1.3.14:

```text
bun test packages
548 pass, 186 fail, 2 errors, 734 tests, 2.86s
```

That result confirms the migration should be incremental. Some packages run cleanly under Bun today, while others depend on Svelte rune transforms, Vitest-only helper APIs, browser globals, DOM/canvas APIs, or package-specific mocks.

## Phase 1 Scope

Move only the packages that passed local `bun test` probes without code changes:

| Package                      | Probe Result    | Phase 1 Action                  |
| :--------------------------- | :-------------- | :------------------------------ |
| `packages/chronology-engine` | 39 pass, 0 fail | Set `test` script to `bun test` |
| `packages/dice-engine`       | 18 pass, 0 fail | Set `test` script to `bun test` |
| `packages/editor-core`       | 41 pass, 0 fail | Set `test` script to `bun test` |
| `packages/schema`            | 47 pass, 0 fail | Set `test` script to `bun test` |

Keep `test:coverage` on Vitest during phase 1. Bun-native coverage can be evaluated separately after the basic runner migration is stable.

## Phase 2 Complete

Move the next pure TypeScript package after fixing Bun-compatible test assertions:

| Package                  | Probe Result    | Phase 2 Action                  |
| :----------------------- | :-------------- | :------------------------------ |
| `packages/search-engine` | 45 pass, 0 fail | Set `test` script to `bun test` |

Phase 2 kept `test:coverage` on Vitest. The package tests still import Vitest test helpers so the existing coverage command continues to work, but the default package test command now runs through Bun.

The required test changes were limited to runner compatibility:

- Added an explicit `beforeEach` import in `tests/smoke.test.ts`.
- Replaced `await expect(promise).resolves.not.toThrow()` patterns with direct `await` calls followed by concrete state assertions.

## Phase 3 Scope

Move two small packages after replacing Vitest-only helper APIs with runner-compatible test setup:

| Package             | Probe Result    | Phase 3 Action                  |
| :------------------ | :-------------- | :------------------------------ |
| `packages/proposer` | 22 pass, 0 fail | Set `test` script to `bun test` |
| `packages/events`   | 13 pass, 0 fail | Set `test` script to `bun test` |

Phase 3 also keeps `test:coverage` on Vitest for both packages.

The required test changes were limited to compatibility:

- Replaced `vi.mocked(GoogleGenerativeAI)` in `packages/proposer` with direct prototype assignment through a small `useMockModel` helper.
- Replaced `vi.stubGlobal` / `vi.unstubAllGlobals` in `packages/events` with explicit `globalThis.BroadcastChannel` save and restore logic.

## Phase 4 Scope

Move the largest remaining pure-package candidate after replacing fake-timer-dependent retry tests with injected retry delays:

| Package                | Probe Result    | Phase 4 Action                  |
| :--------------------- | :-------------- | :------------------------------ |
| `packages/sync-engine` | 82 pass, 0 fail | Set `test` script to `bun test` |

Phase 4 keeps `test:coverage` on Vitest.

The required changes were focused on dependency injection and test-runner compatibility:

- Added optional wait/delay injection to `FileSystemBackend` and `GDriveBackend`, preserving real `setTimeout` delays by default.
- Updated retry tests to inject a resolved wait function instead of relying on `vi.runAllTimersAsync` or `vi.advanceTimersByTimeAsync`.
- Replaced a `vi.mocked(...)` call in `OpfsBackend` tests with a direct typed mock function cast.
- Replaced one `await expect(promise).resolves.not.toThrow()` with direct `await`.

## Current Boundary

Phases 1 through 4 cover the low-risk pure-package migration for this PR. There are no remaining obvious default `test` script switches that should be folded into the same change without introducing broader harness work.

That does not mean Bun-native testing is exhausted. Further improvements should be tracked as follow-up work:

- Audit deferred packages that may only be blocked by small Vitest compatibility assumptions.
- Keep `test:coverage` on Vitest until Bun coverage can replace the current package coverage workflow cleanly.
- Improve timing and reporting notes so future migrations compare package counts and runtime consistently.
- Treat `apps/web` as a separate migration problem because Svelte, browser, and DOM-heavy tests need a dedicated harness strategy.

## Deferred Packages

These packages should stay on Vitest until their failure modes are handled explicitly:

| Package                  | Current Bun Failure Mode                                           | Recommendation                                                          |
| :----------------------- | :----------------------------------------------------------------- | :---------------------------------------------------------------------- |
| `packages/canvas-engine` | Svelte rune globals such as `$state` are not transformed by Bun    | Keep on Vitest unless the Svelte-stateful code is split from pure logic |
| `packages/graph-engine`  | `vi.stubGlobal`, DOM, worker, and Cytoscape-style test assumptions | Keep on Vitest for now                                                  |
| `packages/importer`      | Missing browser APIs such as `FileReader` and `DOMMatrix`          | Add targeted polyfills or keep on Vitest                                |
| `packages/map-engine`    | Canvas renderer tests need canvas/browser mocks                    | Keep on Vitest until a Bun canvas harness exists                        |
| `packages/oracle-engine` | Svelte rune globals, browser globals, and Vitest-only helpers      | Keep on Vitest                                                          |
| `packages/vault-engine`  | Svelte rune globals such as `$state` are not transformed by Bun    | Keep on Vitest unless pure repository logic is separated                |

## Migration Rules

- Migrate package-by-package only after `bun test <package>` passes locally.
- Do not classify packages containing `.svelte.ts` rune code as pure TypeScript unless their tests avoid the rune-backed modules or use a working transform.
- Keep browser, DOM, canvas, worker, and IndexedDB-heavy tests on Vitest until Bun-specific preload/polyfill requirements are documented and verified.
- Prefer explicit imports from `vitest` or `bun:test`; avoid relying on runner globals in package tests.
- Update this document with measured pass/fail results before expanding the Bun-native scope.

## Follow-Up Work

A full probe of all six deferred packages (canvas-engine, graph-engine, importer,
map-engine, oracle-engine, vault-engine) was run on 2026-05-28. Findings, proposed
phases (5–9), and a per-package pass/fail log are in
[bun-native-test-deferred-audit.md](./bun-native-test-deferred-audit.md).
