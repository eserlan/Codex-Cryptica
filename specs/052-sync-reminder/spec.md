# Feature Specification: Sync Reminder

**Feature Branch**: `052-sync-reminder`  
**Created**: 2026-02-20  
**Status**: Draft  
**Input**: User description: "Let's remind the user to sync once in a while, so that the data gets on the users pc, not only in the browser idb. https://github.com/eserlan/Codex-Cryptica/issues/199"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Work-Volume Sync Reminder (Priority: P1)

As a User, I want to be reminded to sync my browser data to my PC after I have created or modified 5 entities without syncing, so that I don't risk losing a significant session of work.

**Why this priority**: Core goal of the feature. Prevents data loss for local-first users who might forget to persist their work.

**Independent Test**: Can be tested by creating/editing 5 entities and verifying the reminder appears.

**Acceptance Scenarios**:

1. **Given** I have a campaign open, **When** I reach 5 unsynced changes (new or modified entities), **Then** a reminder notification appears.
2. **Given** the reminder is visible, **When** I click the "Sync Now" button in the reminder, **Then** the sync process starts and the reminder disappears.

---

### User Story 2 - Dismissal and Silence (Priority: P2)

As a User, I want to dismiss the reminder or have it automatically disappear once I perform a manual sync, so that it doesn't become annoying.

**Why this priority**: Important for UX. Prevents the reminder from being perceived as "nagware".

**Independent Test**: Can be tested by manually syncing while a reminder is active and ensuring it clears.

**Acceptance Scenarios**:

1. **Given** the reminder is visible, **When** I click the "Dismiss" button, **Then** the reminder disappears and doesn't reappear until another 5 changes are made.
2. **Given** the reminder is visible, **When** I perform a manual sync via the standard UI, **Then** the reminder automatically disappears.

---

### User Story 3 - Visual Consistency (Priority: P3)

As a User, I want the reminder to match the look and feel of the app, so that it feels like a native part of the experience.

**Why this priority**: Standard UX polish.

**Independent Test**: Visual inspection against existing toast/banner patterns.

**Acceptance Scenarios**:

1. **Given** a reminder appears, **When** it is displayed, **Then** it uses the current theme colors and typography.

---

### Edge Cases

- What happens if the user has no sync method configured?
  - Assumption: The reminder should not appear if sync is not possible.
- What if the browser tab is in the background?
  - Assumption: The timer should only progress while the tab is active/foregrounded.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST track the synchronization status of the current vault.
- **FR-002**: System MUST monitor the dirty count dynamically using reactive effects (not polling).
- **FR-003**: System MUST trigger the reminder signal immediately when the dirty count reaches the threshold (5 entities).
- **FR-004**: System MUST record the `dirtyEntitiesCount` at the time of reminder display as `lastRemindedCount`.
- **FR-005**: System MUST suppress further reminders until the dirty count increases by an additional 5 entities (e.g., at 10, 15, etc.) or the session is restarted.
- **FR-006**: System MUST reset `lastRemindedCount` to 0 upon any successful sync.
- **FR-007**: System MUST provide a "Sync Now" action in the reminder that invokes the existing sync workflow.
- **FR-008**: System MUST hide the reminder immediately if the dirty count drops below the current threshold (e.g., due to manual sync or undoing changes).

### Key Entities

- **SyncState**: Represents the current synchronization status of the vault.
  - `lastSyncTimestamp`: Time of the last successful sync.
  - `dirtyEntitiesCount`: Number of new or modified entities since the last sync.
  - `lastRemindedDirtyCount`: The dirty count when the user was last prompted.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of users who accumulate 5 or more unsynced entities receive a reminder.
- **SC-002**: Users can initiate a sync with a single click from the reminder.
- **SC-003**: The reminder disappears within 500ms of a successful sync starting or being manually dismissed.
- **SC-004**: Sync reminder does not reappear until the number of unsynced entities has increased by the specified threshold (5 entities) or a new session starts.
