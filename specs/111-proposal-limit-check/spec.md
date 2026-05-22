# Feature Specification: Connection Proposal Limit Check

**Feature Branch**: `111-proposal-limit-check`  
**Created**: 2026-05-22  
**Status**: Draft  
**Input**: User description: "Check if there already are more than 4 connection proposals. If there are, dont auto propose, but intro a button that can look for more. We want options for the entity we open. but by having a global cache, we id each entity and its number of proposals. DetailProposals component opt 1 - but also in zen mode. State sync updates apply, dismiss, etc. to keep everything synced."

## Clarifications

### Session 2026-05-22

- Q: If an entity starts with 5 pending proposals (auto-scan suppressed), and the user dismisses one (count drops to 4), should the auto-proposer automatically trigger? → A: Stay suppressed (only a manual click or clean navigation can trigger auto-scan if count <= 4).
- Q: If the user clicks the "Look for Connection Proposals" manual scan button and the Lore Oracle API call fails, how should this failure be presented? → A: Toast Notification (show a standard toast error notification and revert the button to the idle state).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Auto-proposal Suppression (Priority: P1)

When the user opens an entity, the system checks the total number of existing connections (outbound + inbound) for that active entity. If this count is greater than 4, the background proposer execution must be suppressed (i.e. we do not automatically call the Lore Oracle to look for connections).

**Why this priority**: It is the core behavior needed to limit background AI token usage and reduce layout clutter when there are already many suggestions pending review for the entity.

**Independent Test**: Load a vault with an entity that has more than 4 total connections (outbound + inbound). Open the entity's details. Verify that no background API call is triggered.

**Acceptance Scenarios**:

1. **Given** an active entity with more than 4 total connections (outbound + inbound), **When** the user navigates to it, **Then** the automatic 1-second timeout analysis is NOT scheduled/run.
2. **Given** an active entity with 3 total connections, **When** the user navigates to it, **Then** the automatic 1-second timeout analysis runs normally in the background.
3. **Given** an active entity with 0 connections, **When** the user navigates to it, **Then** the automatic 1-second timeout analysis runs normally in the background.

---

### User Story 2 - Manual Scan Trigger (Priority: P1)

When the auto-propose trigger is suppressed (due to the active entity having more than 4 pending proposals), the user must see a manual "Look for Connection Proposals" button in the Suggestions section. This button must be present in both standard sidebar Detail view and Zen mode view.

**Why this priority**: Provides a fallback for users to explicitly request connection suggestions even when the auto-proposer is suppressed.

**Independent Test**: Navigate to an entity with 5 pending proposals, locate the "Look for Connection Proposals" button, click it, and verify that analysis triggers immediately and loads proposals.

**Acceptance Scenarios**:

1. **Given** an entity has more than 4 pending proposals, **When** viewed in the standard Detail sidebar or Zen mode, **Then** the "Look for Connection Proposals" button is rendered.
2. **Given** the "Look for Connection Proposals" button is visible, **When** the user clicks the button, **Then** a manual analysis runs immediately, showing a loading indicator, and updates the list with any new suggestions once finished.
3. **Given** an entity has no proposals and no history, but auto-proposing was suppressed globally (or skipped), **When** viewed, **Then** the Suggestions section header is displayed along with the manual button.

---

### User Story 3 - State Synchronization (Priority: P2)

The `proposerStore`'s in-memory active arrays (`allPendingProposals`, `allAcceptedProposals`, `allVerifiedProposals`, and per-entity `proposals`) must stay fully synchronized with the IndexedDB database state as the user applies, dismisses, re-evaluates, or runs new analyses on proposals.

**Why this priority**: Ensures the reactive proposal counts and list renderings in all tabs (standard sidebar, Zen mode, and AI Assessment) update immediately without requiring manual refreshing or full page reloads.

**Independent Test**: Trigger a proposal dismissal from the sidebar and verify that the counts in the AI Assessment and the detail sidebar update immediately.

**Acceptance Scenarios**:

1. **Given** a pending proposal is visible in both the sidebar suggestions and the global AI Assessment list, **When** the user dismisses it in the sidebar, **Then** it is immediately removed from both views and the respective counts update.
2. **Given** a new analysis is run manually or automatically, **When** new proposals are generated, **Then** they are immediately loaded and populated into both the entity-specific proposals and the global `allPendingProposals` array.

---

### Edge Cases

- **Fast Navigation**: What happens if the user rapidly clicks between different entities while an analysis or database load is active?
  - _Mitigation_: The store checks `vault.selectedEntityId` and ignores stale results if the user has moved on.
- **AI Disabled**: If the Lore Oracle AI is disabled in settings, the Suggestions section and the manual button should be hidden.
- **Guest Mode**: Guest users cannot trigger proposer analyses (manual or automatic).
- **Count Drops Below 4 during session**: If proposals are dismissed/accepted bringing the pending count to 4 or below, the auto-proposer remains suppressed until the next navigation or a manual scan is triggered.
- **Manual Scan API Failure**: If the Lore Oracle API call fails during a manual scan, the app must display a standard error toast notification, and the button must return to the idle/clickable state.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST query the proposals cache (IndexedDB/store state) for the active entity upon opening the entity.
- **FR-002**: The system MUST check if the active entity has more than 4 total connections (outbound + inbound). If the count is $> 4$, the automatic proposer schedule MUST be skipped.
- **FR-003**: The system MUST render a manual "Look for Connection Proposals" button in `DetailProposals.svelte` when the automatic scan is skipped, or when suggestions exist and the user wants to manual-scan.
- **FR-004**: The manual button MUST trigger `proposerStore.analyzeEntityById(entityId, requireSelection, true)` immediately upon click and display the loading/analyzing state.
- **FR-005**: The `proposerStore` MUST subscribe to the `VAULT_SWITCHED` event and load global proposals automatically so that global pending/accepted arrays are populated on vault load.
- **FR-006**: The `proposerStore` operations `apply()`, `dismiss()`, `reEvaluate()`, `verify()`, `undo()`, and `analyzeEntityById()` MUST automatically call `loadGlobalProposals()` to keep global state arrays in sync.

### Key Entities _(include if feature involves data)_

- **Proposal**: Represents a suggested connection between a source entity and target entity, with confidence score, context snippet, and status (`pending`, `accepted`, `rejected`, `verified`).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Background API calls are prevented 100% of the time when opening an entity that already has more than 4 total connections (outbound + inbound).
- **SC-002**: The manual scan button is visible and clickable in both standard entity details and Zen mode whenever the entity has pending proposals or when auto-scan is bypassed.
- **SC-003**: In-memory proposal lists and counts across the application (including AI Assessment panel and sidebar suggestions) are fully synchronized and updated within 100ms of any proposal state transition (apply, dismiss, etc.).
