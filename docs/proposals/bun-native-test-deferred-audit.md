# Bun Native Test Migration — Deferred Package Audit

This document records the follow-up audit of the six packages deferred in
[bun-native-test-migration-blueprint.md](./bun-native-test-migration-blueprint.md).
The probe was run on 2026-05-28 with Bun 1.3.14.

## Probe Results

| Package                  | Pass | Fail | Primary failure modes                                                                     |
| :----------------------- | ---: | ---: | :---------------------------------------------------------------------------------------- |
| `packages/canvas-engine` |    0 |   10 | `$state is not defined` — all 10 tests instantiate `CanvasStore`                          |
| `packages/graph-engine`  |   73 |   29 | `vi.stubGlobal`/`vi.unstubAllGlobals` (19), Cytoscape mock (10)                           |
| `packages/importer`      |   40 |   10 | `FileReader is not defined` (5), `DOMMatrix is not defined` (4), assert type mismatch (1) |
| `packages/map-engine`    |    3 |   16 | `document is not defined` (16) + `vi.unstubAllGlobals`                                    |
| `packages/oracle-engine` |  102 |   82 | `vi.stubGlobal`/`vi.unstubAllGlobals` (68), `$state` (14)                                 |
| `packages/vault-engine`  |   56 |   16 | `$state is not defined` — all 16 `VaultRepository` tests                                  |

**Current total across the six packages:** 274 pass, 167 fail.
**Projected total after all proposed phases:** 441 pass, ~10 fail (map-engine renderer deferred).

## Failure Mode Analysis

### `$state is not defined`

Svelte 5 runes are used as class field initializers in `.svelte.ts` files
(`store.svelte.ts`, `repository.svelte.ts`, `oracle-settings.svelte.ts`).
Bun runs TypeScript without a Svelte transform, so `$state` is an undefined global.
Affected packages: `canvas-engine`, `vault-engine`, `oracle-engine`.

### `vi.stubGlobal` / `vi.unstubAllGlobals` not a function

`bun:test`'s Vitest compatibility shim does not implement `vi.stubGlobal` or
`vi.unstubAllGlobals`. All test files that call these methods fail at the
`beforeEach`/`afterEach` hook, which cascades every test in the suite.
Affected packages: `graph-engine`, `map-engine`, `oracle-engine`.

The fix is the same save/restore pattern established in Phase 3
(`packages/events`):

```ts
// Before (Vitest-only)
beforeEach(() => {
  vi.stubGlobal("BroadcastChannel", MockBC);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

// After (bun-compatible)
const original = globalThis.BroadcastChannel;
beforeEach(() => {
  (globalThis as any).BroadcastChannel = MockBC;
});
afterEach(() => {
  (globalThis as any).BroadcastChannel = original;
});
```

### Missing browser APIs — `FileReader`, `DOMMatrix`

`packages/importer` uses `FileReader` inside parser source code and `DOMMatrix`
in test helpers. Both are standard browser globals absent from Bun's runtime.
A minimal preload shim is sufficient; no production code changes are needed.

### `document is not defined`

`packages/map-engine` renderer tests call `document.createElement` to build a
canvas mock. Bun provides no DOM environment. Addressing this requires either
a full DOM preload (e.g. `happy-dom`) or a Bun-compatible canvas test harness
strategy — neither of which is settled yet.

### Cytoscape mock — `node.connectedEdges is not a function`

