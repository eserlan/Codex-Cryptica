# Quickstart: Validating Spec 108 Hardening

## Performance Verification

1. **Load Stress Vault**: Use a vault with 1k+ entities.
2. **Profile Rendering**: Run Chrome DevTools Performance recording.
3. **Trigger Updates**: Rapidly switch between nodes or trigger a large sync.
4. **Success**: "Scripting" time stays low; no long tasks (>50ms) attributed to reactive propagation.

## Memory Leak Verification

1. **Monitor Heap**: Open Chrome Memory tab.
2. **Action Sequence**: Perform 10 vault switches.
3. **Collect Garbage**: Click the trash icon in DevTools.
4. **Success**: Memory returns to baseline (+/- 10%); no growth in object count for stores or guests.

## Regressions

- Run `pnpm test` to verify all existing functional logic.
- Run `pnpm run lint` to ensure no `svelte/store` imports remain in `apps/web/src`.
