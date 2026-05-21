# Quickstart: Progressive Worker-Backed Search Indexing

## Scope

Use these scenarios to verify the feature during implementation. They are written as manual checks plus test targets; automated Vitest coverage should be added for the service, store, and search-engine package before code is committed.

## Scenario 1: Cold Large Vault Rebuild

1. Prepare a vault with at least 1,000 entities and no valid `entityDb.searchIndex` snapshot.
2. Open the vault.
3. Confirm graph, map, sidebar, and editor interactions remain responsive while indexing runs.
4. Search for an entity that was already indexed by an early batch.
5. Confirm results appear while status says search is still indexing.
6. Wait for completion and confirm status becomes ready.

Expected result: partial results are available within 2 seconds of metadata availability and the UI does not freeze for more than 100ms.

## Scenario 2: Corrupt Snapshot Fallback

1. Store an invalid or incompatible search snapshot for a test vault.
2. Open the vault.
3. Confirm restore failure does not lose entity data.
4. Confirm the app falls back to progressive rebuild.
5. Confirm status moves from restoring to rebuilding or partial, then ready.

Expected result: corrupt snapshot is recoverable and retry remains available if rebuild fails.

## Scenario 3: Vault Switch Cancellation

1. Start a cold rebuild for Vault A.
2. Switch to Vault B before Vault A finishes.
3. Search in Vault B for a term that only exists in Vault A.
4. Wait long enough for any late Vault A worker promises to resolve.
5. Search again in Vault B.

Expected result: zero Vault A records appear in Vault B results, and stale Vault A progress is ignored.

## Scenario 4: Entity Mutation During Rebuild

1. Start a cold rebuild.
2. Create, edit, and delete entities while indexing is still running.
3. Search for the changed title/content after the relevant batch or replay completes.
4. Search for the deleted entity.

Expected result: updated entities are searchable and deleted entities are removed before the rebuild reaches ready.

## Scenario 5: Worker Failure And Retry

1. Simulate a worker or batch failure in a unit test.
2. Confirm progress becomes failed and `canRetry` is true.
3. Trigger retry.
4. Confirm a new run ID starts and stale failed-run completions are ignored.

Expected result: retry creates a clean run and reaches ready without reusing stale job state.

## Suggested Commands

```sh
pnpm --filter @codex/search-engine test
pnpm --filter web test -- search
pnpm run lint
pnpm test
```

## Implementation Validation Notes

- `pnpm --filter @codex/search-engine test` passed with 45 tests.
- Explicit web search-related Vitest targets passed with 89 tests across 9 files.
- `pnpm --filter @codex/search-engine lint` passed.
- `pnpm --filter web lint` passed.
- `pnpm --filter web run lint:types` passed with existing Svelte/CSS warnings and 0 errors.
- Root `pnpm run lint` and `pnpm test` could not start because Turborepo does not support the current Android arm64 environment.