`packages/graph-engine` `useGraphSync.ts.test.ts` constructs a Cytoscape mock
that does not implement `connectedEdges`. Under Vitest, module-level mocking
(or Vitest's `vi.stubGlobal("Worker")` setup) masked this gap. Without that
wrapper the mock is used directly and the missing method surfaces. The fix is
to add `connectedEdges` to the stub object, but it requires manual inspection
of the mock to confirm the full API surface needed.

## Proposed Phases

### Phase 5 — `importer`: browser API polyfills

Add a test preload file (`packages/importer/tests/setup.ts`) with minimal
`FileReader` and `DOMMatrix` shims, wired via `bunfig.toml` `preload`.

- `FileReader` wraps Bun's `Blob.text()` / `arrayBuffer()` into the callback
  contract the parsers expect.
- `DOMMatrix` exposes the constructor so tests can instantiate it without
  calling any geometric methods.

Expected result: **40 → 50 pass** (all 10 blocked tests clear).
Risk: low — shims are test-only; no production code touched.

### Phase 6 — `oracle-engine` + `graph-engine`: replace `vi.stubGlobal`

Apply the globalThis save/restore pattern to every test file that calls
`vi.stubGlobal` or `vi.unstubAllGlobals`.

**`oracle-engine` files:**

- `src/chat-history.test.ts` — stubs `BroadcastChannel`
- `src/undo-redo.test.ts` — stubs `BroadcastChannel`
- `src/oracle-executor.test.ts` — stubs `navigator`
- `src/executors/chat-executor.test.ts` — stubs `BroadcastChannel`
- `src/executors/visualization-executor.test.ts` — stubs `URL`

**`graph-engine` files:**

- `src/LayoutManager.test.ts` — stubs `Worker`

Expected result: oracle-engine **102 → ~170 pass**; graph-engine **73 → 92 pass**.
Risk: low — identical to the Phase 3 approach that passed for `packages/events`.

### Phase 7 — `vault-engine`, `oracle-engine`, `canvas-engine`: `$state` preload shim

Add a per-package preload (or a shared one under `packages/`) that defines the
Svelte 5 rune globals as passthrough functions:

```ts
// preload-svelte-runes.ts  (test-only, not shipped)
(globalThis as any).$state = (init: unknown) => init;
(globalThis as any).$derived = (fn: () => unknown) => fn();
(globalThis as any).$effect = () => {};
```

At runtime `entities = $state({})` becomes `entities = {}`, which is the
correct initial value. Tests for `VaultRepository`, `OracleSettingsService`,
and `CanvasStore` exercise business logic (load, save, setters, getters) and
do not assert on reactive binding behaviour, so the shim is sufficient.

Expected result: vault-engine **56 → 72 pass**; oracle-engine **~170 → 184 pass**;
canvas-engine **0 → 10 pass**.
Risk: medium — the shim hides reactivity regressions. Acceptable for unit
tests of business logic; document this limitation in the preload file.

### Phase 8 — `graph-engine`: fix Cytoscape mock (`connectedEdges`)

Inspect `useGraphSync.ts.test.ts` to identify the full Cytoscape node API
surface used by the mock, then add the missing `connectedEdges` method.

Expected result: graph-engine **92 → 102 pass** (all 29 failures cleared).
Risk: medium — need to confirm the mock covers all code paths before
expanding; do not reuse the Vitest `stubGlobal` shortcut.

This phase should be scoped as a separate ticket after Phase 6 lands, so that
the `vi.stubGlobal` conversion does not block the mock investigation.

### Phase 9 — `map-engine`: DOM harness strategy (deferred)

The 16 failing renderer tests need a real `document` object and a
canvas-capable environment. Options:

- Load `happy-dom` as a Bun preload — adds a full DOM; interaction with
  canvas mock APIs is untested.
- Keep renderer tests on Vitest — consistent with the blueprint rule that
  canvas/browser-heavy tests stay on Vitest until a strategy is documented.

**Recommendation:** keep on Vitest. Revisit only after a Bun canvas/DOM
harness decision is made for `apps/web`. The 3 currently-passing map-engine
tests remain green in the interim.

## Migration Rules (additions to blueprint)

- A `$state` preload shim is acceptable for packages where `.svelte.ts` files
  hold only business logic reactive state (counters, maps, primitive flags).
  Do not use a shim for packages whose tests assert on reactive update
  propagation.
- Replace every `vi.stubGlobal` / `vi.unstubAllGlobals` call with the
  globalThis save/restore pattern before switching a package's `test` script
  to `bun test`. Do not leave mixed `vi.stubGlobal` in a Bun-native package.
- Record the pass/fail count for each package here after each phase lands.

## Pass/Fail Log

| Phase | Package         | Before | After    | Date       |
| :---- | :-------------- | :----- | :------- | :--------- |
| audit | `canvas-engine` | —      | 0 / 10   | 2026-05-28 |
| audit | `graph-engine`  | —      | 73 / 29  | 2026-05-28 |
| audit | `importer`      | —      | 40 / 10  | 2026-05-28 |
| audit | `map-engine`    | —      | 3 / 16   | 2026-05-28 |
| audit | `oracle-engine` | —      | 102 / 82 | 2026-05-28 |
| audit | `vault-engine`  | —      | 56 / 16  | 2026-05-28 |
