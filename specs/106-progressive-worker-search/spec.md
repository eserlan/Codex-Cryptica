# Feature Specification: Progressive Worker-Backed Search Indexing

**Feature Branch**: `106-progressive-worker-search`  
**Created**: 2026-05-21  
**Status**: Draft  
**Input**: User description: "Progressive worker-backed search indexing that keeps large vault indexing off the main thread, reports rebuild progress, supports cancellation on vault switch, and preserves local-first privacy."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Search Remains Usable During Large Vault Loads (Priority: P1)

As a lore keeper opening a large vault, I want the app to progressively rebuild the search index in the background so that I can keep using the app while search quality improves.

**Why this priority**: Large vault startup is the highest-risk path for search. The user should never experience a frozen UI just because the search index is cold, stale, or being rebuilt.

**Independent Test**: Start with a vault containing at least 1,000 entities and no reusable search index. Open the app and confirm the interface remains responsive while search indexing progresses in batches.

**Acceptance Scenarios**:

1. **Given** a large vault has no valid saved search index, **When** the vault finishes loading metadata, **Then** the app starts a background rebuild without blocking graph, map, sidebar, or editor interactions.
2. **Given** a rebuild is running, **When** the user searches for records already indexed, **Then** matching results are returned while the rebuild continues.
3. **Given** the rebuild is still in progress, **When** additional batches are indexed, **Then** subsequent searches can return newer indexed records without requiring a page refresh.

---

### User Story 2 - Rebuild Progress Is Visible And Plain (Priority: P2)

As a user waiting for search to become complete, I want clear progress feedback so that I know whether search is ready, rebuilding, or degraded.

**Why this priority**: Progressive indexing is only trustworthy if the user understands why early search results may be partial.

**Independent Test**: Trigger a cold search-index rebuild and verify the UI exposes status, indexed count, total count when known, and completion or failure state in plain language.

**Acceptance Scenarios**:

1. **Given** a rebuild starts, **When** progress events are emitted, **Then** the UI shows that search is rebuilding and displays progress using counts or a percentage when available.
2. **Given** a rebuild completes, **When** the final batch is indexed, **Then** the UI returns to a ready state and search results are no longer marked as partial.
3. **Given** a rebuild fails, **When** the system cannot continue indexing, **Then** the UI shows that search may be incomplete and provides a clear recovery path such as retrying the rebuild.

---

### User Story 3 - Rebuilds Cancel Safely On Vault Switch (Priority: P3)

As a game master switching between campaigns, I want any in-progress search rebuild for the old vault to stop immediately so that results from one campaign cannot leak into another.

**Why this priority**: Search indexing touches private campaign data. Cross-vault contamination would violate local-first privacy and user trust.

**Independent Test**: Start a rebuild for one vault, switch to a different vault before completion, and confirm the old rebuild stops and no old-vault results appear in the new vault search.

**Acceptance Scenarios**:

1. **Given** a rebuild is active for Vault A, **When** the user switches to Vault B, **Then** all pending Vault A indexing work is cancelled before Vault B indexing begins.
2. **Given** a cancelled Vault A batch finishes late, **When** it reports back, **Then** the system ignores it and does not add Vault A records to Vault B's index.
3. **Given** Vault B has a valid saved search index, **When** the user switches into Vault B, **Then** that index can be restored without waiting for Vault A cleanup beyond required cancellation.

---

### Edge Cases

- Saved index exists but is stale, corrupt, or incompatible with the current index format.
- Entity metadata loads before full entity content is available.
- The user edits, creates, or deletes entities while a full rebuild is still running.
- The browser throttles background work because the app is hidden or running on a mobile device.
- The worker crashes or becomes unavailable during rebuild.
- A vault contains more entities than can be indexed in a single batch without visible UI jank.
- Guest or shared-session modes must not index or expose private records outside the current visibility policy.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST rebuild search indexes progressively in bounded batches rather than requiring all records to be indexed in one blocking operation.
- **FR-002**: System MUST keep search indexing work off the main UI thread so that app navigation, editing, and graph/map interactions remain responsive during rebuilds.
- **FR-003**: System MUST expose search index status using at least these states: `idle`, `restoring`, `rebuilding`, `ready`, `partial`, `cancelled`, and `failed`.
- **FR-004**: System MUST expose progress information during rebuilds, including indexed record count and total record count when known.
- **FR-005**: System MUST allow partial search results while a rebuild is running and MUST make partial status visible to callers or UI consumers.
- **FR-006**: System MUST cancel or invalidate in-progress rebuild work when the active vault changes.
- **FR-007**: System MUST prevent stale or late rebuild batches from one vault from mutating another vault's active search index.
- **FR-008**: System MUST handle entity create, update, and delete events consistently while a rebuild is active.
- **FR-009**: System MUST persist reusable index data per vault when rebuilds complete successfully.
- **FR-010**: System MUST detect unusable saved indexes and fall back to a progressive rebuild without user data loss.
- **FR-011**: System MUST keep all indexing and persisted search data local to the user's browser storage and current vault.
- **FR-012**: System MUST provide a retry path when rebuilds fail.

### Key Entities _(include if feature involves data)_

- **Search Index Job**: A rebuild or restore operation tied to one vault, with a unique run identity, lifecycle state, progress counts, cancellation state, and error details.
- **Search Index Progress**: User-facing status describing whether search is ready, partial, rebuilding, failed, or cancelled.
- **Index Batch**: A bounded set of search entries processed as one unit so the system can yield between batches and avoid long blocking operations.
- **Saved Index Snapshot**: Per-vault persisted search index data used to restore search quickly on later visits.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Opening a vault with 1,000 entities and no valid saved index keeps primary UI interactions responsive while indexing runs.
- **SC-002**: Search returns partial results within 2 seconds of cold metadata availability for records already indexed.
- **SC-003**: A full rebuild of 1,000 entities completes without a single user-visible freeze longer than 100ms on a typical development machine.
- **SC-004**: Switching vaults during an active rebuild produces zero cross-vault search results in the new vault.
- **SC-005**: Rebuild progress reaches a clear ready, cancelled, or failed terminal state for every rebuild attempt.
- **SC-006**: A corrupt or incompatible saved index automatically falls back to a rebuild and reports a recoverable state.
