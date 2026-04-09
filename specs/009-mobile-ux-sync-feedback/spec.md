# Feature Specification: Mobile UX Refinement & Sync Feedback

**Feature Branch**: `009-mobile-ux-sync-feedback`
**Created**: 2026-01-27
**Updated**: 2026-04-09
**Status**: Implemented
**Input**: User description: "Fixing the mobile view and missing visual indication during sync."

## Solution Design

To address the responsive layout requirements, we have implemented a dedicated mobile navigation system:

1.  **MobileMenu Component**: A slide-out drawer (left-aligned) that houses:
    - Vertical "VaultControls" for campaign management.
    - Application settings access.
    - External links (Patreon, Privacy, Terms).
    - A unified, touch-friendly interface for all primary actions.
2.  **Responsive Header**:
    - **Desktop**: Full horizontal control bar and search input.
    - **Mobile**: Simplified header containing only the hamburger menu toggle, compact brand logo, and a search icon button.
3.  **Vertical VaultControls**: The existing `VaultControls` component was refactored to accept an `orientation="vertical"` prop, allowing it to adapt its layout (buttons stretch to fill width) for the mobile drawer context without code duplication.
4.  **Entity Explorer Mobile Optimization** (Added 2026-04-09):
    - Entity list component refactored for proper mobile scrolling with touch-action and overscroll behavior
    - Detail panel now supports native scroll with proper `overflow-y` and viewport height constraints
    - Embedded entity connections displayed in Zen-style view while sidebars remain accessible
5.  **Zen Mode Enhancements** (Added 2026-04-09):
    - `ZenContent.svelte` updated to show embedded entity connections within the content area
    - `ZenSidebar.svelte` refined for better mobile layout and tab organization
    - Entity detail view maintains sidebar visibility (Oracle, Explorer) while displaying full content

## User Scenarios & Testing

### User Story 1 - Responsive Layout Access (Priority: P1)

As a mobile user, I want the application layout to automatically adjust to my small screen so that I can access all core features (vault management, entity creation, search) without horizontal scrolling or UI overlaps.

**Why this priority**: Core usability requirement for mobile accessibility.

**Independent Test**: Resize browser to 375px width and verify all header buttons are clickable and no text overlaps.

**Acceptance Scenarios**:

1. **Given** a mobile device width (375px), **When** I view the header, **Then** all navigation elements fit within the screen width.
2. **Given** a mobile device, **When** I open the entity creation form, **Then** all input fields are fully visible and keyboard-accessible.

---

### User Story 2 - Real-time Sync Feedback (Priority: P1)

As a user, I want to see a clear visual indication when a cloud synchronization is active so that I am confident my changes are being saved and I know when it's safe to close the application.

**Why this priority**: Essential for data integrity trust and user feedback.

**Independent Test**: Trigger a sync and verify a distinct animation or icon change is visible in the persistent header.

**Acceptance Scenarios**:

1. **Given** Cloud Sync is active, **When** a background sync starts, **Then** the sync icon performs a distinct pulse or rotation animation.
2. **Given** a sync is in progress, **When** it finishes successfully, **Then** the icon returns to a static "connected" state and a brief "Success" indicator is shown.

---

### User Story 3 - Mobile Entity Viewing (Priority: P2)

As a mobile user, I want entity details to be displayed in a space-efficient manner so that I can read content without the graph view obstructing the text.

**Why this priority**: Optimizes limited screen real estate.

**Independent Test**: Open an entity on a mobile-sized screen and verify it occupies the full viewport width.

**Acceptance Scenarios**:

1. **Given** a small screen, **When** I select an entity, **Then** the detail panel slides up or over to cover the graph view.

---

### User Story 6 - Mobile Entity List Scrolling (Priority: P2)

As a mobile user with many entities, I want the entity list in the Explorer to scroll smoothly without interference from browser gestures or page scroll, so that I can browse my lore collection comfortably on touch devices.

**Why this priority**: Essential for usability with large vaults on mobile devices.

**Independent Test**: Load a vault with 50+ entities on a 375px viewport and verify the entity list scrolls independently with proper touch behavior.

**Acceptance Scenarios**:

1. **Given** a mobile device with a large vault, **When** I open the Entity Explorer, **Then** the entity list scrolls vertically with native touch gestures.
2. **Given** the entity list is scrolled, **When** I reach the end, **Then** overscroll behavior provides visual feedback without bouncing the entire page.
3. **Given** touch-action constraints, **When** I scroll the list, **Then** browser-level gestures (pull-to-refresh, back) don't interfere.

