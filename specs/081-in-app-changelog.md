# Feature Specification: In-App Changelog

**Feature Branch**: `feat/in-app-changelog`  
**Created**: 2026-04-14  
**Status**: Implemented  
**Input**: User description: "in app change log so users will see the most recent features" (GitHub Issue #607)

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Automatic Update Notification (Priority: P1)

As a returning user, I want to be automatically notified of new features since my last visit, so I don't miss out on improvements.

**Why this priority**: Core value of the feature—ensuring users are aware of updates without manual effort.

**Independent Test**: Can be tested by setting an older version in `localStorage` and refreshing the app to see the modal.

**Acceptance Scenarios**:

1. **Given** I haven't seen version 0.17.37, **When** I load the application, **Then** a "What's New" modal should appear after a short delay.
2. **Given** I have already seen version 0.17.37, **When** I load the application, **Then** the modal should NOT appear.

---

### User Story 2 - Manual Changelog Access (Priority: P2)

As a curious user, I want to manually view the latest changes at any time, even if I've already dismissed the automatic notification.

**Why this priority**: Provides a persistent reference for feature documentation within the app.

**Independent Test**: Can be tested by navigating to Settings > About and clicking the "What's New" button.

**Acceptance Scenarios**:

1. **Given** I am in the Settings modal, **When** I click the "About" tab, **Then** I should see a "What's New in Codex" button.
2. **Given** I click the "What's New in Codex" button, **Then** the Changelog modal should open.

---

### User Story 3 - Release Highlights (Priority: P1)

As a user, I want to see a concise list of high-impact changes rather than a technical commit log, so I can quickly understand the value of the update.

**Why this priority**: Ensures the information is digestible and high-signal for end users.

**Independent Test**: Can be verified by inspecting the content of `releases.json` and its rendering in `ChangelogModal.svelte`.

**Acceptance Scenarios**:

1. **Given** the Changelog modal is open, **When** viewing a release, **Then** I should see a title, date, version number, and a list of bulleted highlights.

---

### Edge Cases

- **First-time Users**: Users with no `lastSeenVersion` in storage should see all relevant major/minor updates on their first visit (or have their version initialized to current to avoid overwhelm).
- **Overlapping Modals**: The system should delay the changelog modal to avoid conflicting with onboarding tours or the welcome screen.
- **Demo Mode**: The automatic trigger should be disabled in Demo Mode to avoid interrupting the scripted experience.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST store the `lastSeenVersion` in `localStorage`.
- **FR-002**: System MUST provide a structured JSON file (`releases.json`) to store release data.
- **FR-003**: System MUST compare the current release versions against `lastSeenVersion` to determine if a notification is needed.
- **FR-004**: System MUST allow users to dismiss the modal and update the `lastSeenVersion` accordingly.
- **FR-005**: System MUST provide a manual entry point in the "About" section of the settings.

### Key Entities

- **ReleaseEntry**: Represents a single version update.
  - `version`: Semver string (e.g., "0.17.37")
  - `title`: Short descriptive title of the update.
  - `date`: ISO date string.
  - `highlights`: Array of strings describing key changes.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of returning users are prompted with a "What's New" modal upon their first visit after a minor/major version bump.
- **SC-002**: Users can access the changelog manually in under 3 clicks from the main interface.
- **SC-003**: The modal rendering is responsive and follows the theme's visual guidelines.
