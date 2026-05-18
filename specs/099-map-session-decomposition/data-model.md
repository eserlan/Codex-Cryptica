# Data Model: Map Session Store Decomposition

## MapSessionStore

**Purpose**: Compatibility facade and production composition root for VTT map-session state.

**Current responsibilities retained**:

- Export `mapSession` singleton.
- Construct existing and new managers with production dependencies.
- Provide backward-compatible methods and getters for existing consumers.
- Own top-level rune state that does not yet have a better manager owner, such as `vttEnabled`, `mapId`, `mode`, `sessionFogMask`, and `myPeerId`.

**Rules**:

- Existing compatibility methods remain unless a consumer is intentionally migrated in the same change.
- The facade must not duplicate state owned by extracted managers.
- New collaborator dependencies must be injected through constructors.

## VTTSessionLifecycleManager

**Purpose**: Coordinate active-map lifecycle transitions that currently live inline in `map-session.svelte.ts`.

**Inputs**:

- Active map ID.
- Hydration flags.
- Persistence restore/clear hooks.
- Reset hooks for token, initiative, measurement, media, encounter, and chat managers.
- Grid measure load hook.
- Session creation function.

**State transitions**:

- `No active map` → restore popout draft if available, otherwise clear session when not hydrated.
- `Different active map` → bind to active map and attempt draft restoration.
- `Bound map with restored draft` → mark session hydrated and preserve restored state.
- `Bound map without restored draft` → create a fresh encounter session and reset manager state.
- `Clear session` → clear pending broadcasts, optionally remove storage drafts, reset manager state, and clear hydration.

**Validation rules**:

- Must not clear a hydrated session only because active map is temporarily null.
- Must ignore malformed or unrelated popout storage data.
- Must preserve existing draft key behavior through `VTTPersistenceManager`.

## VTTSessionSnapshotManager

**Purpose**: Translate between live manager state and `EncounterSession` payloads.

**Inputs**:

- Encounter metadata state.
- Token manager state.
- Initiative manager state.
- Chat manager state.
- Measurement manager state.
- Grid settings.
- Map ID and mode.
- Session fog mask.

**Outputs**:

- Current `EncounterSession` snapshot for persistence and P2P.
- Applied live state from an `EncounterSession` snapshot.

**Validation rules**:

- Snapshot output shape must remain compatible with existing `EncounterSession`.
- `applySnapshot` must normalize legacy token visibility.
- Missing optional fields must fall back safely.
- Turn index must clamp to the current initiative order.
- Grid size applies only when the snapshot map matches the active map.
- Non-silent application emits a canonical `SESSION_SNAPSHOT`.

## Existing VTT Managers

**Purpose**: Continue owning focused state and commands already extracted from the facade.

**Managers**:

- `VTTTokenManager`
- `VTTInitiativeManager`
- `VTTGridManager`
- `VTTMeasurementManager`
- `VTTChatManager`
- `VTTMediaManager`
- `VTTPersistenceManager`
- `VTTEncounterManager`
- `VTTNetworkManager`

**Rules**:

- Do not move unrelated manager behavior as part of this feature.
- Consumer migrations may target these managers only when tests prove behavior equivalence.

## EncounterSession

**Purpose**: Persisted and transmitted VTT session contract.

**Compatibility requirements**:

- Existing saved sessions remain restorable.
- Current P2P `SESSION_SNAPSHOT` and compressed snapshot payloads remain valid.
- No schema version change is required for this refactor.
