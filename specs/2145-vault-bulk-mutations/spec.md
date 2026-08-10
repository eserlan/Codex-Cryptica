# Feature Specification: Delta-Based Mutations and Bulk Vault Operations

**Feature Branch**: `2145-vault-bulk-mutations`  
**Created**: 2026-08-10  
**Status**: Draft  
**Input**: Issue #2145: Add delta-based mutation and true bulk operation APIs

## User Scenarios & Testing _(mandatory)_

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.

  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Efficient single-entity editing (Priority: P1)

As a user editing one entity, I want the vault to update only the changed entity and affected indexes so that an ordinary edit does not scan the whole vault.

**Why this priority**: Single-entity edits are the common path and currently amplify work for large vaults.

**Independent Test**: Update one entity and verify that the in-memory entity map, derived indexes, search event, and one debounced disk save reflect only that entity delta.

**Acceptance Scenarios**:

1. **Given** an existing entity, **When** a content-only patch is applied, **Then** the mutation preserves unrelated fields and emits the entity delta without comparing two complete maps.
2. **Given** an invalid or missing entity ID, **When** an update is requested, **Then** no persistence or index event occurs and the operation reports failure.

---

### User Story 2 - Fast bulk type changes and deletes (Priority: P1)

As a user changing or deleting many entities from a table or other bulk action, I want one bounded batch operation so that persistence, index maintenance, relationship cleanup, and events are not repeated serially per entity.

**Why this priority**: Large selections currently wait on per-entity debounce/queue work and can become unusable.

**Independent Test**: Run a 100-entity type-change and delete batch against an injected repository and verify one batch-level mutation/persistence path, consistent indexes, and expected events.

**Acceptance Scenarios**:

1. **Given** 100 valid entities, **When** a batch type change runs, **Then** all valid entities are updated and persisted through bounded batch work.
2. **Given** entities with inbound connections and children, **When** a batch delete runs, **Then** references are cleaned consistently and deleted files/cache entries are removed.
3. **Given** a partial storage failure, **When** a batch operation fails, **Then** successful entities remain durable, failed entities are reported for retry, and the operation does not silently claim full success.

---

### User Story 3 - Explicit durable save and cancellation safety (Priority: P2)

As a user pressing Save or switching vaults during a mutation, I want pending debounced edits flushed or cancelled against the correct vault so that explicit saves do not wait unnecessarily and no stale-vault write occurs.

**Why this priority**: Bulk operations need a clear durability boundary while vault switching must remain safe.

**Independent Test**: Schedule a debounced edit, explicitly flush it, then exercise a vault switch/cancellation while a batch is in flight.

**Acceptance Scenarios**:

1. **Given** a pending debounced save, **When** explicit Save is requested, **Then** the pending write is flushed immediately without waiting for the debounce interval.
2. **Given** an in-flight batch and a vault switch, **When** cancellation occurs, **Then** no remaining operation writes to the new vault and the caller receives cancellation/retry state.

---

### Edge Cases

<!--
-->

- Empty batches and unknown IDs are no-ops with explicit results.
- Duplicate IDs in a batch are deduplicated deterministically.
- Guest/demo mode restrictions remain enforced; guest deletion remains forbidden.
- A deleted entity referenced by other entities cleans inbound connections and parent/child references once.
- Partial OPFS/IndexedDB failure reports failed IDs without discarding successful writes.
- A vault switch or cancellation prevents stale writes and stale events.
- Content not loaded in memory must be preserved from cache or hydrated only when required for the write.

## Requirements _(mandatory)_

<!--
-->

### Functional Requirements

- **FR-001**: Mutation APIs MUST accept explicit entity deltas and avoid whole-map diffing on the single-edit hot path.
- **FR-002**: The vault MUST expose batch type-change and batch-delete operations with deterministic results for valid, invalid, duplicate, and failed IDs.
- **FR-003**: Batch operations MUST update in-memory state, secondary indexes, relationships, search events, and persistence from bounded deltas.
- **FR-004**: Batch persistence MUST avoid waiting for one debounce timer per entity and MUST preserve per-entity durability/retry guarantees.
- **FR-005**: Explicit Save/flush MUST bypass the normal continuous-edit debounce while retaining debounce coalescing for normal edits.
- **FR-006**: Mutation APIs MUST preserve guest/demo restrictions, active-vault guards, and local-first storage behavior.
- **FR-007**: Partial failure MUST return recoverable failure information and MUST NOT silently discard successful entity writes.
- **FR-008**: Cancellation or vault switching MUST prevent stale writes and stale vault events.
- **FR-009**: Unit tests MUST cover single-edit success/failure, 100-entity batch success, partial failure/retry, cancellation/vault switch, relationship consistency, and debounce versus explicit flush.

### Key Entities _(include if feature involves data)_

- **EntityDelta**: An entity ID plus the changed fields and the pre/post state needed by index, relationship, search, and persistence consumers.
- **BatchMutationResult**: Counts and per-ID success/failure/cancellation details for a batch operation.
- **PendingSave**: A coalesced entity write keyed by vault ID and entity ID, retaining save options and resolvers until flush or completion.
- **Inbound relationship index**: A vault-scoped mapping from target IDs to source connections used for bounded delete cleanup.

## Success Criteria _(mandatory)_

<!--
-->

### Measurable Outcomes

- **SC-001**: A single content-only edit performs no whole entity-map comparison in the mutation/index-maintenance path.
- **SC-002**: A 100-entity type-change or delete operation uses batch-level coordination and completes without serial 400 ms per-entity debounce waits.
- **SC-003**: Explicit Save begins pending writes immediately; it does not wait for the normal 400 ms debounce interval.
- **SC-004**: Partial failure, cancellation, and vault switching are observable in tests and do not produce stale or silently lost writes.
- **SC-005**: Relationship and search indexes remain consistent after a successful batch delete.
