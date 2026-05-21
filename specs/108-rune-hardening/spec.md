# Feature Specification: Svelte 5 Rune Hardening & Performance

**Feature Branch**: `785-rune-hardening`  
**Created**: 2026-05-21  
**Status**: Draft  
**Input**: User description: "108 in roadmap"

## Clarifications

### Session 2026-05-21

- Q: What is the primary focus scope for this hardening? → A: `apps/web/src` only (focus on UI/Stores)
- Q: How should we handle legacy stores (Writable/Derived)? → A: Legacy stores removed entirely (Pure Svelte 5)
- Q: How should we handle existing reactivity bugs or leaks identified during conversion? → A: Fix immediately during conversion (Hardening focus)

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Smooth Application Performance (Priority: P1)

As a user with a large vault (1,000+ entities), I want the application to respond instantly to my clicks and navigation so that my creative flow is never interrupted by "jank" or main-thread freezes.

**Why this priority**: Performance is a core pillar of Codex Cryptica. Legacy store overhead scales poorly with large data sets.

**Independent Test**: Can be tested by loading a stress-test vault and verifying that interaction latency (e.g., opening a node, switching tabs) remains under 100ms.

**Acceptance Scenarios**:

1. **Given** a vault with 1,000 entities, **When** I navigate between nodes, **Then** the UI transitions remain fluid without noticeable stutter.
2. **Given** a high-frequency event stream (e.g., rapid P2P sync), **When** multiple stores update simultaneously, **Then** the application remains responsive to user input.

---

### User Story 2 - Data Integrity & Stability (Priority: P1)

As a user, I want to be sure that the data I see on screen is accurate and that complex operations (like AI generation or background sync) don't cause the UI to flicker or show stale information.

**Why this priority**: Inconsistent state leads to user distrust and potential data loss if stale state is persisted.

**Independent Test**: Can be tested by triggering an async operation (like Oracle generation) and verifying that the resulting state is correctly snapshotted and rendered.

**Acceptance Scenarios**:

1. **Given** a reactive object being passed to an async handler, **When** the original state changes before the handler completes, **Then** the handler continues to operate on the correct "snapshot" of the data.
2. **Given** a vault switch operation, **When** the new vault loads, **Then** all UI components accurately reflect the new state without "ghost" data from the previous vault.

---

### User Story 3 - Long-Term Session Reliability (Priority: P2)

As a user who keeps the application open for multi-hour gaming sessions, I want the memory usage to stay stable so that the app doesn't slow down or crash over time.

**Why this priority**: Reliability during long sessions is critical for TTRPG environments.

**Independent Test**: Can be tested by monitoring memory usage over multiple vault switches and long-running sync sessions.

**Acceptance Scenarios**:

1. **Given** an open session, **When** I switch vaults 10 times, **Then** the memory usage returns to base levels after each switch.
2. **Given** a P2P session with multiple guests joining and leaving, **When** the roster changes, **Then** all reactive resources associated with disconnected guests are properly cleaned up.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST replace all remaining legacy `svelte/store` instances (Writable, Derived, Readable) within `apps/web/src` with Svelte 5 `$state` and `$derived` signals.
- **FR-002**: Components MUST migrate from legacy auto-subscription syntax (`$store`) to direct signal access to eliminate hidden subscription overhead.
- **FR-003**: System MUST utilize `$state.snapshot` when passing reactive state to non-reactive boundaries, async handlers, or external services (e.g., Web Workers, Comlink).
- **FR-004**: All manual subscription management (e.g., `store.subscribe` with `onDestroy` cleanup) MUST be converted to native Svelte 5 reactivity patterns (e.g., `$effect`, `$derived.by`).
- **FR-005**: System MUST preserve existing functional behavior and cross-component communication logic after the hardening process.
- **FR-006**: System MUST resolve any identified reactivity bugs, race conditions, or memory leaks (e.g., missing cleanup) within the targeted scope during the conversion process.

### Key Entities _(include if feature involves data)_

- **Reactive State**: The unified Svelte 5 signal-based state representing vault data, UI configuration, and session info.
- **State Snapshot**: An immutable clone of a reactive state object at a specific point in time, used for safe async processing.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Zero (0) imports of `svelte/store` remain in the `apps/web/src` codebase.
- **SC-002**: Main-thread "scripting" time in Chrome DevTools Performance profile does not exceed the staging branch baseline during heavy indexing/sync operations.
- **SC-003**: Memory heap size shows no cumulative growth (leakage) after 10 consecutive vault switch cycles.
- **SC-004**: 100% pass rate for existing unit and integration tests covering the affected stores and components.
