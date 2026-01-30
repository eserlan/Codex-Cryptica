# Feature Specification: Performance Improvements

**Feature Branch**: `018-perf-improvements`  
**Created**: 2026-01-30  
**Status**: Draft  
**Input**: User description: "Performance bottlenecks identified in code review affecting large vaults and battery-powered devices, specifically in GraphView, Minimap, and Oracle sync."

## User Scenarios & Testing

### User Story 1 - Smooth Graph Navigation for Large Vaults (Priority: P1)

As a lore keeper with 100+ entities, I want the graph to remain responsive while panning and zooming so that I can navigate my world without UI jank or lag.

**Why this priority**: Core architectural principle III (Sub-100ms Performance) is critical for user experience in complex vaults.

**Independent Test**: Load a stress-test vault (100+ nodes). Rapidly pan and zoom. Monitor "Long Tasks" in DevTools.

**Acceptance Scenarios**:

1. **Given** a vault with 100+ entities, **When** I rapidly pan the graph, **Then** the UI remains at 60fps and no "Long Task" (>50ms) is recorded.
2. **Given** multiple node images are loading, **When** I interact with the graph, **Then** image resolution is batched and debounced to prevent main-thread blocking.

---

### User Story 2 - Battery-Efficient Background Tasks (Priority: P1)

As a mobile user on battery power, I want the application to consume near-zero CPU when I am not interacting with it, so that I can keep my lore open for long sessions without draining my device.

**Why this priority**: Mobile usability is a primary target. Wasteful polling loops (like the current Minimap) violate the "Zero Latency" mantra by wasting resources.

**Independent Test**: Open the app and let it sit idle. Observe CPU usage in the Performance tab.

**Acceptance Scenarios**:

1. **Given** the application is idle, **When** no user interaction occurs, **Then** the Minimap component does not trigger any redraws or frame updates.
2. **Given** a static graph, **When** I am not moving the view, **Then** the CPU usage drops to <1%.

---

### User Story 3 - Low-Latency Lore Synchronization (Priority: P1)

As a user working across multiple tabs, I want my chat history and lore to sync instantly without causing CPU spikes, so that I have a seamless multi-tasking experience.

**Why this priority**: Ensures the "Sovereign data" is always consistent without the overhead of constant deep comparisons.

**Independent Test**: Open two tabs. Send a message in one. Measure the sync time and CPU usage in the other.

**Acceptance Scenarios**:

1. **Given** two tabs open, **When** a message is sent in tab A, **Then** tab B receives and displays it instantly.
2. **Given** tab B receives a sync message, **When** the message timestamp matches the current state, **Then** no expensive JSON deserialization or comparison is performed.

---

### User Story 4 - Accessible and Maintainable UI (Priority: P2)

As a developer and screen-reader user, I want the UI to follow clean coding standards and accessibility guidelines so that the application is easy to maintain and inclusive.

**Why this priority**: Reduces technical debt and ensures compliance with standard accessibility expectations.

**Independent Test**: Run `npm run lint` and verify no a11y warnings. Inspect CSS for `!important`.

**Acceptance Scenarios**:

1. **Given** the Minimap component, **When** I navigate using a keyboard, **Then** all interactive elements are reachable and functional.
2. **Given** a code review, **When** I inspect the styles, **Then** no `!important` overrides are found and theme colors are centralized.

## Requirements

### Functional Requirements

- **FR-001**: **Batched Image Resolution**: System MUST batch node image resolution operations using `Promise.all` in chunks of 20.
- **FR-002**: **Debounced Resolution**: System MUST debounce graph image updates by 100ms to prevent micro-task flooding during interaction.
- **FR-003**: **Incremental Adjacency Map**: `VaultStore` MUST update inbound connections incrementally (O(1)) instead of rebuilding the map (O(N*M)) on every change.
- **FR-004**: **Event-Driven Minimap**: Minimap redraws MUST be triggered by Cytoscape events (`pan`, `zoom`, `resize`, etc.) rather than a polling loop.
- **FR-005**: **RAF-Throttled Redraws**: Minimap redraws MUST be throttled to a maximum of 30fps using `requestAnimationFrame` during rapid event firing.
- **FR-006**: **Sync Timestamping**: `OracleStore` synced state MUST include a `lastUpdated` timestamp to enable cheap sync comparisons.
- **FR-007**: **Specificity Cleanup**: System MUST remove the `!important` override in `GraphView.svelte` by resolving the underlying CSS specificity conflict.
- **FR-008**: **Dynamic Style Variables**: Components MUST use Svelte `style:--var` syntax instead of inline style string concatenation.
- **FR-009**: **Theme Centralization**: All hardcoded hex colors MUST be moved to `app.css` as CSS custom properties.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Graph interaction latency remains <100ms in vaults with 100+ entities.
- **SC-002**: Idle CPU usage for the web application is <1% on modern mobile browsers.
- **SC-003**: Zero accessibility linter warnings in the `Minimap` component.
- **SC-004**: `npm run lint` passes with no style or a11y violations in the affected files.