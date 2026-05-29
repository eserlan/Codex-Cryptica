# Feature Specification: Map Session Store Decomposition

**Feature Branch**: `099-map-session-decomposition`  
**Created**: 2026-05-18  
**Status**: Implemented
**Input**: User description: "Refactor map session store by decomposing responsibilities into focused managers while preserving the existing public mapSession API and behavior"

## Clarifications

### Session 2026-05-18

- Q: How strict should public API compatibility be during extraction? → A: Actively migrate consumers away from `mapSession` where a new manager has a cleaner API.
- Q: What decomposition scope should this feature cover? → A: Extract lifecycle, extract snapshot assembly/application, and migrate selected low-risk UI/P2P consumers to focused manager APIs.
- Q: What validation bar defines success for this refactor? → A: Line-count reduction, focused manager tests, current map-session tests, P2P-dependent tests, and saved snapshot compatibility checks.
- Q: Should manual browser VTT host/guest testing be required for spec acceptance? → A: Manual browser VTT host/guest testing is optional, not required for spec acceptance.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Preserve VTT Play Behavior (Priority: P1)

As a GM or player using the map VTT, I need existing token, initiative, chat, measurement, grid, snapshot, and P2P session behavior to keep working while the map session internals are decomposed and selected consumers migrate to cleaner focused manager APIs.

**Why this priority**: This is a structural refactor of active gameplay state. Any behavioral drift can break core map play, guest sessions, or saved encounters.

**Independent Test**: Existing `MapSessionStore` tests and focused new tests can exercise the public `mapSession` API before and after extraction without depending on implementation details.

**Acceptance Scenarios**:

1. **Given** a bound active map, **When** a token is added, moved, selected, cloned, hidden, assigned ownership, or removed through `mapSession`, **Then** the observable token state, selection state, initiative side effects, persistence behavior, and emitted VTT messages match the current behavior.
2. **Given** a VTT session with initiative, chat, pings, measurements, grid settings, fog state, and tokens, **When** `createSnapshot()` and `applySnapshot()` are used, **Then** the resulting state matches the pre-refactor snapshot contract.
3. **Given** a host or guest session, **When** remote token, chat, mode, turn, fog, grid, ping, measurement, or snapshot events are handled, **Then** the public state updates and broadcasts remain compatible with existing P2P host and guest services.
4. **Given** a consumer is migrated from `mapSession` to an extracted manager API, **When** the same workflow is exercised, **Then** behavior remains equivalent and the migration is covered by focused tests.

---

### User Story 2 - Reduce Map Session Facade Responsibility (Priority: P2)

As a developer maintaining VTT code, I need `map-session.svelte.ts` to act as a small facade over focused collaborators instead of owning lifecycle, snapshot assembly, popout sync, active-map binding, and delegation wiring in one large file.

**Why this priority**: The file is currently the largest source file in the repo at about 896 lines and is a high-risk coordination point for VTT and P2P behavior.

**Independent Test**: The refactor can be validated by checking that responsibilities move into focused modules while the exported singleton and public class methods remain stable.

**Acceptance Scenarios**:

1. **Given** a developer opens `map-session.svelte.ts`, **When** the refactor is complete, **Then** the file primarily wires dependencies, preserves compatibility methods, and delegates lifecycle, snapshot, and selected migrated consumer behavior to named managers.
2. **Given** a lifecycle event such as active-map change, draft restoration, clear session, or bind-to-map, **When** it occurs, **Then** the logic is handled by a focused lifecycle/session coordinator rather than inline mixed with token, chat, and network delegation.
3. **Given** snapshot creation or application is needed, **When** those methods run, **Then** snapshot translation is isolated in a focused module with regression coverage.

---

### User Story 3 - Improve Testability Through Dependency Injection (Priority: P3)

As a developer adding future VTT features, I need map session collaborators to be constructor-injected and testable in isolation.

**Why this priority**: The constitution requires constructor-based dependency injection, and isolated tests reduce the cost of future VTT changes.

**Independent Test**: New manager modules can be unit-tested with mocked dependencies without constructing the full `MapSessionStore`.

**Acceptance Scenarios**:

1. **Given** a new extracted manager, **When** it is tested, **Then** dependencies such as map store, vault, session service, persistence, and broadcaster hooks can be supplied as mocks.
2. **Given** `MapSessionStore` is constructed in app code or tests, **When** optional dependencies are omitted, **Then** sensible production defaults still create the same exported `mapSession` singleton.

---

### Edge Cases

