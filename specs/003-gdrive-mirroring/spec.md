# Feature Specification: Google Drive Cloud Bridge

**Feature Branch**: `003-gdrive-mirroring`  
**Created**: 2026-01-23  
**Status**: Draft  
**Input**: User description: "Optional background mirroring that anchors local-first lore to your personal Google Drive for seamless cross-device access. > Maintain total data sovereignty with an opt-in cloud bridge that preserves your world’s graph without ever touching a third-party server."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Secure Cloud Link (Priority: P1)

As a lore creator, I want to securely connect my personal Google Drive to Codex Arcana so that my local-first data is mirrored to my own private storage.

**Why this priority**: Essential foundation for the "cloud bridge" and data sovereignty. Without this, no syncing can occur.

**Independent Test**: Can be tested by initiating the "Enable Cloud Bridge" flow, completing Google authentication, and verifying the connection status.

**Acceptance Scenarios**:

1. **Given** the Cloud Bridge is disabled, **When** the user clicks "Enable Cloud Bridge", **Then** the system initiates the Google OAuth2 authentication flow.
2. **Given** a successful Google authentication, **When** the user returns to the app, **Then** the system displays "Cloud Bridge Connected" and shows the linked Google account email.

---

### User Story 2 - Seamless Background Sync (Priority: P2)

As a writer working across devices, I want my local changes to automatically mirror to Google Drive in the background so that my lore is always available wherever I log in.

**Why this priority**: Provides the core "seamless cross-device access" value.

**Independent Test**: Can be tested by modifying a lore entry locally and verifying that a corresponding file update appears in the user's Google Drive storage within a reasonable time.

**Acceptance Scenarios**:

1. **Given** the Cloud Bridge is active, **When** a user updates a local lore entry, **Then** the system automatically triggers a background upload to Google Drive.
2. **Given** a change has been mirrored, **When** the user checks their Google Drive (via web browser), **Then** they see the updated lore file in the dedicated app folder.

---

### User Story 3 - Cross-Device Resumption (Priority: P3)

As a creator moving from desktop to mobile, I want the app to detect and pull the latest changes from Google Drive on startup so that I can continue my work exactly where I left off.

**Why this priority**: Completes the cross-device loop.

**Independent Test**: Can be tested by updating lore on Device A, opening the app on Device B, and verifying that Device B displays the updates from Device A.

**Acceptance Scenarios**:

1. **Given** a new device is connected to the same Google Drive, **When** the app starts, **Then** it automatically downloads the latest world graph from the cloud bridge.
2. **Given** local and remote versions differ, **When** a sync is triggered, **Then** the system resolves the state to ensure the user sees the most recent data.

---

### Edge Cases

- **Offline Mode**: How does the system handle changes made while there is no internet connection?
- **Authentication Expiry**: How does the system prompt the user to re-authenticate when the Google OAuth token expires?
- **Simultaneous Edits**: How does the system resolve conflicts if the same lore entry is edited on two devices simultaneously? The system follows a "Last-Write-Wins" strategy based on the modification timestamp.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide an opt-in toggle to enable/disable the Google Drive Cloud Bridge.
- **FR-002**: System MUST use OAuth2 to authenticate with the user's personal Google Drive account.
- **FR-003**: System MUST store lore data in a dedicated, user-accessible folder within their Google Drive (e.g., `/CodexArcana/`).
- **FR-004**: System MUST perform background mirroring of the local graph to Google Drive without blocking user interaction.
- **FR-005**: System MUST ensure that data is transmitted directly between the user's device and Google Drive, never passing through a third-party server (Data Sovereignty).
- **FR-006**: System MUST handle conflict resolution using a "Last-Write-Wins" approach where the version with the latest modification timestamp is preserved.
- **FR-007**: System MUST sync data at a periodic interval (e.g., every 5 minutes) when local changes are detected.

### Key Entities *(include if feature involves data)*

- **Cloud Bridge Configuration**: Stores user preference for sync (enabled/disabled), linked account identifier, and last sync timestamp.
- **World Graph Snapshot**: The serialized version of the lore data being mirrored to the cloud.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete the initial Google Drive connection in under 45 seconds (excluding Google's own login time).
- **SC-002**: Local changes are mirrored to Google Drive within 10 seconds of the user saving their work (assuming active internet connection).
- **SC-003**: 100% of data is preserved in the user's own storage, fulfilling the data sovereignty requirement.
- **SC-004**: Cross-device synchronization is achieved without requiring manual file exports/imports.