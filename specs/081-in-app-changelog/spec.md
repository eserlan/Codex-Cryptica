# Feature Specification: In-App & Dedicated Changelog

**Feature Branch**: `feat/changelog-page`  
**Created**: 2026-04-14  
**Updated**: 2026-04-16 (Extended for Dedicated Page)  
**Status**: In Progress  
**Input**: User description: "in app change log so users will see the most recent features" (GitHub Issue #607) & "Changelog page" (GitHub Issue #637)

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

### User Story 4 - Public Development History (Priority: P2)

As a potential user or guest, I want to review the project's development velocity and history on a dedicated page without needing to enter the workspace, so I can assess the project's health.

**Why this priority**: Improves transparency and project discoverability.

**Independent Test**: Navigate to `/changelog` and verify the page loads with full release history.

**Acceptance Scenarios**:

1. **Given** I am on the marketing landing page, **When** I click the "View Full Changelog" link, **Then** I should be taken to the `/changelog` page.
2. **Given** I am on the `/changelog` page, **When** I scroll through the content, **Then** I should see all previous releases listed in reverse chronological order.

---

### User Story 5 - Deep Linking & Sharing (Priority: P3)

As a community member, I want to share a link to a specific version's release notes, so I can highlight specific updates to others.

**Why this priority**: Facilitates community discussion and focused communication.

**Independent Test**: Append `#v0.18.0` to the `/changelog` URL and verify it scrolls to the correct section.

**Acceptance Scenarios**:

1. **Given** a direct link to a specific version, **When** I load the page, **Then** the browser should anchor to the specific release entry.

---

### Edge Cases

- **First-time Users**: Users with no `lastSeenVersion` in storage should see all relevant major/minor updates on their first visit (or have their version initialized to current to avoid overwhelm).
- **Overlapping Modals**: The system should delay the changelog modal to avoid conflicting with onboarding tours or the welcome screen.
- **Demo Mode**: The automatic trigger should be disabled in Demo Mode to avoid interrupting the scripted experience.
- **Missing Release Content**: If `releases.json` is empty or malformed, the system should gracefully fail (e.g., showing a "No transmissions found" message).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST store the `lastSeenVersion` in `localStorage`.
- **FR-002**: System MUST provide a structured JSON file (`releases.json`) to store release data.
- **FR-003**: System MUST compare the current release versions against `lastSeenVersion` to determine if a notification is needed.
- **FR-004**: System MUST allow users to dismiss the modal and update the `lastSeenVersion` accordingly.
- **FR-005**: System MUST provide a manual entry point in the "About" section of the settings.
- **FR-006**: System MUST provide a dedicated `/changelog` route within the `(marketing)` group.
- **FR-007**: The `/changelog` page MUST be SEO-optimized and prerendered (SSR) for search engine indexing.
- **FR-008**: The page SHOULD support anchor links for individual version sections.
- **FR-009**: The Landing Page (Marketing Layer) MUST include a prominent link to the full Changelog.

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
- **SC-004**: The `/changelog` page achieves a "Good" rating for SEO (meta titles, descriptions, and crawlable content).
- **SC-005**: Users can navigate from the public landing page to the full changelog in a single click.