---

### User Story 7 - Embedded Entity Connections (Priority: P2)

As a user viewing an entity in Zen mode, I want to see and navigate connected entities directly within the content area so that I can explore relationships without leaving my current context.

**Why this priority**: Improves navigation fluency between related entities and strengthens the graph-to-text mental model.

**Independent Test**: Open an entity with connections in Zen mode and verify connections are displayed inline and clickable.

**Acceptance Scenarios**:

1. **Given** an entity with connections, **When** I open it in Zen mode, **Then** related entities are shown in a dedicated connections section.
2. **Given** I'm viewing connections, **When** I click a connected entity, **Then** the main content area updates to show that entity without closing sidebars.
3. **Given** no connections exist, **When** I view the entity, **Then** a subtle "No connections yet" placeholder is shown.

## Requirements

### Functional Requirements

- **FR-001**: Header elements MUST wrap or collapse into a secondary menu on screens narrower than 640px.
- **FR-002**: Cloud status icon MUST display a "Syncing" state animation during active data transfer.
- **FR-003**: The system MUST provide a visual confirmation (e.g., a brief flash or message) when a manual sync completes successfully.
- **FR-004**: Entity detail panels MUST transition to a full-width overlay on mobile-sized viewports.
- **FR-005**: All primary action buttons (Search, Sync, Create) MUST be sized for comfortable touch interaction (minimum 44x44px hit area).
- **FR-006**: Sync engine MUST utilize metadata history to detect file changes, ignoring timestamp discrepancies caused by cross-device transfers.
- **FR-007**: Sync operations MUST support parallel file transfers (minimum concurrency of 5) to optimize throughput for large vaults.
- **FR-008**: Database updates during sync MUST be batched to ensure UI responsiveness.
- **FR-009**: The system MUST detect authentication failures and provide a clear "Reconnect" action without requiring a full page reload.
- **FR-010**: Entity Explorer list MUST support native vertical scrolling with `touch-action: pan-y` and `overscroll-behavior: contain` on mobile viewports.
- **FR-011**: Entity detail panel MUST use proper `overflow-y: auto` with constrained height to enable independent scrolling within the panel.
- **FR-012**: Zen Mode MUST display embedded entity connections in the main content area in a visually distinct, navigable format.
- **FR-013**: Clicking a connected entity in the embedded connections view MUST update the main content area while preserving sidebar state (Oracle, Explorer).
- **FR-014**: Connections section MUST show an appropriate empty state when no connections exist for an entity.

### User Story 4 - Reliable Sync Consistency (Priority: P0)

As a user, I want the sync engine to only upload files I have actually modified, so that I don't waste bandwidth and time re-uploading my entire vault due to technical timestamp quirks.

**Acceptance Scenarios**:

1. **Given** a vault with existing files, **When** I sync without making changes, **Then** 0 files are uploaded.
2. **Given** I download a file on a new device, **When** I sync immediately, **Then** the system recognizes the file is identical to the server version.

### User Story 5 - Fast Sync Performance (Priority: P2)

As a power user with hundreds of files, I want the sync process to utilize my available bandwidth efficiently, so that I can switch devices quickly.

**Acceptance Scenarios**:

1. **Given** a backlog of 50 files, **When** sync starts, **Then** multiple files are uploaded/downloaded simultaneously.

### Key Entities

- **SyncStatus**: Represents the current state of cloud synchronization (Idle, Syncing, Success, Error).
- **ViewportState**: Represents the current display context (Mobile, Tablet, Desktop) to drive layout transitions.
- **EntityConnection**: Represents a relationship between two entities, displayed inline in Zen mode with navigation capability.
- **ExplorerScrollState**: Tracks scroll position and touch interaction state for the Entity Explorer list on mobile.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Zero horizontal scrolling on screens down to 320px width.
- **SC-002**: Sync status transition is perceived by users within 200ms of sync start.
- **SC-003**: Primary task completion time on mobile (e.g., create an NPC) is within 20% of desktop completion time.
- **SC-004**: 100% task success rate for "Sync Now" button clicks on touch devices.
- **SC-005**: Entity Explorer list MUST scroll smoothly at 60fps on mobile devices with 500+ entities.
- **SC-006**: Embedded entity connections MUST render within 150ms of entity load.
- **SC-007**: Click-to-navigate between connected entities in Zen mode MUST complete within 200ms without sidebar state loss.
- **SC-008**: Touch scroll in entity detail panel MUST not trigger browser-level gestures (pull-to-refresh, swipe-back).
