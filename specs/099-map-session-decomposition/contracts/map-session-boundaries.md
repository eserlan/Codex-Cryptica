# Internal Contract: Map Session Boundaries

This feature does not expose a network or HTTP API. These are internal TypeScript/Svelte store contracts that implementation tasks must preserve.

## Compatibility Facade Contract

`MapSessionStore` must continue to provide:

- Exported `mapSession` singleton.
- Constructor with `MapSessionDependencies`.
- Existing public getters for token, initiative, grid, measurement, chat, media, and encounter state.
- Existing public methods used by UI and P2P code unless a specific consumer is migrated in the same change.

Consumer migration rule:

- A consumer may use a focused manager API directly only when it removes coupling, avoids duplicate state ownership, and includes behavior-equivalence tests.
- If no candidate consumer passes that low-risk test, record "no consumer migration selected" here and satisfy the migration scope through documented analysis plus compatibility facade preservation.
- Current candidate for review: `apps/web/src/lib/components/dice/DiceVault.svelte`, because dice roll chat emission may be able to target chat behavior through a narrower boundary.

## Lifecycle Manager Contract

Proposed class: `VTTSessionLifecycleManager`

Required responsibilities:

- `handleActiveMapChange(activeMapId: string | null): void`
- `bindToMap(mapId: string): void`
- `resetSessionState(mapId: string): void`
- `clearSession(clearDraft?: boolean): void`

Implementation status: complete in `apps/web/src/lib/stores/vtt/vtt-session-lifecycle-manager.svelte.ts`. The lifecycle manager uses constructor-injected callbacks for storage restore, draft key lookup, manager resets, and state setters. It does not parse snapshot payloads, own P2P protocol behavior, or directly import singleton stores.

## Snapshot Manager Contract

Proposed class: `VTTSessionSnapshotManager`

Required responsibilities:

- Create an `EncounterSession` from live VTT manager state.
- Apply an `EncounterSession` into live VTT manager state.
- Normalize legacy token snapshot data.
- Handle missing optional snapshot fields.
- Clamp invalid initiative turn indexes.

The snapshot manager must not own browser storage, P2P transport, or direct UI concerns.

Implementation status: complete in `apps/web/src/lib/stores/vtt/vtt-session-snapshot-manager.ts`. The snapshot manager uses constructor-injected callbacks for live state reads/writes, normalizes legacy token visibility, handles missing optional fields, clears pending movement/ping state, and emits a canonical `SESSION_SNAPSHOT` only when applied non-silently.

## Composition Boundary

`apps/web/src/lib/stores/vtt/map-session-composition.svelte.ts` owns `MapSessionStore` manager construction and browser storage/active-map effects. This keeps `apps/web/src/lib/stores/map-session.svelte.ts` as the small stateful singleton entry point while avoiding new singleton dependencies in the extracted snapshot and lifecycle managers.

## Consumer Migration Decision

No consumer migration selected in this implementation pass. `apps/web/src/lib/components/dice/DiceVault.svelte` remains on the backward-compatible `MapSessionStore` facade because migrating dice roll chat emission would add scope without reducing the main map-session hotspot further. The facade preservation and focused manager tests satisfy the low-risk migration analysis for this spec.

## Verification Contract

The implementation is complete only when:

- Existing `map-session.test.ts` behavior remains green.
- New lifecycle manager tests cover success and at least one stale/malformed/no-active-map path.
- New snapshot manager tests cover success and at least one legacy/partial payload path.
- P2P-dependent tests that rely on `mapSession` remain green.
- `pnpm --filter=web run lint:types` reports no new errors.
- Full validation runs `pnpm run lint` and `pnpm test`, or documents a local environment blocker with required CI validation before merge.
- Coverage for new manager files is run or checked against the current coverage floor.