- Active map changes while a popout draft exists for a different map.
- No active map is selected after a session has already hydrated.
- Snapshot payload is missing optional grid, chat, measurement, or token fields from older saved sessions.
- Remote P2P events arrive while local persistence or draft restoration is in progress.
- Guest-owned tokens are rebound or cleared after a guest rename, disconnect, or host teardown.
- Browser storage events contain malformed JSON or snapshots for a different map.
- Initiative turn index is out of bounds after token removal or snapshot restore.
- The app is running in non-browser test/server contexts where `window`, `sessionStorage`, or `localStorage` are unavailable.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST preserve the exported `mapSession` singleton and keep backward-compatible `MapSessionStore` methods unless a specific consumer is intentionally migrated to a cleaner extracted manager API in the same change.
- **FR-002**: The system MUST keep token lifecycle behavior unchanged, including grid snapping, movement confirmation, selection, multi-selection, cloning, visibility, ownership, initiative side effects, and guest authority checks.
- **FR-003**: The system MUST keep encounter lifecycle behavior unchanged, including bind-to-map, clear session, start new encounter, save/load/delete encounter snapshots, draft persistence, and popout synchronization.
- **FR-004**: The system MUST keep snapshot serialization and restoration compatible with existing saved encounter data and current P2P `SESSION_SNAPSHOT` payloads.
- **FR-005**: The system MUST keep chat, dice roll messages, shared token image, ping, measurement, grid settings, fog, mode, and initiative broadcast behavior unchanged.
- **FR-006**: The system MUST move active-map binding, hydration, draft restoration, and clear/reset orchestration out of the main `map-session.svelte.ts` facade into one or more focused collaborators.
- **FR-007**: The system MUST move snapshot assembly/application logic out of the main facade into a focused collaborator or utility with unit coverage for success and legacy/partial payload paths.
- **FR-008**: The system MUST use constructor-based dependency injection for any new services, coordinators, or managers, with production defaults supplied by `MapSessionStore`.
- **FR-009**: The system MUST add or update tests for every moved behavior and every migrated consumer, covering the expected success path and at least one meaningful failure, cancellation, stale payload, or compatibility path.
- **FR-010**: The system MUST avoid broad UI or gameplay changes; any user-facing behavior changes are out of scope unless required to preserve existing behavior after extraction.
- **FR-011**: The system MUST document the resulting responsibility boundaries in the feature plan or data model so future VTT/P2P work knows where to place new behavior.
- **FR-012**: The system MUST keep any consumer migration surgical; consumers may depend on extracted managers only when that reduces coupling without creating duplicate state ownership.
- **FR-013**: The system MUST limit this feature's decomposition scope to lifecycle extraction, snapshot extraction, and selected low-risk consumer migrations; full facade rewrites or wholesale consumer migration are follow-up work.
- **FR-014**: The system MUST include validation for saved `EncounterSession` snapshot compatibility and P2P-dependent map-session behavior as part of the feature acceptance checks.
- **FR-015**: Manual browser host/guest VTT testing MAY be used as additional confidence, but it MUST NOT be required for formal feature acceptance unless the implementation plan later identifies untestable networking risk.

### Key Entities

- **MapSessionStore**: Public facade and exported singleton used by Svelte components and P2P services. It should remain available for compatibility while selected consumers may migrate to focused manager APIs.
- **Session Lifecycle Coordinator**: Proposed collaborator responsible for active-map binding, hydration, reset, draft restoration, and clear-session orchestration.
- **Session Snapshot Coordinator**: Proposed collaborator responsible for translating between live VTT manager state and `EncounterSession` snapshots.
- **Existing VTT Managers**: Current focused managers for token, initiative, grid, measurement, chat, media, persistence, encounter, and network responsibilities.
- **EncounterSession**: Persisted and transmitted VTT session snapshot contract that must remain backward compatible.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: `apps/web/src/lib/stores/map-session.svelte.ts` is reduced from about 896 lines to below 500 lines without breaking existing `MapSessionStore` compatibility methods.
- **SC-002**: All existing `MapSessionStore` tests pass after the refactor.
- **SC-003**: New focused manager tests cover extracted lifecycle and snapshot behavior, including at least one partial/legacy snapshot or malformed storage path.
- **SC-004**: P2P-dependent tests that use `mapSession` still pass, proving host and guest session contracts remain compatible.
- **SC-005**: Saved snapshot compatibility checks prove existing `EncounterSession` payloads still restore into equivalent map-session state.
- **SC-006**: Type checking reports no new errors in the web workspace.
- **SC-007**: The implementation plan identifies exact responsibility boundaries and avoids adding new gameplay features during the refactor.
- **SC-008**: The implementation plan identifies which consumers, if any, will migrate away from `mapSession` and why each migration is low risk.
- **SC-009**: Formal completion can be reached through automated tests and type checks; manual browser host/guest testing is optional supporting evidence.
