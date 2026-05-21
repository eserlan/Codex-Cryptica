# Research: Spec 108 Svelte 5 Rune Hardening

## Target Areas

- **Legacy Stores**: Identified `apps/web/src/lib/stores/guest.ts` and `debug.svelte.ts` as using legacy `writable`.
- **Component Subscriptions**: Approximately 392 instances of legacy store imports and 30,540 instances of `$` auto-subscription in Svelte components.
- **Manual Cleanup**: 20 components using `onDestroy` for manual cleanup, likely manageable via native Svelte 5 effects.
- **Snapshot Requirements**: AI services (`ai.ts`, `node-merge.service.ts`) and search services (`search.ts`) identified as primary candidates for `$state.snapshot` to ensure data consistency in async/worker boundaries.

## Decisions

- **Decision**: Full removal of `svelte/store` imports from `apps/web/src`.
- **Rationale**: Reduces architectural complexity and aligns with Svelte 5 performance benchmarks.
- **Decision**: Proactive fixing of identified reactivity bugs during conversion.
- **Rationale**: Aligns with the "Hardening" objective of the specification.

## Implementation Patterns

- **Pattern**: Replace `Writable` class properties with `$state` properties.
- **Pattern**: Replace `Derived` stores with `$derived` or `$derived.by`.
- **Pattern**: Migrate components to use direct class property access (e.g., `vault.entities`) instead of auto-subscription (`$vault`).
- **Pattern**: Wrap all data sent to `Comlink` or `fetch` with `$state.snapshot()`.
