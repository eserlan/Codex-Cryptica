# Quickstart: Map Session Store Decomposition

## Goal

Shrink `apps/web/src/lib/stores/map-session.svelte.ts` below 500 lines by extracting lifecycle and snapshot responsibilities while preserving VTT and P2P behavior.

## Baseline And Current Status

- Baseline before implementation: `apps/web/src/lib/stores/map-session.svelte.ts` was 896 lines.
- Current implementation count: `apps/web/src/lib/stores/map-session.svelte.ts` is 47 lines.
- Extracted support files:
  - `apps/web/src/lib/stores/vtt/map-session-facade.ts`: compatibility delegation surface.
  - `apps/web/src/lib/stores/vtt/map-session-composition.svelte.ts`: manager construction and storage/active-map effects.
  - `apps/web/src/lib/stores/vtt/vtt-session-snapshot-manager.ts`: `EncounterSession` create/apply translation.
  - `apps/web/src/lib/stores/vtt/vtt-session-lifecycle-manager.svelte.ts`: active-map binding, hydration, reset, and clear-session orchestration.

## Verification Results

- `pnpm --filter=web exec vitest run src/lib/stores/map-session.test.ts`: passed before refactor, 36 tests.
- `pnpm --filter=web exec vitest run src/lib/cloud-bridge/p2p/p2p.test.ts`: passed before refactor, 13 tests.
- `pnpm --filter=web exec vitest run src/lib/stores/vtt/vtt-session-lifecycle-manager.test.ts src/lib/stores/vtt/vtt-session-snapshot-manager.test.ts src/lib/stores/map-session.test.ts src/lib/cloud-bridge/p2p/p2p.test.ts`: passed after extraction, 4 files / 60 tests.
- `pnpm --filter=web run lint:types`: passed with 0 errors and 11 pre-existing warnings in unrelated files.
- `pnpm --filter=web run lint`: passed.
- `pnpm --filter=web test`: passed, 146 files / 1112 tests passed / 3 skipped.
- `pnpm run lint`: blocked locally because Turborepo does not support this Android arm64 environment.
- `pnpm test`: blocked locally because Turborepo does not support this Android arm64 environment.
- `pnpm --filter=web exec vitest run --coverage src/lib/stores/vtt/vtt-session-lifecycle-manager.test.ts src/lib/stores/vtt/vtt-session-snapshot-manager.test.ts`: manager tests passed, but the partial coverage run failed global thresholds because it only covered a subset of the app. New manager file coverage in that partial run: lifecycle manager 97.91% lines, snapshot manager 100% lines.

## Implementation Order

1. Add failing or characterization tests for lifecycle behavior:
   - active map bind
   - no active map after hydration
   - draft restore
   - clear session with storage cleanup
   - malformed or unrelated popout storage

2. Add failing or characterization tests for snapshot behavior:
   - create full `EncounterSession`
   - apply full `EncounterSession`
   - apply legacy/partial snapshot
   - clamp invalid turn index
   - preserve P2P-compatible snapshot output

3. Extract `VTTSessionSnapshotManager`.

4. Extract `VTTSessionLifecycleManager`.

5. Wire both managers through `MapSessionStore` constructor dependencies.

6. Migrate only selected low-risk consumers away from `mapSession`, if the plan identifies any with a cleaner manager boundary.

7. Keep compatibility methods on `MapSessionStore` unless every affected consumer is migrated in the same change.

## Verification Commands

```sh
pnpm --filter=web exec vitest run src/lib/stores/map-session.test.ts
pnpm --filter=web exec vitest run src/lib/stores/vtt/vtt-session-lifecycle-manager.test.ts src/lib/stores/vtt/vtt-session-snapshot-manager.test.ts
pnpm --filter=web exec vitest run src/lib/cloud-bridge/p2p/p2p.test.ts
pnpm --filter=web run lint:types
pnpm run lint
pnpm test
```

If the local environment cannot run full `pnpm run lint` or `pnpm test`, record the blocker and require CI or a supported local environment to run them before merge.

Also run or inspect coverage for the new manager files so the feature does not lower the current coverage floor.

Manual browser host/guest testing is optional supporting evidence, not required for spec acceptance.
